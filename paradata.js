function buildParadataDisplay(data) {

	var documents = data.documents.document;
	for(var i = 0; i < documents.length; i++) {
		doc = documents[i];
		if(doc.resource_data_type=="paradata") {
			var paradataDoc = buildParadataDoc(doc);
		}
		
	}
}

function buildParadataDoc(doc) {
	//debug("<p>buildParadataDoc: "+JSON.stringify(doc));
	var paradataDoc= {
		id : doc.doc_id,
		url : doc.resource_locator,
		identity : doc.identity,
		payload_placement: doc.payload_placement
	}
	if(doc.payload_placement=="inline" && (" "+doc.payload_schema).indexOf("Comm")!=-1) {
		//paradataDoc.comm_paradata_src = doc.resource_data;
		var xmlDoc = $.parseXML(doc.resource_data);
		$xml = $( xmlDoc );
		//paradataTitle, paradataDescription
    	paradataDoc.paradataTitle = $xml.find( "paradataTitle" );
    	paradataDoc.paradataDescription = $xml.find( "paradataDescription" ); 
		/*var paradataJson = $.xml2json(doc.resource_data);
		paradataDoc.paradata = paradataJson;
		debug("<p>paradata: "+ JSON.stringify(paradataJson));*/
	}
}



function buildParadataListing(doc_id) {
	var doc = docDictionary[doc_id];
	if(doc) {
		var url = doc.url;
		var obtain_url = NODE_URL + '/obtain?by_doc_ID=true&request_id=' + doc_id
		var output = '<h3><a href="#">' + doc_id + '</a></h3>';
		output += '<div id="' + doc_id + '">';
		output += '<a href="' + url + '" target="_blank">View resource</a>'
		output += ' | <a href="' + obtain_url + '" target="_blank">View Full Learning Registry entry</a><br>';
		output += '<button id="' + doc_id + '_loadPara" class="paradataLoader">Find Paradata</button> <br><br>';
		/*if(doc.type) {
		 output += '<b>type</b>: ' + doc.type+ '<br><br>';
		 }*/
		for(var identity_type in doc.identity) {
			var identity_value = doc.identity[identity_type];
			output += '<b>' + identity_type + '</b>: ' + identity_value + '<br>';
		}
		if(doc.keys) {
			output += '<b>keywords</b>: ';
			output += doc.keys.join(", ");
		}
		output += '</div>';

		return output;
	} else {
		return "---";
	}
}