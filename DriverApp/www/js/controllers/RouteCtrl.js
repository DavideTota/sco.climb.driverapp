angular.module('driverapp.controllers.route', [])

.controller('RouteCtrl', function ($scope, $rootScope, $stateParams, $ionicHistory, $ionicNavBarDelegate, $ionicPopup, $ionicModal, $interval, $ionicScrollDelegate, $filter, Config, Utils, StorageSrv, GeoSrv, AESrv, APISrv, WSNSrv) {
    $scope.fromWizard = false;
    var aesInstance = {};

    $scope.children = null;
    $scope.driver = null;
    $scope.helpers = [];
    $scope.helpersTemp = [];

    $scope.route = {};
    $scope.stops = [];
    $scope.onBoardTemp = [];
    $scope.onBoard = [];

    $scope.enRoute = false;
    $scope.enRoutePos = 0;
    $scope.enRouteArrived = false;

    /* INIT */
    if (!!$stateParams['fromWizard']) {
        $scope.fromWizard = $stateParams['fromWizard'];
    }

    if ($scope.fromWizard) {
        if (!!$stateParams['route']) {
            $scope.route = $stateParams['route'];

            aesInstance = AESrv.startInstance($scope.route.objectId);
            WSNSrv.updateNodeList(StorageSrv.getChildren(), 'child', true);

            if (!!$stateParams['driver']) {
                $scope.driver = $stateParams['driver'];
                AESrv.setDriver($scope.driver);
            }

            if (!!$stateParams['helpers']) {
                $scope.helpersTemp = $stateParams['helpers'];
                /*$scope.helpers.forEach(function (helper) {
                    AESrv.setHelper(helper);
                });*/
            }

            $scope.$watch(
                function () {
                    return WSNSrv.networkState;
                },
                function (newNs, oldNs) {
                    var ns = angular.copy(newNs);
                    var somethingChanged = false;

                    Object.keys(ns).forEach(function (nodeId) {
                        if (WSNSrv.isNodeByType(nodeId, 'child')) {
                            if (ns[nodeId].status == WSNSrv.STATUS_NEW) {
                                // new node?
                                if (oldNs[nodeId].status == '') {
                                    AESrv.nodeInRange(ns[nodeId].object);
                                }

                                var child = $scope.isChildOfThisStop(nodeId);
                                if (child !== null) {
                                    $scope.takeOnBoard(child.objectId);
                                    ns[nodeId].status = WSNSrv.STATUS_BOARDED_ALREADY;
                                    somethingChanged = true;
                                }
                            }

                            if ($scope.isOnBoard(ns[nodeId].object.objectId)) {
                                var overTimeout = (moment().valueOf() - ns[nodeId].timestamp) > Config.NODESTATE_TIMEOUT;

                                if (overTimeout && ns[nodeId].status !== WSNSrv.STATUS_OUT_OF_RANGE) {
                                    ns[nodeId].status = WSNSrv.STATUS_OUT_OF_RANGE;
                                    somethingChanged = true;
                                    AESrv.nodeOutOfRange(ns[nodeId].object, ns[nodeId].timestamp);
                                    var errorString = 'Attenzione! ';
                                    errorString += ns[nodeId].object.surname + ' ' + ns[nodeId].object.name + ' (' + nodeId + ') fuori portata!';
                                    console.log('nodeOutOfRange: ' + nodeId + ' (last seen ', +ns[nodeId].timestamp + ')');
                                    // TODO toast for failure
                                    //Utils.toast(errorString, 5000, 'center');
                                } else if (!overTimeout && ns[nodeId].status === WSNSrv.STATUS_OUT_OF_RANGE) {
                                    ns[nodeId].status = WSNSrv.STATUS_BOARDED_ALREADY;
                                    somethingChanged = true;
                                    AESrv.nodeInRange(ns[nodeId].object);
                                    console.log('nodeBackInRange: ' + nodeId);
                                    var toastString = ns[nodeId].object.surname + ' ' + ns[nodeId].object.name + ' (' + nodeId + ') di nuovo in portata!';
                                    // TODO toast for failure
                                    //Utils.toast(toastString, 5000, 'center');
                                }
                            }
                        }
                    });

                    if (somethingChanged) {
                        WSNSrv.networkState = ns;
                    }
                }
            );
        }
    } else {
        if (!!$stateParams['route']) {
            $scope.route = $stateParams['route'];
        } else if (!!$stateParams['routeId']) {
            $scope.route = StorageSrv.getRouteById($stateParams['routeId']);
        }
    }

    APISrv.getStopsByRoute($stateParams['routeId']).then(
        function (stops) {
            $scope.stops = stops;
            // Select the first automatically
            $scope.sel.stop = $scope.stops[0];
            $scope.getChildrenForStop($scope.sel.stop);

            if ($scope.fromWizard) {
                AESrv.stopReached($scope.sel.stop);
            }
        },
        function (error) {
            // TODO handle error
            console.log(error);
        }
    );

    /*
        $scope.checkStopPosition = function(position){
           if(position == $scope.stops[0].position){
               return "-first";
           } else {
               if(position == $scope.stops[$scope.stops.length-1].position){
                   return "-last";
               } else {
                   return "";
               }
           }
        };
    */

    $scope.toggleEnRoute = function () {
        $ionicScrollDelegate.scrollTop(true);

        // if has next
        if (!!$scope.stops[$scope.enRoutePos + 1]) {
            $scope.enRoute = !$scope.enRoute;

            if ($scope.enRoute) {
                $scope.sel.stop = $scope.stops[$scope.enRoutePos];

                // NODE_CHECKIN
                $scope.onBoardTemp.forEach(function (passengerId) {
                    var child = $scope.getChild(passengerId);
                    AESrv.nodeCheckin(child);
                    if (!!child.wsnId) {
                        WSNSrv.checkinChild(child.wsnId);
                    }
                });

                $scope.onBoard = $scope.onBoard.concat($scope.onBoardTemp);
                $scope.onBoardTemp = [];
                $scope.mergedOnBoard = $scope.getMergedOnBoard();

                // Riparti
                $scope.helpersTemp.forEach(function (helper) {
                    AESrv.setHelper(helper);
                });
                $scope.helpers = $scope.helpers.concat($scope.helpersTemp);
                $scope.helpersTemp = [];

                if ($scope.enRoutePos == 0) {
                    // Parti
                    AESrv.startRoute($scope.stops[$scope.enRoutePos]);

                    GeoSrv.startWatchingPosition(function (position) {
                        AESrv.driverPosition($scope.driver, position.coords.latitude, position.coords.longitude);
                    }, null, Config.GPS_DELAY);
                }
            } else {
                // Fermati
                $scope.enRoutePos++;
                $scope.sel.stop = $scope.stops[$scope.enRoutePos];
                AESrv.stopReached($scope.sel.stop);
                $scope.getChildrenForStop($scope.sel.stop);
            }

            // if has no next
            if (!$scope.stops[$scope.enRoutePos + 1]) {
                // Arriva
                $scope.onBoard.forEach(function (passengerId) {
                    var child = $scope.getChild(passengerId);
                    AESrv.nodeAtDestination(child);
                    AESrv.nodeCheckout(child);

                    if (!!child.wsnId && !!WSNSrv.networkState[child.wsnId] && WSNSrv.networkState[child.wsnId].status == WSNSrv.STATUS_BOARDED_ALREADY) {
                        WSNSrv.checkoutChild(child.wsnId);
                    }
                });
                AESrv.endRoute($scope.stops[$scope.enRoutePos]);
                GeoSrv.stopWatchingPosition();
                $scope.enRouteArrived = true;
            }
        }
    };

    $scope.sel = {
        stop: null
    };

    $scope.getChild = function (childId) {
        var foundChild = null;
        for (var i = 0; i < $scope.children.length; i++) {
            var child = $scope.children[i];
            if (child.objectId === childId) {
                foundChild = child;
                i = $scope.children.length;
            }
        }
        return foundChild;
    };

    $scope.getChildrenForStop = function (stop) {
        $scope.sel.stop = stop;
        var passengers = [];
        if ($scope.children == null || $scope.children.length == 0) {
            $scope.children = StorageSrv.getChildren();
        }
        if ($scope.children != null) {
            $scope.children.forEach(function (child) {
                if (stop.passengerList.indexOf(child.objectId) != -1) {
                    passengers.push(child);
                }
            });
        }
        stop.passengers = passengers;
    };

    $scope.isChildOfThisStop = function (childWsnId) {
        var child = null;
        if (!!$scope.sel.stop && !!$scope.sel.stop.passengers) {
            for (var i = 0; i < $scope.sel.stop.passengers.length; i++) {
                var passenger = $scope.sel.stop.passengers[i];
                if (passenger.wsnId === childWsnId) {
                    child = passenger;
                    i = $scope.sel.stop.passengers.length;
                }
            }
        }
        return child;
    };

    $scope.takeOnBoard = function (passengerId) {
        if ($scope.onBoardTemp.indexOf(passengerId) === -1) {
            $scope.onBoardTemp.push(passengerId);
        }
        $scope.mergedOnBoard = $scope.getMergedOnBoard();
    };

    $scope.dropOff = function (passengerId) {
        var index = $scope.onBoardTemp.indexOf(passengerId)
        if (index !== -1) {
            $scope.onBoardTemp.splice(index, 1);
        }
        $scope.mergedOnBoard = $scope.getMergedOnBoard();
    };

    $scope.toBeTaken = [];
    $scope.setToBeTaken = function (child) {
        var tbtIndex = $scope.toBeTaken.indexOf(child.objectId);
        if (!!child.checked && tbtIndex === -1) {
            $scope.toBeTaken.push(child.objectId);
        } else if (!child.checked && tbtIndex !== -1) {
            $scope.toBeTaken.splice(tbtIndex, 1);
        }
    };

    $scope.isOnBoard = function (childId) {
        if ($scope.onBoard.indexOf(childId) != -1 || $scope.onBoardTemp.indexOf(childId) != -1) {
            return true;
        }
        return false;
    };

    /*
     * "Add others" Modal
     */
    $ionicModal.fromTemplateUrl('templates/route_modal_add.html', {
        scope: $scope,
        animation: 'slide-in-up'
    }).then(function (modal) {
        $scope.modal = modal;
    });

    $scope.openModal = function () {
        $scope.modal.show();
    };

    $scope.closeModal = function () {
        $scope.modal.hide();
    };

    //Cleanup the modal when we're done with it!
    $scope.$on('$destroy', function () {
        $scope.modal.remove();
    });

    // Execute action on hide modal
    $scope.$on('modal.hidden', function () {
        if ($scope.toBeTaken.length > 0) {
            $scope.onBoardTemp = $scope.onBoardTemp.concat($scope.toBeTaken);
        }

        // reset
        $scope.toBeTaken.forEach(function (childId) {
            $scope.getChild(childId).checked = false;
        });
        $scope.toBeTaken = [];

        $scope.mergedOnBoard = $scope.getMergedOnBoard();
    });

    // Execute action on remove modal
    $scope.$on('modal.removed', function () {});

    /*
     * Child details popup
     */
    $scope.showChildDetails = function (child) {
        $scope.phone = (!!child.parentName ? child.parentName + ': ' + child.phone : child.phone);
        var detailsPopup = $ionicPopup.alert({
            title: child.surname + ' ' + child.name,
            //template: (!!child.parentName ? child.parentName + ': ' + child.phone : child.phone),
            templateUrl: 'templates/phone_popup_person.html',
            scope: $scope,
            okText: 'OK',
            okType: 'button'
        });
    };

    /*
     * Merge lists method: used to merge the two lists (onBoard and onBoardTmp) and generate a matrix with rows of 3 cols
     */
    $scope.getMergedOnBoard = function () {
        var onBoardMerged = [];
        var onBoardMatrix = [];
        var cols = 3;
        for (var i = 0; i < $scope.onBoard.length; i++) {
            var tmpData = {
                id: $scope.onBoard[i],
                tmp: false
            };
            onBoardMerged.push(tmpData);
        }
        for (var i = 0; i < $scope.onBoardTemp.length; i++) {
            var tmpData = {
                id: $scope.onBoardTemp[i],
                tmp: true
            };
            if ($scope.isNewValue(onBoardMerged, tmpData)) {
                onBoardMerged.push(tmpData);
            }
        }
        // here I have to convert in matrix
        for (var i = 0; i < onBoardMerged.length; i += cols) {
            var rowArr = [];
            var actualCols = (i + cols);
            if ((actualCols) <= onBoardMerged.length) {
                for (var c = 0; c < cols; c++) {
                    rowArr.push(onBoardMerged[i + c]);
                }
            } else {
                for (var c = i; c < onBoardMerged.length; c++) {
                    rowArr.push(onBoardMerged[c]);
                }
            }
            onBoardMatrix.push(rowArr);
        }
        //return onBoardMerged;
        return onBoardMatrix;
    }

    /*
     * Check lists method: used to check if a value is already present in a list or not
     */
    $scope.isNewValue = function (arr, val) {
        var present = false;
        for (var i = 0; i < arr.length && !present; i++) {
            if (arr[i] == val) {
                present = true;
            }
        }
        return !present;
    }

    $scope.isRoutePanelOpen = false; // initial state of the route panel (closed)
    $scope.openRouteView = function () {
        $scope.isRoutePanelOpen = true;
    }

    $scope.closeRouteView = function () {
        $scope.isRoutePanelOpen = false;
    }

    $scope.selectHelpersPopup = function () {
        //$scope.volunteers = $scope.getDriverAndVolunteers(StorageSrv.getVolunteers(), $scope.helpers, $scope.helpersTemp);
        $scope.volunteers = $filter('orderBy')(StorageSrv.getVolunteers(), ['checked', 'name']);
        $scope.helpers = $filter('orderBy')($scope.helpers, ['checked', 'name']);
        $scope.helpersTemp = $filter('orderBy')($scope.helpersTemp, ['checked', 'name']);
        var hs = $scope.helpers.concat($scope.helpersTemp);

        var oldHelpersIds = [];
        $scope.helpers.forEach(function (h) {
           oldHelpersIds.push(h.objectId);
        });

        var counter = 0;
        hs.forEach(function (h) {
            for (var i = 0; i < $scope.volunteers.length; i++) {
                if ($scope.volunteers[i].objectId == h.objectId) {
                    $scope.volunteers[i].checked = true;
                    if (oldHelpersIds.indexOf($scope.volunteers[i].objectId) != -1) {
                        $scope.volunteers[i].disabled = true;
                    }
                    Utils.moveInArray($scope.volunteers, i, counter);
                    //console.log('Helper ' + $scope.volunteers[counter].name + ' moved to position ' + counter);
                    counter++;
                    i = $scope.volunteers.length;
                }
            }
        });

        var helpersPopup = $ionicPopup.show({
            templateUrl: 'templates/route_popup_helpers.html',
            cssClass: 'route-volunteers',
            title: 'ACCOMPAGNATORI',
            subTitle: $scope.route.name,
            scope: $scope,
            buttons: [{
                text: 'CHIUDI',
                type: 'button-stable',
            }, {
                text: 'SALVA',
                type: 'button-positive',
                onTap: function (e) {
                    $scope.selectHelpers($scope.volunteers);
                }
            }]
        });

        $scope.selectHelpers = function (volunteers) {
            $scope.helpersTemp = [];
            for (var i = 0; i < volunteers.length; i++) {
                if (volunteers[i].checked && !volunteers[i].disabled) {
                    $scope.helpersTemp.push(volunteers[i]);
                }
            }
            //$scope.helpers = $scope.helpersTemp; // here I align the helpers
            helpersPopup.close();
        };
    };

    /*$scope.getDriverAndVolunteers = function (all, help, helptemp) {
        var hlps = [];
        for (var i = 0; i < all.length; i++) {
            for (var h = 0; h < help.length; h++) {
                if (all[i].objectId == help[h].objectId) {
                    var hlp = help[h];
                    hlp.checked = true;
                    hlp.ordered = 0; // used only in list ordering
                    hlps.push(hlp);
                    all.splice(i, 1); // remove from arr
                    if (i > 0) {
                        i -= 1; // move i to back;
                    }
                }
            }
            for (var h = 0; h < helptemp.length; h++) {
                if (all[i].objectId == helptemp[h].objectId) {
                    var hlp = helptemp[h];
                    hlp.checked = true;
                    hlp.ordered = 0; // used only in list ordering
                    hlps.push(hlp);
                    all.splice(i, 1); // remove from arr
                    if (i > 0) {
                        i -= 1; // move i to back;
                    }
                }
            }
        }
        for (var i = 0; i < hlps.length; i++) {
            all.splice(0, 0, hlps[i]);
        }
        //all.splice(0, 0,drv); // add the driver
        return all;
    };*/

});
