/**
 * @author jaybee
 */

//var NODE_URL = "http://lrdev05.learningregistry.org";
var NODE_URL = "http://127.0.0.1:5000";
var typeReturnCount = 0;

var TRIM_SIZE = 30;

var searchTerm;
//var sliceAsTagResult;
//var sliceAsIdentityResult;
var sliceAsTagResultCount;
var sliceAsIdentityResultCount;
var max_results;
var search_data;
var sliceLimit=-1;
//var currentNodes;

var TAG = "Tag";
var IDENTITY = "Identity";
var searchTermType;

var topNode;
var nodeDictionary = new Object();

var labelType, useGradients, nativeTextSupport, animate;

var identityTypes = ["curator", "owner", "submitter"];

var ht;

var $search_confirm_dialog;

(function() {
  var ua = navigator.userAgent,
      iStuff = ua.match(/iPhone/i) || ua.match(/iPad/i),
      typeOfCanvas = typeof HTMLCanvasElement,
      nativeCanvasSupport = (typeOfCanvas == 'object' || typeOfCanvas == 'function'),
      textSupport = nativeCanvasSupport 
        && (typeof document.createElement('canvas').getContext('2d').fillText == 'function');
  //I'm setting this based on the fact that ExCanvas provides text support for IE
  //and that as of today iPhone/iPad current text support is lame
  labelType = (!nativeCanvasSupport || (textSupport && !iStuff))? 'Native' : 'HTML';
  nativeTextSupport = labelType == 'Native';
  useGradients = nativeCanvasSupport;
  animate = !(iStuff || !nativeCanvasSupport);
})();


$(function(){
	$("button").button();
    $("#Search").button({
        icons: {
            primary: 'ui-icon-search'
        },
        text: true
    });
	
    $("#Search").click(function(){
    	searchTerm = $("#term").val();
       	startDetermineType();
    });
    
    $( "#progressbar" ).progressbar({
			value: 0,
			disabled: true
	});
	
	$("#serverselect").eComboBox({
		'allowNewElements' : true,
		'editableElements' : false
	});
	$("#serverselect").change( function() {
		NODE_URL = "http://"+$("#serverselect").val();
	});
	/*
	 * 			<div id="dialog-confirm-search-size" title="Continue search?">
				<p>
					<span class="ui-icon ui-icon-alert" style="float:left; margin:0 7px 20px 0;"></span><span id = "confirm-search-text"/>
				</p>
			</div>
		
	 */
	$search_confirm_dialog = $('<div></div>')
	.dialog({
		resizable : false,
		autoOpen: false,
		title: 'Confirm search',
		modal : true,
		buttons : {
			"Retrieve all results" : function() {
				sliceLimit=-1;
				$(this).dialog("close");
				handleSlice(parseSliceResult);
			},
			"Retrieve first 1000 results" : function() {
				sliceLimit=1000;
				$(this).dialog("close");
				handleSlice(parseSliceResult);
			},
			Cancel : function() {
				sliceLimit=-1;
				$(this).dialog("close");
			}
		}
	});


	
	
    buildGraph();
});

function debug(msg){
    $('#debug').append( msg );
}
function status(msg){
    $('#status').html(msg);
}



function startDetermineType() {
    status("Determining type...");
	sliceAsTagResultCount = -1;
	sliceAsIdentityResultCount = -1;
	
	
	var tagCountCallback = function(data) {
		sliceAsTagResultCount = data.resultCount;
		if(sliceAsIdentityResultCount>-1) compareTagAndIdentityCountResults();
	}
	
	var tagSliceData = buildSliceObject({"any_tags": searchTerm, "ids_only":true});
	tagSliceData.success = tagCountCallback;
	$.ajax(tagSliceData);
	
	var identityCountCallback = function(data) {
		sliceAsIdentityResultCount = data.resultCount;
		if(sliceAsTagResultCount>-1) compareTagAndIdentityCountResults();
	}
	
	var identitySliceData = buildSliceObject({"identity": searchTerm, "ids_only":true});
	identitySliceData.success = identityCountCallback;
	$.ajax(identitySliceData);
}

function compareTagAndIdentityCountResults() {
	
	if(sliceAsTagResultCount > sliceAsIdentityResultCount) {
		searchTermType = TAG;
		max_results = sliceAsTagResultCount;
		search_data = buildSliceObject({"any_tags": searchTerm});
	} else {
		searchTermType = IDENTITY;
		max_results = sliceAsIdentityResultCount;
		search_data = buildSliceObject({"identity": searchTerm});
	}
	status("Type is " + searchTermType);
	if(max_results>1000) confirmSearch();
	else handleSlice(parseSliceResult);
}

function confirmSearch() {
	$search_confirm_dialog.html("This search will return as many as " + max_results + " results.");
	$search_confirm_dialog.dialog('open');
}

function buildSliceObject(dataArg) {
	var sliceObj = {
		  url: NODE_URL+ "/slice",
		  dataType: 'jsonp',
		  jsonp: 'callback',
		  data: dataArg
	};
	return sliceObj;
}

function buildSliceObject(dataArg) {
	var sliceObj = {
		  url: NODE_URL+ "/slice",
		  dataType: 'jsonp',
		  jsonp: 'callback',
		  data: dataArg
	};
	return sliceObj;
}

var handleSlice = function(finalCallback) {
	var finalResult = new Array();
	var iterateCount = 0;
	
	var iterateSlice = function(slicedata) {
		if(slicedata) {
			finalResult = finalResult.concat(slicedata.documents);
			status("Retrieved data " + finalResult.length + "/" + max_results);
			$( "#progressbar" ).progressbar( "option", "value", 100*(finalResult.length/max_results) );
			var doc = slicedata.documents[0];
			//status(JSON.stringify(doc));
			if(slicedata.resumption_token) {
				if(search_data.data.resumption_token == slicedata.resumption_token) {
					status("Received the same resumption token twice, aborting...");
				finalCallback(finalResult);
				} else {
					search_data.data.resumption_token = slicedata.resumption_token
					$.ajax(search_data);	
				}
			} else {
				finalCallback(finalResult);
			}
		} else {
			$.ajax(search_data);
		}
	}
	status("Querying the Learning Registry...");
	$( "#progressbar" ).progressbar({
			disabled: false,
			value: 0
	});
	search_data.success = iterateSlice;
	iterateSlice();
}


function buildNode(value, parentValue, type) {
	var idVal;
	if(parentValue != "") idVal = parentValue+"-"+value+"-"+type;
	else idVal = value+"-"+type;
	
	var shape;
	if(type == TAG) shape = 'star';
	else shape = 'square';
	
	return {
		id: idVal,
		name: value,
		data : {
			$type : shape,
			$dim : 1,
			datatype: type,
			urls: [],
		},
		children: []
	}
}

function addNodeChild(node, child) {
	node.children.push(child);
}

function addNodeURL(node, url) {
	if($.inArray(url, node.data.urls)<0) {
		node.data.urls.push(url);
		var newSize = 50 * (node.data.urls.length / max_results);
		node.data.$dim = newSize;
	}
}

function parseSliceResult(results) {
	nodeDictionary = new Object();
	topNode = buildNode(searchTerm, "", searchTermType);
	nodeDictionary[searchTerm+"-"+searchTermType] = node;
	var documents = results;
	
	status("Parsing results for " + documents.length + " documents");
	for (var i=0; i < documents.length; i++) {
		doc = documents[i];
		if (doc.resource_data_description && doc.resource_data_description.resource_locator) {
			var url = doc.resource_data_description.resource_locator;
			addNodeURL(topNode, url);
			if (doc.resource_data_description.keys) {
				var keys = doc.resource_data_description.keys;
				for (var j=0; j<keys.length; j++) {
					var key = keys[j].toLowerCase().trim();
					var id = searchTerm+"-"+key+"-"+TAG
					//debug(id);
					if(!nodeDictionary[id]) {
						var node = buildNode(key, searchTerm, TAG);
						addNodeURL(node, url);
						nodeDictionary[id] = node;
						addNodeChild(topNode, node)
					} else {
						addNodeURL(nodeDictionary[id], url);
					}
				}
			} else {
				debug("no keys!");
				debug(JSON.stringify(doc));
			}
			
			if (doc.resource_data_description.identity) {
				var identities = doc.resource_data_description.identity;
				for (var k=0; k<identityTypes.length; k++) {
					var type = identityTypes[k];
					if(identities[type]) {
						var ident = identities[type].toLowerCase().trim();
						var id = searchTerm+"-"+ident+"-"+TAG
						//debug(id);
						if(!nodeDictionary[id]) {
							var node = buildNode(ident, searchTerm, IDENTITY);
							addNodeURL(node, url);
							nodeDictionary[id] = node;
							addNodeChild(topNode, node)
						} else {
							addNodeURL(nodeDictionary[id], url);
						}
					} else {
						//debug("nothing for type: " + type)
					}
				}
			} else {
				//debug("no identities!");
				//debug(JSON.stringify(doc));
			}
		}
	}
	var trimmed = trimNodes(topNode);
	//debug(JSON.stringify(topNode));
	loadGraphData(trimmed);
}

function compareURLcounts(node1, node2) {
	return node2.data.urls.length - node1.data.urls.length;
}

function trimNodes(node) {
	var newNode = jQuery.extend(true, {}, node);
	var children = newNode.children;
	children = children.sort(compareURLcounts);
	children = children.slice(0,TRIM_SIZE);
	newNode.children = children;
	return newNode;
}

function buildGraph() {
	var infovis = document.getElementById('infovis');
    var w = infovis.offsetWidth - 50, h = infovis.offsetHeight - 50;
    
    //init Hypertree
    ht = new $jit.Hypertree({
      //id of the visualization container
      injectInto: 'infovis',
      //canvas width and height
      width: w,
      height: h,
      //Change node and edge styles such as
      //color, width and dimensions.
      Node: {
          dim: 9,
          color: "#f00",
          overridable: true, 
      },
      Edge: {
          lineWidth: 2,
          color: "#088"
      },
      onBeforeCompute: function(node){
          //Log.write("centering");
      },
      //Attach event handlers and add text to the
      //labels. This method is only triggered on label
      //creation
      onCreateLabel: function(domElement, node){
          domElement.innerHTML = node.name + " ("+node.data.urls.length+")";
          $jit.util.addEvent(domElement, 'click', function () {
              ht.onClick(node.id, {
                  onComplete: function() {
                      ht.controller.onComplete();
                  }
              });
          });
      },
      //Change node styles when labels are placed
      //or moved.
      onPlaceLabel: function(domElement, node){
          var style = domElement.style;
          style.display = '';
          style.cursor = 'pointer';
          if (node._depth <= 1) {
              style.fontSize = "1.2em";
              style.color = "#ddd";

          } else if(node._depth == 2){
              style.fontSize = "1.0em";
              style.color = "#555";

          } else {
              style.display = 'none';
          }

          var left = parseInt(style.left);
          var w = domElement.offsetWidth;
          style.left = (left - w / 2) + 'px';
      },
      
      onComplete: function(){
          //Log.write("done");
          
          //Build the right column relations list.
          //This is done by collecting the information (stored in the data property) 
          //for all the nodes adjacent to the centered node.
          var node = ht.graph.getClosestNodeToOrigin("current");
          var html = "<h4>" + node.name + "</h4><b>Connections:</b>";
          html += "<ul>";
          node.eachAdjacency(function(adj){
              var child = adj.nodeTo;
              if (child.data) {
                  var rel = (child.data.band == node.name) ? child.data.relation : node.data.relation;
                  html += "<li>" + child.name + " " + "<div class=\"relation\">(relation: " + rel + ")</div></li>";
              }
          });
          html += "</ul>";
          $jit.id('inner-details').innerHTML = html;
      }
    });
}



function loadGraphData(json) {
	status("Loading graph data");
    //load JSON data.
    ht.loadJSON(json);
    //compute positions and plot.
    ht.refresh();
    //end
    ht.controller.onComplete();
	status("Complete!");
}
