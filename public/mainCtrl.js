(function() {
  'use strict';

  angular
    .module('app.main')
    .controller('mainController', mainController);

  mainController.$inject = ['$q', '$scope', '$log', '$mdToast', '$mdDialog', '$mdSidenav'];

  function mainController($q, $scope, $log, $mdToast, $mdDialog, $mdSidenav) {

    var vm = this;


    var firebaseConfig = {
      apiKey: "AIzaSyCa7VZ-kAvTLOOO1J-mMAI84k4NmyYuFbo",
      authDomain: "ex-rm-map.firebaseapp.com",
      databaseURL: "https://ex-rm-map.firebaseio.com",
      storageBucket: "",
    };

    firebase.initializeApp(firebaseConfig);

    var vm = this;

    var geocoder;
    var map;
    var markerArray = [];
    var markerCluster;

    vm.RMList = {};
    vm.missions = [];
    vm.missionNames = [];
    vm.newRM;

    // $log.debug(newRM);

    vm.initMap = function() {
      var myLatLng = {lat: 33.328748, lng: -40.497745};

      map = new google.maps.Map(document.getElementById('map'), {
        zoom: 3,
        center: myLatLng
      });

      markerCluster = new MarkerClusterer(map, markerArray, {imagePath: 'libs/js-marker-clusterer/images/m'});
    }

    vm.appInit = function(){
      firebase.database().ref('RMList/').once('value').then(function(snapshot) {
        vm.RMList = snapshot.val();
        console.log("RM List")
        console.log(vm.RMList);
        for (var rm in vm.RMList) {
          var latLng = new google.maps.LatLng(vm.RMList[rm].missionDetails.location.lat, vm.RMList[rm].missionDetails.location.lng);
          var marker = new google.maps.Marker({
            position: latLng
          });


          var index = vm.missions.findIndex(x => x.name == vm.RMList[rm].missionDetails.name);

          if (index === -1){
            console.log(index)
            var mission = vm.RMList[rm].missionDetails;
            delete mission.start;
            delete mission.end;
            vm.missions.push(mission);
            vm.missionNames.push(mission.name)
          }
          markerArray.push(marker);
        }
        console.log(vm.missions)
        console.log(vm.missionNames)
        vm.initMap();
      }, function(error) {
          $log.error(error)
      })

      // firebase.database().ref('missions/').once('value').then(function(snapshot) {
      //   missions = snapshot.val();
      //   console.log('missions')
      //   console.log(missions)
      // }, function(error) {
      //     $log.error(error)
      // })
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
      console.log(newRM)
      map.setCenter(newRM.missionDetails.location);
      var marker = new google.maps.Marker({
          map: map,
          position: newRM.missionDetails.location
      });

      markerCluster.addMarker(marker);
    }, function() {
      $log.warn('Dialog Cancelled')
    });
  };


  function newRMDialogController($q, $mdDialog, missions) {

    vm = this;

    vm.missionNames = missions
    vm.gmapsService = new google.maps.places.AutocompleteService();
    vm.geocoder = new google.maps.Geocoder();

    console.log(vm.missionNames)

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
          $log.debug(results[0].geometry)
          vm.RM.creationDate = new Date().toString();
          vm.RM.missionDetails.location.lat = results[0].geometry.location.lat();
          vm.RM.missionDetails.location.lng = results[0].geometry.location.lng();

          firebase.database().ref('RMList/').push(vm.RM);

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