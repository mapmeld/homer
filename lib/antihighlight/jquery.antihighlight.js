/**
 * jQuery antihighlight
 * based on jQuery.highlightTextarea 2.0
 *
 * Copyright 2012, Damien "Mistic" Sorel
 *    http://www.strangeplanet.fr
 *
 * thanks to Julien L for the main algorithm
 *    http://stackoverflow.com/a/7599199
 *
 * thanks to Pascal Wacker for jQuery wrapper and API methods
 *    pascal.wacker@tilllate.com
 *
 * Dual licensed under the MIT or GPL Version 3 licenses.
 *    http://www.opensource.org/licenses/mit-license.php
 *    http://www.gnu.org/licenses/gpl.html
 *
 * Depends:
 *	  jquery.js
 *    jquery-ui.js | resizable (optional)
 */


(function($) {
    /**
     * Plugin declaration
     */
    $.fn.antihighlight = function(options) {
        // callable public methods
        var callable = ['highlight','enable','disable','setOptions','setWords','setLetters', 'setReject'];

        var plugin = $(this).data('antihighlight');

        // already instantiated and trying to execute a method
        if (plugin && typeof options === 'string') {
            if ($.inArray(options,callable)!==false) {
                return plugin[options].apply(plugin, Array.prototype.slice.call(arguments, 1));
            }
            else {
                throw 'Method "' + options + '" does not exist on jQuery.antihighlight';
            }
        }
        // not instantiated and trying to pass options object (or nothing)
        else if (!plugin && (typeof options === 'object' || !options)) {
            if (!options) {
                options = {};
            }

            // extend defaults
            options = $.extend({}, $.fn.antihighlight.defaults, options);
            options.regParam = options.caseSensitive ? 'gm' : 'gim';

            // for each element instantiate the plugin
            return this.each(function() {
                var plugin = $(this).data('antihighlight');

                // create new instance of the plugin if the plugin isn't initialised
                if (!plugin) {
                    plugin = new $.antihighlight($(this), options);
                    plugin.init();
                    $(this).data('antihighlight', plugin);
                }
            });
        }
    }

    /**
     * Defaults
     */
    $.fn.antihighlight.defaults = {
        words:         [],
        letters:       [],
        reject:        [],
        color:         '#ffff00',
        stopColor:     '#f66',
        caseSensitive: true,
        resizable:     false,
        id:            null,
        debug:         false
    };

    /**
     * Main plugin function
     */
    $.antihighlight = function(element, options) {
        this.options = options;

        if (element instanceof jQuery) {
            this.$textarea = element;
        }
        else {
            this.$textarea = $(element);
        }

        this.$main = null;
        this.$highlighterContainer = null;
        this.$highlighter = null;


        /*
         * init the plugin
         * scope: private
         */
        this.init = function() {
						//Determine scrollbar width
						this.scrollbarWidth = this.getScrollbarWidth();

            // build the HTML wrapper
            if (this.$textarea.closest('.antihighlight').length <= 0) {
                this.$textarea.wrap('<div class="antihighlight" />');
            }
            this.$main = this.$textarea.parent('.antihighlight');

            if (this.$main.find('.highlighterContainer').length <= 0) {
                this.$main.prepend('<div class="highlighterContainer"></div>');
            }
            this.$highlighterContainer = this.$main.children('.highlighterContainer');

            if (this.$highlighterContainer.find('.highlighter').length <= 0) {
                this.$highlighterContainer.html('<div class="highlighter"></div>');
            }
            this.$highlighter = this.$highlighterContainer.children('.highlighter');

            // set id
            if (this.options.id != null) {
                this.$main.attr('id', this.options.id);
            }

            // set css
            this.updateCss();

            // bind the events
            this.bindEvents();

            // apply the resizeable
            this.applyResizable();

            // highlight content
            this.highlight();

            // readjust for PBS layout
            this.$main.css({
              position: 'absolute',
              top: this.$textarea.css("top"),
              left: this.$textarea.css("left")
            });
            this.$textarea.css({
              left: 0,
              top: 0
            });
        }

        /*
         * compute highlight
         * @param delay: boolean - use a delayed update
         * scope: public
         */
        this.highlight = function(delay) {
            if (delay==null || delay==false) {
                this.applyText(this.$textarea.val());
            }
            else {
                this.condensator($.proxy(function(){
                  this.applyText(this.$textarea.val());
                }, this), 100, 300);
            }

            return this.$textarea.data('antihighlightEvents')===true;
        }

        /*
         * update plugin options
         * scope: public
         */
        this.setOptions = function(options) {
            if (typeof options != 'object') {
                options = {};
            }

            this.options = $.extend({}, this.options, options);
            this.options.regParam = this.options.caseSensitive ? 'g' : 'gi';

            if (this.options.debug) {
                this.$highlighter.addClass('debug');
            }
            else {
                this.$highlighter.removeClass('debug');
            }

            if (this.$textarea.data('antihighlightEvents')===true) {
                this.highlight();
                return true;
            }
            else {
                return false;
            }
        }

        /*
         * update words list
         * scope: public
         */
        this.setWords = function(words) {
            if (typeof words !== 'string' && !(words instanceof Array)) {
                words = [];
            }
            else if (typeof words === 'string') {
                words = [words];
            }
            this.options.words = words;

            if (this.$textarea.data('antihighlightEvents')===true) {
                this.highlight();
                return true;
            }
            else {
                return false;
            }
        }

        /*
         * update letters list
         * scope: public
         */
        this.setLetters = function(letters) {
            if (typeof letters !== 'string' && !(letters instanceof Array)) {
                letters = [];
            }
            else if (typeof letters === 'string') {
                letters = [letters];
            }
            this.options.letters = letters;

            if (this.$textarea.data('antihighlightEvents')===true) {
                this.highlight();
                return true;
            }
            else {
                return false;
            }
        }

        /*
         * update list of rejected words (phonics or other settings)
         * scope: public
         */
        this.setReject = function(reject) {
            if (typeof reject !== 'string' && !(reject instanceof Array)) {
                reject = [];
            }
            else if (typeof reject === 'string') {
                reject = [reject];
            }
            this.options.reject = reject;

            if (this.$textarea.data('antihighlightEvents')===true) {
                this.highlight();
                return true;
            }
            else {
                return false;
            }
        }

        /*
         * add events handlers
         * scope: private
         */
        this.bindEvents = function() {
            var events = this.$textarea.data('antihighlightEvents');

            if (typeof events != 'boolean' || events !== true) {
                // prevend positionning errors by allways focusing the textarea
                this.$highlighter.on({
                  'click.antihighlight' : $.proxy(function(){ this.$textarea.focus(); }, this)
                });

                // add triggers to textarea
                this.$textarea.on({
                    'input.antihighlight' :  $.proxy(function(){ this.highlight(true); }, this),
                    'resize.antihighlight' : $.proxy(function(){ this.updateSizePosition(true); }, this),
                    'scroll.antihighlight' : $.proxy(function(){ this.updateSizePosition(); }, this)
                });

								//For <input> elements, also call updateSizePosition() on a more comprehensive set of events.  (<input> elements don't seem to trigger the scroll event, so we have to detect changes through more creative means...)
								if(this.$textarea[0].tagName.toLowerCase()=='input') {
	                this.$textarea.on({
										//The slight delay below helps prevent Cmd-Left Arrow and Cmd-Right Arrow on Mac from behaving strangely.  (With this delay removed, the highlight is only updated after Cmd is released)
                    'keydown.antihighlight keypress.antihighlight keyup.antihighlight input.antihighlight2 select.antihighlight' : $.proxy(function(){ setTimeout($.proxy(function() { this.updateSizePosition(); }, this), 1); }, this),
                    'mouseover.antihighlight' : $.proxy(function(){ this.inputRefreshInterval = setInterval($.proxy(function() { this.updateSizePosition(); }, this), 100); }, this), //Respond to horizontal mouse scrolling (again, we can't use the scroll event, so this is the second best option.  Feel free to comment out the mouseover and mouseout handlers if you can't spare the extra CPU required for polling)
                    'mouseout.antihighlight' : $.proxy(function(){ clearInterval(this.inputRefreshInterval); this.updateSizePosition(); }, this)
	                });
								}

                this.$textarea.data('antihighlightEvents', true);
            }
        }

        /*
         * remove event handlers
         * scope: private
         */
        this.unbindEvents = function() {
            this.$highlighter.off('click.antihighlight');
            this.$textarea.off('input.antihighlight scroll.antihighlight resize.antihighlight keydown.antihighlight keypress.antihighlight keyup.antihighlight input.antihighlight2 select.antihighlight mouseover.antihighlight mouseout.antihighlight');
            this.$textarea.data('antihighlightEvents', false);
        }

        /*
         * enable the highlighting
         * scope: public
         */
        this.enable = function() {
            this.bindEvents();
            this.highlight();
        }

        /*
         * disable the highlighting
         * scope: public
         */
        this.disable = function() {
            this.unbindEvents();
            this.$highlighter.html(this.html_entities(this.$textarea.val()));
        }

        /*
         * set style of containers
         * scope: private
         */
        this.updateCss = function() {
            // the main container has the same size and position than the original textarea
            this.cloneCss(this.$textarea, this.$main, [
                'float','vertical-align'
            ]);
            this.$main.css({
                'width':  this.$textarea.outerWidth(true),
                'height': this.$textarea.outerHeight(true)
            });

            // the highlighter container is positionned at "real" top-left corner of the textarea and takes its background
            this.cloneCss(this.$textarea, this.$highlighterContainer, [
                'background','background-image','background-color','background-position','background-repeat','background-origin','background-clip','background-size',
                'padding-top','padding-right','padding-bottom','padding-left'
            ]);
            this.$highlighterContainer.css({
                'top':    this.toPx(this.$textarea.css('margin-top')) + this.toPx(this.$textarea.css('border-top-width')),
                'left':   this.toPx(this.$textarea.css('margin-left')) + this.toPx(this.$textarea.css('border-left-width')),
                'width':  this.$textarea.width(),
                'height': this.$textarea.height()
            });

            // the highlighter has the same size than the "inner" textarea and must have the same font properties
            this.cloneCss(this.$textarea, this.$highlighter, [
                'font-size','font-family','font-style','font-weight','line-height',
                'vertical-align','word-spacing','text-align'
            ]);
            this.$highlighter.css({
                'width':  this.$textarea.width(),
                'height': this.$textarea.height()
            });

            // now make the textarea transparent to see the highlighter throught
            this.$textarea.css({
                'background': 'none',
            });

            // display highlighter text for debuging
            if (this.options.debug) {
                this.$highlighter.addClass('debug');
            }
        }

        /*
         * set textarea as resizable
         * scope: private
         */
        this.applyResizable = function() {
            if (this.options.resizable && jQuery.ui) {
                this.$textarea.resizable({
                    'handles': 'se',
                    'resize':  $.proxy(function() { this.updateSizePosition(true); }, this)
                });
            }
        }

        /*
         * replace $highlighter html with formated $textarea content
         * scope: private
         */
        this.applyText = function(text) {
            text = " " + this.html_entities(text);
            var originalText = text + "";

            if (this.options.letters.length > 0) {
                replace = [];

                for (var i=0; i<this.options.letters.length; i++) {
                  replace.push(this.html_entities(this.options.letters[i]));
                }

                text = text.replace(
                  new RegExp('[^'+replace.join('')+'\,\.\!\?\\s]', this.options.regParam),
                  "<span class=\"highlight\" style=\"background-color:"+this.options.color+";\">_</span>"
                );
            }

            if (this.options.words.length > 0) {
                allow = [];
                replace = [];
                reject = [];

                for (var i=0; i<this.options.words.length; i++) {
                  allow.push(this.html_entities(this.options.words[i].toLowerCase()));
                }

                originalText = originalText.replace(/(\r|\n)/g, " \n").split(" ");
                for(var w=0;w<originalText.length;w++){
                  var word = originalText[w].toLowerCase();
                  // remove punctuation from start or end of the word
                  word = word.replace(/\b[-.,()&$#!\[\]{}"']+\B|\B[-.,()&$#!\[\]{}"']+\b/g, "");
                  if (this.options.reject.indexOf(word) > -1) {
                    // word was specifically rejected - highlight in red
                    if (reject.indexOf(word) == -1) {
                      reject.push(word);
                    }
                  }
                  else if(allow.indexOf(word) == -1 && replace.indexOf(word) == -1 && word.replace(/\s/,'').length){
                    // not in permitted words - highlight in yellow
                    replace.push(word);
                  }
                }

                var regParam = this.options.regParam;
                var regColor = this.options.color;
                var stopColor = this.options.stopColor;

                $.each(reject, function(r, word){
                  text = text.replace(
                    new RegExp('\\s(' + word + ')(\\s|\\.|,|$)', regParam),
                    " <span class=\"highlight\" style=\"background-color:"+stopColor+";\">$1</span> "
                  );
                });

                $.each(replace, function(r, word){
                  text = text.replace(
                    new RegExp('\\s(' + word + ')(\\s|\\.|,)', regParam),
                    " <span class=\"highlight\" style=\"background-color:"+regColor+";\">$1</span> "
                  );
                });
            }

            this.$highlighter.html(text.replace(" ", ""));
            this.updateSizePosition();
        }

        /*
         * adapt $highlighter size and position according to $textarea size and scroll bar
         * @param forced: boolean - update containers size
         * scope: private
         */
        this.updateSizePosition = function(forced) {
            // resize containers
            if (forced) {
                this.$main.css({
                    'width':  this.$textarea.outerWidth(true),
                    'height': this.$textarea.outerHeight(true)
                });
                this.$highlighterContainer.css({
                    'width':  this.$textarea.width(),
                    'height': this.$textarea.height()
                });
            }

						//If there is a vertical scrollbar, account for its width
            if (
              (this.$textarea[0].clientHeight < this.$textarea[0].scrollHeight && this.$textarea.css('overflow') != 'hidden' && this.$textarea.css('overflow-y') != 'hidden')
              || this.$textarea.css('overflow') == 'scroll' || this.$textarea.css('overflow-y') == 'scroll'
            ) {
                var padding = this.scrollbarWidth;
            }
						//No vertical scrollbar detected
            else {
                var padding = 0;
            }

						var width = this.$textarea[0].tagName.toLowerCase()=='input' ? 99999 : this.$textarea.width()-padding; //TODO: There's got to be a better way of going about this than just using 99999px...
            this.$highlighter.css({
                'width':         width,
                'height':        this.$textarea.height()+this.$textarea.scrollTop(),
                'padding-right': padding,
                'top':           -this.$textarea.scrollTop(),
                'left':          -this.$textarea.scrollLeft()
            });
        }

				//Adapted from http://benalman.com/projects/jquery-misc-plugins/#scrollbarwidth
				this.getScrollbarWidth = function() {
			    var parent,
			      child;

			    if ( typeof width === 'undefined' ) {
			      parent = $('<div style="width:50px;height:50px;overflow:auto"><div/></div>').appendTo('body');
			      child = parent.children();
			      width = child.innerWidth() - child.height( 99 ).innerWidth();
			      parent.remove();
			    }

			    return width;
				}

        /*
         * set 'to' css attributes listed in 'what' as defined for 'from'
         * scope: private
         */
        this.cloneCss = function(from, to, what) {
            for (var i=0; i<what.length; i++) {
                to.css(what[i], from.css(what[i]));
            }
        }

        /*
         * clean/convert px and em size to px size (without 'px' suffix)
         * scope: private
         */
        this.toPx = function(value) {
            if (value != value.replace('em', '')) {
                // https://github.com/filamentgroup/jQuery-Pixel-Em-Converter
                var that = parseFloat(value.replace('em', '')),
                    scopeTest = $('<div style="display:none;font-size:1em;margin:0;padding:0;height:auto;line-height:1;border:0;">&nbsp;</div>').appendTo('body'),
                    scopeVal = scopeTest.height();
                scopeTest.remove();
                return Math.round(that * scopeVal);
            }
            else if (value != value.replace('px', '')) {
                return parseInt(value.replace('px', ''));
            }
            else {
                return parseInt(value);
            }
        }

        /*
         * apply html entities
         * scope: private
         */
        this.html_entities = function(value) {
            if (value) {
                return $('<div />').text(value).html();
            }
            else {
                return '';
            }
        }

        /*
         * add a delay with age limit to a method
         * scope: private
         */
        var timer = null;
        var startTime = null;
        this.condensator = function(callback, ms, limit) {
            if (limit==null) {
              limit=ms;
            }

            var date = new Date();
            clearTimeout(timer);

            if (startTime==null) {
                startTime = date.getTime();
            }

            if (date.getTime() - startTime > limit) {
                callback.call();
                startTime = date.getTime();
            }
            else {
                timer = setTimeout(callback, ms);
            }
        }
    };
})(jQuery);
