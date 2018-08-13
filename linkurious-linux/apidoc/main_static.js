// Google Analytics
(function (i, s, o, g, r, a, m) {
    i['GoogleAnalyticsObject'] = r;
    i[r] = i[r] || function () {(i[r].q = i[r].q || []).push(arguments)}, i[r].l = 1 * new Date();
    a = s.createElement(o), m = s.getElementsByTagName(o)[0];
    a.async = 1;
    a.src = g;
    m.parentNode.insertBefore(a, m)
})(window, document, 'script', '//www.google-analytics.com/analytics.js', 'ga');
ga('create', 'UA-35774713-1', 'auto');
ga('send', 'pageview');

// Bootstrap Scrollspy
$(this).scrollspy({ target: '#scrollingNav', offset: 18 });

// Content-Scroll on Navigation click
$('#sidenav').find('a').on('click', function(e) {
  e.preventDefault();
  var id = $(this).attr('href');

  if ($(id).length > 0) {
    $('html,body').animate({scrollTop: parseInt($(id).offset().top)}, 400);
  }
  window.location.hash = $(this).attr('href');
});

// Quickjump on Pageload to hash position
if(window.location.hash) {
  var id = window.location.hash;
  if ($(id).length > 0)
    $('html,body').animate({ scrollTop: parseInt($(id).offset().top) }, 0);
}

// bootstrap popover
$('a[data-toggle=popover]')
  .popover()
  .click(function(e) {
    e.preventDefault();
  });


$('.nav-tabs-examples a').click(function (e) {
  e.preventDefault();
  $(this).tab('show');
});

// Linkurious specific
// -------------------

/**
 * @param {string} rootPath
 * @param {function(Error, string[]|string)} cb
 */
function getVersions(rootPath, cb) {
  var oReq = new XMLHttpRequest();
  var CT_JSON = 'application/json';

  oReq.addEventListener("load", function() {
    if (oReq.status !== 200) {
      return cb(new Error('Unexpected HTTP status: ' + oReq.status), oReq.responseText);
    }

    var ct = oReq.getResponseHeader('Content-Type');
    if ((ct + '').indexOf(CT_JSON) !== 0) {
      return cb(new Error('Unexpected Content-Type ' + ct), oReq.responseText);
    }

    try {
      return cb(null, JSON.parse(oReq.responseText))
    } catch(e) {
      return cb(new Error('JSON parse error: ' + e.message), oReq.responseText);
    }
  });

  oReq.addEventListener("error", function(e) {
    cb(e, null);
  });

  oReq.open("GET", rootPath + "/../");
  oReq.setRequestHeader('Accept', CT_JSON);
  oReq.send();
}

/**
 * @param {string} itemId
 * @param {function} fn
 */
function onClick(itemId, fn) {
  document.getElementById(itemId).addEventListener('click', fn, false);
}

/**
 * @param {string} rootPath
 * @param {string} siteName
 */
function initDocSite(rootPath, siteName) {
  var versionPopup = document.getElementById('versionPopup');
  var popupLayer = document.getElementById('popupLayer');

  // add version popup close button
  onClick('versionClose', function() {
    versionPopup.style.display = 'none';
    popupLayer.style.display = 'none';
  });
  onClick('popupLayer', function() {
    versionPopup.style.display = 'none';
    popupLayer.style.display = 'none';
  });

  // add version popup open button
  onClick('versionOpen', function() {
    versionPopup.style.display = 'block';
    popupLayer.style.display = 'block';
  });

  // load versions menu
  getVersions(rootPath, function(err, versions) {
    if (err) {
      console.log('XHR error: ' + (err.message ? err.message : JSON.stringify(err)));
      versions = ['latest'];
    } else {
      versions.unshift('latest');
    }

    var list = document.getElementById('versionList');
    var html = ['<ul>'];
    for (var i = 0, l = versions.length; i < l; ++i) {
      html.push(
        '<li><a class="versionLink" href="',
        rootPath,
        '/../',
        versions[i],
        '/apidoc',
        '">',
        siteName,
        ' for version <strong>',
        versions[i],
        '</strong></a></li>\n'
      );
    }
    html.push('</ul>');
    list.innerHTML = html.join('');
  });
}

initDocSite('..', 'Server SDK doc.');
