// CSRF token
var csrf_token = '';

// store page content
var pages = [{ text: [], image: [], layout: [] }];
var current_page = 0;
var current_image = null;

var book = null;
var highlighter = null;
var twoPageOn = false;
var phonicsWhitelist = [];
var activeImage = null;

if(font && font.name) {
  font.name = font.name.replace("web_", "");
} else {
  font = {
    name: "arial",
    size: 18
  };
  cover = {};
  layout = {};
}

function saveCurrentPage(callback) {
  // get cover
  if(current_page === -1) {
    if (typeof callback === 'function') {
      callback();
    }
    return;
  }

  current_page = Math.floor(current_page / 2) * 2;

  if($("#pbsLeftPage").html()) {
    // save text content from the left page (if it exists)
    pages[current_page].text = [];
    var textAreas = $("#pbsLeftPage textarea");
    textAreas.each(function (i, textArea) {
      var pageText = $(textArea).val();
      pages[current_page].text.push(pageText);
      PBS.KIDS.storybook.config.pages[current_page].content[i].text = pageText;
    });

    // save images
    if (!pages[current_page].image) {
      pages[current_page].image = [];
    }
    var imgs = $("#pbsLeftPage .pbsSprite");
    var img_offset = textAreas.length;
    var bg_offset = 0;
    imgs.each(function (i, img) {
      // skip the background canvas unless this page specifically styles it
      if (!i && !PBS.KIDS.storybook.config.pages[current_page].background.url) {
        img_offset--;
        bg_offset++;
        return;
      }

      try {
        var imgURL = img.toDataURL();
        pages[current_page].image[i - bg_offset] = imgURL;
        PBS.KIDS.storybook.config.pages[current_page].content[i + img_offset].url = imgURL;
      } catch(e) {
      }
    });

    var page_lister = current_page;
    var page_lister_right = current_page + 1;
    if (_("ltr") === "rtl") {
      page_lister = pages.length - page_lister - 1;
      page_lister_right = page_lister - 1;
    }

    // show a snippet of text in the left nav
    if (pages[current_page].text.length) {
      $($(".page-list p")[page_lister]).text(pages[current_page].text[0].substring(0, 19));
    }

    // save content from the right page (if it exists)
    if(pages.length > current_page + 1) {

      // update text areas from right page
      pages[current_page + 1].text = [];
      var rightTextAreas = $("#pbsRightPage textarea");
      rightTextAreas.each(function(i, textArea) {
        var pageText = $(textArea).val();
        pages[current_page + 1].text.push(pageText);
        PBS.KIDS.storybook.config.pages[current_page + 1].content[i].text = pageText;
      });

      // update images from right page
      if (!pages[current_page + 1].image) {
        pages[current_page + 1].image = [];
      }
      var rightImgs = $("#pbsRightPage .pbsSprite");
      var rightImgOffset = rightTextAreas.length;
      bg_offset = 0;
      rightImgs.each(function (i, img) {
        // skip the background canvas unless this page specifically styles it
        if (!i && !PBS.KIDS.storybook.config.pages[current_page + 1].background.url) {
          rightImgOffset--;
          bg_offset++;
          return;
        }

        try {
          var imgURL = img.toDataURL();
          pages[current_page + 1].image[i - bg_offset] = imgURL;
          PBS.KIDS.storybook.config.pages[current_page + 1].content[i + rightImgOffset].url = imgURL;
        } catch(e) {
        }
      });

      if (pages[current_page + 1].text.length) {
        $($(".page-list p")[page_lister_right]).text(pages[current_page + 1].text[0].substring(0, 19));
      }
    }
  }

  if(current_image){
    // upload image and then issue callback
  }
  else if (typeof callback === "function") {
    // nothing to async upload - make callback now
    callback();
  }
}

function makePageJumps(p, pagejumps) {
  // helps automatically move user off of the cover page
  if(pagejumps < p) {
    pagejumps += 2;
    var ev = book.addEventListener("PAGE_CHANGE", function() {
      book.removeEventListener(ev);
      if (_("ltr") === "rtl") {
        book.previousPage();
      } else {
        book.nextPage(p, pagejumps);
      }
    });
  }
}

function setCurrentPage(p, isAddingPage) {
  saveCurrentPage(function(){
    // highlight the current page in the menu
    var list_index = p;
    if (_("ltr") === "rtl") {
      // special rules for right-to-left books
      if(isAddingPage) {
        list_index = pages.length - 1;
      } else {
        list_index = pages.length - p - 1;
      }
    }
    $(".page-list a").removeClass("active");
    $($(".page-list a")[list_index]).addClass("active");

    // don't move if user requests the current two-page spread
    if(p === current_page) {
      return;
    } else if (_("ltr") === "rtl" && (p % 2) && (current_page === p - 1)) {
      return;
    }

    if(current_page > -1) {
      // regular page - use library's gotoPage function
      book.gotoPage(p);
    }
    else {
      // cover page - use callbacks
      makePageJumps(p, -1);
    }
    current_page = p;
  });
}

// drop a file onto the page
var files, fileindex;

var blockHandler = function (e) {
  e.stopPropagation();
  e.preventDefault();
};

// process an image upload
var processImage = function (e) {
  var iw = $(activeImage.canvas).width() * 2;
  var ih = $(activeImage.canvas).height() * 2;
  activeImage.fill = "#fff";
  activeImage.fillRect(0, 0, iw, ih);

  var i = new Image();
  i.onload = function () {
    if (i.width / i.height > iw / ih) {
      ih = i.height * iw / i.width;
    } else {
      iw = i.width * ih / i.height;
    }

    activeImage.drawImage(i, 0, 0, iw, ih);
    $("#iconmodal").modal('hide');
    saveCurrentPage();
  };
  i.src = e.target.result;
};

// async: process English text and callback with phonics information
function loadPhonics(textBlurb, callback) {
  var text = textBlurb.replace(/(\r|\n)/g, " ").split(' ');
  var words = [];
  for(var w = 0; w < text.length; w++) {
    var word = text[w].replace(/\b[-.,()&$#!\[\]{}"']+\B|\B[-.,()&$#!\[\]{}"']+\b/g, "");
    if (word) {
      words.push(word);
    }
  }
  $.getJSON("/phonics?words=" + words.join(","), function (phonics) {
    if (callback && typeof callback === 'function') {
      callback(phonics);
    }
  });
}

function loadPhonicsIntoWorksheet(wordlist) {
  // add each word
  for(var word in wordlist) {
    if (wordlist.hasOwnProperty(word)) {
      // for each valid pronunciation
      for(var p = 0; p < wordlist[word].length; p++) {
        // add each syllable once
        for(var s = 0; s < wordlist[word][p].length; s++) {
          var syllable = wordlist[word][p][s];
          if (phonicsWhitelist.indexOf(syllable) === -1) {
            phonicsWhitelist.push(syllable);
          }
        }
      }
    }
  }
}

// process a word list upload
var wordWhitelist = [];
var masterlist = {};
var letterWhitelist = ['abcdefghijklmnopqrstuvwxyz,.?;:\'\"!àèò'];
$.getJSON("/wordlist/haiti", function(word_array) {
  setWhitelist(word_array);
});
// loadPhonics(wordWhitelist.join(' '), loadPhonicsIntoWorksheet);

function removeAccents(content){
  var accents = {
    "a": ["à"],
    "e": ["è","é"],
    "i": [ ],
    "o": ["ò"],
    "u": [],
    "-": ["/"]
  };
  for(var letter in accents){
    for(var a=0;a<accents[letter].length;a++){
      content = replaceAll(content, accents[letter][a], letter);
    }
  }
  return content;
}

function replaceAll(src, oldr, newr){
  while(src.indexOf(oldr) > -1){
    src = src.replace(oldr, newr);
  }
  return src;
}

function setWhitelist (whitelist) {
  // reset existing whitelists
  wordWhitelist = [];
  letterWhitelist = [];
  for (var w=0; w<whitelist.length; w++) {
    var word = whitelist[w];

    // add all letters to letter list
    for(var i=0;i<word.length;i++){
      if(letterWhitelist.indexOf(word[i]) === -1){
        letterWhitelist.push(word[i]);
      }
    }

    // include words in word list
    if(wordWhitelist.indexOf(word) === -1){
      wordWhitelist.push(word);
    }
  }

  // update antihighlighter plugin
  if (layout.grader === 'phonics') {
    loadPhonics(wordWhitelist.join(' '), loadPhonicsIntoWorksheet);
  } else {
    var autocomplete_list = [];

    for (var m = 0; m < wordWhitelist.length; m++) {
      var part_of_speech = wordWhitelist[m].split('~')[0];
      var word = wordWhitelist[m].split('~')[1];
      wordWhitelist[m] = word;

      var simple_word = removeAccents(word);
      autocomplete_list.push(simple_word);
      masterlist[simple_word] = { part_of_speech: part_of_speech, word: word };
    }

    letterWhitelist = [letterWhitelist.join('')];
    if (highlighter) {
      highlighter.antihighlight('setLetters', letterWhitelist);
      highlighter.antihighlight('setWords', wordWhitelist);
    }

    // set typeahead / autocomplete to new wordlist
    $(".typeahead").typeahead({
      source: autocomplete_list,
      highlighter: function(item){
        var select_word = masterlist[item].word;
        var part_of_speech = masterlist[item].part_of_speech;
        var word_bar = $("<li><a href='#'>" + select_word + "</a></li>")
        word_bar.find('a').click(function(e) {
          e.preventDefault();
          var content = $(currentText).val();
          var lastSpace = Math.max(content.lastIndexOf(" "), content.lastIndexOf("\n"));
          $(".hover-word-suggest").hide();
          $(currentText).val( content.substring(0, lastSpace + 1) + select_word + " ").focus();
        });
        $("td." + part_of_speech).show();
        $("tr.suggested td." + part_of_speech).append(word_bar);
        $(".hover-word-suggest").show();
        return null;
      },
      minLength: 1
    });
  }

  // sentences in page check + words in sentence check
  var runPage = function (page) {
    var pageWords = 0;
    $(page + " textarea").each(function(i, txt) {
      pageWords += $(txt).val().replace(/\s+/, ' ').split(' ').length;

      if (layout.sentenceWords) {
        var sentences = $(txt).val().split(/\.|!|\?|,/);
        for (var s = 0; s < sentences.length; s++) {
          var wordCount = sentences[s].replace(/\s+/, ' ').split(' ').length;
          if (wordCount > layout.sentenceWords) {
            $(txt).css("border", "1px solid #f88");
          } else {
            $(txt).css("border", "1px solid rgb(34, 34, 34)");
          }
        }
      }
    });
    if (layout.pageWords) {
      if (pageWords > layout.pageWords) {
        $(page + " textarea").css("border", "1px solid #f88");
      } else {
        $(page + " textarea").css("border", "1px solid rgb(34, 34, 34)");
      }
    }
  };
  runPage("#pbsLeftPage");
  runPage("#pbsRightPage");

  // make sure fonts have same properties, so highlights match words in textbox
  $('.highlighter').css({
    'font-family': font.name,
    'font-size': font.size + "pt",
    'line-height': layout.lineSpace + "pt"
  });

  return wordWhitelist;
}

// set default letter and word lists
var menuItem = $(".user-login .dropdown-menu li");
menuItem.find("a").on("click", function() {
  $(".dropdown-menu.wordlists li").removeClass("active");
  menuItem.addClass("active");
  setWhitelist(['abcdefghijklmnopqrstuvwxyz,.?;:\'\"!àèò']);
});

// download a copy of all user + team word lists, add to a menu
var wordlists_by_id = {};
$.getJSON("/wordlist/all", function (metalist) {
  $.each(metalist, function(i, list) {
    var menuItem = $("<li role='presentation'>");
    menuItem.append($("<a href='#' role='menuitem'>").text(list.name));
    $(".dropdown-menu.wordlists").append(menuItem);
    menuItem.find("a").on("click", function() {
      $(".dropdown-menu.wordlists li").removeClass("active");
      menuItem.addClass("active");

      // AJAX to download the actual wordlist once selected
      if(!wordlists_by_id[list._id]) {
        $.getJSON("/wordlist/" + list._id, function(detail_list) {
          wordlists_by_id[detail_list._id] = detail_list.words;
          setWhitelist(detail_list.words);
        });
      }
      else {
        setWhitelist(wordlists_by_id[list._id]);
      }
    });
  });
});

// when offline - load previous word lists from app storage
if (typeof outOfChromeApp === "undefined" || !outOfChromeApp) {
  chrome.storage.local.get(null, function (items) {
    $.each(items, function(hash, list){
      // filter storage for word lists
      if(!list.type || list.type !== "wordlist") {
        return;
      }

      var menuItem = $("<li role='presentation'>");
      menuItem.append($("<a href='#' role='menuitem'>").text(list.name));
      $(".user-login .dropdown-menu").append(menuItem);

      // make word list selectable
      menuItem.find("a").on("click", function() {
        $(".dropdown-menu.wordlists li").removeClass("active");
        menuItem.addClass("active");
        setWhitelist(list.wordlist.split(' '));
      });
    });
  });
}

// uploading a whitelist when a user presses "Save" button
$("#wordmodal .save").on("click", function() {
  var name = $("#wordmodal #wordlistname").val();
  var wordlist = $("#wordmodal p").text();

  // add to word list dropdown for logged-in users
  $(".dropdown-menu.wordlists li").removeClass("active");

  var menuItem = $("<li role='presentation' class='active'>");
  menuItem.append($("<a href='#' role='menuitem'>").text(name));
  $(".dropdown-menu.wordlists").append(menuItem);
  menuItem.find("a").on("click", function() {
    $(".dropdown-menu.wordlists li").removeClass("active");
    menuItem.addClass("active");
    setWhitelist(wordlist.split(" "));
  });

  if (typeof outOfChromeApp === "undefined" || !outOfChromeApp) {
    // save to Chrome app version of localStorage
    var hash = md5(wordlist);
    chrome.storage.local.get('wordlist_' + hash, function(item){
      if (!Object.keys(item).length) {
        // creating a new list in localStorage
        var storeVal = {};
        storeVal['wordlist_' + hash] = {type: 'wordlist', name: name, wordlist: wordlist};
        chrome.storage.local.set(storeVal, function(){
          console.log('list saved as ' + storeName);
        });
      }
      else{
        // list exists in localStorage
        return;
      }
    });

  } else {
    // online - post word list to server
    $.post("/wordlist", {name: name, wordlist: wordlist, _csrf: csrf_token, grader: (layout.grader || "words")}, function(response) {
      console.log(response);
    });
  }
});

// process a dropped file into letter and word lists
var processWhitelist = function (e) {
  var whitelist = e.target.result;
  // reduce to lowercase words separated by spaces
  whitelist = whitelist.replace(/\r?\n|\r/g, ' ').replace(/\s\s+/g, ' ').toLowerCase().split(' ');

  whitelist = setWhitelist(whitelist);

  // display and save whitelist for final approval
  $("#wordmodal .modal-body input").val("");
  $("#wordmodal .modal-body p").text(whitelist.join(" ").substring(0,500));
  $("#wordmodal").modal('show');
};


// file drop handlers
var dropFile = function (e) {
  e.stopPropagation();
  e.preventDefault();

  files = e.dataTransfer.files;
  if (files && files.length) {
    var reader = new FileReader();

    var fileType = files[0].type.toLowerCase();
    if(fileType.indexOf("image") > -1){
      // process an image
      reader.onload = processImage;
      reader.readAsDataURL(files[0]);
    }
    else{
      // process a whitelist of letters and words
      reader.onload = processWhitelist;
      reader.readAsText(files[0]);
    }
  }
};
window.addEventListener('dragenter', blockHandler, false);
window.addEventListener('dragexit', blockHandler, false);
window.addEventListener('dragover', blockHandler, false);
window.addEventListener('drop', dropFile, false);

// books can be created and updated on online site
var book_id = null;

function upload(callback) {
  saveCurrentPage(function(){
    $.post("/book", {pages: pages, book_id: book_id, _csrf: csrf_token}, function(response) {
      // redirect to newly created or updated book
      if(!book_id || book_id !== response.id) {
        book_id = response.id;
        history.replaceState({}, "", "/edit?id=" + book_id);
      }
      if (typeof callback === 'function') {
        callback();
      }
    });
  });
}
$(".upload").on("click", upload);
$(".btn.view").click(function() {
  upload(function() {
    window.location.href = "/book2/" + book_id;
  });
});

function checkPhonics(textBlurb) {
  loadPhonics(textBlurb, function(phonics) {
    var rejectWords = [];
    for (var word in phonics) {
      if (phonics.hasOwnProperty(word)) {
        var wordWorks = false;
        for (var p = 0; p < phonics[word].length; p++) {
          var pronunciationWorks = true;
          for (var s = 0; s < phonics[word][p].length; s++) {
            var syllable = phonics[word][p][s];
            if (phonicsWhitelist.indexOf(syllable) === -1) {
              // unknown phoneme - reject this pronunciation
              pronunciationWorks = false;
              break;
            }
          }
          if (pronunciationWorks) {
            // one of this word's pronunciations works - accept word
            wordWorks = true;
          }
        }
        if (!wordWorks && phonics[word].length) {
          // this word is known and it was rejected
          rejectWords.push(word);
        }
      }
    }
    if (rejectWords.length) {
      // highlight these phonics words
      highlighter.antihighlight('setReject', rejectWords);
    }
  });
}

// color changer on icons
var rgb_of = {
  "black": [0, 0, 0],
  "pink": [255, 105, 180],
  "red": [255, 0, 0],
  "orange": [255, 165, 0],
  "yellow": [230, 230, 0],
  "green": [0, 200, 0],
  "blue": [0, 0, 200],
  "purple": [200, 0, 200]
};

$("#iconmodal li a").click(function(e) {
  $("#iconmodal li").removeClass("active");
  var li = $(e.target).parent();
  li.addClass("active");
  if (li.hasClass("all")) {
    $("#iconmodal img").show();
  } else if (li.hasClass("people")) {
    $("#iconmodal img").hide();
    $("#iconmodal .people").show();
  } else if (li.hasClass("animals")) {
    $("#iconmodal img").hide();
    $("#iconmodal .animals").show();
  }
});

$(".color-bar span").on("click", function(e){
  var color = $(e.target).attr("class");
  var canvas = $("canvas.color-change")[0];
  var ctx = canvas.getContext('2d');
  $.each($("#iconmodal img"), function(x, img) {
    // clear canvas
    ctx.clearRect(0, 0, 164, 164);

    // draw black icon
    ctx.drawImage(img, 0, 0, 164, 164);

    // pixel replace
    var imageData = ctx.getImageData(0, 0, 164, 164);
    for (var i = 0; i < imageData.data.length; i += 4) {
      if(imageData.data[i+3]) {
        imageData.data[i] = rgb_of[color][0];
        imageData.data[i+1] = rgb_of[color][1];
        imageData.data[i+2] = rgb_of[color][2];
      }
    }
    ctx.putImageData(imageData,0,0);

    // replace icon
    img.src = canvas.toDataURL();
  });
});

// activate first page link
$($(".page-list").children()[0]).on("click", function() {
  if (_("ltr") === "rtl") {
    setCurrentPage(pages.length - 1);
  } else {
    setCurrentPage(0);
  }
});

var currentText;
function launchWordGuide(textarea, pressed) {
  var content = $(textarea).val();
  if (pressed) {
    content += pressed;
  }
  if ($(textarea).offset().left < ($(window).width() / 2) - 100) {
    $(".hover-word-suggest").removeClass("left").addClass("right");
  } else {
    $(".hover-word-suggest").removeClass("right").addClass("left");
  }
  var lastWord = content.substring(Math.max(content.lastIndexOf(" "), content.lastIndexOf("\n")) + 1);
  $(".hover-word-suggest").hide();
  if (lastWord.length > 1) {
    currentText = textarea;
    $(".hover-word-suggest input").val(lastWord).trigger('keydown').trigger('keyup').trigger('keypress');
  }
}

function renderBook(GLOBAL, PBS) {

  // Create the storybook
  book = PBS.KIDS.storybook.book(GLOBAL, PBS, $(".well.page")[0], PBS.KIDS.storybook.config);

  // Load the storybook resources
  book.load();

  // wait for page to load before reactivating plugins
  book.addEventListener("PAGE_CHANGE", function () {
    current_page = book.getPage();

    // activate antihighlight
    if (layout.grader === "phonics") {
      highlighter = $("textarea").antihighlight({
        caseSensitive: false
      });
    } else {
      highlighter = $("textarea").antihighlight({
        words: wordWhitelist,
        letters: letterWhitelist,
        caseSensitive: false
      });
    }

    // match styling on antihighlight and textareas
    $('.highlighter').css({
      'font-family': font.name,
      'font-size': font.size + "pt",
      'line-height': layout.lineSpace + "pt"
    });

    // full-page and two-page text areas
    if(twoPageOn) {
      $("textarea").css({ "z-index": 999 });
      $(".antihighlight").width($("textarea").width());
    }
    $("textarea").resize();

    // auto-suggest last word
    $("textarea").on("keypress", function(e) {
      var pressed = String.fromCharCode(e.which);
      if (!pressed) {
        return;
      }
      launchWordGuide(e.target, pressed);
    });
    $("textarea").on("keyup", function(e){
      if (e.keyCode === 8) {
        launchWordGuide(e.target);
      }
    });
    $(".typeahead").on("keydown", function() {
      // clear suggestions
      $("tr td").hide();
      $("tr.suggested td").html("");
    });

    // multilingual input with jQuery.IME
    // $("textarea").ime();

    // when user leaves the textarea, do more difficult check for phonics
    // only English words are currently in the system
    if ((_("en") === "en") && (layout.grader && layout.grader === "phonics")) {
      $("textarea").on("blur", function (e) {
        if (phonicsWhitelist && phonicsWhitelist.length) {
          var text = $(e.target).val();
          checkPhonics(text);
        }
      });
    }

    // when user leave the textarea, make sure words have good spacing
    if(layout.wordSpace) {
      if (typeof layout.wordSpace === "number") {
        var spacer = "  ";
        for (var i = 2; i < layout.wordSpace; i++) {
          spacer += " ";
        }
        layout.wordSpace = spacer;
      }
      if ((typeof layout.wordSpace === "string") && (layout.wordSpace.length > 1)) {
        $("textarea").on("blur", function (e) {
          var text = $(e.target).val();
          text = text.replace(/(\s-\n)+/g, layout.wordSpace);
          $(e.target).val(text);
          // doesn't work on right page
          highlighter.antihighlight('highlight');
        });
      }
    }

    // make images clickable
    $(".pbsSprite").each(function (i, spriter) {
      $(spriter).click(function (e) {
        var canvas = e.target;
        activeImage = canvas.getContext('2d');
        if ($(canvas).hasClass("pbsPageCanvas")) {
          // clicked on the background canvas - is this customized?
          var pageID = $("#pbsRightPage .pbsSprite").parent().parent().attr("id");
          if (pageID === "pbsLeftPage") {
            if (!PBS.KIDS.storybook.config.pages[current_page] || !PBS.KIDS.storybook.config.pages[current_page].background.url) {
              return;
            }
          } else if (pageID === "pbsRightPage") {
            if (!PBS.KIDS.storybook.config.pages[current_page + 1] || !PBS.KIDS.storybook.config.pages[current_page + 1].background.url) {
              return;
            }
          } else {
            // cover?
            return;
          }
        }
        $("#iconmodal").modal('show');
        $("#iconmodal .modal-body").find('img').on('click', function (e) {
          $("#iconmodal .modal-body").find('img').off();
          var ctx = activeImage;
          ctx.fillStyle = "#fff";
          ctx.fillRect(0, 0, 500, 250);
          ctx.drawImage(e.target, 0, 0, 300, 300);
          $("#iconmodal").modal('hide');
          saveCurrentPage();
        });
      });
    });

    // when user leaves the textarea, save its contents
    $("textarea").on("blur", saveCurrentPage);
  });
}

// adding a new page
$(".new-page").on("click", function() {
  $("#pagemodal").modal('show');
});

function addNewPage(e) {
  // create new page in left menu
  pages.push({ text: [], image: [], layout: [] });
  var addPage = $("<a class='list-group-item' href='#'></a>");
  addPage.append($("<h4 class='list-group-item-heading'>" + _("page_num", { page: pages.length }) + "</h4>"));
  addPage.append($("<p class='list-group-item-text'></p>"));
  $($(".page-list .list-group-item")[pages.length-2]).after(addPage);

  // activate link to page in left menu
  var myPageNum = pages.length - 1;
  addPage.on("click", function(){
    var clickPageNum = myPageNum;
    if (_("ltr") === "rtl") {
      clickPageNum = pages.length - myPageNum - 1;
    }
    setCurrentPage(clickPageNum);
  });

  // rtl: flip the pages to add this page to the 'end'
  if (_("ltr") === "rtl") {
    PBS.KIDS.storybook.config.pages.reverse();
  }

  var newPageItems = [];
  var background = {};
  if (e && e.target) {
    // arriving from page modal
    $("#pagemodal .textposition").each(function(i, textPos) {
      if (textPos.checked) {
        if (textPos.name === "top") {
          newPageItems.push( getTopText(_("new_page_message")) );
          pages[pages.length-1].layout.push("top");
        } else if (textPos.name === "bottom") {
          newPageItems.push( getBottomText(_("new_page_message")) );
          pages[pages.length-1].layout.push("bottom");
        } else if (textPos.name === "bg") {
          newPageItems.push( getFullPageText(_("new_page_message")) );
          pages[pages.length-1].layout.push("bg");
        }
      }
    });
    $("#pagemodal .imgposition").each(function(i, imgPos) {
      if (imgPos.checked) {
        if (imgPos.name === "top") {
          newPageItems.push( getTopImg() );
          pages[pages.length-1].layout.push("image_top");
        } else if (imgPos.name === "bottom") {
          newPageItems.push( getBottomImg() );
          pages[pages.length-1].layout.push("image_bottom");
        } else if (imgPos.name === "bg") {
          background = {
            color: "#c8c8c8",
            url: prefix + "images/blank.png"
          };
          pages[pages.length-1].layout.push("image_bg");
        }
      }
    });
  } else {
    // triggering it directly
    if(!twoPageOn || (pages.length % 2) ) {
      newPageItems.push( makeFirstPage(_("new_page_message")) );
    }
  }

  PBS.KIDS.storybook.config.pages.push({
    background: background,
    content: newPageItems
  });

  // clear and rebuild book
  $(".page.well").html("");
  renderBook(window, PBS);

  // show cover
  // library will advance to new page once book reloads
  current_page = -1;
  setCurrentPage(myPageNum, true);
}
$("#pagemodal .save").click(addNewPage);

// background image disables other images
$("input[type=radio][name=bg][value=image]").click(function (e) {
  if ($("input[type=radio][name=bg][value=image]")[0].checked) {
    if ($("input[type=radio][name=top][value=image]").length) {
      $("input[type=radio][name=top][value=image]")[0].checked = false;
    }
    if ($("input[type=radio][name=bottom][value=image]").length) {
      $("input[type=radio][name=bottom][value=image]")[0].checked = false;
    }
  }
});

// set initial storybook
function initializeBook() {
  PBS.KIDS.storybook.config = {
  	background: {
  		color: "#ababab"
  	},
  	audio: {
  		enabled: false
  	},
  	book: {
  		font: font.name,
  		direction: _("ltr"),
  		startOnPage: 0,
  		pageWidth: $(".well.page").width() - 50,
  		pageHeight: Math.max($(".well.page").height(), 500),
  		previousPageButton: {
  			url: prefix + "images/prev-page-button.png",
  			x: 1,
  			y: 50,
  			width: "50px",
  			height: "50px"
  		},
  		nextPageButton: {
  			url: prefix + "images/next-page-button.png",
  			horizontalAlign: "RIGHT",
  			x: 1,
  			y: 50,
  			width: "50px",
  			height: "50px"
  		},
  		pageBackground: {
  			color: "#fefefe"
  		},
  		oddPageBackground: {
  			color: "#fdfdfd"
  		},
  		evenPageBackground: {
  			color: "#f9f9f9"
  		},
  		pageTurnDuration: 500,
  		pageSlideDuration: 200
  	},
  	cover: {
  		background: {
  			url: cover.url || (prefix + "images/frog_2546.png")
  		},
  		content: [
        {
          type: "TextArea",
          x: 10,
          y: 30,
          width: 90,
          align: "center",
          color: "#00f",
          size: font.size || 18,
          font: font.name || "Arial",
          lineHeight: layout.lineSpace || "120%",
          text: cover.title || ""
        }
  		]
  	},
  	pages: []
  };

  // restore a book edit in progress
  if (load_book_id) {
    book_id = load_book_id;
  }

  if (load_book && load_book.length) {
    // load created book
    pages = load_book;

    // when loading a book with no pages - create first one
    if(!pages.length) {
      pages.push({ text: [_("first_page_message")], image: [], layout: [getFirstBlock()] });
    }

    for (var p = 0; p < pages.length; p++) {
      var reloadPage = [];
      var background = {};
      try {
        for (var t = 0; t < pages[p].layout.length; t++) {
          var t2 = t - (pages[p].text || []).length;
          var boxType = pages[p].layout[t];
          if (boxType === "top") {
            reloadPage.push(getTopText(pages[p].text[t]));
          } else if (boxType === "bottom") {
            reloadPage.push(getBottomText(pages[p].text[t]));
          } else if (boxType === "bg") {
            reloadPage.push(getFullPageText(pages[p].text[t]));
          } else if (boxType === "image_top") {
            reloadPage.push(getTopImg(pages[p].image[t2]));
          } else if (boxType === "image_bottom") {
            reloadPage.push(getBottomImg(pages[p].image[t2]));
          } else if (boxType === "image_bg") {
            background = {
              color: "#c8c8c8",
              url: pages[p].image[t2] || (prefix + "images/blank.png")
            };
          }
        }
      } catch (e) {
        console.log(e);
      }
      PBS.KIDS.storybook.config.pages.push({
        background: background,
        content: reloadPage
      });
    }

    $.each($(".page-list").find("a.list-group-item"), function(p, page_link) {
      if (p === 0) {
        $(page_link).addClass("active");
      }
      $(page_link).on("click", function(){
        setCurrentPage(p);
      });
    });

  } else {
    // starting new book
    PBS.KIDS.storybook.config.pages.push({
      content: [makeFirstPage()]
    });
    pages[0].layout.push(getFirstBlock());
  }

  renderBook(window, PBS);
}

if (typeof outOfChromeApp !== "undefined" && outOfChromeApp) {
  // if you are online, you can initialize the book now
  // if offline: you are waiting for a callback with preferred locale
  initializeBook();
}

$(".file-input .btn").click(function(e) {
  e.preventDefault();
  upload(function() {
    var form = $($(e.target).parents("form")[0]);
    var page_index = current_page;
    if ($(activeImage.canvas).parents("#pbsRightPage").length) {
      page_index++;
    }
    form.attr("action", "/edit?id=" + book_id + "&page=" + page_index);
    form.submit();
  });
});
