/**
 * Copyright 2011 SRI International
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * 
 * 
 * @author John Brecht
 */

//var NODE_URL = "http://lrdev05.learningregistry.org";
var NODE_URL = "http://node01.public.learningregistry.net";
//var NODE_URL = "http://127.0.0.1:5000";
var typeReturnCount = 0;

var TRIM_SIZE = 12;
var SECONDARY_TRIM_SIZE = 6;

var searchTerm;
var sliceAsTagResultCount;
var sliceAsIdentityResultCount;
var max_results;
var limit_results;
var SLICE_LIMIT_MAX = 100000;
var SUGGESTED_SLICE_LIMIT = 500;
var sliceLimit = SLICE_LIMIT_MAX;

var summary_doc_count = 0;
var summary_tag_count = 0;
var summary_id_count = 0;

var peek_count = 0;
var peek_started = false;

var node_click_count = 0;
var currentClickedNode;

//var currentNodes;
var post_confirm_search_data;

var TAG = "Tag";
var IDENTITY = "Identity";
var searchTermType;

var topNode;
var nodeDictionary = new Object();
var secondaryNodeDictionary = new Object();
var docDictionary = new Object();

var labelType, useGradients, nativeTextSupport, animate;

var identityTypes = ["curator", "owner", "submitter"];

var hypertree;

var $search_confirm_dialog;

var ajaxPool = []; 

var debugMode = false;

(function() {
	var ua = navigator.userAgent, 
	iStuff = ua.match(/iPhone/i) || ua.match(/iPad/i), 
	typeOfCanvas = typeof HTMLCanvasElement, 
	nativeCanvasSupport = (typeOfCanvas == 'object' || typeOfCanvas == 'function'), 
	textSupport = nativeCanvasSupport && ( typeof document.createElement('canvas').getContext('2d').fillText == 'function');
	//I'm setting this based on the fact that ExCanvas provides text support for IE
	//and that as of today iPhone/iPad current text support is lame
	labelType = (!nativeCanvasSupport || (textSupport && !iStuff)) ? 'Native' : 'HTML';
	nativeTextSupport = labelType == 'Native';
	useGradients = nativeCanvasSupport;
	animate = !(iStuff || !nativeCanvasSupport);
})();

$(function() {
	
	var url_vars = getUrlVars();
	if(url_vars.debug) debugMode = true;
	
	$("button").button();
	//$('select').selectmenu();
	//$("#doc_list_accordion" ).accordion();
	$("#controls" ).collapse();
	$("#Search").button({
		icons : {
			primary : 'ui-icon-search'
		},
		text : true
	});		
	
	$("#Help").button({
		icons: {
			primary: 'ui-icon-help'
		},
		text: false
	});
	
	$("#secondary").hide();

	$("#Search").click(function() {
		startNewSearch($("#term").val());
	});
	$("#term").keypress(function(e) {
	    if(e.keyCode == 13) {
	        startNewSearch($("#term").val());
	    }
	});

	$( "#primaryLimit" ).html(TRIM_SIZE);
	$( "#primaryLimitSlider" ).slider({
		min: 2,
		max: 30,
		value: TRIM_SIZE,
		slide: function(event, ui) {
			TRIM_SIZE = ui.value;
			$( "#primaryLimit" ).html(TRIM_SIZE);
		}
	});

	$( "#secondaryLimit" ).html(SECONDARY_TRIM_SIZE);
	$( "#secondaryLimitSlider" ).slider({
		min: 2,
		max: 20,
		value: SECONDARY_TRIM_SIZE,
		slide: function(event, ui) {
			SECONDARY_TRIM_SIZE = ui.value;
			$( "#secondaryLimit" ).html(SECONDARY_TRIM_SIZE);
		}
	});

	$( "#entryLimit" ).html(SUGGESTED_SLICE_LIMIT);
	$( "#entryLimitSlider" ).slider({
		min: 100,
		max: 3000,
		step: 100,
		value: SUGGESTED_SLICE_LIMIT,
		slide: function(event, ui) {
			SUGGESTED_SLICE_LIMIT = ui.value;
			$( "#entryLimit" ).html(SUGGESTED_SLICE_LIMIT);
		}
	});
	
	
	$("#Help").click(function() {
		window.open("help.html","Learning Registry Browser Help",'width=500,height=500,menubar=no,scrollbars=yes,toolbar=no');
	});

	$("#secondary").click(function() {
		if(!peek_started) {
			peekAhead(topNode);
			$("#secondary").hide();
		}
	});

	$("#progressbar").progressbar({
		value : 0,
		disabled : true
	});

	/*if(debugMode) { 
		$("#serverselect").eComboBox({
			'allowNewElements' : true,
			'editableElements' : false
		});
		$("#serverselect").change(function() {
			NODE_URL = "http://" + $("#serverselect").val();
		});
	} else {
		$("#serverselect").hide();
		$("#debugDiv").hide();
	}*/
	
	$("#serverselect").eComboBox({
		'allowNewElements' : true,
		'editableElements' : false
	});
	$("#serverselect").change(function() {
		NODE_URL = "http://" + $("#serverselect").val();
	});
	if(!debugMode) $("#debugDiv").hide();
	
	$.ajaxSetup({
		dataType : 'jsonp',
		jsonp : 'callback',
		beforeSend : function(jqXHR) {
			ajaxPool.push(jqXHR);
		}
	});
	buildGraph();
	
	
	if(url_vars.search) {
		$("#term").val(unescape(url_vars.search));
		$("#Search").click();
	}
});

function startNewSearch(term) {
	if(term.length==0) return;
	$("#progressbar").progressbar("option", "value", 0);
	clearSummary();
	$("#secondary").hide();
    try {
    	_gaq.push(['_trackEvent', 'LRBrowser', 'Search', term.toLowerCase()]);
    } catch (e) {}
	killOustandingRequests();
	topNode = buildNode("Loading", "", TAG);
	topNode.id = -1;
	loadGraphData(topNode, true);
	searchTerm = term;
	startDetermineType();
}

function killOustandingRequests() {
	for(var request in ajaxPool) {
		ajaxPool[request].abort();
	}
}

function debug(msg) {
	if(debugMode)$('#debug').append(msg);
}

function status(msg) {
	$('#status').html(msg);
}

function summary() {
	var msg = "<p>Found " + summary_doc_count + " entries containing ";
	msg = msg + searchTermType + " " + searchTerm + "</p>";
	msg = msg + "<p>Results contained " + summary_tag_count + " tags & " + summary_id_count + " identities.</p>";
	msg = msg + "<p>Limiting display to " + TRIM_SIZE + " items.";
	$('#results_summary').html(msg);
}

function clearSummary() {
	$('#results_summary').html("");
}

function startDetermineType() {
	status("Determining type...");
	sliceAsTagResultCount = -1;
	sliceAsIdentityResultCount = -1;

	var tagCountCallback = function(data) {
		sliceAsTagResultCount = data.resultCount;
		if(sliceAsIdentityResultCount > -1)
			compareTagAndIdentityCountResults();
	}
	var tagSliceData = buildSliceObject({
		"any_tags" : searchTerm,
		"ids_only" : true
	});
	tagSliceData.success = tagCountCallback;
	$.ajax(tagSliceData);

	var identityCountCallback = function(data) {
		sliceAsIdentityResultCount = data.resultCount;
		if(sliceAsTagResultCount > -1)
			compareTagAndIdentityCountResults();
	}
	var identitySliceData = buildSliceObject({
		"identity" : searchTerm,
		"ids_only" : true
	});
	identitySliceData.success = identityCountCallback;
	$.ajax(identitySliceData);
}

function compareTagAndIdentityCountResults() {
	var search_data;
	if(sliceAsTagResultCount > sliceAsIdentityResultCount) {
		searchTermType = TAG;
		max_results = sliceAsTagResultCount;
		search_data = buildSliceObject({
			"any_tags" : searchTerm
		});
	} else {
		searchTermType = IDENTITY;
		max_results = sliceAsIdentityResultCount;
		search_data = buildSliceObject({
			"identity" : searchTerm
		});
	}
	if(max_results > SUGGESTED_SLICE_LIMIT) {
		post_confirm_search_data = search_data
		confirmSearch(search_data);
	} else {
		sliceLimit = SLICE_LIMIT_MAX;
		handleSlice(parseSliceResult, search_data);
	}
}

function confirmSearch() {
	//$search_confirm_dialog.html("This search will return as many as " + max_results + " results.");
	//$search_confirm_dialog.dialog('open');

	var btns = {};
	btns["Retrieve all results"] = function() {
				sliceLimit = SLICE_LIMIT_MAX;
				$(this).dialog("close");
				limit_results = false;
				handleSlice(parseSliceResult, post_confirm_search_data);
			};
	btns["Retrieve first " + SUGGESTED_SLICE_LIMIT + " results"] = function() { 
				sliceLimit = SUGGESTED_SLICE_LIMIT;
				limit_results = true;
				max_results = SUGGESTED_SLICE_LIMIT;
				$(this).dialog("close");
				handleSlice(parseSliceResult, post_confirm_search_data);
			};
	btns["Retrieve some other number of results..."] = function() { 
				max_results = prompt('Enter the maximum results to retrieve', '500');
				sliceLimit = max_results;
				limit_results = true;
				$(this).dialog("close");
				handleSlice(parseSliceResult, post_confirm_search_data);
			};
	btns["Cancel"] = function() { 
				sliceLimit = -1;
				$(this).dialog("close");
			};
	$("<div>This search will return as many as " + max_results + " results.</div>").dialog({
		autoOpen : true,
		title : 'Confirm search',
		modal : true,
		buttons : btns
	});
	
}

function buildSliceObject(dataArg) {
	var sliceObj = {
		url : NODE_URL + "/slice",
		data : dataArg
	};
	return sliceObj;
}

var handleSlice = function(finalCallback, search_data, quiet, parentNode) {
	var finalResult = new Array();
	var iterateCount = 0;

	var iterateSlice = function(slicedata) {
		if(slicedata) {
			finalResult = finalResult.concat(slicedata.documents);
			
			//now max_results actually refines as you go, as redundancies are found
			if(!limit_results) {
				debug("not limiting results, updating max");
				max_results = slicedata.resultCount
			}
			
			if(!quiet) {
				status("Retrieved data " + finalResult.length + "/" + max_results);
				$("#progressbar").progressbar("option", "value", 100 * (finalResult.length / max_results));
			}
			var doc = slicedata.documents[0];
			//status(JSON.stringify(doc));
			if(slicedata.resumption_token) {
				if(search_data.data.resumption_token == slicedata.resumption_token) {
					if(!quiet)
						status("Received the same resumption token twice, aborting...");
					finalCallback(finalResult, parentNode);
				} else if(finalResult.length >= sliceLimit) {
					if(!quiet)
						status("Reached limit, aborting...");
					finalCallback(finalResult, parentNode);
				} else {
					search_data.data.resumption_token = slicedata.resumption_token
					$.ajax(search_data);
				}
			} else {
				finalCallback(finalResult, parentNode);
			}
		} else {
			$.ajax(search_data);
		}
	}
	if(!quiet) {
		status("Querying the Learning Registry...");
		$("#progressbar").progressbar({
			disabled : false,
			value : 0
		});
	}
	search_data.success = iterateSlice;
	iterateSlice();
}

function buildDoc(doc) {
	var outDoc= {
		id : doc.doc_id,
		url : doc.resource_data_description.resource_locator,
		keys : doc.resource_data_description.keys,
		identity : doc.resource_data_description.identity,
		type : doc.resource_data_description.resource_data_type
	}
	if(doc.resource_data_description.resource_data_type == "paradata") {
		if(doc.resource_data_description.payload_placement=="inline") {
			if((" "+doc.resource_data_description.payload_schema).indexOf("Comm")!=-1) {
				var xmlDoc = $.parseXML(doc.resource_data_description.resource_data);
				$xml = $( xmlDoc );
				//paradataTitle, paradataDescription
		    	outDoc.paradataTitle = $xml.find( "paradataTitle" );
		    	outDoc.paradataDescription = $xml.find( "paradataDescription" ); 
			} else {
				outDoc.paradata_src = doc.resource_data_description.resource_data;
			}
		} else if(doc.payload_placement=="linked") {
			outDoc.paradata_url =doc.resource_data_description.payload_locator;
		}
	}
		
	return outDoc;
}

function buildNode(value, parentValue, type) {
	var idVal;
	if(parentValue != "")
		idVal = parentValue + "-" + value + "-" + type;
	else
		idVal = value + "-" + type;

	var shape = 'star';
	var color;
	if(type == TAG)
		//shape = 'star';
		color = '#6B8E23';
	else
		//shape = 'square';
		color = '#7A378B';

	return {
		id : idVal,
		name : value,
		data : {
			$type : shape,
			$dim : 10,
			$color : color,
			datatype : type,
			doc_ids : [],
			getGraphLabel : function() {
				//return this.name + " ("+this.data.doc_ids.length+")";
				return (this.name );
				//return value + " ("+data.doc_ids.length+")";
			}
		},
		children : []
	}
}

function addNodeChild(node, child) {
	node.children.push(child);
}

function addNodeDocID(node, doc_id) {
	if($.inArray(doc_id, node.data.doc_ids) < 0) {
		node.data.doc_ids.push(doc_id);
		var newSize = 10 + 30 * (node.data.doc_ids.length / max_results);
		//temporarily setting to static size until count issue is fixed
		//var newSize = 25;
		node.data.$dim = newSize;
	}
}

function parseSliceResult(results) {
	nodeDictionary = new Object();
	topNode = buildNode(searchTerm, "", searchTermType);
	nodeDictionary[searchTerm + "-" + searchTermType] = node;
	var documents = results;
	summary_doc_count = 0;
	summary_tag_count = 0;
	summary_id_count = 0;
	peek_started = false;
	if(searchTermType == TAG)
		summary_tag_count++;
	else
		summary_id_count++;

	status("Parsing results for " + documents.length + " entries");
	for(var i = 0; i < documents.length; i++) {
		doc = documents[i];
		/*if(doc.resource_data_description.resource_data_type == "paradata" && i<25) {
			debug("<p>paradataDoc:" + JSON.stringify(doc))
		}*/
		if(doc.resource_data_description && doc.resource_data_description.resource_locator) {//} && doc.resource_data_description.resource_data_type != "paradata") {
			var doc_id = doc.doc_ID;
			summary_doc_count++;
			if(!docDictionary[doc_id])
				docDictionary[doc_id] = buildDoc(doc);
			addNodeDocID(topNode, doc_id);
			if(doc.resource_data_description.keys) {
				var keys = doc.resource_data_description.keys;
				for(var j = 0; j < keys.length; j++) {
					var key = keys[j].toLowerCase().trim();
					var node_id = searchTerm + "-" + key + "-" + TAG
					if(!nodeDictionary[node_id]) {
						var node = buildNode(key, searchTerm, TAG);
						summary_tag_count++;
						addNodeDocID(node, doc_id);
						nodeDictionary[node_id] = node;
						addNodeChild(topNode, node)
					} else {
						addNodeDocID(nodeDictionary[node_id], doc_id);
					}
				}
			} else {
			}

			if(doc.resource_data_description.identity) {
				var identities = doc.resource_data_description.identity;
				for(var k = 0; k < identityTypes.length; k++) {
					var type = identityTypes[k];
					if(identities[type]) {
						var ident = identities[type].toLowerCase().trim();
						var node_id = searchTerm + "-" + ident + "-" + TAG
						if(!nodeDictionary[node_id]) {
							var node = buildNode(ident, searchTerm, IDENTITY);
							summary_id_count++;
							addNodeDocID(node, doc_id);
							nodeDictionary[node_id] = node;
							addNodeChild(topNode, node)
						} else {
							addNodeDocID(nodeDictionary[node_id], doc_id);
						}
					} else {
					}
				}
			} else {
				//debug("no identities!");
				//debug(JSON.stringify(doc));
			}
		}
	}
	status("Parsing complete.");
	summary();
	topNode.children = trimChildren(topNode.children, TRIM_SIZE);
	loadGraphData(topNode);
	status("Principle search complete");
	if(summary_doc_count>0) $("#secondary").show();
}

function peekAhead() {
	status("Exploring secondary terms...");
	$("#progressbar").progressbar("option", "value", 0);
	peek_count = 0;
	peek_started = true;
	sliceLimit = 500;
	for(var key in topNode.children) {
		var node = topNode.children[key];
		var search_data;
		if(node.data.datatype == TAG) {
			search_data = buildSliceObject({
				"any_tags" : node.name
			});
		} else {
			search_data = buildSliceObject({
				"identity" : node.name
			});
		}
		handleSlice(parseSecondarySliceResult, search_data, true, node);
	}
}

function parseSecondarySliceResult(results, parentNode) {

	var documents = results;
	for(var i = 0; i < documents.length; i++) {
		doc = documents[i];
		if(doc.resource_data_description && doc.resource_data_description.resource_locator) {
			var doc_id = doc.doc_ID;
			if(!docDictionary[doc_id])
				docDictionary[doc_id] = buildDoc(doc);
			if(doc.resource_data_description.keys) {
				var keys = doc.resource_data_description.keys;
				for(var j = 0; j < keys.length; j++) {
					var key = keys[j].toLowerCase().trim();
					var node_id = searchTerm + "-" + key + "-" + TAG
					if(!nodeDictionary[node_id]) {
						var node = buildNode(key, searchTerm, TAG);
						addNodeChild(parentNode, node)
					} else {
					}
				}
			} else {
			}

			if(doc.resource_data_description.identity) {
				var identities = doc.resource_data_description.identity;
				for(var k = 0; k < identityTypes.length; k++) {
					var type = identityTypes[k];
					if(identities[type]) {
						var ident = identities[type].toLowerCase().trim();
						var node_id = searchTerm + "-" + ident + "-" + TAG
						if(!nodeDictionary[node_id]) {
							var node = buildNode(ident, searchTerm, IDENTITY);
							addNodeChild(parentNode, node)
						} else {
						}
					} else {
					}
				}
			} else {
				//debug("no identities!");
				//debug(JSON.stringify(doc));
			}
		}
	}
	parentNode.children = trimChildren(parentNode.children, SECONDARY_TRIM_SIZE);
	//debug(JSON.stringify(topNode));
	peek_count++;
	$("#progressbar").progressbar("option", "value", 100 * (peek_count / TRIM_SIZE));
	//if(peek_count==topNode.children.length-1) loadGraphData(topNode);
	loadGraphData(topNode);
	if(peek_count==(TRIM_SIZE-1)) status("Secondary term search complete");
}

function compareDocCounts(node1, node2) {
	return node2.data.doc_ids.length - node1.data.doc_ids.length;
}

function trimNodes(node, trimTo) {
	var children = node.children;
	children = children.sort(compareDocCounts);
	children = children.slice(0, trimTo);
	var newNode = jQuery.extend(true, {}, node);
	newNode.children = children;
	return newNode;
}

function trimChildren(children, trimTo) {
	children = children.sort(compareDocCounts);
	children = children.slice(0, trimTo);
	return children;
}

function buildGraph() {
	var infovis = document.getElementById('infovis');
	var w = infovis.offsetWidth - 50, h = infovis.offsetHeight - 50;

	//init Hypertree
	hypertree = new $jit.Hypertree({
		//id of the visualization container
		injectInto : 'infovis',
		//canvas width and height
		width : w,
		height : h,
		//Change node and edge styles such as
		//color, width and dimensions.
		Node : {
			overridable : true,
			color : "#00F"
		},
		Edge : {
			lineWidth : 2,
			color : "#088"
		},
		onBeforeCompute : function(node) {
			//Log.write("centering");
		},
		//Attach event handlers and add text to the
		//labels. This method is only triggered on label
		//creation
		onCreateLabel : function(domElement, node) {
			var labelText = node.name;
			if(node.data.doc_ids.length > 0) {
				labelText += " (" + node.data.doc_ids.length + ")"
			}
			domElement.innerHTML = labelText;

			$jit.util.addEvent(domElement, 'click', function() {
				
				currentClickedNode = node;
				node_click_count++;

				function handleNodeDoubleClick() {
					$("#term").val(node.name);
					startNewSearch(node.name)
				}

				if(node_click_count == 1) {
					setTimeout("handleNodeSingleClick()", 500);
				} else if(node_click_count == 2) {
					handleNodeDoubleClick();
				}
			});
		},
		//Change node styles when labels are placed
		//or moved.
		onPlaceLabel : function(domElement, node) {
			var style = domElement.style;
			style.display = '';
			style.cursor = 'pointer';

			if(node.id == topNode.id) {
				style.fontSize = "1.4em";
				style.color = "#ddd";
				if(node.id == topNode.id) style.textTransform = "uppercase";
			} else {
				var pars = $jit.Graph.Util.getParents(node);
				if(pars[0] && pars[0].id == topNode.id) {
					style.fontSize = "1.0em";
					style.color = "#ddd";
				} else if(pars[0]){
					var grandPars = $jit.Graph.Util.getParents(pars[0]);
					if(grandPars[0] && grandPars[0].id == topNode.id) {
						style.fontSize = "0.8em";
						style.color = "#888";
					}
				}
			}
			
			 
			/*if(node._depth <= 1) {
				style.fontSize = "0.9em";
				style.color = "#ddd";
				if(node.id == topNode.id) style.textTransform = "uppercase";

			} else if(node._depth == 2) {
				style.fontSize = "0.8em";
				style.color = "#555";

			} else {
				style.display = 'none';
				style.color = "#444";
			}*/

			var left = parseInt(style.left);
			var w = domElement.offsetWidth;
			style.left = (left - w / 2) + 'px';
		},
		onComplete : function() {
			var node = hypertree.graph.getClosestNodeToOrigin("current");
			buildDocList(node);
		}
	});
}

function handleNodeSingleClick() {
	node_click_count = 0;
	hypertree.onClick(currentClickedNode.id, {
		onComplete : function() {
			hypertree.controller.onComplete();
		}
	});
}

function buildDocList(node) {
	if(node.id == -1)
		$("#doc_list_header").html('');
	else if(node.id == topNode.id)
		$("#doc_list_header").html('&nbsp;&nbsp;Entries for <i>' + node.data.datatype + ' <b>"' + node.name + '"</b></i>');
	else
		$("#doc_list_header").html('&nbsp;&nbsp;Entries for <i>' + node.data.datatype + ' <b>"' + node.name + '"</b> and ' + 
													topNode.data.datatype + ' <b>"' + topNode.name + '"</i></b>');
	$("#doc_list_accordion").remove();
	$("#document_list").append('<div id="doc_list_accordion"/>');
	for(var doc_id in node.data.doc_ids) {
		var listing = buildListing(node.data.doc_ids[doc_id]);
		$("#doc_list_accordion").append(listing);
	}
	$(".paradataLoader").click(function() {
		loadParadata($(this).attr('id'));
	});
	buildAccordion();
}

function buildListing(doc_id) {
	var doc = docDictionary[doc_id];
	if(doc) {
		var url = doc.url;
		var display_url;
		if(url.length<51) display_url = url;
		else display_url = url.substring(0, 50) + "...";
		var obtain_url = NODE_URL + '/obtain?by_doc_ID=true&request_id=' + doc_id
		var output = '<h3><a href="#">' + display_url + '</a></h3>';
		output += '<div id="' + doc_id + '">';
		output += '<a href="' + url + '" target="_blank">View resource</a>'
		output += ' | <a href="' + obtain_url + '" target="_blank">View Full Learning Registry entry</a><br>';
		if(doc.type) {
			if(doc.type != "paradata")
				output += '<button id="' + doc_id + '_loadPara" class="paradataLoader">Find Paradata</button>';
			output += '<br><br><b>type</b>: ' + doc.type + '<br>';
		}
		for(var identity_type in doc.identity) {
			var identity_value = doc.identity[identity_type];
			output += '<b>' + identity_type + '</b>: ' + identity_value + '<br>';
		}
		if(doc.keys) {
			output += '<b>keywords</b>: ';
			output += doc.keys.join(", ");
			output += '<br>';
		}
		if(doc.type) {
			if(doc.type === "paradata") {
				if(doc.paradata_url) {
					output += '<a href="' + doc.paradata_url + '" target="_blank">View Paradata</a><br>'
				} else if(doc.paradataTitle) {
					output += '<b>title</b>: ' + doc.paradataTitle + '<br>';
					output += '<b>description</b>: ' + doc.paradataDescription + '<br>';
				} else if(doc.paradata_src) {
					var escaped = "";
					escaped += doc.paradata_src;
					escaped = replaceAll(escaped, "<", "&lt;");
					escaped = replaceAll(escaped, ">", "&gt;");
					output += '<b>Raw Paradata</b>: <code>' + escaped + '</code><br>';
				}
			}
		}

		output += '</div>';

		return output;
	} else {
		return "---";
	}
}
function replaceAll(txt, replace, with_this) {
  return txt.replace(new RegExp(replace, 'g'),with_this);
}
function loadParadata(doc_id) {
	doc_id = doc_id.split("_")[0];
	debug("<p>load paradata: " + doc_id + "</p>");
	var doc = docDictionary[doc_id];
	if(doc) {
		debug("<p>found doc: " + doc + "</p>");
		var url = doc.url;
		if(url) {
			debug("about to call obtain");
			var obtainObject = buildObtainObject(url);
			obtainObject.success = function(data) {
				debug("obtained: " + JSON.stringify(data));
				var doc_div = $('#' + doc_id);
				var paradataDisplay = buildParadataDisplay(data);
				$('#' + doc_id).append(paradataDisplay);
				/*$('#' + doc_id).append("<b>Paradata</b>:");
				$('#' + doc_id).append(JSON.stringify(data));*/
			};
			$.ajax(obtainObject);
		}
	}
}

function buildObtainObject(url) {
	var obtainObject = {
		url : NODE_URL + "/obtain",
		data : {
			request_id : url,
			by_resource_id : true
		}
	};
	return obtainObject;
}

function buildAccordion() {
	$("#doc_list_accordion").accordion({
		autoHeight : false,
		collapsible : true
	});
}

function clearGraphData() {
	var empty = buildNode("loading", "", TAG);
	//load JSON data.
	hypertree.loadJSON(empty);
	//compute positions and plot.
	hypertree.refresh();
	//end
	hypertree.controller.onComplete();
}

function loadGraphData(json, quiet) {
	//load JSON data.
	hypertree.loadJSON(json);
	//compute positions and plot.
	hypertree.refresh();
	//end
	hypertree.controller.onComplete();
}