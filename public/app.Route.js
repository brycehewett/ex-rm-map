(function() {
  'use strict';

  angular.module('app').config(RouteConfig);

  RouteConfig.$inject = ['$locationProvider','$stateProvider', '$urlRouterProvider'];

  function RouteConfig($locationProvider, $stateProvider, $urlRouterProvider) {

    $locationProvider.html5Mode(true).hashPrefix('!')

    $stateProvider
      .state('main', {
        url: '/',
        templateUrl: 'map.html'
      })

    $urlRouterProvider.otherwise('/');
  }
}());
