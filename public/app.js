(function () {
  'use strict';

  angular.module('app', [
    'app.main',
    'app.Services',
    'ui.router'
  ]);

  angular.module('app.Services', []);
  angular.module('app.main', ['ngMaterial']);
})();
