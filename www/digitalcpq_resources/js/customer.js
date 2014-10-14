'use strict';
var custCntl = function ($scope, $rootScope, $location, $http, $routeParams, SFDCData) {

	$scope.baskets = [];
	$scope.results =  [];
	$scope.offercreate = false;
	$scope.shownewform = false;
	
	$rootScope.$watch('online', function(val) {
		console.log ('custCntl online change ' + val);
    	$scope.custonline = $rootScope.online;
    });
	
	$scope.search = function (stxt) {
    	SFDCData.query("Account", "*",  stxt && [{field: 'Name', like: stxt}] || null)
    		.then(function (data) {
	    		console.log ('controller : ' + angular.toJson(data));
	    		$scope.results =  data;
	    	})
    	if (stxt && stxt.length > 2) {
    		$scope.offercreate = true;
    	}
    }
	
	var getLocal = function() {
		SFDCData.queryLocal("Account", "*",  [{field: 'Id', equals: 'LOCAL'}])
		.then (function (cdata) {
			console.log ('custCntl getLocal Account: ' + angular.toJson(cdata));
			// get any sync error
			$scope.results =  cdata;
			SFDCData.queryLocal("Visit__c", "*",  [{field: 'Id', equals: 'LOCAL'}])
			.then (function (odata) {
				console.log ('custCntl getLocal Visit__c: ' + angular.toJson(odata));
				for (var bidx in odata) {
					console.log ('got Visit data : ' + odata[bidx].VisitMetaData__c);
					odata[bidx].VisitMetaData__c = angular.fromJson(odata[bidx].VisitMetaData__c);
				}
				$scope.baskets =  odata;
			});
		});
	}
	
	if ($routeParams.sync) {
		$scope.sync = true;
		getLocal();
	}
	
	
	$scope.edit = function (o1) {
		$scope.NewCustomer = o1;
		$scope.shownewform = true;
	}
	

    $scope.selectCustomer = function(cust) {
    	if ($scope.sync == true) {
    		// one less to sync
    		$scope.shownewform = false;
    		SFDCData.rmSyncError("Account", cust._soupEntryId);

    	} else {
    		$rootScope.setVisitOutlet (cust);
    		var fromURL = $routeParams.fromURL;
    		if (!fromURL) {
    			$location.path( "/");
    		} else {
    			$location.path(fromURL);
    		}
    	}
    }
    
    $scope.reinitialiseSoup = function (){
    	if (confirm("Are you sure!")) {
    		$scope.reinit_wait = true;
	    	SFDCData.reinitialiseSoup().then(function (val) {
	    		$scope.reinit_wait = false;
	    		alert (val);
	    	});
    	}
    }
    $scope.syncout = function() {
    	$scope.waiting = true;
    	
    	SFDCData.initSyncinfo();
    	$scope.syncstatus = "saving Contacts";
    	SFDCData.syncup ("Account").then(function () {
    		$scope.syncstatus = "saving Visits";
    		SFDCData.syncup ("Visit__c").then(function () {
    			$scope.syncstatus = "refresh Outlets";
    			SFDCData.query ("Account",  "*", null).then(function () {
    				$scope.syncstatus = "refresh Products";
	    			SFDCData.query ("Product__c", "*", null).then(function () {
                        $scope.syncstatus = "refresh Visits";
                        SFDCData.query ("Visit__c", "*", null).then(function () {
                            $scope.syncstatus = "upto date";
                            $scope.waiting = false;
                            getLocal();
                        });
	    			});
    			});
    		});
    	});
    }

    $scope.submit = function () {
        $scope.errorStr = null;
        SFDCData.insert("Contact", $scope.NewCustomer, $scope.sync == true).then(function (res) {
        	console.log ('got ' + angular.toJson(res));
        	if (res.id) {
        		$scope.NewCustomer.Id = res.id;
        		$scope.selectCustomer ($scope.NewCustomer);
        	} else if (res._soupEntryId) {
        		$scope.NewCustomer._soupEntryId = res._soupEntryId;
        		$scope.selectCustomer ($scope.NewCustomer);
        	} else  { // array
        		$scope.errorStr = 'Didnt Save';
        		if (res.message) {
        			$scope.errorStr  += ': ' + res.message;
        		}
        	}
        });
                   
    }
}
