'use strict';
var configureCtrl =  function (SFDCData, $sce, $http, $routeParams,  $resource, $scope, $rootScope, $location) {

    angular.element(document).ready(function () {
        jQuery(".ng-view").foundation();
    });
    //var url = ($rootScope.sf) && ($rootScope.sf.client.targetOrigin + $rootScope.sf.context.links.restUrl) || '/proxy';
    //console.log ('hitting : ' +url);
    //$http.get('/proxy' + '/query/?q=' + "select id, name, RecordType.Name, ThumbImage69Id__c,  Description__c from product__c where id = '" + $routeParams.id + "'")

    $scope.enableaddtocart = false;
    $scope.productConfig = { };
    
	SFDCData.query("Product__c", "*",  [{field: "Id", equals: $routeParams.id}])
    	.then(function (data) {

            $scope.product = data[0];
            //console.log ('config meta : ' + $scope.product.ConfigMetaData__c);
            $scope.productConfigPrice = $scope.product.Base_Price__c || 0;
            $scope.productConfigMetaData = angular.fromJson($scope.product.ConfigMetaData__c);

            if ($routeParams.idx) {
                console.log ('setting existing config from basket: ' + $routeParams.idx);
                $scope.productConfig = $rootScope.selectedVisit.reports[$routeParams.idx].config;
            }
            // can we light up add to cart?
            var notfinished = false;
            for (var c in $scope.productConfigMetaData) {
                var copt = $scope.productConfigMetaData[c];
                if (copt.required && !$scope.productConfig[copt.name]) {
                    notfinished = true;
                }
            }
            if (!notfinished) $scope.enableaddtocart = true;
            
            
            $scope.getRichDescroption =  function() {
                return $sce.trustAsHtml($scope.product.Description__c);
            };
            /*
            $http.get('/proxy/chatter/files/' + $scope.product.ThumbImage69Id__c)
                .success(function (cdata) {
                        $scope.productConfigPrice = 0;
                        $scope.product.imgsrc = 'https://eu2.salesforce.com' + cdata.downloadUrl;

            });
            */

        });

    $scope.toggleAccordion = function(val) {
        //console.log ('toggleAccordion: ' + val);
        if ($scope.accordion[val] == true) {
            $scope.accordion[val] = false;
            //console.log ('toggleAccordion: closing #panelContent' + val);
            $("#panelContent" + val).slideToggle("slow");

        } else {
            $scope.accordion[val] = true;
            //console.log ('toggleAccordion: opening #panelContent' + val);
            $("#panelContent" + val).slideToggle("slow");
            for (var i in $scope.accordion) {
                //console.log ('toggleAccordion: checking  i:' + i + ' : val: ' + val);
                if (i != val) {
                    if ($scope.accordion[i] == true) {
                        //console.log ('toggleAccordion: closing #panelContent' + val);
                        $("#panelContent" + i).slideToggle("slow");
                        $scope.accordion[i] = false;
                    }
                }
            }
        }
    }
    
    
    $scope.addselection = function (idx, category, val) {
        console.log ('addselection: idx : ' + idx);
        $scope.productConfig[category] = val;

        // close category
        $scope.toggleAccordion(idx);

        // open next category?
        $scope.toggleAccordion(idx+1);

        // can we enable finished?
        var notfinished = false;
        $scope.productConfigPrice = $scope.product.Base_Price__c || 0;
        for (var c in $scope.productConfigMetaData) {
            var copt = $scope.productConfigMetaData[c];
            if (copt.required && !$scope.productConfig[copt.name]) {
                notfinished = true;
            } else {
                for (var vopt in copt.values) {
                    if (copt.values[vopt].name === $scope.productConfig[copt.name]) {
                        $scope.productConfigPrice += copt.values[vopt].price;
                    }
                }
            }
        }
        if (!notfinished) $scope.enableaddtocart = true;

    }

    $scope.isFilterSelected = function (category,val) {
        console.log ('isfilterSelected: ' + category + ' : ' + val);
        if ($scope.productConfig[category] === val)
            return true;
        return false;
    }
    $scope.addtobasket = function() {

        if ($routeParams.idx) {
            console.log ('updating existing config from basket: ' + $routeParams.idx);
            $rootScope.selectedVisit.reports[$routeParams.idx].config = $scope.productConfig;
        } else {
            $rootScope.addVisitReport($scope.product, 'New', $scope.productConfig);
        }
        jQuery('#itemadded_modal').foundation('reveal', 'open');

    }

    $scope.openhelp = function(chioce_val, val) {
        $scope.helptxt = chioce_val.name + ': ' + val.name;
        jQuery('#help_modal').foundation('reveal', 'open');
        return true;
    }

}
