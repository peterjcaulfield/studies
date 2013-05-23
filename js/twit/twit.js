/**
 * Twit
 *  jQuery Plugin to Display Twitter Tweets on a Blog.
 *  http://code.google.com/p/jquery-twit/
 *
 * Copyright (c) 2010 Yusuke Horie
 *
 * Released under the MIT License:
 * http://www.opensource.org/licenses/mit-license.php
 *
 * Since  : 0.1.0 - 08/26/2009
 * Version: 0.2.0 - 02/17/2010
 */
(function(jQuery){

  var _i = 0;

  /** public methods **/
  // .fn key extends JQuery object to the library function is native. You can then do $('my_html_element').twit(user, options);
  jQuery.fn.twit = function (user, options) {
    if (typeof user != 'string') return this;

    var      
      opts = jQuery.extend({}, jQuery.fn.twit.defaults, options), // $.extend merges objects with the first param being modified
      c = jQuery.isFunction(opts.callback) ? opts.callback: _callback, // if a callback is defined in options use that otherwise use private __callback method
      url = 'https://api.twitter.com/1/statuses/user_timeline.json?screen_name=' + user,
      params = {};

    opts.user = user;
    params.count = opts.count;
    // $.each iterates over the dom element that is part of the JQuery object
    // This is bound when $('my_html_element').twit(user, options); is executed
    return this.each(function(i, e) { // i is the index and e is the element
      var $e = $(e); 
      if (!$e.hasClass('twit')) $e.addClass('twit'); // add twit class to the element if it doesn't have it
      // make ajax request to twitter timeline api endpoint with the params 
      jQuery.ajax({
        url: url,
        data: params,
        dataType: 'jsonp',
        success: function (o) { // if sucessful apply the callback to the results
          c.apply(this, [(o.results) ? o.results: o, e, opts]);
        }
      });
    }); // end of each loop
  };
  // sets the JQuery extended twit functions defaults
  // the most important values are count and limit
  // count = amount of tweets to return
  // limit is the amount of tweets that will have markup generated for when twits callback function runs on the first pass
  jQuery.fn.twit.defaults = {
    user: null,
    callback: null,
    icon: true,
    username: true,
    text: true,
    count: 200,
    limit: 15,
    label: 'Twitter',
    title: ''
  };

  /** private method **/
  // default callback on ajax completion
  var _callback = function (o, e, opts) {
    // reference to top level dom element
    var $this = $(e);
    // if the results are zero return false otherwise 
    if (!o || o.length == 0 || $this.length == 0) return false;
    //.data stores arbitrary data in the jquery object. Args are key / value
    $this.data('_inc', 1);
    // increment global i - this keeps track of how many times the callback as been called
    _i++;
    // parsing the ajax response
    var username = o[0].user.screen_name,
        icon = o[0].user.profile_image_url;
    // html markup
    var h =
      '<div class="twitHeader">' +
      ' <span class="twitLabel">' + opts.label + '</span>&nbsp;&nbsp;' +
      ' <span class="twitTitle">' + opts.title + '</span>' +
      '</div>';
    if (opts.icon || opts.username) {
      h += '<div class="twitUser">';
      if (opts.icon) 
        h +=
          ' <a href="http://twitter.com/' + username + '/">' +
          '  <img src="' + icon + '" alt="' + username + '" title="' + username + '" style="vertical-align:middle;" />' +
          ' </a>&nbsp;&nbsp;';
      if (opts.username)
        h += '<a href="http://twitter.com/' + username + '/">' + username + '</a>';
      h += '</div>';
    }
    // generates markup using private __build method
    h += '<ul class="twitBody" id="twitList' + _i + '">' + _build(o, $this, opts) + '</ul>';
    // sets the inner html content of the parent element (that was bound when calling .twit) to the generated markup
    $this.html(h);
    // this is the function that is bound to the 'show more' links at the end of the page of tweets
    // note: .live jquery method is now deprecated should use .on instead
    // see: http://api.jquery.com/live/ for details on how to switch
    $('a.twitEntryShow', '#twitList' + _i).live('click', function (e) {
      e.preventDefault();
      // get reference to the clicked element
      var $t = $(this);
      // fade out its parent container
      $t.parent().fadeOut(400, function () {
        // get value of its own increment
        var i = $this.data('_inc');
        // increment it
        i++;
        // reassing it with new value
        $this.data('_inc', i);
        //check if we have are showing more or all
        if ($t.hasClass('twitEntryAll')) {
          // .die is deprecated. Use .off instead
          $t.die('click');
          // get start offset
          var start = (i*opts.limit) - opts.limit;
          // append __builds generated markup after the 'show more' link  and then remove the link
          $(this).after(_build(o, $this, opts, start, o.length)).remove();
        } else {
          $(this).after(_build(o, $this, opts)).remove();  // otherwise we show more
        }
      });
    });

  };
  // private __build function
  // this function is responsible for parsing the actual tweets
  // from the json object and generating the html markup
  // params: o = json, $t is parent dom element, opts is opts object
  var _build = function (o, $t, opts, s, e) {
    var
      h = '',
      inc = $t.data('_inc'), // retrieves what increment we are at
      start = s || (inc*opts.limit) - opts.limit, // gets the tweet start offset in the json based on inc and limit
      end = e || ((o.length > start + opts.limit) ? start + opts.limit: o.length); // gets the tweet end offset in the json based on start offset, limit and length of json response 
    // loop across the json at the appropriate offsets
    for (var i=start; i<end; i++) {
      var
        // grab the tweet object
        t = o[i],
        username = t.user.screen_name,
        icon = t.user.profile_image_url;
      // start generating a single tweets markup
      h += '<li class="twitEntry">';
      if (opts.text) {
        // grab the tweet text and format it
        var text = t.text
          .replace(/(https?:\/\/[-_.!~*\'()a-zA-Z0-9;\/?:\@&=+\$,%#]+)/, function (u) {
            var shortUrl = (u.length > 30) ? u.substr(0, 30) + '...': u;
            return '<a href="' + u + '">' + shortUrl + '</a>';
          })
          .replace(/@([a-zA-Z0-9_]+)/g, '@<a href="http://twitter.com/$1">$1</a>')
          .replace(/(?:^|\s)#([^\s\.\+:!]+)/g, function (a, u) {
            return ' <a href="http://twitter.com/search?q=' + encodeURIComponent(u) + '">#' + u + '</a>';
          });
        h += ' <span>' + text + '</span>';
      }

      h += '</li>';
    }
    // if there are more tweets in the json response then are currently shown on the page
    // create a link to display more
    if (o.length > end) {
      h +=
        '<li class="twitNavi">' +
        '<a href="#" class="twitEntryShow">more</a> &nbsp;/&nbsp;';
      if (o.length > opts.limit)
        h += '<a href="#" class="twitEntryShow twitEntryAll">all</a>';
      h += '</li>';
    }
    return h;
  };

})(jQuery);
