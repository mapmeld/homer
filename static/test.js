// multilingual input with jQuery.IME
$("textarea").ime();

// highlight word list with jQuery.highlighttextarea
$(document).ready(function(){
  if(typeof outOfChromeApp == "undefined" || !outOfChromeApp){
    $("textarea").width(650).height(100);
  }

  $("textarea").highlightTextarea({
    words: ['hello', 'world', 'नेपाल'],
    letters: ['q'],
    caseSensitive: false
  });
});

// make translations with Polyglot.js
var polyglot, _;

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

// translate words already on the page
function doTranslations(){
  polyglot = new Polyglot({ phrases: translations });
  _ = function(word){
    return polyglot.t(word);
  };

  var translateWords = $(".translate");
  $.each(translateWords, function(w, word_element){
    var word = $(word_element).text();
    $(word_element).text( _(word) );
  });
}

// drop an image onto the page
var files, fileindex;

var blockHandler = function(e){
  e.stopPropagation();
  e.preventDefault();
};

var processFile = function(e){
  var img_url = e.target.result;
  $(".filedrop").removeClass("bordered").html("").append($("<img/>").attr("src", img_url));
};

var dropFile = function(e){
  e.stopPropagation();
  e.preventDefault();

  files = e.dataTransfer.files;
  if(files && files.length){
    var reader = new FileReader();
    reader.onload = processFile;
    reader.readAsDataURL(files[0]);
  }
};
window.addEventListener('dragenter', blockHandler, false);
window.addEventListener('dragexit', blockHandler, false);
window.addEventListener('dragover', blockHandler, false);
window.addEventListener('drop', dropFile, false);


// PDF export
function pdfify(){
  var ctx = $("canvas")[0].getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.rect(0, 0, 500, 300);
  ctx.fill();
  ctx.font = "20px sans-serif";
  ctx.fillStyle = "#000";
  ctx.fillText($("textarea").val(), 0, 40);

  var doc = new jsPDF();

  // add sample text
  doc.text(20, 20, "TEST UNICODE");

  // add user image
  var img_offset = 0;
  var page_img = $(".filedrop").find("img");
  if(page_img.length){
    var insert_img = $(page_img[0]);
    img_offset += insert_img.height() / 8;
    var img_format = 'PNG';
    if(insert_img.attr("src").indexOf("data:image/jpeg") === 0){
      img_format = 'JPEG';
    }
    doc.addImage(insert_img.attr("src"), img_format, 20, 40, insert_img.width() / 8, insert_img.height() / 8);
  }

  // add internationalized text as an image
  var imgData = $("canvas")[0].toDataURL();
  doc.addImage(imgData, 'PNG', 20, 40 + img_offset, 125, 75);

  //doc.addPage();
  // http://parall.ax/products/jspdf

  doc.save('Test.pdf');
}

$(".pdfify").on("click", pdfify);
