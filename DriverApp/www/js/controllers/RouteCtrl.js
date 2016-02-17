angular.module('driverapp.controllers.route', [])

.controller('RouteCtrl', function ($scope, $stateParams, $ionicHistory, $ionicModal, $interval, $ionicScrollDelegate, Config, StorageSrv, AESrv, APISrv) {
    $ionicHistory.clearHistory();

    var fromWizard = false;
    var aesInstance = {};

    $scope.children = StorageSrv.getChildren();
    $scope.driver = null;
    $scope.helpers = null;

    $scope.route = {};
    $scope.stops = [];
    $scope.onBoardTemp = [];
    $scope.onBoard = [];

    $scope.enRoute = false;
    $scope.enRoutePos = 0;
    $scope.enRouteArrived = false;

    // FIXME dev purpose only!
    var gpsInterval = null;

    /* INIT */
    if (!!$stateParams['fromWizard']) {
        fromWizard = $stateParams['fromWizard'];
    }

    if (fromWizard) {
        if (!!$stateParams['route']) {
            $scope.route = $stateParams['route'];

            aesInstance = AESrv.startInstance($scope.route.objectId);

            if (!!$stateParams['driver']) {
                $scope.driver = $stateParams['driver'];
                AESrv.setDriver($scope.driver);
            }

            if (!!$stateParams['helpers']) {
                $scope.helpers = $stateParams['helpers'];
                $scope.helpers.forEach(function (helper) {
                    AESrv.setHelper(helper);
                });
            }

            APISrv.getStopsByRoute($scope.route.objectId).then(
                function (stops) {
                    $scope.stops = stops;
                    // Select the first automatically
                    $scope.sel.stop = $scope.stops[0];
                    AESrv.stopReached($scope.sel.stop);
                    $scope.getChildrenForStop($scope.sel.stop);
                },
                function (error) {
                    // TODO handle error
                    console.log(error);
                }
            );
        }
    }

    $scope.toggleEnRoute = function () {
        $ionicScrollDelegate.scrollTop(true);

        // if has next
        if (!!$scope.stops[$scope.enRoutePos + 1]) {
            $scope.enRoute = !$scope.enRoute;

            if ($scope.enRoute) {
                // NODE_CHECKIN
                $scope.onBoardTemp.forEach(function (passengerId) {
                    AESrv.nodeCheckin($scope.getChild(passengerId));
                });
                $scope.onBoard = $scope.onBoard.concat($scope.onBoardTemp);
                $scope.onBoardTemp = [];

                // Riparti
                if ($scope.enRoutePos == 0) {
                    // Parti
                    AESrv.startRoute($scope.stops[$scope.enRoutePos]);
                    // FIXME dev purpose only!
                    gpsInterval = $interval(function () {
                        AESrv.driverPosition($scope.driver);
                        console.log('driverPosition!');
                    }, Config.getGPSDelay());
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
                    AESrv.nodeCheckout($scope.getChild(passengerId));
                });
                AESrv.endRoute($scope.stops[$scope.enRoutePos]);
                // FIXME dev purpose only!
                $interval.cancel(gpsInterval);

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
        var passengers = [];
        $scope.children.forEach(function (child) {
            if (stop.passengerList.indexOf(child.objectId) != -1) {
                passengers.push(child);
            }
        });
        stop.passengers = passengers;
    };

    $scope.takeOnBoard = function (passengerId) {
        if ($scope.onBoardTemp.indexOf(passengerId) === -1) {
            $scope.onBoardTemp.push(passengerId);
        }
    };

    $scope.dropOff = function (passengerId) {
        var index = $scope.onBoardTemp.indexOf(passengerId)
        if (index !== -1) {
            $scope.onBoardTemp.splice(index, 1);
        }
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
    });

    // Execute action on remove modal
    $scope.$on('modal.removed', function () {});
});
