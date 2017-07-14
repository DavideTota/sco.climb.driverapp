angular.module('driverapp', [
  'ionic',
  'ionic.wizard',
  'ngCordova',
  'driverapp.services.storage',
  'driverapp.services.config',
  'driverapp.services.utils',
  'driverapp.services.wsn',
  'driverapp.services.geo',
  'driverapp.services.ae',
  'driverapp.services.api',
  'driverapp.services.route',
  'driverapp.controllers.home',
  'driverapp.controllers.wizard',
  'driverapp.controllers.routes',
  'driverapp.controllers.route',
  'driverapp.controllers.volunteers',
  'driverapp.controllers.batteries'
])

  .run(function ($ionicPlatform, $rootScope, $state, $ionicHistory, $ionicPopup, $window, Config, Utils, StorageSrv, WSNSrv, APISrv, GeoSrv) {
    $ionicPlatform.ready(function () {
      // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
      // for form inputs)
      if (window.cordova && window.cordova.plugins.Keyboard) {
        cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true)
        cordova.plugins.Keyboard.disableScroll(true)
      }

      if (window.StatusBar) {
        // org.apache.cordova.statusbar required
        window.StatusBar.styleDefault()
      }

      GeoSrv.geolocalize();

      /*
       * Check Internet connection
       */
      if (Utils.isConnectionDown()) {
        Utils.loaded()

        $ionicPopup.alert({
          title: 'Nessuna connessione',
          template: 'L\'applicazione non può funzionare se il terminale non è connesso a Internet',
          okText: 'Chiudi',
          okType: 'button-energized'
        })

          .then(function (result) {
            ionic.Platform.exitApp()
          })
      }

      if (window.DriverAppPlugin) {
        WSNSrv.init().then(
          function (response) {},
          function (reason) {}
        )

        WSNSrv.startListener().then(
          function (response) {},
          function (reason) {}
        )

        /*
         * WSN Functions!
         */
        $rootScope.WSNSrvGetMasters = function () {
          WSNSrv.getMasters().then(
            function (masters) {},
            function (reason) {}
          )
        }

        $rootScope.WSNSrvConnectMaster = function (masterId) {
          WSNSrv.connectMaster(masterId).then(
            function (procedureStarted) {},
            function (reason) {}
          )
        }

        $rootScope.WSNSrvSetNodeList = function () {
          var childrenWsnIds = WSNSrv.getNodeListByType('child')
          WSNSrv.setNodeList(childrenWsnIds).then(
            function (procedureStarted) {},
            function (reason) {}
          )
        }

        $rootScope.WSNSrvGetNetworkState = function () {
          WSNSrv.getNetworkState().then(
            function (networkState) {},
            function (reason) {}
          )
        }

        $rootScope.WSNSrvCheckMaster = function () {
          WSNSrv.connectMaster($rootScope.driver.wsnId).then(
            function (procedureStarted) {},
            function (reason) {}
          )
        }

      }

      $rootScope.exitApp = function () {
        $ionicPopup.confirm({
          title: 'Chiusura app',
          template: 'Vuoi veramente uscire?',
          cancelText: 'No',
          cancelType: 'button-stable',
          okText: 'Si',
          okType: 'button-energized'
        })

          .then(function (result) {
            if (result) {
              Utils.setMenuDriverTitle(null) // clear driver name in menu
              ionic.Platform.exitApp()
            }
          })
      }

      $rootScope.logout = function () {
        $ionicPopup.confirm({
          title: 'Logout',
          template: 'Vuoi veramente fare logout?',
          cancelText: 'No',
          cancelType: 'button-stable',
          okText: 'Si',
          okType: 'button-energized'
        })

          .then(function (result) {
            if (result) {
              Config.resetIdentity()
              StorageSrv.clearIdentityIndex()
              if (ionic.Platform.isIOS()) {
                $state.go('app.wizard').then(function () {
                    window.location.reload(true);
                });
              } else {
                ionic.Platform.exitApp()
              }
              /*
              $state.go('app.wizard').then(function () {
                  window.location.reload(true);
              });
              */

              /*
              window.location.hash = '/wizard';
              window.location.reload(true);
              */

              /*
              document.location.href = 'index.html';
              */

              /*
              $state.go('app.wizard');
              $ionicHistory.clearHistory();
              setTimeout(function () {
                  $window.location.reload(true);
              }, 100);
              */
            }
          })
      }

      $ionicPlatform.registerBackButtonAction(function (event) {
        // if (true) { // TODO need a condition?
        $rootScope.exitApp()
        // }
      }, 100)
    })
  })

  .config(function ($stateProvider, $urlRouterProvider) {
    $stateProvider.state('app', {
      url: '/app',
      abstract: true,
      templateUrl: 'templates/menu.html',
      controller: 'AppCtrl'
    })
      .state('app.wizard', {
        url: '/wizard',
        cache: false,
        views: {
          'menuContent': {
            templateUrl: 'templates/wizard.html',
            controller: 'WizardCtrl'
          }
        }
      })
      .state('app.home', {
        url: '/home',
        views: {
          'menuContent': {
            templateUrl: 'templates/home.html',
            controller: 'HomeCtrl'
          }
        }
      })
      .state('app.routes', {
        url: '/routes',
        cache: false,
        views: {
          'menuContent': {
            templateUrl: 'templates/routes.html',
            controller: 'RoutesCtrl'
          }
        }
      })
      .state('app.route', {
        url: '/routes/:routeId',
        cache: false,
        params: {
          fromWizard: false,
          route: {},
          driver: {},
          helpers: []
        },
        views: {
          'menuContent': {
            templateUrl: 'templates/route.html',
            controller: 'RouteCtrl'
          }
        }
      })
      .state('app.volunteers', {
        url: '/volunteers',
        cache: false,
        views: {
          'menuContent': {
            templateUrl: 'templates/volunteers.html',
            controller: 'VolunteersCtrl'
          }
        }
      })

    $urlRouterProvider.otherwise('/app/wizard')
  })
