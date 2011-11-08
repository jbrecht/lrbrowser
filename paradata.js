function buildParadataDisplay(data) {

	var documents = data.documents[0].document;
	var output = "<div><h4>Paradata</h4>";
	var paradata_count = 0;
	for(var i = 0; i < documents.length; i++) {
		doc = documents[i];
		if(doc.resource_data_type=="paradata") {
			paradata_count++;
			var paradataDoc = buildParadataDoc(doc);
			output += buildParadataListing(paradataDoc, true);
			output += "<br>";
		}
	}
	if(paradata_count == 0)  output += "No paradata found for this resource";
	output += "</div>";
	
	return output;
}

function buildParadataDoc(doc) {
	debug("<p>buildParadataDoc: "+JSON.stringify(doc));
	var paradataDoc= {
		id : doc.doc_id,
		resource_url : doc.resource_locator,
		identity : doc.identity,
		payload_placement: doc.payload_placement
	}
	if(doc.payload_placement=="inline") {
		var isComm = false;
		if((" "+doc.payload_schema).indexOf("Comm")!=-1 || (" "+doc.payload_schema).indexOf("comm")!=-1) {
			var xmlDoc = $.parseXML(doc.resource_data);
			$xml = $( xmlDoc );
			//paradataTitle, paradataDescription
	    	paradataDoc.paradataTitle = $xml.find( "paradataTitle" );
	    	paradataDoc.paradataDescription = $xml.find( "paradataDescription" ); 
		} else {
			paradataDoc.paradata_src = doc.resource_data;
		}
	} else if(doc.payload_placement=="linked") {
		paradataDoc.url = doc.payload_locator;
	}
	debug("built paradataDoc:  " + JSON.stringify(paradataDoc));
	
	return paradataDoc;
}



function buildParadataListing(paradataDoc, includeID) {
	debug("build paradata listing...");
	var output = '<div id="' + paradataDoc.id + '_paradata">';
	if(includeID) {
		for(var identity_type in paradataDoc.identity) {
			var identity_value = paradataDoc.identity[identity_type];
			output += '<b>' + identity_type + '</b>: ' + identity_value + '<br>';
		}
	}
	if(paradataDoc.url) {
		output += '<a href="' + paradataDoc.url + '" target="_blank">View Paradata</a><br>'
	} else if(paradataDoc.paradataTitle){
		output += '<b>title</b>: ' + paradataDoc.paradataTitle + '<br>';
		output += '<b>description</b>: ' + paradataDoc.paradataDescription + '<br>';
	} else if(paradataDoc.paradata_src) {
		output += '<b>Raw Paradata</b>: ' + paradataDoc.paradata_src + '<br>';
	}
	output += '</div>';

	return output;
}