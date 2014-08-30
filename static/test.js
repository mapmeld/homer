// CSRF token
var csrf_token = $('#csrf').val();

// store page content
var pages = [{ text: "", image: null }];
var current_page = 0;
var current_image = null;

var book = null;
var highlighter = null;

function saveCurrentPage(callback) {
  // get cover
  if(current_page === -1) {
    var title = $(".pbsPage0TextArea1").text();
    if (typeof callback === "function") {
      callback();
    }
    return;
  }

  current_page = Math.floor(current_page / 2) * 2;

  page_text = $("#pbsLeftPage textarea").val();
  pages[current_page].text = page_text;

  PBS.KIDS.storybook.config.pages[current_page].content[0].text = page_text;

  $($(".page-list p")[current_page]).text(page_text.substring(0,19));

  // right page
  if(pages.length > current_page + 1) {
    page_text = $("#pbsRightPage textarea").val();
    PBS.KIDS.storybook.config.pages[current_page+1].content[0].text = page_text;
    $($(".page-list p")[current_page+1]).text(page_text.substring(0,19));
    pages[current_page + 1].text = page_text;
  }

  if(current_image){
  }
  else if (typeof callback === "function") {
    callback();
  }
}

function makePageJumps(p, pagejumps) {
  if(pagejumps < p) {
    pagejumps += 2;
    var ev = book.addEventListener("PAGE_CHANGE", function() {
      book.removeEventListener(ev);
      book.nextPage(p, pagejumps);
    });
  }
}

function setCurrentPage(p) {
  saveCurrentPage(function(){

    $(".page-list a").removeClass("active");
    $($(".page-list a")[p]).addClass("active");

    if(p === current_page) {
      return;
    }

    if(current_page > -1) {
      book.gotoPage(p);
    }
    else {
      makePageJumps(p, -1);
    }
    current_page = p;
  });
}

// drop an image onto the page
var files, fileindex;

var blockHandler = function (e) {
  e.stopPropagation();
  e.preventDefault();
};

var processImage = function (e) {
  current_image = e.target.result;
  $(".filedrop")
    .removeClass("bordered")
    .html("");

  $(".image_area")
    .addClass("fullsize")
    .css({
      "background": "-webkit-gradient(linear, left top, left bottom, color-stop(0%,rgba(0,0,0,0)), color-stop(75%,rgba(0,0,0,0)), color-stop(100%,#fff)), url(" + current_image + ")",
      "width": $("textarea").width()
    })
    .find("h4").hide();
};

function setWhitelist (whitelist) {
  // reset existing whitelists
  var wordWhitelist = [];
  var letterWhitelist = [];
  for (var w=0; w<whitelist.length; w++) {
    var word = whitelist[w];

    // all letters in letter list?
    for(var i=0;i<word.length;i++){
      if(letterWhitelist.indexOf(word[i]) === -1){
        letterWhitelist.push(word[i]);
      }
    }

    // add to word list?
    if(wordWhitelist.indexOf(word) === -1){
      wordWhitelist.push(word);
    }
  }

  highlighter.antihighlight('setLetters', [letterWhitelist.join('')]);
  highlighter.antihighlight('setWords', wordWhitelist);
  $('.highlighter').css({ 'font-family': font_name });

  return wordWhitelist;
}

// logged in - load word lists
if ($("#logout").length) {
  // set original list
  var menuItem = $(".user-login .dropdown-menu li");
  menuItem.find("a").on("click", function() {
    $(".dropdown-menu.wordlists li").removeClass("active");
    menuItem.addClass("active");
    setWhitelist(['hello', 'world', 'नेपाल', 'abcdefghijklmnopqrstuvw']);
  });

  // download a copy of all word lists, add to a menu
  var wordlists_by_id = {};
  $.getJSON("/wordlist/inteam", function (metalist) {
    $.each(metalist, function(i, list) {
      var menuItem = $("<li role='presentation'>");
      menuItem.append($("<a href='#' role='menuitem'>").text(list.name));
      $(".dropdown-menu.wordlists").append(menuItem);
      menuItem.find("a").on("click", function() {
        $(".dropdown-menu.wordlists li").removeClass("active");
        menuItem.addClass("active");

        // AJAX to download the actual wordlist once
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
}

// offline - load previous word lists
if (typeof outOfChromeApp === "undefined" || !outOfChromeApp) {
  chrome.storage.local.get(null, function (items) {
    $.each(items, function(hash, list){
      // only look at word lists
      if(!list.type || list.type !== "wordlist") {
        return;
      }

      var menuItem = $("<li role='presentation'>");
      menuItem.append($("<a href='#' role='menuitem'>").text(list.name));
      $(".user-login .dropdown-menu").append(menuItem);
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
    // online - post to server
    $.post("/wordlist", {name: name, wordlist: wordlist, _csrf: csrf_token}, function(response) {
      console.log(response);
    });
  }
});

var processWhitelist = function (e) {
  var whitelist = e.target.result;
  // reduce to lowercase words separated by spaces
  whitelist = whitelist.replace(/\r?\n|\r/g, ' ').replace(/\s\s+/g, ' ').toLowerCase().split(' ');

  whitelist = setWhitelist(whitelist);

  // display and save whitelist
  $("#wordmodal .modal-body input").val("");
  $("#wordmodal .modal-body p").text(whitelist.join(" ").substring(0,500));
  $("#wordmodal").modal('show');
};

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


// PDF export
function pdfify() {
  saveCurrentPage(function(){

    var ctx = $("canvas.preview")[0].getContext("2d");
    ctx.font = "20px sans-serif";
    ctx.fillStyle = "#000";

    var doc = new jsPDF();

    if(rightToLeft){
      pages.reverse();
    }

    for(var p=0; p<pages.length; p++) {
      // add user image
      var img_offset = 0;
      if(pages[p].image){
        var insert_img = pages[p].image;
        img_offset += pages[p].image_height / 8;
        var img_format = 'PNG';
        if(pages[p].image.indexOf("data:image/jpeg") === 0){
          img_format = 'JPEG';
        }
        doc.addImage(pages[p].image, img_format, 20, 40, pages[p].image_width / 8, pages[p].image_height / 8);
      }

      // add internationalized text as an image
      $("canvas.preview").attr("width", 500);
      ctx.fillText(pages[p].text, 0, 40);
      var imgData = $("canvas.preview")[0].toDataURL();
      doc.addImage(imgData, 'PNG', 20, 40 + img_offset, 125, 75);

      if(p !== pages.length - 1){
        // need next page
        doc.addPage();
      }
    }

    if(rightToLeft){
      pages.reverse();
    }

    doc.save('Test.pdf');
  });
}

$(".pdfify").on("click", pdfify);

// books can be created and updated
var book_id = null;

function upload() {
  saveCurrentPage(function(){
    $.post("/book", {pages: pages, book_id: book_id, _csrf: csrf_token}, function(response) {
      // redirect to newly created or updated book
      book_id = response.id;
      window.location = "/book/" + book_id;
    });
  });
}
$(".upload").on("click", upload);

// choose icon
$(".chooseicon").on("click", function() {
  $('#iconmodal').modal('show').find('.modal-body');
  $.getJSON("/image/inteam", function (imagelist) {
    for(var i = 0; i < imagelist.length; i++) {
      var img = $('<img/>').attr('src', imagelist[i].url).addClass('col-md-3');
      $('#iconmodal .modal-body').append(img);
    }
    $('#iconmodal .modal-body').append($('<div></div>').addClass('clearfix'));
    $('#iconmodal .modal-body img').on('click', function(e) {
      // add to current page
      var ctx = $(".pbsPageContainer canvas")[0].getContext('2d');
      ctx.drawImage(e.target, 0, 0, 100, 100);
      $('#iconmodal').modal('hide');
    });
  });
});
$('.iconchooser').on('click', function() {
  var highlighted_icons = $('#iconmodal .modal-body img.highlight');
  if(highlighted_icons.length) {
    processImage({ target: { result: $(highlighted_icons[0]).attr("src") } });
  }
});

// color changer on icons
var rgb_of = {
  "pink": [255, 105, 180],
  "red": [255, 0, 0],
  "orange": [255, 165, 0],
  "yellow": [255, 255, 0],
  "green": [0, 255, 0],
  "blue": [0, 0, 255],
  "purple": [200, 0, 200]
};

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

// activate existing page links
$($(".page-list").children()[0]).on("click", function() {
  setCurrentPage(0);
});

function renderBook(GLOBAL, PBS) {

  // Create the storybook
  book = PBS.KIDS.storybook.book(GLOBAL, PBS, $(".well.page")[0], PBS.KIDS.storybook.config);

  // Load the storybook resources
  book.load();

  book.addEventListener("PAGE_CHANGE", function () {
    current_page = book.getPage();

    // activate antihighlight
    highlighter = $("textarea").antihighlight({
      words: ['hello', 'world', 'नेपाल'],
      letters: ['abcdefghijklmnopqrstuvw'],
      caseSensitive: false
    });

    // multilingual input with jQuery.IME
    $("textarea").ime();
    $("textarea").on("blur", saveCurrentPage);
  });
}

// adding a new page
$(".new-page").on("click", function() {
  // create new page listing
  pages.push({ text: "", image: null });
  var addPage = $("<a class='list-group-item' href='#'></a>");
  addPage.append($("<h4 class='list-group-item-heading'>" + _("page_num", { page: pages.length }) + "</h4>"));
  addPage.append($("<p class='list-group-item-text'></p>"));

  // insert after last page
  $($(".page-list .list-group-item")[pages.length-2]).after(addPage);

  // activate page link
  var myPageNum = pages.length - 1;
  addPage.on("click", function(){
    setCurrentPage(myPageNum);
  });

  // add layout page
  PBS.KIDS.storybook.config.pages.push({
    content: [
      {
        type: "TextArea",
        x: 10,
        y: 30,
        width: 80,
        align: "left",
        color: "#222222",
        size: 28,
        font: font_name,
        text: _("new_page_message")
      }
    ]
  });
  $(".page.well").html("");
  renderBook(window, PBS);

  // show new page
  current_page = -1;
  setCurrentPage(myPageNum);
});

PBS.KIDS.storybook.config = {
	background: {
		color: "#ababab"
	},
	audio: {
		enabled: false
	},
	book: {
		font: "Georgia",
		direction: _("ltr"),
		startOnPage: 0,
		pageWidth: $(".well.page").width() - 50,
		pageHeight: Math.max($(".well.page").height(), 450),
		previousPageButton: {
			url: "images/prev-page-button.png",
			x: 1,
			y: 50,
			width: "50px",
			height: "50px"
		},
		nextPageButton: {
			url: "images/next-page-button.png",
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
			url: "images/frog_2546.png"
		},
		content: [
      {
        type: "TextArea",
        x: 10,
        y: 30,
        width: 90,
        align: "center",
        color: "#fff",
        size: 28,
        font: font_name,
        text: "Title"
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
  pages = load_book;
  for (var p = 0; p < pages.length; p++) {
    PBS.KIDS.storybook.config.pages.push({
      content: [
        {
          type: "TextArea",
          x: 10,
          y: 30,
          width: 80,
          align: "left",
          color: "#222222",
          size: 28,
          font: font_name,
          text: pages[p].text
        }
      ]
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
  PBS.KIDS.storybook.config.pages.push({
    content: [
      {
        type: "TextArea",
        x: 10,
        y: 30,
        width: 80,
        align: "left",
        color: "#222222",
        size: 28,
        font: font_name,
        text: _("first_page_message")
      }
    ]
  });
}

renderBook(window, PBS);
