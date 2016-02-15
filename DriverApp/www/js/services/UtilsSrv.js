angular.module('driverapp.services.utils', [])

.factory('Utils', function ($rootScope, $filter, $timeout, $ionicPopup, $ionicLoading, Config) {
    var Utils = {};

    Utils.isValidDate = function (dateString) {
        return moment(dateString, Config.getDateFormat(), true).isValid();
    };

    Utils.isValidDateRange = function (dateFromString, dateToString) {
        var dateFromValid = moment(dateFromString, Config.getDateFormat(), true).isValid();
        var dateToValid = moment(dateToString, Config.getDateFormat(), true).isValid();
        var rightOrder = moment(dateFromString).isSameOrBefore(dateToString);
        return (dateFromValid && dateToValid && rightOrder);
    };

    Utils.toast = function (message, duration, position) {
        message = message || $filter('translate')('toast_error_generic');
        duration = duration || 'short';
        position = position || 'bottom';

        if (!!window.cordova) {
            // Use the Cordova Toast plugin
            //$cordovaToast.show(message, duration, position);
            window.plugins.toast.show(message, duration, position);
        } else {
            if (duration == 'short') {
                duration = 2000;
            } else {
                duration = 5000;
            }

            var myPopup = $ionicPopup.show({
                template: '<div class="toast">' + message + '</div>',
                scope: $rootScope,
                buttons: []
            });

            $timeout(
                function () {
                    myPopup.close();
                },
                duration
            );
        }
    };

    Utils.fastCompareObjects = function (obj1, obj2) {
        return JSON.stringify(obj1) === JSON.stringify(obj2);
    };

    Utils.loading = function () {
        $ionicLoading.show();
    };

    Utils.loaded = function () {
        $ionicLoading.hide();
    };

    return Utils;
});