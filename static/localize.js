// make translations with Polyglot.js
var polyglot, _;
var rightToLeft = false;

// in Chrome app - determine language on client side
if(typeof outOfChromeApp == "undefined" || !outOfChromeApp){
  chrome.i18n.getAcceptLanguages(function(languageList){
    var preferredLocale = (languageList[0]).toLowerCase().replace("-","_");
    // check if there is a match for the complete locale (e.g., es_uy)
    if(!allTranslations[preferredLocale]){
      // check if there is a match for the root locale (es_uy -> es)
      preferredLocale = preferredLocale.split("_")[0];
      if(!allTranslations[preferredLocale]){
        // default (en)
        preferredLocale = "en";
      }
    }
    translations = allTranslations[preferredLocale];
    doTranslations();
  });
}
else{
  doTranslations();
}

function doTranslations(){
  polyglot = new Polyglot({ phrases: translations });
  _ = function(word, vars){
    return polyglot.t(word, vars);
  };

  // translate words already on the page
  var translateWords = $(".translate");
  $.each(translateWords, function(w, word_element){
    var word = $(word_element).text();
    $(word_element).text( _(word) );
  });
  
  // set page language (helps use spellcheck)
  $("html").attr("lang", _("en"));

  // check for right-to-left languages (including Arabic)
  // text inputs should have dir="auto" already set
  if(_("ltr") == "rtl"){
    rightToLeft = true;
    $("html").attr("dir", "rtl");
    $("body").addClass("rtl");
  }
}