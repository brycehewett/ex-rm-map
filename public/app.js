(function () {
  'use strict';

  angular.module('app', [
    'app.main',
    'ui.router'
  ]);

  angular.module('app.Services', []);
  angular.module('app.main', ['ngMaterial', 'ngMask', 'ngMap']);
})();
