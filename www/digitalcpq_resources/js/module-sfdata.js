// used to inject a constant value 	
angular.module('sfdata.constants', []).constant ('soups', {
    "Account": {
    	primaryField: 'Name',
    	allFields: ["Id", "Name", "Type", "Industry", "ShippingStreet", "ShippingCity", "ShippingPostalCode", "ShippingLatitude", "ShippingLongitude", "ThumbImageB64__c"],
    	indexSpec:[{"path":"Id","type":"string"},{"path":"Name","type":"string"},{"path":"ShippingCity","type":"string"}]},
	"Product__c": {
		primaryField: 'Name',
    	indexSpec:[{"path":"Id","type":"string"},{"path":"Name","type":"string"}, {"path":"Category__c","type":"string"}, {"path":"Brand__c","type":"string"}, {"path":"Status__c","type":"string"}, {"path":"Packaging__c","type":"string"}, {"path":"ThumbImageB64__c","type":"string"} ],
    	allFields: ["Id", "Name", "Description__c", "Category__c", "Brand__c", "Status__c", "Packaging__c", "ConfigMetaData__c", "ThumbImageB64__c", "Base_Price__c"]},
    	           
    "Visit__c": {
    	primaryField: 'Name',
    	indexSpec:[{"path":"Id","type":"string"},{"path":"Name","type":"string"}],
    	allFields: ["Id", "Name", "Outlet__c",  "VisitMetaData__c", "Status__c"],
    	childLookupFields: { "Outlet__c": "Account"}
    	}
});

// Services are registered to modules via the Module API. Typically you use the Module#factory API to register a service
angular.module('sfdata.service', ['sfdata.constants'])
	.factory( 'SFDCMockStore', ['soups',  function(soups) {
	   	  
		var _store = {};
		// register soups
		for (var sname in soups) {
			_store[sname] = []; 
		}
		
		var _find = function(obj, key, val) {
			var sobjs = _store[obj];
			if (val) {
				//console.log ('_find, for each existing record ' + sobjs.length);
				for (var i in sobjs) {
					var r = sobjs[i];
					//console.log ('_find, testing ' + r[key] + ' == ' + val);
					if (r[key] == val) {
						return i;
					}
				}
			}
			return -1;
		}
		var _upsert = function (obj, records, keyfld, success, error) {
			console.log ('SFDCMockStore _upsert '+obj+' on : ' + keyfld);
			  var sobjs = _store[obj];
			  for (var r in records) {
				  var rec = records[r];
				  var exist = _find(obj, keyfld, rec[keyfld]);
				  if (exist == -1) {
					  console.log ('SFDCMockStore _upsert, inserting key record: ' + rec[keyfld]);
					  rec._soupEntryId = sobjs.length +1;
					  sobjs.push (rec);
				  } else {
					  console.log ('SFDCMockStore _upsert, updating existing key : ' + rec[keyfld]);
					  // sobjs[exist] = rec
					  // real store merges the data!
					  for (var elidx in rec) {
						  sobjs[exist][elidx] = rec[elidx];
					  }
					  
				  }
			  }
			  success (records);
		  }
		

    	return {
    		  registerSoup: function (sname, idxes, success, error) { 
    			  console.log ('SFDCMockStore registerSoup : ' + sname);
    			  _store[sname] = []; 
    			  success(); 
    		  },
    		  removeSoup: function (sname, success, error) { 
    			  console.log ('SFDCMockStore removeSoup : ' + sname);
    			  _store[sname] = []; 
    			  success(); 
    		  },
    		  upsertSoupEntries : function (obj, records, success, error) {
    			  _upsert (obj, records, "_soupEntryId", success, error);
    		  },
    		  upsertSoupEntriesWithExternalId: _upsert,
    		  buildAllQuerySpec: function(field, order, limi) {
    			  return {};
    		  },
    		  buildExactQuerySpec: function(field, equals, order, limit) {
    			  return {"field": field, "equals": equals};
    		  },
    		  buildLikeQuerySpec: function (field, like, order, limit) {
    			  return {"field": field, "like": like.substring(0, like.length -1)};
    		  },
    		  buildSmartQuerySpec: function (smartqsl, limit) {
    			  return {"smartsql": smartqsl};
    		  },
    		  runSmartQuery: function(qspec, success,error) {
    			  // TODO
    		  },
    		  querySoup: function (obj, qspec, success,error) {
    			  console.log ('SFDCMockStore querySoup : ' + obj +' : ' + angular.toJson (qspec));
    			  var sobjs = _store[obj];
    			  if (!qspec.field) {
    				  success ( {currentPageOrderedEntries:angular.copy (sobjs)});
    			  } else if (qspec.field) {
  
    				  var res = [];
    				  for (var r in sobjs) {
    					  var rec = sobjs[r];
    					  var cval = rec[qspec.field];
    					  if (cval) {
    						  if (qspec.like && cval.indexOf(qspec.like) > -1) {
    							  res.push (rec);
    						  } else if (qspec.equals && qspec.equals == cval) {
    							  res.push (rec);
    						  }
    					  }
    				  }
    				  success( {currentPageOrderedEntries: angular.copy (res)});
    			  } else {
    				  success ({currentPageOrderedEntries:[]});
    			  }
    		  }}
	}])
    // component should explicitly define its dependencies dependency injection (DI)
    .factory( 'SFDCData', ['SFDCMockStore', 'soups', '$document', '$http', '$rootScope', '$q', function(SFDCMockStore, soups, $document,  $http, $rootScope, $q) {
        console.log('SFDCData service initialisation');
        
        // orgId, accessToken, userAgent, userId, identityUrl, communityUrl, refreshToken, clientId, instanceUrl, communityId
        var _creds;
        var _sfdcoauth;
        var _smartstore = SFDCMockStore;
        var _bootstrap;
        var _online;
        
        var _setOnline = function(val, applyit) { 
    		_online = val; 
        	$rootScope.online = _online;
        	if (applyit) {
        		$rootScope.$apply();
        	}
        }
        _setOnline (true, false);
        
        // HACK HERE 
        var _xref = {};
        
        // ----------------------- registerSoups function
        var registerSoups = function(smartstore) {
            console.log ('registerSoups ' + angular.toJson(soups));
            var registerPromises = [];
            for (var sname in soups) {
                var idxes = soups[sname].indexSpec;

                var deferred = $q.defer();
                var success = function (val) {
                	console.log ('success registerSoup ' + angular.toJson(val));
                	deferred.resolve(val); 
                }
                var error = function (val) { 
                	console.log ('error registerSoup ' + angular.toJson(val));
                	deferred.reject(val); 
                }

                console.log ('calling registerSoup for ' + sname + ', idx : ' + angular.toJson(idxes));
                smartstore.registerSoup(sname, idxes, success, error);
                registerPromises.push(deferred);
            }

            return $q.all(registerPromises).then(function () {
            	console.log ('I am Finished registerSoup!');
            });
        };
        
        var reinitialiseSoup = function() {
        	console.log ('reinitialiseSoup ');
        	var deferredFinished = $q.defer();
        	var registerPromises = [];
            for (var sname in soups) {
                

                var deferred = $q.defer();
                var success = function (val) {
                	console.log ('success registerSoup ' + angular.toJson(val));
                	deferred.resolve(val); 
                }
                var error = function (val) { 
                	console.log ('error registerSoup ' + angular.toJson(val));
                	deferred.reject(val); 
                }

                console.log ('calling removeSoup for ' + sname);
                _smartstore.removeSoup(sname, success, error);
                registerPromises.push(deferred);
            }

             $q.all(registerPromises).then(function () {
            	 _initSyncinfo();
            	registerSoups (_smartstore).then (function () {
            		deferredFinished.resolve('I am Finished reinitialiseSoup');
            	})
            });
            
             return deferredFinished.promise;
        }
        
        // ----------------------- setupOauthCreds from cordova plugin
        var setupOauthCreds = function(sfdcoauth) {
        	var deferredOauth = $q.defer();
            var success = function (val) {
            	console.log ('authenticate got creds ' + angular.toJson(val));
            	_creds = val;
            	deferredOauth.resolve(val);  
            }
            var error = function (val) { 
            	console.log  ('authenticate error ' + angular.toJson(val));
            	deferredOauth.reject(val);  
            }
            console.log  ('calling authenticate(success, error) ');
        	sfdcoauth.authenticate (success, error);
        	
        	return deferredOauth.promise;
        }

        var cordovaDeffer = $q.defer(),
            _resolved = false;
        
     // ----------------------- resolveCordova, call once we finished the cordova plugins initialisation, or if we're on the web
        var resolveCordova = function (cordova) {
        	console.log ('resolveCordova : ' + _resolved);
        	if (!_resolved) {
        		_resolved = true;
    			cordovaDeffer.resolve(cordova);
    		}
        }
        // ----------------------- cordovaReady, run when we have the ok device ready from cordova
        var cordovaReady = function (cordova) {
        	
            _sfdcoauth = cordova.require("com.salesforce.plugin.oauth");
            _smartstore = cordova.require("com.salesforce.plugin.smartstore");
            _bootstrap = cordova.require("com.salesforce.util.bootstrap");
            //_smartstore.setLogLevel();
            
            
            _setOnline (_bootstrap.deviceIsOnline());
            document.addEventListener("online", function() {
            	console.log ("online addEventListener");
            	_setOnline (true, true);  }, false);
            document.addEventListener("offline", function() {
            	console.log ("offline addEventListener");
            	_setOnline ( false, true);  }, false);
 
            setupOauthCreds(_sfdcoauth).then (function () {
            	console.log ('calling registerSoups');
            	registerSoups (_smartstore).then ( function () {
            		console.log  ('done, resolve cordova init');
            		navigator.splashscreen.hide();
            		resolveCordova (cordova);
            	})
            });
        }
        
        console.log ('add listener for cordova deviceready');
        document.addEventListener('deviceready', function() {
        	console.log ('got cordova deviceready');
        	cordovaReady(window.cordova);	
        });
        /* after 2seconds, Check to make sure we didn't miss the event (just in case)
        setTimeout(function() {  
        	if (!_resolved && window.cordova) { 	
        		cordovaReady(window.cordova);  
        		}}, 2000);
		*/

        // ----------------------- query function
        var query = function(obj, fields , where) {
        	return _query (obj, fields , where, _online)
        }
        
        var  queryLocal = function(obj, fields , where) {
        	return _query (obj, fields , where, false)
        }
        
        var _query = function(obj, fields , where, mode) {
        	if (!_creds) {
        		console.log ('we dont have the credentials from the cordova container, so use hardwired!');
        		sess = _sfdccreds.session_api;
        		pth = _sfdccreds.sf_host_url + _sfdccreds.sfdc_api_version;
        	} else {
        		sess = _creds.accessToken;
        		pth = _creds.instanceUrl + _sfdccreds.sfdc_api_version;
        	}
        	
        	var allfieldsquery = false;
        	if (!fields || fields == "*") {
        		allfieldsquery = true;
        		fields = soups[obj].allFields;
        	}
        	
        	var buildsql = function(obj, fields, smart) {
        	
        		var formatfld = function (obj, field, smart) {
        			if (!smart)
        				return field;
        			else 
        				return "{" + obj + ":" + field + "}";
        		}
        		
        		var qstr = "SELECT ";
        		for (var fidx in fields) {
        			if (fidx >0) qstr += ", ";
        			qstr += formatfld (obj, fields[fidx], smart)
        		}
        		
        		if (!smart)
        			qstr += " FROM " + obj;
        		else 
        			qstr += " FROM {" + obj + "}";
        		
        		if (where) {
        			for (var whereidx in where) {
        				if (whereidx == 0) { 
        					qstr += " WHERE ";
        				} else {
        					qstr += " AND ";
        				}
        				var whereitem = where[whereidx];
        				qstr += formatfld (obj, whereitem.field, smart)
        				if (whereitem.like)
        					if (!smart)
        						qstr += " LIKE '" + whereitem.like + "%25'";
        					else
        						qstr += " LIKE '" + whereitem.like + "%'";
        				else if (whereitem.contains)
        					if (!smart)
        						qstr += " LIKE '%25" + whereitem.contains + "%25'";
        					else
        						qstr += " LIKE '%" + whereitem.contains + "%'";
        				else if (whereitem.equals)
        					qstr += " = '" + whereitem.equals + "'";
        			}
        		}
        		
        		qstr += " ORDER BY " + formatfld (obj, soups[obj].primaryField, smart);
        		return qstr;
        	}
        	
        	if (mode) {
        		var qstr = buildsql (obj, fields, false);
        		console.log ('online running query : ' + qstr);
        		return $http.get(pth  + "/query/?q=" + qstr,
	                    {
	                        headers: {  'Authorization': 'OAuth ' + sess  }
	                    }).then (function (results) {
	                    	//console.log ('got ' + angular.toJson(results.data));
	                    	
	                    	/* DONT BOTH TRYING TO CACHE ALL ONLINE QUERY DATA, JUST USE SYNC */
	                    	if (_smartstore && results.data.records) {
	                    		if (allfieldsquery) {
		                    		console.log ('get online results, save for offline (upsertSoupEntriesWithExternalId with "Id") : ' + obj);
		                    		_smartstore.upsertSoupEntriesWithExternalId(obj, results.data.records, "Id", 
		                    				function (val) { 
		                    					console.log ('upsert success: ' + angular.toJson(val));
		                    				}, function (val) { 
		                    					console.log ('upsert error: ' + angular.toJson(val));});
	                    		}
	                    	}
	                    	
	                    	return results.data.records;
	                    });
        	} else {
        		var ssDeffer = $q.defer();
        		console.log ('offline running query');
        		if (_smartstore) {
        			
        			var qspec;
        			var smartqsl;
        			
        			if (!where || where.length == 0) {
        				console.log ('offline search running buildAllQuerySpec');
        				qspec = _smartstore.buildAllQuerySpec (soups[obj].primaryField, null, 100);
        			}
        			else if (where.length == 1 && where[0].equals) {
        				console.log ('offline search running buildExactQuerySpec : ' + where[0].field + ' = ' + where[0].equals);
        				qspec = _smartstore.buildExactQuerySpec (where[0].field, where[0].equals, null, 100);
        			} 
        			else if (where.length == 1 && where[0].like) {
        				console.log ('offline search running buildLikeQuerySpec : ' + where[0].field + ' = ' + where[0].equals);
        				qspec = _smartstore.buildLikeQuerySpec (where[0].field, where[0].like + "%", null, 100);
        			} 
        			else {
        				// SmartQuery requires Everyfield to be indexed & ugly post processing ! the others do not!
        				smartqsl = buildsql (obj, fields, true);
        				console.log ('offline search running smartqsl : ' + smartqsl);
        				qspec = _smartstore.buildSmartQuerySpec(smartqsl, 100);
        			}
        			
        			var success = function (val) {
                    	console.log ('querySoup got data ' + angular.toJson(val));
                    	if (smartqsl) { // using smartSQL, need to do some reconstruction UGH!!!
                    		var results = [];
                    		for (var rrecidx in val.currentPageOrderedEntries) {
                    			var res = {},
                    				rrec = val.currentPageOrderedEntries[rrecidx];
                    			for (var fidx in fields) {
                    				res[fields[fidx]] = rrec[fidx];
                    			}
                    			results.push (res);
                    		}
                    		ssDeffer.resolve(results);
                    	} else {
                    		ssDeffer.resolve(val.currentPageOrderedEntries);  
                    	}
                    }
                    var error = function (val) { 
                    	console.log  ('querySoup error ' + angular.toJson(val));
                    	ssDeffer.reject(val);  
                    }
                    if (smartqsl) {
                    	_smartstore.runSmartQuery(qspec, success,error);
                    } else {
                    	_smartstore.querySoup(obj, qspec, success,error);
                    }
        		} else {
        			console.log ('Device offline & no smartstore');
        			ssDeffer.reject('Device offline & no smartstore'); 
        		}
        		return ssDeffer.promise;
        	}
        }	
        
        // ----------------------- insert function
        var _insert = function(obj, objdata, localOnly) {
        	if (!localOnly) localOnly = false;
        	
        	if (!_creds) {
        		console.log ('we dont have the credentials from the cordova container, so use hardwired!');
        		sess = _sfdccreds.session_api;
        		pth = _sfdccreds.sf_host_url + _sfdccreds.sfdc_api_version;
        	} else {
        		sess = _creds.accessToken;
        		pth = _creds.instanceUrl + _sfdccreds.sfdc_api_version;
        	}
        	
        	var offlineUpsert = function (ol_obj, ol_objdata) {
        		console.log ('offline upsertSoupEntries (uses _soupId)');
        		var ssDeffer = $q.defer();
        		
        		if (_smartstore) {
        			var success = function (val) {
                    	console.log ('upsertSoupEntries got data ' + angular.toJson(val));
                    	
                    	var val0 = val[0];
                    	// HACK HERE
                    	if (val0.Id !== "LOCAL") {
                    		if (!_xref[ol_obj]) _xref[ol_obj] = {};
                    		console.log ('_xref, adding _soupEntryId : '+ val0._soupEntryId +' Id: ' + val0.Id);
                    		_xref[ol_obj][val0._soupEntryId] = { Id: val0.Id, Name: val0[soups[obj].primaryField]};
                    	}
                    	ssDeffer.resolve(val0);
                    	
                    }
                    var error = function (val) { 
                    	console.log  ('upsertSoupEntries error ' + angular.toJson(val));
                    	ssDeffer.resolve(val);  
                    }
                    if (ol_objdata.Id !== "LOCAL" && !ol_objdata._soupEntryId) {
                    	
                    	console.log ('_insert upsert soup using "Id" : '+ ol_objdata.Id);
                    	_smartstore.upsertSoupEntriesWithExternalId (ol_obj, [ol_objdata], "Id", success, error);
                    } else {
                    	console.log ('_insert upsert soup using "_soupEntryId" : '+ ol_objdata._soupEntryId);
	                    _smartstore.upsertSoupEntries (ol_obj, [ol_objdata], success, error);
                    }
        		} else {
        			ssDeffer.reject('Device offline & no smartstore'); 
        		}
        		return ssDeffer.promise;
        	}
        	
        	if (_online && !localOnly) {
        		console.log ('online upsert');
        		var olDeffer = $q.defer();
        		
        		var clean_objdata = {},
        			allFields = soups[obj].allFields,
        			childLookupFields = soups[obj].childLookupFields || {};
        			
    			for (var fidx in allFields) {
    				var f = allFields[fidx];
    				if (f == 'Id') {
    					console.log ('Its a Id field so dont add to clean object data');
    				} else if (childLookupFields[f]) {
    					var parentObject = childLookupFields[f];
    					console.log ('Its a Lookup field, check we have the lookup sfdc Id: ' + f);
						if (objdata[f].Id && objdata[f].Id !== 'LOCAL') {
    						console.log ('we already have a sfdc Id for the parent : ' + objdata[f].Id);
    						objdata[f] = objdata[f].Id;
    						clean_objdata[f] = objdata[f];
    						
    					} else if (objdata[f]._soupEntryId) {
	    					console.log ('I have lookup field with a _soupId ref, find Id : ' + f + ', parent Object: '+ parentObject +' lookup to soup : ' + objdata[f]._soupEntryId);
	    					
	    					// HACK - really should do a queryLocal here (obj, fields , where)
	    					
	    					if (_xref[parentObject] && _xref[parentObject][objdata[f]._soupEntryId]) {
	    						objdata[f] = _xref[parentObject][objdata[f]._soupEntryId].Id;
	    						clean_objdata[f] = objdata[f];
	    						console.log ('got it! : ' + objdata[f]);
	    					} else {
	    						console.log ('Will let this Fail, dont have a entry in the dependentSoupToId map :(');
	    					}
	    					
						} 
    				} else {
    					clean_objdata[f] = objdata[f];
    				}
    			}
    			console.log ('online upsert of clean_objdata');
    			var poststr = pth  + "/sobjects/" + obj + "/",
    				method = "POST";
    			if (objdata["Id"] && objdata["Id"] != 'LOCAL') {
    				console.log ('We have a Id! so its a update');
    				poststr += objdata["Id"];
    				method = "PATCH";
    			}
    			
        		$http({
        				url: poststr,
        				method: method,
        				data: clean_objdata,
	                    headers: {  'Authorization': 'OAuth ' + sess  }
	                }).success (function (results) {
	                	console.log ('online success resolve : ' + angular.toJson(results));
	                	objdata.Id = results.id
	                	if (_smartstore) {
	                		console.log ('online success, now offlineUpsert');
	                		offlineUpsert (obj, objdata).then (function(offresults) {
	                			olDeffer.resolve(offresults); 
	                		});
	                	} else {
	                		olDeffer.resolve(results); 
	                	}
	               }).error (function (results) {
	                	console.log ('error resolve : ' + angular.toJson(results));
	                	olDeffer.resolve(results[0]); 
	                });
        		return olDeffer.promise;
        	} else {
        		objdata.Id = 'LOCAL';
        		$rootScope.syncinfo.tosync++;
        		return offlineUpsert (obj, objdata);
        	}
        }
        
        var _initSyncinfo = function () {
			$rootScope.syncinfo = { tosync: 0, errcount: 0, errmsg: {}};
        }
        var _addSyncError = function (obj, soupEntryId, errmsg) {
        	$rootScope.syncinfo.errcount++;
    		$rootScope.syncinfo.errmsg[obj+'-'+soupEntryId] = errmsg;
        }
        var _rmSyncError = function (obj, soupEntryId) {
        	$rootScope.syncinfo.tosync--;
        	if ($rootScope.syncinfo.errmsg[obj+'-'+soupEntryId]) {
	        	$rootScope.syncinfo.errcount--;
	    		$rootScope.syncinfo.errmsg[obj+'-'+soupEntryId] = null;
        	}
        }
        //------------------------ sync offline records to server
     	var _syncup = function (obj) {
     		var deferredDone = $q.defer();

			queryLocal(obj, "*",  [{field: 'Id', equals: 'LOCAL'}])
	    		.then(function (data) {
	    			$rootScope.syncinfo.tosync = $rootScope.syncinfo.tosync + data.length;
		    		console.log ('sync '+obj+' : ' + angular.toJson(data));
		    		var allPromises = [];
		    		if (data.length >0) {
			    		for (var d in data) {
	            			console.log ('upserting into ' + obj + ' : ' + angular.toJson(data[d]));
	            			allPromises.push (_insert(obj, data[d]).then (function (res) {
		    					if (res.Id && res.Id !== 'LOCAL') {
		    						$rootScope.syncinfo.tosync--;
		    		        	} else { // array
		    		        		var serr = 'Save error ';
		    		        		if (res.message) {
		    		        			serr  = res.message;
		    		        		}
		    		        		console.log ('_syncup : adding error ' + obj + '-' + data[d]._soupEntryId + ' : ' + serr);
		    		        		_addSyncError (obj, data[d]._soupEntryId, serr)
		    		        	}
			    			}));
	            			
			    		}
			    		
			    		$q.all(allPromises).then(function () { 
			    			console.log ('syncup: finished syncing : ' + obj);
			    			deferredDone.resolve(); 
			    		});
		    		} else {
		    			deferredDone.resolve(); 
		    		}
		    		
		    	});
			return deferredDone.promise;
		}

        // The  singleton service injected into components dependent on the service
        return {
        	isInitialised: function() { return _resolved; },
	    	cordovaDeffer: cordovaDeffer,
	    	resolveCordova: resolveCordova,
	    	setOnline: _setOnline, 
	    	getOnline: function() { 
	    		return _online; 
	    	},
	        getCreds: function() { 
	        	return _creds; 
	        },
	        query: query,
	        queryLocal: queryLocal,
	        insert: _insert,
	        syncup: _syncup,
	        initSyncinfo: _initSyncinfo,
	        addSyncError: _addSyncError,
	        rmSyncError: _rmSyncError,
	        reinitialiseSoup: reinitialiseSoup
	        
	    }
    }])
    //Use this method to register work which needs to be performed on module loading
    .config(function () { //console.log('sfdata.service config function');
    	})
    // Use this method to register work which should be performed when the injector is done loading all modules
    .run(function(){ //console.log('sfdata.service run function'); 
    	});

// A module is a collection of services, directives, controllers, filters, and configuration information
angular.module('sfdata', ['sfdata.service', 'sfdata.constants']);


var ensureSFDCDataServiceInitialised = {
	    'SFDCData':function(SFDCData){   if (SFDCData.isInitialised()) return true; else return SFDCData.cordovaDeffer.promise;  }};