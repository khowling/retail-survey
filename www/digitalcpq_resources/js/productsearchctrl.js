var searchCtrl =  function ($resource, $scope, $rootScope, $location, $timeout, SFDCData) {


    angular.element(document).ready(function () {
        jQuery(".ng-view").foundation();
    });

	$scope.isSmall = window.matchMedia(Foundation.media_queries.small).matches;

    $scope.toggleAccordion = function(val) {
        if ($scope.accordion[val] == true) {
            $scope.accordion[val] = false;
            $("#panelContent" + val).slideToggle("slow");

        } else {
            $scope.accordion[val] = true;
            $("#panelContent" + val).slideToggle("slow");
            for (var i in $scope.accordion) {
                if (i !== val) {
                    if ($scope.accordion[i] == true) {
                        $("#panelContent" + i).slideToggle("slow");
                        $scope.accordion[i] = false;
                    }
                }
            }
        }
    }

	//var urlfilters = JSON.stringify($location.search('filters'));
	//console.log ('url filters ' + urlfilters);
	
	
	
	var data = {};
	$scope.setfilters = {};
    $scope.filtersCount = function() {
        return  Object.keys($scope.setfilters).length;
    }
	//if (!urlfilters) $scope.setfilters = JSON.parse (urlfilters);
	
	//$scope.data = data;
	
	$scope.isFilterSelected = function(fieldname, fieldval) {
		//console.log ('isFilterSelected ' + fieldname + ' ' + fieldval);
		if ($scope.setfilters[fieldname]) {
			if ($scope.setfilters[fieldname].indexOf(fieldval) >= 0) {
				return true;
			}
		}
		return false;
	}
	 	
	$scope.toggleFilter = function(fieldname, fieldval) {
		if (!$scope.setfilters[fieldname]) {
			$scope.setfilters[fieldname] = [];
			$scope.setfilters[fieldname].push(fieldval);
		} else {
			if ($scope.setfilters[fieldname].indexOf(fieldval) >= 0) {
				$scope.setfilters[fieldname].pop(fieldval);
				if ($scope.setfilters[fieldname].length == 0) {
					// remove element??
				}
			} else {
				$scope.setfilters[fieldname].push(fieldval);
			}
		}
	//	$location.search({filters: JSON.stringify($scope.setfilters)});
		console.log ('addFilter ' + JSON.stringify($scope.setfilters));
	}

	$scope.rmFilter = function(idx) {
		console.log ('rmFilter ' + idx);  			
		$scope.setfilters.splice( $scope.setfilters[idx] ,1);
	}
	
	$scope.addRecord = function(rec1) {
		console.log ('addRecord ' + JSON.stringify(rec1)); 
		$rootScope.selected.push(rec1);
	}
	$scope.rmSelected = function(idx) {
		console.log ('rmSelected ' + idx);  			
		$rootScope.selected.splice( $scope.selected[idx] ,1);
	}

	/* Initialisation */
	$scope.Search = $resource('/products/:accId', {accId:'@id'},
		{'saveall':  {method:'POST', isArray:true},
		'query':  {method:'GET', isArray:false}});
	$scope.showerror = false; 

	
	/* new search */
	$scope.facetorder = ['Category__c', 'Brand__c', 'Status__c', 'Packaging__c'];
	$scope.search = function (stxt, facetonly) {
		
		
		
		// process filters 'search' & 'facets'
		var sstr = stxt && stxt.txt;
		
		var filters = [];
		if (sstr) {
			filters.push ({field: 'Name', like: sstr});
		}
		for (var filtfld in $scope.setfilters) {
			var filtvals = $scope.setfilters[filtfld];
			for (var filtvalidx in filtvals) {
				filters.push ({field: filtfld, contains: filtvals[filtvalidx]});
			}
		}
		console.log ('search() filters : ' + angular.toJson(filters));
        var fieldss = ['Id', 'Category__c', 'Brand__c', 'Status__c', 'Packaging__c'];
        if (!facetonly) {
            fieldss.push ('Name');
            fieldss.push ('ThumbImageB64__c');
        }

		// run search
    	SFDCData.query("Product__c", fieldss,  filters)
    	  .then(function (data) {
    		console.log ('controller : ' + angular.toJson(data));
    		
    		var local_facetresults = {};
    		
    		for (var ridx in data) {
    			var rec = data[ridx];
    			
    			if (rec.Available_Tariffs__c) {
    				rec.Available_Tariffs__c = rec.Available_Tariffs__c.split(',');
    			}
    			
    			for (var facfldidx in $scope.facetorder) {
    				var facfld = $scope.facetorder[facfldidx];
    				//console.log ('processing facet field: ' + facfld);

    				if (rec[facfld] != null) {
    					if (!local_facetresults[facfld]) {
    						local_facetresults[facfld] = {};
    					}
    					//console.log ('processing facet field, got value: ' + rec[facfld]);
    					if (rec[facfld] instanceof Array) {
    						console.log ('multi-facet field');
    						for (var vidx in rec[facfld]) {
    							var ffval = rec[facfld][vidx];
    							console.log ('adding facet val : ' + facfld + ' : ' +  ffval);
    							if (!local_facetresults[facfld][ffval])
    								local_facetresults[facfld][ffval]  = 1;
    							else
    								local_facetresults[facfld][ffval]  += 1;
    						}
    					} else {
    						console.log ('adding facet val : ' + facfld + ' : ' +  rec[facfld]);
    						if (!local_facetresults[facfld][rec[facfld]]) 
    							local_facetresults[facfld][rec[facfld]]  = 1 ;
    						else
    							local_facetresults[facfld][rec[facfld]]  += 1 ;
    					}
    				}
    			}
    		}
    		
    		$scope.data = { facetresults: local_facetresults};
            if (!facetonly) {
                $scope.data.res = data;
            }
    	})
    }
	

	
	
	/* data/action bindings */
    
	$scope.searchols = function (s) {
		if (s == null) s = {};
		if (s.txt == null || s.txt == '') s.txt = "*";
		if (s.rows == null) s.rows = 50;
		//if (f != null) s.filters = JSON.stringify(f);
		s.filters = JSON.stringify($scope.setfilters);
        s.facets = $scope.facetorder;
		console.log ('searching for  ' + JSON.stringify(s));
		
		//$location.search('s', JSON.stringify(s));
		
		var res = $scope.Search.query(s, 
			/*Success */
			function (value, responseHeaders){
				console.log(JSON.stringify(value));
				data.res = value.response.docs;

				// Facet
				console.log('found docs ' + value.response.numFound + ' documents');
				data.totalrecords = value.response.numFound;
				data.facetresults = {};
                data.facetcounts = {};
				if (value.facet_counts != null) {
					var ffs = value.facet_counts.facet_fields;
					for (var fldidx in s.facets) {
                        var fld = s.facets[fldidx];
                        if (ffs[fld]) {
                            data.facetresults[fld] = {};
                            data.facetcounts[fld] = 0;
                            for (var x = 0; x < ffs[fld].length; x += 2) {
                                if (ffs[fld][x + 1] > 0) {
                                    data.facetcounts[fld] += 1;
                                }
                                    data.facetresults[fld][ffs[fld][x]] = ffs[fld][x + 1];

                            }
                        }
				    }
				    console.log('facets arranged ' + JSON.stringify(data.facetresults));
				}


			}, 
			/* Error */
			function (httpResponse) {
			 	$scope.errorStr = 'Error ' + JSON.stringify( httpResponse);
			 	$scope.showerror = true;
			 	alert ($scope.errorStr);
			 } );
	}


	/* data/action bindings */
	$scope.add = function (s) {
		$scope.Search.saveall(s, 
						function (value, responseHeaders){
					console.log ('Add success : ' + JSON.stringify( value)) ;

				}, 
							  function (httpResponse) {
				 	$scope.errorStr = 'Error ' + JSON.stringify( httpResponse);
				 	$scope.showerror = true;
				 	alert ($scope.errorStr);
			 	} );

	}

	var initials = {txt: '', rows: 0};

	console.log('initials ' + JSON.stringify(initials));
	$timeout(function () {
		$scope.search (initials, true);
	});
}
