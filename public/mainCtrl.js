(function() {
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

    vm.mapAPI = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyBOuqyDzI-BqSgSjv1cB3K0P5urSjqNj8Y&libraries=places';

    vm.RMList = {};
    vm.missionNames = [];
    vm.newRM;
    var map;
    vm.mapCenter = {
      lat: 41,
      lng: -87
    };

    var geocoder;
    vm.markerArray = [];

    if (window.location.hostname.indexOf('localhost') < 0) {
      var db = 'main/'
    } else {
      $log.debug('localhost')
      var db = 'test/'
    }

    vm.toggleNav = function() {
      $mdSidenav('left').toggle();
    }


    vm.appInit = function(){
      firebase.database().ref(db + 'RMList').once('value').then(function(snapshot) {
        vm.RMList = snapshot.val();
          NgMap.getMap().then(function(map) {
            for (var rm in vm.RMList) {
              var latLng = new google.maps.LatLng(vm.RMList[rm].missionDetails.location.lat, vm.RMList[rm].missionDetails.location.lng);
              var marker = new google.maps.Marker({
                position: latLng
              });
              if (vm.missionNames.indexOf(vm.RMList[rm].missionDetails.name) < 0) {
                vm.missionNames.push(vm.RMList[rm].missionDetails.name)
              }
              vm.markerArray.push(marker);
              $log.debug(marker)
            }
            vm.markerCluster = new MarkerClusterer(map, vm.markerArray, {
              imagePath: 'libs/js-marker-clusterer/images/m'});
          })
      }, function(error) {
          $log.error(error)
      })
    };

    vm.showNewRMDialog = function() {
      $mdDialog.show({
        controller: newRMDialogController,
        templateUrl: 'newRMDialog.html',
        locals:{missions: vm.missionNames},
        controllerAs: 'newRM',
        clickOutsideToClose: true
      })
      .then(function(newRM) {
        vm.mapCenter.lat = newRM.missionDetails.location.lat;
        vm.mapCenter.lng = newRM.missionDetails.location.lng;
        console.log(vm.mapCenter.lat)
        console.log(vm.mapCenter.lng)

        NgMap.getMap().then(function(map) {
          var marker = new google.maps.Marker({
              position: newRM.missionDetails.location
          });
          vm.markerCluster.addMarker(marker);

        })


        // map.setCenter(newRM.missionDetails.location);


      }, function() {
      });
    };

    function newRMDialogController($q, $mdDialog, missions) {


      vm = this;

      vm.missionNames = missions
      vm.gmapsService = new google.maps.places.AutocompleteService();
      vm.geocoder = new google.maps.Geocoder();

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

      vm.cancel = function() {
        $mdDialog.cancel();
      };

      vm.search = function(address) {
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

      vm.debug = function(error) {
        console.log(error);
      }

      vm.add = function(newRM) {
        vm.geocoder.geocode( { 'address': vm.RM.missionDetails.location.address}, function(results, status) {
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
