/**
 * @author jaybee
 */

var TAG = "Tag";
var INSTITUTION = "Insitution";
var termType=TAG;

var searchMode=TAG;

$(function(){
	$("button").button();
	$("#radio1").buttonset();
    $("#Tag").button({
        icons: {
            primary: 'ui-icon-tag'
        },
        text: false
    });
    $("#Institution").button({
        icons: {
            primary: 'ui-icon-home'
        },
        text: false
    });
    $("#RelatedTags").button({
        icons: {
            primary: 'ui-icon-tag'
        },
        text: true
    });
    $("#RelatedInstitutions").button({
        icons: {
            primary: 'ui-icon-home'
        },
        text: true
    });
	
    $("#Tag").click(function(){
    	termType = TAG;
       $("#termType").html(TAG+":")
    });
    $("#Institution").click(function(){
    	termType = INSTITUTION;
       $("#termType").html(INSTITUTION+":")
    });
	
    $("#RelatedTags").click(function(){
       searchMode=TAG;
       handleSlice();
    });
	
    $("#RelatedInstitutions").click(function(){
       searchMode=INSTITUTION;
       handleSlice();
    });
});

function debug(msg){
    $('#debug').append('<p>' + msg + '</p>');
}

var handleSlice = function(data) {
	var ajaxArgs = {
		  url: "http://lrdev03.learningregistry.org/slice",
		  dataType: 'jsonp',
		  jsonp: 'callback',
		  data: { },
		  success: handleSlice
	};
	if(termType==TAG) ajaxArgs.data.any_tags = $("#term").val();
	else ajaxArgs.data.identity = $("#term").val();

	if(data) {
		window.results_documents = window.results_documents.concat(data.documents);
		if(data.resumption_token) {
			ajaxArgs.resumption_token = data.resumption_token;
			$.ajax(ajaxArgs);	
		} else {
			parseSliceResults();
		}
	} else {
		$.ajax(ajaxArgs);
	}
	
}
