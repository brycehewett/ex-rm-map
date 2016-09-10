(function() {
  'use strict';

  angular
    .module('app.main')
    .controller('mainController', mainController);

  mainController.$inject = ['$q', '$scope', '$log', '$mdToast', '$mdDialog', '$mdSidenav', 'NgMap', '$timeout', '$cookies'];

  function mainController($q, $scope, $log, $mdToast, $mdDialog, $mdSidenav, NgMap, $timeout, $cookies) {

    var vm = this;

    var firebaseConfig = {
      apiKey: "AIzaSyBOuqyDzI-BqSgSjv1cB3K0P5urSjqNj8Y",
      authDomain: "exrmmap.firebaseapp.com",
      databaseURL: "https://exrmmap.firebaseio.com",
      storageBucket: "",
    };

    firebase.initializeApp(firebaseConfig);

    $scope.missionCount = 0;
    $scope.RMCount = 0;
    $scope.map;
    $scope.mapCenter = {
      lat: 41,
      lng: -87
    }

    vm.mapAPI = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyBOuqyDzI-BqSgSjv1cB3K0P5urSjqNj8Y&libraries=places';
    vm.RMList = {};
    vm.RMCount = 0;
    vm.missionData = [];
    vm.missionNames = [];
    vm.newRM;
    vm.markerArray = [];
    vm.MarkerClusterer;

    if (window.location.hostname.indexOf('localhost') < 0) {
      var db = 'main/'
    } else {
      $log.warn("You're currently on localhost. All data will be pushed to test directory.")
      var db = 'test/'
    }

    vm.toggleNav = function() {
      $mdSidenav('left').toggle();
    }

    vm.appInit = function(){
      vm.mapReady = false;
      firebase.database().ref(db + 'RMList').once('value').then(function(snapshot) {
        vm.RMList = snapshot.val();
          NgMap.getMap().then(function(map) {

            function initMapData() {
               var q = $q.defer();
               vm.mapReady = false;
               for (var rm in vm.RMList) {
                 var latLng = new google.maps.LatLng(vm.RMList[rm].missionDetails.location.lat, vm.RMList[rm].missionDetails.location.lng);
                 var marker = new google.maps.Marker({
                   position: latLng
                 });
                 if (vm.missionNames.indexOf(vm.RMList[rm].missionDetails.name) < 0) {
                   vm.missionNames.push(vm.RMList[rm].missionDetails.name);
                   var mission = vm.RMList[rm].missionDetails;
                   delete mission.start;
                   delete mission.end;
                   vm.missionData.push(mission)
                 }
                 $scope.missionCount = vm.missionNames.length;
                 $scope.RMCount++
                 vm.markerArray.push(marker);
               }

               $scope.markerCluster = new MarkerClusterer(map, vm.markerArray, {
                 imagePath: 'libs/js-marker-clusterer/images/m',
                 gridSize: 45,
                 averageCenter: true
               });

              q.resolve();
              return q.promise;
            }

            initMapData().then(function() {
              vm.mapReady = true;
            }, function () {
              vm.mapReady = true;
            });
          })
      }, function(error) {
          $log.error(error)
      })
    };

    vm.showNewRMDialog = function() {

      $cookies.put("test", true);
      $scope.cookieValue = $cookies.get("test");

      if ($cookies.get("test")) {
        $cookies.remove("test");
        vm.cookiesEnabled = true;
      } else {
        vm.cookiesEnabled = false;
      }

      if ($cookies.get('missionSubmitted') || !vm.cookiesEnabled) {
        $mdDialog.show({
          controller: alertDialogController,
          templateUrl: 'alertDialog.html',
          locals:{cookiesEnabled: vm.cookiesEnabled},
          controllerAs: 'alert',
          clickOutsideToClose: true
        })
      } else {
        $mdDialog.show({
          controller: newRMDialogController,
          templateUrl: 'newRMDialog.html',
          locals:{missions: vm.missionData},
          controllerAs: 'newRM',
          clickOutsideToClose: true
        })
        .then(function(newRM) {
          $scope.mapCenter = newRM.missionDetails.location;

          NgMap.getMap().then(function(map) {
            var marker = new google.maps.Marker({
                position: newRM.missionDetails.location
            });
            $scope.markerCluster.addMarker(marker);
          })

          $scope.missionCount++
          $scope.RMCount++
        })
      }
    };

    function alertDialogController($mdDialog, cookiesEnabled) {
      var vm = this;
      vm.cookiesEnabled = cookiesEnabled;
      vm.close = function() {
        $mdDialog.cancel();
      }
    }

    function newRMDialogController($q, $mdDialog, missions, $cookies) {

      var vm = this;
      var timer;

      vm.missionData = missions
      vm.gmapsService = new google.maps.places.AutocompleteService();
      vm.geocoder = new google.maps.Geocoder();

      if (window.location.hostname.indexOf('localhost') == 0) {
        $log.warn("You're on localhost, adding to test db.")
        vm.RM = {
          from: 'Panama City, FL',
          gender: 'Male',
          creationDate: 'text',
          leftChurch: {
            date: '2015',
            reason: 'text'
          },
          missionDetails: {
            start: '2007',
            end: '2009',
            name: 'Tirana Albania Mission',
            location: {
              address: 'Tirana, Albania',
            }
          }
        }
      };

      vm.cancel = function() {
        $mdDialog.cancel();
      };

      vm.selectedLocation = function(location) {
        vm.RM.missionDetails.location = location;
      }

      vm.search = function(address) {
        var deferred = $q.defer();
        $timeout.cancel(timer);

        timer = $timeout(function () {
          getResults(address).then(
            function (predictions) {
              var results = [];
              for (var i = 0, prediction; prediction = predictions[i]; i++) {
                results.push(prediction.description);
              }
              deferred.resolve(results);
            }
          );
        }, 1000);
       return deferred.promise;
      }

      function getResults(address) {
        var deferred = $q.defer();
        vm.gmapsService.getQueryPredictions({input: address}, function (data) {
          deferred.resolve(data);
        });
        return deferred.promise;
      }

      vm.add = function(newRM) {
          vm.geocoder.geocode( { 'address': vm.RM.missionDetails.location.address}, function(results, status) {
            if (status == 'OK') {
              // $log.debug(results[0].geometry)
              vm.RM.creationDate = new Date().toString();
              vm.RM.missionDetails.location.lat = results[0].geometry.location.lat();
              vm.RM.missionDetails.location.lng = results[0].geometry.location.lng();

              $cookies.put('missionSubmitted', true, {'expires': "Fri Sep 09 2100 12:46:06 GMT-0600 (Mountain Daylight Time)"})
              firebase.database().ref(db + 'RMList').push(vm.RM);

              $mdToast.show(
                $mdToast.simple()
                  .textContent("Succcess! You've been added to the map.")
                  .position('bottom right')
                  .hideDelay(3000)
              );

              $mdDialog.hide(newRM);

            } else {
              $mdToast.show(
                $mdToast.simple()
                  .textContent('Geocode was not successful for the following reason: ' + status)
                  .position('bottom right')
                  .hideDelay(10000)
              );
            }
          });
      }
    }

  vm.appInit();

  }
})();
