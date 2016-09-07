(function () {
  'use strict';

  angular
    .module('app.main')
    .controller('mainController', mainController);

  mainController.$inject = ['$q', '$scope', '$log', '$mdToast', '$mdDialog', '$mdSidenav', 'NgMap'];

  function mainController($q, $scope, $log, $mdToast, $mdDialog, $mdSidenav, NgMap) {

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

    vm.selectMission = function(lat, lng) {
      var selected = [];
      for (var rm in vm.RMList) {
        if (lat == vm.RMList[rm].missionDetails.location.lat &&
            lng == vm.RMList[rm].missionDetails.location.lng) {
              selected.push(vm.RMList[rm])
        }
      }
      vm.selectedMission = selected;
      $scope.$apply();
      console.log(vm.selectedMission)
    }

    vm.initMapData = function(map) {
      var q = $q.defer();
      vm.mapReady = false;
      for (var rm in vm.RMList) {
        var latLng = new google.maps.LatLng(vm.RMList[rm].missionDetails.location.lat, vm.RMList[rm].missionDetails.location.lng);
        var marker = new google.maps.Marker({
          position: latLng
        });

        marker.addListener('click', function (marker) {
          vm.selectMission(marker.latLng.lat(), marker.latLng.lng());
          map.setCenter(marker.latLng)
        });


        if (vm.missionNames.indexOf(vm.RMList[rm].missionDetails.name) < 0) {
          vm.missionNames.push(vm.RMList[rm].missionDetails.name);
          var mission = vm.RMList[rm].missionDetails;
          // delete mission.start;
          // delete mission.end;
          vm.missionData.push(mission)
          //  $log.debug(mission)
        }
        $scope.missionCount = vm.missionNames.length;
        $scope.RMCount++
        //  $log.debug(marker)
        vm.markerArray.push(marker);
      }

      vm.markerCluster = new MarkerClusterer(map, vm.markerArray, {
        imagePath: 'libs/js-marker-clusterer/images/m',
        gridSize: 45,
        averageCenter: true
      });

      google.maps.event.addListener(vm.markerCluster, 'clusterclick', function (cluster) {
        if (map.getZoom() == map.maxZoom) {
          vm.selectMission(cluster.a[0].position.lat(), cluster.a[0].position.lng());
        }
      });
      q.resolve();
      return q.promise;
    }

    vm.appInit = function () {
      vm.mapReady = false;
      firebase.database().ref(db + 'RMList').once('value').then(function (snapshot) {
        vm.RMList = snapshot.val();
        NgMap.getMap().then(function (map) {

          vm.geocoder = new google.maps.Geocoder();

          vm.initMapData(map).then(function () {
            vm.mapReady = true;
          }, function () {
            vm.mapReady = true;
          });
        })
      }, function (error) {
        $log.error(error)
      })
    };

    console.log(vm.selectedMission)


    vm.showNewRMDialog = function () {
      $mdDialog.show({
        controller: newRMDialogController,
        templateUrl: 'newRMDialog.html',
        locals: {missions: vm.missionNames},
        controllerAs: 'newRM',
        clickOutsideToClose: true
      })
        .then(function (newRM) {
          $scope.mapCenter = newRM.missionDetails.location;

          NgMap.getMap().then(function (map) {
            var marker = new google.maps.Marker({
              position: newRM.missionDetails.location
            });
            $scope.markerCluster.addMarker(marker);
          })

          $scope.missionCount++
          $scope.RMCount++
        })
    };

    vm.debug = function () {
      console.log(vm.selectedMission);
    }


    function newRMDialogController($q, $mdDialog, missions) {

      vm = this;

      vm.missionNames = missions
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
        };
      }
      ;

      vm.cancel = function () {
        $mdDialog.cancel();
      };

      vm.search = function (address) {
        var deferred = $q.defer();
        getResults(address).then(
          function (predictions) {
            var results = [];
            for (var i = 0, prediction; prediction = predictions[i]; i++) {
              results.push(prediction.description);
            }
            deferred.resolve(results);
          }
        );
        return deferred.promise;
      }

      function getResults(address) {
        var deferred = $q.defer();
        vm.gmapsService.getQueryPredictions({input: address}, function (data) {
          deferred.resolve(data);
        });
        return deferred.promise;
      }

      vm.add = function (newRM) {
        vm.geocoder.geocode({'address': vm.RM.missionDetails.location.address}, function (results, status) {
          if (status == 'OK') {
            // $log.debug(results[0].geometry)
            vm.RM.creationDate = new Date().toString();
            vm.RM.missionDetails.location.lat = results[0].geometry.location.lat();
            vm.RM.missionDetails.location.lng = results[0].geometry.location.lng();

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
