'use strict';

angular.module('myApp', ['ngResource', 'ngRoute', 'ngAnimate', 'ngCookies', 'sfdata'])
    .config(['$routeProvider', function($routeProvider){
    $routeProvider.
            when('/', {
                templateUrl: static_resource_url+ '/partials/home.html',
         //       resolve: ensureSFDCDataServiceInitialised,
                controller: function ($scope, SFDCData) {

                }
            }).
            when('/search', {
                templateUrl: static_resource_url+ '/partials/productsearch.html',
                controller: 'searchCtrl'
            }).
            when('/configure/:id', {
                templateUrl: static_resource_url+ '/partials/configure.html',
                controller: 'configureCtrl'
            }).
            when('/stats', {
                templateUrl: static_resource_url+ '/partials/stats.html'
            }).
            when('/basket', {
                templateUrl: static_resource_url+ '/partials/basket.html'
            }).
            when('/guided', {
                templateUrl: static_resource_url+ '/partials/guided.html',
                controller: 'searchCtrl'
            }).
            when('/customer', {
                templateUrl: static_resource_url+ '/partials/customer.html',
                controller: 'custCntl'
            }).
            when('/visit', {
                templateUrl: static_resource_url+ '/partials/visit.html',
                controller: 'visitCntl'
            }).
            when('/toolkit', {
                templateUrl: static_resource_url+ '/partials/toolkit.html'
            }).
            otherwise({
                redirectTo: '/'
            });
}]).filter('split', function() {
    return function(input, delimiter) {
        var delimiter = delimiter || ',';

        return input.split(delimiter);
    }
}).filter('sfnametolabel', function() {
    return function(input) {
        try {
            return input.replace ('__c', '').replace(/_/g, ' ');
        } catch (e) {
            return 'NO VALUE*';
        }
    }
}).run(['SFDCData', '$rootScope', '$location', '$http', '$cookies', '$cookieStore', '$route', function(SFDCData, $rootScope, $location, $http, $cookies, $cookieStore, $route) {

    $rootScope.static_resource_url = static_resource_url;

    // setup sync metrics
    SFDCData.initSyncinfo ();

    // setup basket
    $rootScope.resetVisit = function () {
        console.log ('resetBasket');
        $rootScope.selectedVisit = {items: 0, reports: []};
        return true;
    }
    $rootScope.setVisitOutlet = function (cust) {
        $rootScope.selectedVisit.outlet = { Id: cust.Id, _soupEntryId: cust._soupEntryId, Name: cust.Name};
    }
    $rootScope.addVisitReport = function (product, status, productConfig) {
        //$rootScope.selectedVisit.total += productConfigPrice;
        $rootScope.selectedVisit.items ++;
        $rootScope.selectedVisit.reports.push({product__r:  {Id: product.Id, Name: product.Name}, config: productConfig, Status__c: status});
    }
    $rootScope.setVisit = function (v) {
        $rootScope.selectedVisit = v.VisitMetaData__c;
        $rootScope.selectedVisit.Name = v.Name;
        $rootScope.selectedVisit.Id = v.Id;

    }
    $rootScope.resetVisit();

    $rootScope.insertSFDC = function() {
        console.log ('insertSFDC ');
          $rootScope.saveErrorStr = null;
        SFDCData.insert("Visit__c", {"Outlet__c": $rootScope.selectedVisit.outlet ,"VisitMetaData__c": angular.toJson($rootScope.selectedVisit)})
            .then(function (res) {
                console.log ('got ' + angular.toJson(res));
                if (res.id) {
                    jQuery('#orderconf_modal').foundation('reveal', 'open');
                    $rootScope.resetVisit();
                } else if (res._soupEntryId) {
                    jQuery('#orderconf_modal').foundation('reveal', 'open');
                    $rootScope.resetVisit();
                } else  { // array
                    $rootScope.saveErrorStr = 'Didnt Save';
                    if (res.message) {
                        $rootScope.saveErrorStr  += ': ' + res.message;
                    }
                }
         });
    }


    $rootScope.$on("$routeChangeSuccess", function(currentRoute, previousRoute){
            $rootScope.sidecart = true;
            var currTemplate = $route.current.loadedTemplateUrl;
            console.log ('check route : ' + currTemplate);
            if (currTemplate && currTemplate.indexOf("partials/basket.html")  > -1) {
                console.log ('check route, its a full basket url, dont show the side basket');
                $rootScope.sidecart = false;
            }
    });

    console.log ('running in website, so DONT wait for cordova ready? param : ' + document.URL.split('web=')[1] );
    if (document.URL.split('web=')[1] == "1") {
        SFDCData.resolveCordova(null);
    }


}]);


var homeCtrl = function ($rootScope, $scope, SFDCData) {
    var cordova_change = false,
            user_change = false;

    $scope.inVisualforce = inVisualforce;

    $scope.$watch('homeonline', function(val) {
        console.log ('homeCtrl homeonline change, cordova_change? ' + cordova_change);
        if (cordova_change) cordova_change = false;
        else {
            user_change = true;
            console.log ('homeCtrl online change BY THE USER to: ' + val);
            SFDCData.setOnline(val);
            $scope.mode = val && 'online' || 'offline';
        }
    });


    //$rootScope.online = SFDCData.getOnline();
    $rootScope.$watch('online', function(val) {

        console.log ('homeCtrl online change, user_change? ' + user_change);
        if (user_change) user_change = false;
        else {
            cordova_change = true;
            console.log ('homeCtrl online change BY CORDOVA to: ' + val);
            $scope.homeonline = $rootScope.online;
            $scope.mode = val && 'online' || 'offline';
        }
    });
}
