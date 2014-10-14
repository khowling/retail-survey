/**
 * Created by khowling on 02/10/2014.
 */
'use strict';
var visitCntl = function ($scope, $rootScope, $location, $http, $routeParams, SFDCData) {
    SFDCData.query("Visit__c", "*")
        .then(function (vdata) {
            //console.log ('custCntl getLocal : ' + angular.toJson(odata));
            for (var bidx in vdata) {
                //console.log ('got basket data : ' + odata[bidx].OrderMetaData__c);
                vdata[bidx].VisitMetaData__c = angular.fromJson(vdata[bidx].VisitMetaData__c);
            }
            $scope.visits =  vdata;
        });

    $scope.selectVisit = function(visit) {
        $rootScope.setVisit (visit);
    }

}
