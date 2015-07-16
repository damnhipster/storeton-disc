(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"/Users/h.brahmbhatt/dev/storeton/node_modules/brighton/lib/adapters/adobe-analytics.js":[function(require,module,exports){
module.exports = {adapter:{send:function(section, data){
    if(section === 'event'){
        var trackFilterValues = function(){
            var filterNames = [];
            var filterValues = [];
            data.filters.forEach(function(f){
                var filterMap = f.values;
                for(var k in filterMap){
                    var val = filterMap[k];
                    if(val.length>0){
                        filterNames.push(k);
                        filterValues.push(val.replace(/;/g,'|'));
                    }
                }
            });
            NAP.analytics.setConversionVar('filterType', filterNames.join(','), true);
            NAP.analytics.setConversionVar('filterValue', filterValues.join(','), true);
        };

        if(data.name === 'filtersChanged'){
            trackFilterValues();
            NAP.analytics.trackElement('Filter');
        }
        else if(data.name === 'filtersToggled'){
            NAP.analytics.addEvent('inPageEvent');
            NAP.analytics.setPageVar('inPageEvent', "Filters :: " + (data.visibility ? 'Open' : 'Close'), true);
            NAP.analytics.trackElement('Filters');
        }
        else if(data.name === 'filtersCleared'){
            NAP.analytics.addEvent('inPageEvent');
            NAP.analytics.setPageVar('inPageEvent', "Filters :: Clear", true);
            NAP.analytics.trackElement('Filters');
        }
        else if(data.name === 'filtersShowSizeChart'){
            NAP.analytics.addEvent('inPageEvent');
            NAP.analytics.setPageVar('inPageEvent', "Product list :: Size chart", true);
            NAP.analytics.trackElement('Filters');
        }
        else if(data.name === 'breadcrumb'){
            NAP.analytics.addEvent('inPageEvent');
            NAP.analytics.setPageVar('inPageEvent', "Product list :: Breadcrumbs :: "+data.title, true);
            NAP.analytics.trackElement('Breadcrumb', false);
        }
        else if(data.name === 'leftNav'){
            trackFilterValues();
            var linkText = "Left Nav: "+data.category;
            NAP.analytics.trackElement(linkText, null, NAP.analytics.LINK_CUSTOM);
        }
    }
}}}

},{}],"/Users/h.brahmbhatt/dev/storeton/node_modules/brighton/lib/adapters/qubit.js":[function(require,module,exports){
var deepGet = require('../utils.js').deepGet;

var uvMapping = {
	page: {
		environment: 'environment',
		type: 'type'
	},
	user: {
		user_id: 'id',
		language: 'locale'
	},
	shopping_bag: {
		alias: 'basket',
		currency: 'currency',
		subtotal: 'total',
		line_items: getLineItems
	}
}

var uv = {
	version: "1.2.1"
};

function getLineItems(bag) {
	var items = [];
	var length = bag.products ? bag.products.length : 0;
	for (var i=0; i < length; i++) {
		items.push({
			line_item: {
				product: {
					id: bag.products[i].pid
				},
				subtotal: bag.products[i].price,
				quantity: bag.products[i].quantity
			}
		});
	}
	return items;
}

function transform(map, data) {
	if(typeof map === "string") return deepGet(map, data);
	if(typeof map === "function") return map(data);
};

var qubitAdapter = {
	send: function(section, data) {
		if(uvMapping[section]) {
			var uvKey = uvMapping[section].alias || section;
			uv[uvKey] = uv[uvKey] || {};
		}
		for(var key in uvMapping[section]) {
			if(uvMapping[section].hasOwnProperty(key) && key !== 'alias') {
				var uvData = transform(uvMapping[section][key], data)
				if (uvData !== null && uvData !== undefined) {
					uv[uvKey][key] = uvData;
				}
			}
		}
	}
};

module.exports = {
	adapter: qubitAdapter,
	window: {
		universal_variable: uv
	}
}

},{"../utils.js":"/Users/h.brahmbhatt/dev/storeton/node_modules/brighton/lib/utils.js"}],"/Users/h.brahmbhatt/dev/storeton/node_modules/brighton/lib/analytics.js":[function(require,module,exports){
'use strict';

var Section = require('./section');


function Analytics() {
	this.adapters = [];
	this.sections = {};
	return this;
}

Analytics.prototype.create = function (name) {
    this.sections[name] = new Section(this.analyser);
}

Analytics.prototype.addAdapter = function (adapter) {
    this.analyser.addAdapter(adapter);
}

Analytics.prototype.get = function (name) {
	return this.sections[name];
};

Analytics.prototype.set = function (name, data) {
	var section = this.sections[name];
	section.set(data);
	sendToAdapters(name, section.data, this.adapters);
};

Analytics.prototype.addAdapter = function (adapter, window) {
	this.adapters.push(adapter.adapter);
	if(window && adapter.window) setAdapterGlobals(adapter, window);
};

function setAdapterGlobals(adapter, window) {
	for(var key in adapter.window) {
		if(adapter.window.hasOwnProperty(key))
			window[key] = adapter.window[key];
	}
}

function sendToAdapters(section, data, adapters) {
	var length = adapters.length;
	for(var i=0; i < length; i++) {
		adapters[i].send(section, data);
	};
}

module.exports = Analytics;

},{"./section":"/Users/h.brahmbhatt/dev/storeton/node_modules/brighton/lib/section.js"}],"/Users/h.brahmbhatt/dev/storeton/node_modules/brighton/lib/section.js":[function(require,module,exports){
'use strict';

var deepGet = require('./utils.js').deepGet;

function Section() {
	this.data = {};
	return this;
}

function deepSet(obj, data) {
	for (var attr in obj) {
		if (Object.prototype.toString.call(obj[attr]) === '[object Object]' && data[attr] !== undefined) {
			deepSet(obj[attr], data[attr])
		} else {
			data[attr] = obj[attr]
		}
	};
}

Section.prototype.set = function(obj) {
	deepSet(obj, this.data);
}

Section.prototype.get = function(prop) {
	return deepGet(prop, this.data);
}

function deepRemove(prop, data) {
	var props = prop.split('.');
	if(props.length > 1) {
		var removed = deepRemove(props.slice(1).join('.'), data[props[0]])
	} else {
		delete data[prop];
	}
}

Section.prototype.remove = function(prop) {
	deepRemove(prop, this.data);
}

module.exports = Section;


},{"./utils.js":"/Users/h.brahmbhatt/dev/storeton/node_modules/brighton/lib/utils.js"}],"/Users/h.brahmbhatt/dev/storeton/node_modules/brighton/lib/utils.js":[function(require,module,exports){
function deepGet(key, data) {
	var props = key.split('.'),
		length = props.length;

	for (var i=0; i < length; i++){
		var prop = props[i];
		if (prop in data) {
			data = data[prop]
		} else {
			return;
		}
	}
	return data;
}

module.exports = {
	deepGet: deepGet
}

},{}],"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/analytics.js":[function(require,module,exports){
'use strict';

require('./lib/adobe.analytics.js');

var Analytics = require('../../../../../node_modules/brighton');
var qubit = require('../../../../../node_modules/brighton/lib/adapters/qubit');
var adobeAnalytics = require('../../../../../node_modules/brighton/lib/adapters/adobe-analytics');

var analytics = new Analytics();

analytics.create('user');
analytics.create('page');
analytics.create('event');
analytics.addAdapter(qubit);
analytics.addAdapter(adobeAnalytics);

module.exports = analytics;

},{"../../../../../node_modules/brighton":"/Users/h.brahmbhatt/dev/storeton/node_modules/brighton/lib/analytics.js","../../../../../node_modules/brighton/lib/adapters/adobe-analytics":"/Users/h.brahmbhatt/dev/storeton/node_modules/brighton/lib/adapters/adobe-analytics.js","../../../../../node_modules/brighton/lib/adapters/qubit":"/Users/h.brahmbhatt/dev/storeton/node_modules/brighton/lib/adapters/qubit.js","./lib/adobe.analytics.js":"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/lib/adobe.analytics.js"}],"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/components/dropdown.js":[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});
var eventName = 'click.dropdown';
var openClass = 'dropdown-open';

exports['default'] = function () {

	/* NOTE:
 	events are turned off and turned back on,
 	to prevent multiple event attachments
 	if this function is called many times.
 	- Remove note when DOM unit tests are in place
 */

	var $dropdowns = $('.dropdown');

	$dropdowns.off(eventName).on(eventName, function (e) {
		$(e.currentTarget).toggleClass(openClass);
	});

	$('body').off(eventName).on(eventName, function (e) {
		/* NOTE:
  	1. We close all drop downs if clicked element doesn't
  		contain drop down in class name
  	2. Currently we check against the element's class name.
  		A more accurate test will be if the element is a child
  		of a dropdown element, however it's more DOM intensive.
   	- Remove note when DOM unit tests are in place
   */
		if (! ~e.target.className.indexOf('dropdown')) {
			$dropdowns.removeClass(openClass);
		}
	});
};

module.exports = exports['default'];

},{}],"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/components/infiniteScroll.js":[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _modulesUtils = require('../modules/utils');

// Function detects when user is n pixels from bottom of page.
// Once this distance is reached a callback is fired at least once
// Callback function must fire an increment function (passed in as an argument),
// before the callback can be executed again. This ensures async process have
// control of execution of the callback

exports['default'] = function () {
	var opts = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

	var $window = $(window);
	var $document = $(document);
	var params = $.extend({
		startPage: 1,
		debounce: 0,
		buffer: 0,
		callback: function callback() {}
	}, opts);

	var incrementPage = true;
	var currentPage = parseInt(params.startPage, 10);
	var action = function action() {
		if ($window.scrollTop() + $window.height() > $document.height() - params.buffer) {
			if (incrementPage === true) {
				incrementPage = false;
				params.callback(++currentPage, function () {
					incrementPage = true;
				});
			}
		}
	};

	$window.on('scroll', (0, _modulesUtils.debounce)(params.debounce, action));
};

module.exports = exports['default'];

},{"../modules/utils":"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/modules/utils.js"}],"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/components/lazyLoad.js":[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _modulesUtils = require('../modules/utils');

function getElements(selector) {
	var elementsToView = document.querySelectorAll(selector + ' img[data-src]');
	return Array.prototype.slice.call(elementsToView);
}

exports['default'] = function () {
	var selector = arguments.length <= 0 || arguments[0] === undefined ? '' : arguments[0];
	var opts = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

	var params = $.extend({
		debounce: 20,
		buffer: 250
	}, opts);
	var elementViewList = getElements(selector);
	var buffer = params.buffer;

	var beLazy = function beLazy() {
		var doc = document.documentElement;
		var viewport = {
			height: window.innerHeight || doc.clientHeight,
			width: window.innerWidth || doc.clientWidth
		};

		// only iterate if view list populated
		elementViewList.length && elementViewList.forEach(function (element) {

			// perform check on element's visibility
			if (element && (0, _modulesUtils.elementInView)(element, viewport, buffer)) {
				// TODO: performance enhancement
				// element has been viewed therefore no need to observe
				// remove from list of elements to iterate through
				// elementViewList.splice(index, 1);

				(0, _modulesUtils.responsiveProperty)(element);
			}
		});
	};

	$(window).on('resize scroll', (0, _modulesUtils.debounce)(params.debounce, beLazy)).trigger('scroll');

	return {
		refresh: function refresh() {
			elementViewList = getElements(selector);
			beLazy();
		}
	};
};

module.exports = exports['default'];

},{"../modules/utils":"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/modules/utils.js"}],"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/components/slider.js":[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});
var doc = document;
var classes = {
	bar: 'ton-slider-bar',
	container: 'ton-slider',
	ranges: 'ton-slider-ranges',
	rangeMax: 'ton-slider-max',
	rangeMin: 'ton-slider-min',
	values: 'ton-slider-value'
};

function dom() {
	var classArray = [classes.bar, classes.ranges, classes.rangeMin, classes.rangeMax, classes.values, classes.values];
	var objects = classArray.map(function (elClass) {
		var el = doc.createElement('div');
		el.className = elClass;
		return el;
	});

	// add max and min slider objects to range object
	var $range = objects[1];
	var $rangeMin = objects[2];
	var $rangeMax = objects[3];
	var $rangeMinValue = objects[4];
	var $rangeMaxValue = objects[5];
	$rangeMin.appendChild($rangeMinValue);
	$rangeMax.appendChild($rangeMaxValue);
	$range.appendChild($rangeMax);
	$range.appendChild($rangeMin);

	return {
		bar: objects[0],
		range: $range,
		rangeMax: $rangeMax,
		rangeMin: $rangeMin,
		rangeMinValue: $rangeMinValue,
		rangeMaxValue: $rangeMaxValue
	};
}

exports['default'] = function (element) {
	var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

	// create elements within slider
	var elements = dom();
	element.appendChild(elements.range);
	element.appendChild(elements.bar);
	element.className = classes.container;

	var $slider = $(elements.bar);
	var params = $.extend({
		values: [0, 100],
		between: [0, 100],
		every: 1,
		margin: 1,
		beforeValue: '',
		afterValue: '',
		display: function display(val) {
			return val;
		},
		link: {},
		onSet: false
	}, options);

	$slider.noUiSlider({
		// default
		connect: params.values.length > 1,
		start: params.values,
		step: params.every,
		margin: params.margin,
		range: {
			min: params.between[0],
			max: params.between[1]
		},
		format: {
			to: params.display,
			from: function from(value) {
				return value;
			}
		}
	});

	params.onSet && $slider.on({ set: params.onSet });
	params.link.lower && $slider.Link('lower').to($(params.link.lower));
	params.link.upper && $slider.Link('upper').to($(params.link.upper));

	if (params.beforeValue) {
		elements.rangeMinValue.insertAdjacentHTML('beforeBegin', params.beforeValue);
		elements.rangeMaxValue.insertAdjacentHTML('beforeBegin', params.beforeValue);
	}

	if (params.afterValue) {
		elements.rangeMinValue.insertAdjacentHTML('afterEnd', params.afterValue);
		elements.rangeMaxValue.insertAdjacentHTML('afterEnd', params.afterValue);
	}

	// noUIslider - get NaN if range = 0. if range is zero, disable slider
	if (params.between[0] === params.between[1]) {
		$slider.attr('disabled', 'disabled');
		elements.rangeMinValue.textContent = params.between[0];
		elements.rangeMaxValue.textContent = params.between[1];
		return $slider;
	}

	// bind ranges to elements
	$slider.Link('lower').to($(elements.rangeMinValue));
	$slider.Link('upper').to($(elements.rangeMaxValue));

	return $slider;
};

module.exports = exports['default'];

},{}],"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/config.js":[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports["default"] = {
	breakpoints: {
		desktop: 640
	},
	features: {
		infiniteScroll: false
	},
	productList: {
		infiniteScroll: {
			debounce: 50,
			buffer: 500,
			viewMoreAfter: 1
		},
		lazyLoad: {
			debounce: 0,
			buffer: 400
		},
		filters: {
			visible: true,
			price: {
				stepSize: 1,
				margin: 1
			}
		}
	}
};
module.exports = exports["default"];

},{}],"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/lib/adobe.analytics.js":[function(require,module,exports){
(function (global){
/*

 Paul Le

 */
"use strict";

var CookieUtil = {

    getCookie: function getCookie(c_name) {
        var c_end;
        if (document.cookie.length > 0) {
            c_start = document.cookie.indexOf(c_name + "=");

            if (c_start != -1) {
                c_start = c_start + c_name.length + 1;
                c_end = document.cookie.indexOf(";", c_start);

                if (c_end == -1) {
                    c_end = document.cookie.length;
                }
                return unescape(document.cookie.substring(c_start, c_end));
            }
        }
        return "";
    },

    getCookieFromRegExp: function getCookieFromRegExp(regex) {
        var cString = document.cookie;
        var thisCookie;

        try {
            cString = cString.split(";");

            for (var a = 0; a < cString.length; a++) {
                thisCookie = cString[a].split("=");
                if (regex.test(thisCookie[0])) {
                    return unescape(thisCookie[1]);
                }
            }
        } catch (e) {}
    },

    setCookie: function setCookie(c_name, value, expiredays) {
        var exdate = new Date();
        exdate.setDate(exdate.getDate() + expiredays);
        document.cookie = c_name + "=" + escape(value) + (expiredays == null ? "" : ";expires=" + exdate.toUTCString());
    },

    setSessionCookieWithPath: function setSessionCookieWithPath(c_name, value, path) {
        document.cookie = c_name + "=" + escape(value) + ";path=" + path;
    },

    deleteCookie: function deleteCookie(c_name) {
        CookieUtil.setCookie(c_name, "", -1);
    },

    deleteCookieWithPath: function deleteCookieWithPath(c_name) {
        CookieUtil.setCookieWithPath(c_name, "", -1, "/");
    },

    setCookieWithPath: function setCookieWithPath(c_name, value, expiredays, path) {
        var exdate = new Date();
        exdate.setDate(exdate.getDate() + expiredays);
        document.cookie = c_name + "=" + escape(value) + ";expires=" + exdate.toUTCString() + ";path=" + path;
    }
};

global.NAP = global.NAP || {};

global.NAP.headerLoaded = NAP.headerLoaded || false;

global.NAP.analytics = (function () {
    "use strict";

    // Adobe variable mapping
    var eventMap = {
        "productView": "prodView",
        "openBag": "scOpen",
        "addToBag": "scAdd",
        "viewBag": "scView",
        "removeFromBag": "scRemove",
        "checkout": "scCheckout",
        "purchase": "purchase",
        "customProductView": "event1",
        "searchSuccess": "event2",
        "nullSearch": "event3",
        "cardError": "event4",
        "backButton": "event5",
        "helpOverlay": "event6",
        "formComplete": "event7",
        "predictiveSearch": "event8",
        "socialShare": "event9",
        "imageZoom": "event10",
        "productPageOverlay": "event11",
        "wishlistAdd": "event12",
        "wishlistRemove": "event13",
        "discount": "event14", // currency
        "signup": "event15",
        "register": "event16",
        "returnGenerated": "event17",
        "bagAlert": "event18",
        "wishlistAlert": "event19",
        "bagAddPopup": "event20",
        "useAccordion": "event21",
        "useCarousel": "event22",
        "useDiscountCode": "event23",
        "useGiftCard": "event24",
        "linkData": "event25",
        "hazmat": "event26",
        "hasItemInBasket": "event27",
        "videoTime": "event34",
        "videoViews": "event35",
        "videoCompletes": "event36",
        "videoSegmentViews": "event37",
        "inPageEvent": "event45",
        "eventSignup": "event68"
    };

    // eVars = persistent conversion variables
    var conversionVarMap = {
        "purchaseID": "purchaseID",
        "productName": "products", // SAINT
        "campaign": "campaign",
        "website": "eVar1",
        "application": "eVar2",
        "region": "eVar3",
        "internalSearch": "eVar4",
        "numSearchResults": "eVar5",
        "campaignStack": "eVar6",
        "campaignFirstClick": "eVar7", // populated in s_code
        "campaignLastClick": "eVar8", // populated in s_code
        "visitNumber": "eVar9",
        "timeParting": "eVar10",
        "shippingMethod": "eVar11",
        "paymentMethod": "eVar12",
        "productFindMethod": "eVar13",
        "logInOut": "eVar14",
        "adobeVisitorID": "eVar15",
        "loginID": "eVar16",
        "helpOverlayType": "eVar17",
        "filterType": "eVar18",
        "filterValue": "eVar19",
        "formID": "eVar20",
        "shippingCountry": "eVar21", // lowercase
        "shippingCity": "eVar22", // lowercase
        "customerNo": "eVar23",
        "customerID": "eVar24",
        "orderCurrency": "eVar25",
        "language": "eVar26",
        "productDetailAccordionType": "eVar27",
        "imageID": "eVar28",
        "crosssellItem": "eVar29",
        "socialType": "eVar30",
        "size": "eVar31",
        "siteType": "eVar32",
        "appName": "eVar33",
        "signupSource": "eVar34",
        "registrationSource": "eVar35",
        "returnOrderProduct": "eVar36",
        "brandPreference": "eVar37",
        "accordionID": "eVar38",
        "searchResultType": "eVar39", // populated in s_code
        "navigationArea": "eVar40",
        "videoID": "eVar43",
        "videoSegment": "eVar44",
        "videoContentType": "eVar45",
        "eventSignupSource": "eVar68"
    };

    // sProps = traffic variables (page specific)
    var pageVarMap = {
        "pageName": "pageName",
        "channel": "channel",
        "domain": "server",
        "category": "prop1",
        "department": "prop2",
        "subsection1": "prop3",
        "subsection2": "prop13",
        "class": "prop4",
        "pageType": "prop5",
        "timeParting": "prop6",
        "newReturn": "prop7",
        "pageViewedPercent": "prop8",
        "errorURL": "prop9",
        "errorReferer": "prop10",
        "adobeVisitorID": "prop11", // populated in s_code
        "sizeAvailable": "prop12", // list prop
        "trackingServer": "trackingServer",
        "trackingServerSecure": "trackingServerSecure",
        "events": "events",
        "account": "s_account",
        "linkTrackEvents": "linkTrackEvents",
        "linkTrackVars": "linkTrackVars",
        "products": "products",
        "inPageEvent": "prop36"
    };

    // variables to include in every request (linkTrackVars)
    var linkVars = ["channel", "shippingCountry", "language"];
    var pageEvents = [];
    var products = [];

    // conditional tags to ignore - populated on first access
    var disabledTags;

    // is development mode? (debug enabled)
    var developmentMode;

    // current site
    var site;

    // should a pageview be fired as soon as the page is loaded
    // set to false to manually fire this where required
    var autoPageview = true;

    // if s_code hasn't loaded yet, queue up any calls
    var loaded = false; // flag: true when s_code loaded
    var loadAttempts = 0; // attempt counter
    var loadTimer; // attempt timer
    var tagQueue = []; // queue of tags to send when available

    var orderID;
    var skus = [];
    var orderComplete = false;

    // tracking product finding method
    var finding = {
        cookieName: "NAPfinding",
        products: [], // keeps a list of products and their associated finding method
        scratch: "", // last non-product/non-checkout page visited
        referpid: null, // referring PID (for features, e.g. YMAL)
        load: function load() {
            // load data from cookie

            if ("undefined" === typeof CookieUtil) {
                logError("finding.load: Cookie library not loaded");
                return false;
            }

            var cookie = CookieUtil.getCookie(this.cookieName);
            if (null === cookie || "" === cookie) {
                logDebug("finding.load: No current path cookie");
                return false;
            }

            /**
             * Cookie format:
             * scratch**pid**product1pid$$product1referrer[$$product1referpid]^^product2pid$$product2referrer[$$product2referpid] ...
             */

            cookie = cookie.split("**");
            var cookieLength = cookie.length;
            if (cookieLength < 2 || cookieLength > 3) {
                logError("finding.load: Invalid path cookie");
                return false;
            }

            this.scratch = cookie[0]; // current finding method
            this.referpid = cookieLength === 3 ? cookie[1] : null; // current referring pid

            // rows separated by ^^, values separated by $$
            if (cookieLength > 2 && cookie[2].length > 0) {
                var rows = cookie[2].split("^^");
                if (rows.length > 1) {
                    var myProducts = this.products;
                    $.each(rows, function () {
                        var row = this.split("$$");
                        var rowLength = row.length;
                        if (rowLength < 2 || rowLength > 3) {
                            logError("finding.load: Unreadable row (*)");
                        }

                        var rowValues = {
                            "pid": row[0],
                            "referrer": row[1]
                        };
                        if (rowLength === 3) {
                            rowValues.referpid = row[2];
                        }

                        myProducts.push(rowValues);
                    });
                } else if (rows.length == 1) {
                    var tmp = rows[0].split("$$");
                    var rowLength = tmp.length;
                    if (rowLength < 2 || rowLength > 3) {
                        logError("finding.load: Unreadable row (1)", rowLength);
                    }
                    var rowValues = {
                        "pid": tmp[0],
                        "referrer": tmp[1]
                    };
                    if (rowLength === 3) {
                        rowValues.referpid = tmp[2];
                    }

                    this.products.push(rowValues);
                } else {
                    logDebug("finding.load: no data");
                }
            }
            return true;
        },
        save: function save() {
            // save data to cookie

            // we require the CookieUtil library, which should already have loaded
            if ("undefined" === typeof CookieUtil) {
                logError("finding.save: Cookie library not loaded");
                return false;
            }

            // cookie format:  scratch**referpid**product1pid$$product1referrer[$$product1referpid]^^[product2...n]
            var cookieString = (this.scratch || "") + "**" + (this.referpid || "") + "**";
            logDebug("finding.save: Scratch and refer", cookieString);

            var productStrings = [];
            for (var i = this.products.length - 1; i >= 0; --i) {
                logDebug("finding.save: Adding product:", this.products[i]);
                productStrings[i] = this.products[i].pid + "$$" + this.products[i].referrer;
                if ("undefined" !== typeof this.products[i].referpid) {
                    productStrings[i] += "$$" + this.products[i].referpid;
                }
                logDebug("finding.save: add product", productStrings[i]);
            }
            cookieString += productStrings.join("^^");
            logDebug("finding.save: Saving cookie string: ", cookieString);
            CookieUtil.setSessionCookieWithPath(this.cookieName, cookieString, "/");

            return true;
        },
        clear: function clear() {
            // clear cookie after purchase
            this.products = [];
            this.scratch = "";
            this.referpid = null;
            CookieUtil.deleteCookieWithPath(this.cookieName);
        }
    };

    /**
     * If s_code loaded, fire all queued tags and variable assignments
     * @return {bool} True if tags fired, False otherwise
     */
    function fireQueuedTags() {

        if (!loaded) {
            if (!NAP.headerLoaded || "undefined" === typeof s) {
                // if no s_code, go round again
                queueTag();
                return false;
            }
            loaded = true;
        }
        clearTimeout(loadTimer);

        if (tagQueue.length < 1) {
            // no queued tags
            logDebug("fireQueuedTags: No tags in queue");
            return false;
        }

        // fire all tags in list
        var numTags = tagQueue.length;
        var trackPageview = false;

        for (var i = 0; i < numTags; ++i) {
            if (tagQueue[i].hasOwnProperty("varName")) {
                s[tagQueue[i].varName] = tagQueue[i].value;
            } else if (tagQueue[i].hasOwnProperty("tag")) {
                if ("t" === tagQueue[i].tag) {
                    trackPageview = true;
                    continue;
                }
                s[tagQueue[i].tag].apply(s, tagQueue[i].params);
            }
        }

        if (trackPageview) {
            logDebug("Tracking pageview from queue");
            s.t();
        }
        return true;
    }

    /**
     * Queue tags for firing when s_code is available
     * Sets a timer to re-try, up to a specified number of retries
     * @param {object} tag in format {'tag': , 'params': } to be used by fireQueuedTags()
     */
    function queueTag(tag) {

        var MAX_LOAD_ATTEMPTS = 30;
        var LOAD_ATTEMPT_DELAY = 500;

        // to avoid continually attempting to load s_code, count attempts
        ++loadAttempts;

        // give up if we've tried to load s_code too many times
        if (loadAttempts > MAX_LOAD_ATTEMPTS) {
            if ("undefined" === typeof s) {
                logDebug("queueTag: Given up waiting");
                clearTimeout(loadTimer);
                return false;
            } else {
                NAP.headerLoaded = true;
            }
        }

        // if a tag has been passed, add it to the queue
        if (tag) {
            tagQueue.push(tag);
        }

        // check again in 500ms (1/2 sec)
        clearTimeout(loadTimer);
        loadTimer = setTimeout(function () {
            fireQueuedTags();
        }, LOAD_ATTEMPT_DELAY);
    }

    /**
     * Fire a tag if the s_code is available, else queue for later
     * @param {string} Name of tag to fire (do not include the s. part)
     * @param {array} Parameters for tag
     * @return {bool} True if tag fired, False if queued
     */
    function fireTag(tag, params) {

        if (!tag) {
            logError("fireTag: no tag specified");
        }

        if (!loaded) {
            if ("undefined" !== typeof s && NAP.headerLoaded) {
                loaded = true;
                fireQueuedTags();
            } else {
                // queue tags to be fired as soon as s_code is available
                queueTag({ "tag": tag, "params": params });
                return false;
            }
        }

        params = params || [];
        s[tag].apply(s, params);
        return true;
    }

    /**
     * Set a variable if the s_code is available, else queue for later
     * @param {string} Name of variable to set
     * @param {*} Value to set
     * @return {bool} True if value set, false if queued
     */
    function setValue(varName, value) {

        if (!varName) {
            logError("setValue: no tag specified");
            return false;
        }

        if (!loaded) {
            if ("undefined" !== typeof s && NAP.headerLoaded) {
                fireQueuedTags();
            } else {
                queueTag({ "varName": varName, "value": value });
                return false;
            }
        }

        value = value || "";
        s[varName] = value;
        return true;
    }

    /**
     * Due to the "interesting" way Adobe determines whether to use the Live or Dev reporting suite, we need to set
     * a cookie to force dev mode
     */
    function setDevelopmentCookie() {
        if (-1 === document.cookie.indexOf("s_tagEnv")) {
            document.cookie = "s_tagEnv=dev;%20path=/";
            logDebug("Set Development mode cookie");
        }
    }

    /**
     * Helper function to select correct hostname
     * Must be called before we set linkTrackVars in init()
     * @todo Is this the best way to do it?
     **/
    function setTargetServerByHostname() {

        var trackingServer, trackingServerSecure, account;
        var hostname = window.location.hostname;

        if (isDevelopment()) {
            setDevelopmentCookie();
            if ("string" === typeof webEnv) {
                hostname = webEnv;
            }
        }

        trackingServer = "metrics.theoutnet.com";
        trackingServerSecure = "smetrics.theoutnet.com";
        site = "ton";

        // set the relevant server attribute
        setVar(pageVarMap, "trackingServer", trackingServer);
        setVar(pageVarMap, "trackingServerSecure", trackingServerSecure);

        // add these variables to the list that are sent
        addLinkVar(pageVarMap, "trackingServer");
        addLinkVar(pageVarMap, "trackingServerSecure");
    }

    /**
     * Helper function to set region, language, shipping country from data attributes
     * IMPORTANT: This function can't be called from the <head> as it requires the body tag to have loaded!
     */
    function setEnvironmentParameters() {

        var docBody = $(document.body);

        if (docBody.data("region")) {
            setVar(conversionVarMap, "region", docBody.data("region"));
        }

        if (docBody.data("language")) {
            setVar(conversionVarMap, "language", docBody.data("language"));
        }

        if (docBody.data("country")) {
            setVar(conversionVarMap, "shippingCountry", docBody.data("country"));
        }
    }

    /**
     * Helper function to detect development environments
     * Tests for a dave hostname, localhost, or an IP address
     */
    function isDevelopment() {

        if ("undefined" === typeof developmentMode) {
            var hostname = window.location.hostname;

            developmentMode = -1 !== hostname.indexOf("dave") || -1 !== hostname.indexOf("localhost") || -1 !== hostname.indexOf(".nap") || hostname.match(/[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/);
        }

        return developmentMode;
    }

    /**
     * Helper function for conditional tags
     */
    function isTagEnabled(tag) {

        if (!$.isArray(disabledTags)) {
            disabledTags = $("body").data("analytics-disable").split(",");
        }

        return !$.inArray(tag, disabledTags);
    }

    /**
     * General sanitisation: deals with accented characters, and removes forbidden characters
     */
    function sanitise(value) {

        if ("string" !== typeof value) {
            value = "" + value;
        }

        // Translate accented characters to non-accented equivalent
        var characterMappings = [{ "base": "A", "letters": /[\u0041\u24B6\uFF21\u00C0\u00C1\u00C2\u1EA6\u1EA4\u1EAA\u1EA8\u00C3\u0100\u0102\u1EB0\u1EAE\u1EB4\u1EB2\u0226\u01E0\u00C4\u01DE\u1EA2\u00C5\u01FA\u01CD\u0200\u0202\u1EA0\u1EAC\u1EB6\u1E00\u0104\u023A\u2C6F]/g }, { "base": "AA", "letters": /[\uA732]/g }, { "base": "AE", "letters": /[\u00C6\u01FC\u01E2]/g }, { "base": "AO", "letters": /[\uA734]/g }, { "base": "AU", "letters": /[\uA736]/g }, { "base": "AV", "letters": /[\uA738\uA73A]/g }, { "base": "AY", "letters": /[\uA73C]/g }, { "base": "B", "letters": /[\u0042\u24B7\uFF22\u1E02\u1E04\u1E06\u0243\u0182\u0181]/g }, { "base": "C", "letters": /[\u0043\u24B8\uFF23\u0106\u0108\u010A\u010C\u00C7\u1E08\u0187\u023B\uA73E]/g }, { "base": "D", "letters": /[\u0044\u24B9\uFF24\u1E0A\u010E\u1E0C\u1E10\u1E12\u1E0E\u0110\u018B\u018A\u0189\uA779]/g }, { "base": "DZ", "letters": /[\u01F1\u01C4]/g }, { "base": "Dz", "letters": /[\u01F2\u01C5]/g }, { "base": "E", "letters": /[\u0045\u24BA\uFF25\u00C8\u00C9\u00CA\u1EC0\u1EBE\u1EC4\u1EC2\u1EBC\u0112\u1E14\u1E16\u0114\u0116\u00CB\u1EBA\u011A\u0204\u0206\u1EB8\u1EC6\u0228\u1E1C\u0118\u1E18\u1E1A\u0190\u018E]/g }, { "base": "F", "letters": /[\u0046\u24BB\uFF26\u1E1E\u0191\uA77B]/g }, { "base": "G", "letters": /[\u0047\u24BC\uFF27\u01F4\u011C\u1E20\u011E\u0120\u01E6\u0122\u01E4\u0193\uA7A0\uA77D\uA77E]/g }, { "base": "H", "letters": /[\u0048\u24BD\uFF28\u0124\u1E22\u1E26\u021E\u1E24\u1E28\u1E2A\u0126\u2C67\u2C75\uA78D]/g }, { "base": "I", "letters": /[\u0049\u24BE\uFF29\u00CC\u00CD\u00CE\u0128\u012A\u012C\u0130\u00CF\u1E2E\u1EC8\u01CF\u0208\u020A\u1ECA\u012E\u1E2C\u0197]/g }, { "base": "J", "letters": /[\u004A\u24BF\uFF2A\u0134\u0248]/g }, { "base": "K", "letters": /[\u004B\u24C0\uFF2B\u1E30\u01E8\u1E32\u0136\u1E34\u0198\u2C69\uA740\uA742\uA744\uA7A2]/g }, { "base": "L", "letters": /[\u004C\u24C1\uFF2C\u013F\u0139\u013D\u1E36\u1E38\u013B\u1E3C\u1E3A\u0141\u023D\u2C62\u2C60\uA748\uA746\uA780]/g }, { "base": "LJ", "letters": /[\u01C7]/g }, { "base": "Lj", "letters": /[\u01C8]/g }, { "base": "M", "letters": /[\u004D\u24C2\uFF2D\u1E3E\u1E40\u1E42\u2C6E\u019C]/g }, { "base": "N", "letters": /[\u004E\u24C3\uFF2E\u01F8\u0143\u00D1\u1E44\u0147\u1E46\u0145\u1E4A\u1E48\u0220\u019D\uA790\uA7A4]/g }, { "base": "NJ", "letters": /[\u01CA]/g }, { "base": "Nj", "letters": /[\u01CB]/g }, { "base": "O", "letters": /[\u004F\u24C4\uFF2F\u00D2\u00D3\u00D4\u1ED2\u1ED0\u1ED6\u1ED4\u00D5\u1E4C\u022C\u1E4E\u014C\u1E50\u1E52\u014E\u022E\u0230\u00D6\u022A\u1ECE\u0150\u01D1\u020C\u020E\u01A0\u1EDC\u1EDA\u1EE0\u1EDE\u1EE2\u1ECC\u1ED8\u01EA\u01EC\u00D8\u01FE\u0186\u019F\uA74A\uA74C]/g }, { "base": "OI", "letters": /[\u01A2]/g }, { "base": "OO", "letters": /[\uA74E]/g }, { "base": "OU", "letters": /[\u0222]/g }, { "base": "P", "letters": /[\u0050\u24C5\uFF30\u1E54\u1E56\u01A4\u2C63\uA750\uA752\uA754]/g }, { "base": "Q", "letters": /[\u0051\u24C6\uFF31\uA756\uA758\u024A]/g }, { "base": "R", "letters": /[\u0052\u24C7\uFF32\u0154\u1E58\u0158\u0210\u0212\u1E5A\u1E5C\u0156\u1E5E\u024C\u2C64\uA75A\uA7A6\uA782]/g }, { "base": "S", "letters": /[\u0053\u24C8\uFF33\u1E9E\u015A\u1E64\u015C\u1E60\u0160\u1E66\u1E62\u1E68\u0218\u015E\u2C7E\uA7A8\uA784]/g }, { "base": "T", "letters": /[\u0054\u24C9\uFF34\u1E6A\u0164\u1E6C\u021A\u0162\u1E70\u1E6E\u0166\u01AC\u01AE\u023E\uA786]/g }, { "base": "TZ", "letters": /[\uA728]/g }, { "base": "U", "letters": /[\u0055\u24CA\uFF35\u00D9\u00DA\u00DB\u0168\u1E78\u016A\u1E7A\u016C\u00DC\u01DB\u01D7\u01D5\u01D9\u1EE6\u016E\u0170\u01D3\u0214\u0216\u01AF\u1EEA\u1EE8\u1EEE\u1EEC\u1EF0\u1EE4\u1E72\u0172\u1E76\u1E74\u0244]/g }, { "base": "V", "letters": /[\u0056\u24CB\uFF36\u1E7C\u1E7E\u01B2\uA75E\u0245]/g }, { "base": "VY", "letters": /[\uA760]/g }, { "base": "W", "letters": /[\u0057\u24CC\uFF37\u1E80\u1E82\u0174\u1E86\u1E84\u1E88\u2C72]/g }, { "base": "X", "letters": /[\u0058\u24CD\uFF38\u1E8A\u1E8C]/g }, { "base": "Y", "letters": /[\u0059\u24CE\uFF39\u1EF2\u00DD\u0176\u1EF8\u0232\u1E8E\u0178\u1EF6\u1EF4\u01B3\u024E\u1EFE]/g }, { "base": "Z", "letters": /[\u005A\u24CF\uFF3A\u0179\u1E90\u017B\u017D\u1E92\u1E94\u01B5\u0224\u2C7F\u2C6B\uA762]/g }, { "base": "a", "letters": /[\u0061\u24D0\uFF41\u1E9A\u00E0\u00E1\u00E2\u1EA7\u1EA5\u1EAB\u1EA9\u00E3\u0101\u0103\u1EB1\u1EAF\u1EB5\u1EB3\u0227\u01E1\u00E4\u01DF\u1EA3\u00E5\u01FB\u01CE\u0201\u0203\u1EA1\u1EAD\u1EB7\u1E01\u0105\u2C65\u0250]/g }, { "base": "aa", "letters": /[\uA733]/g }, { "base": "ae", "letters": /[\u00E6\u01FD\u01E3]/g }, { "base": "ao", "letters": /[\uA735]/g }, { "base": "au", "letters": /[\uA737]/g }, { "base": "av", "letters": /[\uA739\uA73B]/g }, { "base": "ay", "letters": /[\uA73D]/g }, { "base": "b", "letters": /[\u0062\u24D1\uFF42\u1E03\u1E05\u1E07\u0180\u0183\u0253]/g }, { "base": "c", "letters": /[\u0063\u24D2\uFF43\u0107\u0109\u010B\u010D\u00E7\u1E09\u0188\u023C\uA73F\u2184]/g }, { "base": "d", "letters": /[\u0064\u24D3\uFF44\u1E0B\u010F\u1E0D\u1E11\u1E13\u1E0F\u0111\u018C\u0256\u0257\uA77A]/g }, { "base": "dz", "letters": /[\u01F3\u01C6]/g }, { "base": "e", "letters": /[\u0065\u24D4\uFF45\u00E8\u00E9\u00EA\u1EC1\u1EBF\u1EC5\u1EC3\u1EBD\u0113\u1E15\u1E17\u0115\u0117\u00EB\u1EBB\u011B\u0205\u0207\u1EB9\u1EC7\u0229\u1E1D\u0119\u1E19\u1E1B\u0247\u025B\u01DD]/g }, { "base": "f", "letters": /[\u0066\u24D5\uFF46\u1E1F\u0192\uA77C]/g }, { "base": "g", "letters": /[\u0067\u24D6\uFF47\u01F5\u011D\u1E21\u011F\u0121\u01E7\u0123\u01E5\u0260\uA7A1\u1D79\uA77F]/g }, { "base": "h", "letters": /[\u0068\u24D7\uFF48\u0125\u1E23\u1E27\u021F\u1E25\u1E29\u1E2B\u1E96\u0127\u2C68\u2C76\u0265]/g }, { "base": "hv", "letters": /[\u0195]/g }, { "base": "i", "letters": /[\u0069\u24D8\uFF49\u00EC\u00ED\u00EE\u0129\u012B\u012D\u00EF\u1E2F\u1EC9\u01D0\u0209\u020B\u1ECB\u012F\u1E2D\u0268\u0131]/g }, { "base": "j", "letters": /[\u006A\u24D9\uFF4A\u0135\u01F0\u0249]/g }, { "base": "k", "letters": /[\u006B\u24DA\uFF4B\u1E31\u01E9\u1E33\u0137\u1E35\u0199\u2C6A\uA741\uA743\uA745\uA7A3]/g }, { "base": "l", "letters": /[\u006C\u24DB\uFF4C\u0140\u013A\u013E\u1E37\u1E39\u013C\u1E3D\u1E3B\u017F\u0142\u019A\u026B\u2C61\uA749\uA781\uA747]/g }, { "base": "lj", "letters": /[\u01C9]/g }, { "base": "m", "letters": /[\u006D\u24DC\uFF4D\u1E3F\u1E41\u1E43\u0271\u026F]/g }, { "base": "n", "letters": /[\u006E\u24DD\uFF4E\u01F9\u0144\u00F1\u1E45\u0148\u1E47\u0146\u1E4B\u1E49\u019E\u0272\u0149\uA791\uA7A5]/g }, { "base": "nj", "letters": /[\u01CC]/g }, { "base": "o", "letters": /[\u006F\u24DE\uFF4F\u00F2\u00F3\u00F4\u1ED3\u1ED1\u1ED7\u1ED5\u00F5\u1E4D\u022D\u1E4F\u014D\u1E51\u1E53\u014F\u022F\u0231\u00F6\u022B\u1ECF\u0151\u01D2\u020D\u020F\u01A1\u1EDD\u1EDB\u1EE1\u1EDF\u1EE3\u1ECD\u1ED9\u01EB\u01ED\u00F8\u01FF\u0254\uA74B\uA74D\u0275]/g }, { "base": "oi", "letters": /[\u01A3]/g }, { "base": "ou", "letters": /[\u0223]/g }, { "base": "oo", "letters": /[\uA74F]/g }, { "base": "p", "letters": /[\u0070\u24DF\uFF50\u1E55\u1E57\u01A5\u1D7D\uA751\uA753\uA755]/g }, { "base": "q", "letters": /[\u0071\u24E0\uFF51\u024B\uA757\uA759]/g }, { "base": "r", "letters": /[\u0072\u24E1\uFF52\u0155\u1E59\u0159\u0211\u0213\u1E5B\u1E5D\u0157\u1E5F\u024D\u027D\uA75B\uA7A7\uA783]/g }, { "base": "s", "letters": /[\u0073\u24E2\uFF53\u00DF\u015B\u1E65\u015D\u1E61\u0161\u1E67\u1E63\u1E69\u0219\u015F\u023F\uA7A9\uA785\u1E9B]/g }, { "base": "t", "letters": /[\u0074\u24E3\uFF54\u1E6B\u1E97\u0165\u1E6D\u021B\u0163\u1E71\u1E6F\u0167\u01AD\u0288\u2C66\uA787]/g }, { "base": "tz", "letters": /[\uA729]/g }, { "base": "u", "letters": /[\u0075\u24E4\uFF55\u00F9\u00FA\u00FB\u0169\u1E79\u016B\u1E7B\u016D\u00FC\u01DC\u01D8\u01D6\u01DA\u1EE7\u016F\u0171\u01D4\u0215\u0217\u01B0\u1EEB\u1EE9\u1EEF\u1EED\u1EF1\u1EE5\u1E73\u0173\u1E77\u1E75\u0289]/g }, { "base": "v", "letters": /[\u0076\u24E5\uFF56\u1E7D\u1E7F\u028B\uA75F\u028C]/g }, { "base": "vy", "letters": /[\uA761]/g }, { "base": "w", "letters": /[\u0077\u24E6\uFF57\u1E81\u1E83\u0175\u1E87\u1E85\u1E98\u1E89\u2C73]/g }, { "base": "x", "letters": /[\u0078\u24E7\uFF58\u1E8B\u1E8D]/g }, { "base": "y", "letters": /[\u0079\u24E8\uFF59\u1EF3\u00FD\u0177\u1EF9\u0233\u1E8F\u00FF\u1EF7\u1E99\u1EF5\u01B4\u024F\u1EFF]/g }, { "base": "z", "letters": /[\u007A\u24E9\uFF5A\u017A\u1E91\u017C\u017E\u1E93\u1E95\u01B6\u0225\u0240\u2C6C\uA763]/g }];

        for (var i = 0; i < characterMappings.length; i++) {
            value = value.replace(characterMappings[i].letters, characterMappings[i].base);
        }
        value = value.replace(/[^\w \.\,\-\|]/g, "");

        return value;
    }

    /**
     * Display debug messages if appropriate
     **/
    function logDebug(message, debugValue) {

        if (!isDevelopment() || "object" !== typeof console || !console.log) {
            return;
        }

        if (debugValue) {
            console.log("ANALYTICS: " + message, debugValue);
        } else {
            console.log("ANALYTICS: " + message);
        }
    }

    /**
     * Display error messages if appropriate
     **/
    function logError(message) {

        if (!isDevelopment() || "object" !== typeof console || !console.error) {
            return;
        }

        console.error("ANALYTICS: " + message);
    }

    /**
     * Uses analyticsPageData variables set up in incMetaInformation.jsp or incMetaInformationSolr.jsp
     * to provide page name and categorisation
     */
    function setupCategorisation() {

        if ("object" !== typeof analyticsPageData) {
            return;
        }

        setVar(pageVarMap, "pageName", analyticsPageData.title);
        setVar(pageVarMap, "channel", ""); // channel
        setVar(pageVarMap, "category", analyticsPageData.category); // prop1
        setVar(pageVarMap, "department", analyticsPageData.department); // prop2
        setVar(pageVarMap, "subsection1", analyticsPageData.subsection1); // prop3
        setVar(pageVarMap, "subsection2", analyticsPageData.subsection2); // prop13
        setVar(pageVarMap, "class", analyticsPageData.pageClass); // prop4

        setVar(pageVarMap, "pageType", analyticsPageData.pageType);

        //STORETON SPECIFIC
        setVar(conversionVarMap, "eventSignupSource", "Storeton");
        addLinkVar(conversionVarMap, "eventSignupSource");

        if ("undefined" !== typeof analyticsPageData.autoPageview) {
            autoPageview = analyticsPageData.autoPageview == "true";
        }
    }

    /**
     * Initialise tracking for the page
     */
    function init() {

        finding.load();

        // set target host based on site
        setTargetServerByHostname();

        // get categorisation info from page
        setupCategorisation();

        $(function () {
            setEnvironmentParameters();

            if (autoPageview) {
                logDebug("Auto-tracked Pageview");
                NAP.analytics.trackPageview();
            } else {
                logDebug("Auto-track disabled");
            }
        });
    }

    /**
     * Add variable name to the linkTrackVars list
     */
    function addLinkVar(map, varName) {

        // does map exist?
        if ("undefined" === typeof map) {
            logError("addLinkVar: undefined map");
        }

        if (map.hasOwnProperty(varName)) {
            if (-1 === $.inArray(map[varName], linkVars)) {
                linkVars.push(map[varName]);
            }
        } else {
            logError("addLinkVar: variable " + varName + " does not exist");
        }
    }

    /**
     * After sending data, clear event and product data
     */
    function clearVars() {

        linkVars = ["channel", "shippingCountry", "language"];
        pageEvents = [];
        products = [];
    }

    /**
     * Before sending a tag for a custom link, output any built variables
     */
    function outputLinkVars() {

        if (pageEvents.length > 0) {

            var eventNames = [];
            $.each(pageEvents, function () {
                var tmp = this.split("=");
                eventNames.push(tmp[0]);
            });

            // set the list of events this page uses
            setVar(pageVarMap, "linkTrackEvents", eventNames.join(","));
            setVar(pageVarMap, "events", pageEvents.join(","), true);
            logDebug("Tracking events", pageEvents);

            // we need to set a pageVar to say there are events set
            addLinkVar(pageVarMap, "events");
        }

        // Used on Basket and Checkout pages
        if (products.length > 0) {

            // build list of products
            s.products = products.join(",");
            logDebug("Tracking products", s.products);

            // add product list to variables to be sent
            addLinkVar(pageVarMap, "products");
        }

        // these variables will be tracked on every page
        setVar(pageVarMap, "linkTrackVars", linkVars.join(","));
        logDebug("Link vars", linkVars);

        clearVars();
    }

    /**
     * Before sending a pageview tag, output any built variables
     */
    function outputPageVars() {

        if (pageEvents.length > 0) {
            s.events = pageEvents.join(",");
        }

        // Used on Basket and Checkout pages
        if (products.length > 0) {

            // build list of products
            s.products = products.join(",");
        }

        clearVars();
    }

    /**
     * Retrieve value of a previously set page variable
     * @param {string} varName Name of variable to retrieve
     * @return {*} variable value
     */
    function getPageVar(varName) {
        if ("undefined" === typeof s) {
            // check through queued tags
            for (var t in tagQueue) {
                if ($.inArray("varName", t) && t.varName === varName) {
                    return t.value;
                }
            }
        } else {
            // we're looking in s itself
            if (!(varName in pageVarMap)) {
                return;
            }
            var soughtVar = pageVarMap[varName];

            if (varName in pageVarMap && s[soughtVar]) {
                return s[soughtVar];
            }
            return;
        }
    }

    /**
     * Set value of the specified variable
     * equivalent to s.variable = value
     * @param {object} map of "friendly" names to Adobe variable names
     * @param {string} "friendly name" of variable
     * @param {*} value to assign to variable (will be sanitised...)
     * @param {bool} ...unless this is set to true
     */
    function setVar(map, key, value, doNotSanitise) {

        // does map exist?
        if ("undefined" === typeof map) {
            logError("setVar: undefined map");
        }

        // does key exist in map?
        if (map.hasOwnProperty(key)) {
            if (doNotSanitise) {
                setValue(map[key], value);
            } else {
                setValue(map[key], sanitise(value));
            }
        } else {
            logError("setVar: variable " + key + " does not exist");
        }
    }

    /**
     * Generate the Discount event text so it can be appended to the string created by
     * 'addProduct()' that is sent to the Adobe server.
     * @param {string} Discount amount as string
     */
    function getDiscountText(discount) {
        var discountText = "";

        if (discount) {
            discountText = eventMap.discount + "=" + discount;
        }

        return discountText;
    }

    init();

    return { // public stuff goes in here

        LINK_DOWNLOAD: "d",
        LINK_EXIT: "e",
        LINK_CUSTOM: "o",

        setPageVar: function setPageVar(varName, value, linkVar) {
            setVar(pageVarMap, varName, value);
            if ("undefined" != typeof linkVar && linkVar) {
                addLinkVar(pageVarMap, varName);
            }
            logDebug("Setting page variable " + varName, value);
        },

        setConversionVar: function setConversionVar(varName, value, linkVar) {
            setVar(conversionVarMap, varName, value);
            if ("undefined" != typeof linkVar && linkVar) {
                addLinkVar(conversionVarMap, varName);
            }
            logDebug("Setting conversion variable " + varName, value);
        },

        addEvent: function addEvent(eventName, value) {
            if (eventMap.hasOwnProperty(eventName)) {
                if (-1 === $.inArray(eventName, pageEvents)) {
                    logDebug("Adding event " + eventMap[eventName]);

                    var eventString = eventMap[eventName];

                    if ("undefined" !== typeof value) {
                        eventString += "=" + sanitise(value);
                    }
                    pageEvents.push(eventString);
                }
            } else {
                logError("addEvent: event " + eventName + " not found");
            }
        },

        addProduct: function addProduct(sku, qty, price, discount) {

            var numFoundProducts = finding.products.length; // number of products already in finding cache
            var findingMethod = ""; // current finding method
            var findingPID = ""; // current finding pid

            logDebug("Finding status", finding);

            var pid = ("" + sku).split("-")[0];

            // if we have products in finding cache, check if any match the current product
            if (numFoundProducts > 0) {
                $.each(finding.products, function () {
                    if (parseInt(this.pid) === parseInt(pid)) {
                        findingMethod = sanitise(this.referrer); // set the referrer if the finding pid matches
                        if (null !== this.referpid) {
                            findingPID = this.referpid; // also set the referrer pid if applicable
                        }
                    }
                });
            }

            // if no existing finding method, use the one from scratch
            if ("" === findingMethod) {
                logDebug("Getting finding method from scratch");
                findingMethod = sanitise(finding.scratch);

                if ("" == findingPID && null !== findingPID && null !== finding.referpid) {
                    logDebug("Getting referring PID from cookie", finding.referPID);
                    findingPID = finding.referpid; // set the referring pid where applicable
                }
            }

            // if the current PID is the same as the referring PID, user has probably pressed back button
            // since it's impossible for a product to refer itself, this data should be cleared
            if (null !== finding.referpid && "undefined" !== typeof productID && productID == finding.referpid) {
                logDebug("Referring PID is the same, clearing finding data");
                findingPID = null;
                findingMethod = null;
                finding.referpid = null;
                finding.scratch = null;
                finding.save();
            }

            if ("undefined" !== typeof qty && null !== qty) {

                // counterintuitively, the price you send is the total for the SKU, not the unit price
                var totalPrice = parseInt(qty, 10) * parseFloat(price);
                logDebug("Adding order product: " + qty + " x " + pid + " @ " + price);

                /* Product string must always start with a ; */
                var productString = ";" + sanitise(pid) + ";" + sanitise(qty) + ";" + sanitise(totalPrice) + ";" + getDiscountText(discount) + ";";

                skus.push({ sku: sku, pid: pid, quantity: qty, unitPrice: price });
            } else {
                logDebug("Adding basket product", pid);
                var productString = ";" + sanitise(pid) + ";" + ";;" + getDiscountText(discount) + ";";
            }

            if (null !== findingMethod && "undefined" !== typeof findingMethod) {
                logDebug("Adding finding method of ", findingMethod);
                productString += conversionVarMap["productFindMethod"] + "=" + findingMethod;

                if ("" !== findingPID && "undefined" !== typeof findingPID) {
                    logDebug("Adding referring PID", findingPID);
                    productString += "|" + conversionVarMap["crosssellItem"] + "=" + findingPID;
                }
            } else {
                logDebug("No finding method", finding);
            }
            logDebug("Add product:", productString);
            products.push(productString);
        },

        setPageName: function setPageName(pageName) {
            analyticsPageData.title = pageName;
            setVar(pageVarMap, "pageName", pageName);
        },

        /**
         * Select page type
         */
        setPageType: function setPageType(pageType) {
            analyticsPageData.pageType = pageType;
            this.setPageVar("pageType", pageType);
        },

        /**
         * Update current finding method
         * @param {string} source Page name/name of area where product may have been found - should never be a Product Details page
         */
        recordFindingMethod: function recordFindingMethod(source, pid) {

            // reset finding PID - this will be set later if required
            logDebug("Resetting finding PID");
            finding.referpid = null;

            // if nothing specified, use page title
            if ("undefined" === typeof source) {
                source = analyticsPageData.title;
                if ("" === source) {
                    logError("No page title for finding method");
                    return;
                }
                logDebug("Auto set finding method to: ", source);
            } else {
                logDebug("Manually set finding method to: ", source);

                if ("undefined" !== typeof pid) {
                    logDebug("Manually set referring product to: ", pid);
                    finding.referpid = pid;
                }
            }
            finding.scratch = source;
            finding.save();
        },

        /**
         * Set finding method for the specified product to the latest value
         * @param {int} pid of product
         */
        trackFindingMethod: function trackFindingMethod(pid) {

            if (!finding.scratch) {
                logError("No current finding method. Aborting.", finding);
                return;
            }

            logDebug("Tracking finding method as: ", finding.scratch);

            var productData = {
                "pid": pid,
                "referrer": finding.scratch
            };

            if (null !== finding.referpid) {
                productData.referpid = finding.referpid;
            }
            finding.scratch = null;
            finding.referpid = null;

            finding.products.push(productData);
            finding.save();
        },

        /**
         * Track a page view - this should only be called ONCE per page
         * This will send the pageName, so ensure this has been set first
         * Read Adobe documentation for non-JS version
         */
        trackPageview: function trackPageview() {

            if ("object" === typeof analyticsPageData) {
                var pageCategory = analyticsPageData.category;
                var pageType = analyticsPageData.pageType;

                if (!("CHECKOUT" === pageCategory || "PRODUCT DETAILS PAGE" === pageType)) {
                    this.recordFindingMethod();
                } else {
                    logDebug("Finding method tracking not active for this page");
                    logDebug("Current finding method is: ", finding.scratch);
                    if (null !== finding.referpid) {
                        logDebug("Current referring pid is: ", finding.referpid);
                    }
                }
            }

            // auto track search keywords
            if ("" !== window.location.search) {
                var keywords = decodeURI(window.location.search.replace(new RegExp("^(?:.*[&\\?]" + encodeURI("keywords").replace(/[\.\+\*]/g, "\\$&") + "(?:\\=([^&]*))?)?.*$", "i"), "$1"));
                if ("" !== keywords) {
                    setVar(conversionVarMap, "internalSearch", keywords);
                }
            }

            // auto track search keywords
            if ("" !== window.location.search) {
                var querystring = window.location.search.substr(1).split("&"),
                    numParams = querystring.length;

                for (var i = 0; i < numParams; ++i) {
                    var querytmp = querystring[i].split("=");
                    if (2 === querytmp.length && querytmp[0].toLowerCase() === "keywords") {
                        setVar(conversionVarMap, "internalSearch", decodeURIComponent(querytmp[1].replace(/\+/g, " ")));
                    }
                }
            }

            // output any product/event tags
            outputPageVars();

            fireTag("t"); // no params, so simply call Adobe function

            logDebug("Page view tracked");

            // tidy up after recording order
            if ("ORDER CONFIRMATION" === s[pageVarMap.department]) {
                finding.clear();
            }
        },

        /**
         * Track element action (this will need refactoring)
         * @param {object} element Element we are tracking
         * @param {string} linkType Type of link (Download, Exit, Custom) - see constants
         * @param {string} linkName Name to display in reporting
         * @param {object} override variables (no documentation for this)
         * @param {function|"navigate"} Callback, "navigate" means follow the link href
         */
        trackElement: function trackElement(linkName, element, linkType, variableOverrides, doneAction) {

            // If object has no href property, we send 'true' to cancel the navigation delay
            if (!element || "object" === typeof element && !("href" in element)) {
                element = "true";
            }

            // Sanitise link type (may be one of the below):
            // File Download, Exit Link, Custom Link
            switch (linkType) {
                case this.LINK_DOWNLOAD:
                case this.LINK_EXIT:
                    break;
                default:
                    linkType = this.LINK_CUSTOM;
            }

            // linkName may be a maximum of 100 characters
            linkName = linkName.substr(0, 100);

            // pass null if no overrides specified
            variableOverrides = variableOverrides || null;

            // doneAction is either a callback function or 'navigate', which follows the link
            doneAction = doneAction || "navigate";

            logDebug("Element tag (" + linkType + ")", element);

            // set all event tags before here
            outputLinkVars();

            // SiteCatalyst call
            fireTag("tl", [element, linkType, linkName, variableOverrides, doneAction]);
        },

        /**
         * Run this function if the specified flag is present in the body data tags
         * @param {string} key			Tag key to look for in body tag data
         * @param {function} callback	Callback function to run if tag is present
         */
        conditional: function conditional(key, callback) {

            if (isTagEnabled(key)) {
                callback();
            }
        },

        /**
         * Track product add to bag function
         * NOTE: for form submissions that cause a page refresh, use the callback param with a form submit function
         *
         * @param productID PID to add
         * @param link Element to pass
         * @param callback Optional function to call on track (use for form submit)
         * @return {boolean}
         */
        trackAddToBag: function trackAddToBag(productID, link, callback) {
            if ("undefined" === typeof productID) {
                logError("No PID to add");
                return false;
            }

            link = link || true;

            this.addEvent("addToBag");

            this.trackFindingMethod(productID);
            this.addProduct(productID);

            // for form submits
            if ("undefined" === typeof callback) {
                this.trackElement("Add to Bag", link);
            } else {
                this.trackElement("Add to Bag", link, this.LINK_CUSTOM, null, callback);
            }
        },

        trackBagSessionStart: function trackBagSessionStart(link) {
            if ("nap" === site && !!CookieUtil.getCookie("shopping_basket") === false || "mrp" === site && "0" == $("#header-inject-bagcount").text() || "ton" === site && "0" == $("#basket-items-count").text()) {
                this.addEvent("openBag");
                this.trackElement("Bag session start", link || true);
            }
        },

        /**
         * Track completed order from confirmation page
         * @param {object} orderData Order ID, country and city
         * (this will be expanded in future phases)
         */
        trackOrderComplete: function trackOrderComplete(orderData) {

            orderData = orderData || {};
            if (orderData.hasOwnProperty("orderID")) {
                orderID = orderData.orderID;
                orderComplete = true;
                this.setConversionVar("purchaseID", orderData.orderID);
            }
            if (orderData.hasOwnProperty("country")) {
                this.setConversionVar("shippingCountry", orderData.country);
            }
            if (orderData.hasOwnProperty("city")) {
                this.setConversionVar("shippingCity", orderData.city);
            }
            if (orderData.hasOwnProperty("paymentMethod")) {
                this.setConversionVar("paymentMethod", orderData.paymentMethod);
            }
            //mobile app tracking
            if (orderData.hasOwnProperty("applicationName")) {
                this.setConversionVar("appName", orderData.applicationName);
            }

            this.addEvent("purchase");
        },

        trackProductView: function trackProductView(sku, discount) {
            setEnvironmentParameters();
            this.addEvent("productView");
            this.addEvent("customProductView");

            logDebug("Tracking product view for ", sku);
            this.addProduct(sku, null, null, discount);
            this.trackPageview();
        },

        /**
         * If the order is complete the method returns order
         * confirmation data e.g. it will return the orderID
         * together with an array of product data such as sku,
         * pid, quantity and unit price for each product.
         */
        getOrderConfirmation: function getOrderConfirmation() {
            if (orderComplete) {
                return {
                    orderID: orderID,
                    skus: skus
                };
            }
            return null;
        },

        loaded: function loaded() {
            if ("undefined" === typeof s) {
                return false;
            }
            return true;
        }
    };
})();

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/main.js":[function(require,module,exports){
'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _pagesProductListIndex = require('./pages/product-list/index');

var _pagesProductListIndex2 = _interopRequireDefault(_pagesProductListIndex);

var _analytics = require('./analytics');

var _analytics2 = _interopRequireDefault(_analytics);

$(_pagesProductListIndex2['default']);

},{"./analytics":"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/analytics.js","./pages/product-list/index":"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/pages/product-list/index.js"}],"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/modules/feature.js":[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _config = require('../config');

exports['default'] = function (name) {
	return (_config.features || {})[name] === true;
};

module.exports = exports['default'];

},{"../config":"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/config.js"}],"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/modules/history.js":[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});
var win = window;
var history = win.history;
var origin = win.location.origin;
var canPush = history.pushState;
var cache = {};

if ('onpopstate' in win) {
	window.onpopstate = function () {
		var e = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

		// get current window url based
		var url = e.target && e.target.location && e.target.location.href;
		var fullyQualified = origin + url;

		// execute callback if url already stored
		url && cache[fullyQualified] && cache[fullyQualified](url);
	};
}

exports['default'] = {
	add: function add(url) {
		var _ref = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

		var _ref$data = _ref.data;
		var data = _ref$data === undefined ? {} : _ref$data;
		var _ref$title = _ref.title;
		var title = _ref$title === undefined ? '' : _ref$title;
		var _ref$callback = _ref.callback;
		var callback = _ref$callback === undefined ? false : _ref$callback;

		if (url) {
			// store callback to be called when url revisited
			if (callback) cache[origin + url] = callback;
			canPush && history.pushState(data, title, url);
		}
	}
};
module.exports = exports['default'];

},{}],"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/modules/mediator.js":[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});
var events = {};

exports['default'] = {
	on: function on(event, callback) {
		var _this = this;

		if (!event) return;

		// register multiple events if space found
		if (!! ~event.indexOf(' ')) {
			event.split(' ').forEach(function (name) {
				_this.on(name, callback);
			});
			return;
		}

		if (!events[event]) events[event] = [];
		events[event].push(callback);
	},
	emit: function emit(event) {
		var _this2 = this;

		for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
			args[_key - 1] = arguments[_key];
		}

		// emit multiple events if space found
		if (!! ~event.indexOf(' ')) {
			event.split(' ').forEach(function (name) {
				_this2.emit.apply(_this2, [].concat(name, args));
			});
			return;
		}

		if (!events[event]) return;
		events[event].forEach(function (callback) {
			callback.apply({ name: event }, args);
		});
	}
};
module.exports = exports['default'];

},{}],"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/modules/product-list/filter.js":[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _modulesMediator = require('../../modules/mediator');

var _modulesMediator2 = _interopRequireDefault(_modulesMediator);

var _modulesUtilsQs = require('../../modules/utils/qs');

var _modulesUtilsQs2 = _interopRequireDefault(_modulesUtilsQs);

var valueDelimiter = ';';
var events = {
	change: 'filter:change',
	clear: 'filter:clear',
	addValue: 'filter:add',
	removeValue: 'filter:remove',
	updateValue: 'filter:update',
	toggle: 'filter:toggle'
};

var Filter = (function () {
	function Filter(name) {
		var _this = this;

		_classCallCheck(this, Filter);

		this.name = name;
		this.values = {};
		this.qsParams = {};
		this.state = {
			visible: false
		};

		// register events
		_modulesMediator2['default'].on(events.toggle, function (name, value) {
			if (name == _this.name) {
				_this.state.visible = value;
			}
		});
	}

	_createClass(Filter, [{
		key: 'value',
		value: function value(param, _value) {
			if (!param) return this.values;
			if (_value === undefined) return this.values[param];
			return this.values[param] = _value;
		}
	}, {
		key: 'initValueFromQs',
		value: function initValueFromQs(param) {
			var value = _modulesUtilsQs2['default'].get(param) || '';
			this.value(param, value);
			return this;
		}
	}, {
		key: 'setDefaultVisibility',
		value: function setDefaultVisibility(param) {
			if (this.value(param)) {
				this.visible = true;
			}
			return this;
		}
	}, {
		key: 'addParameter',
		value: function addParameter(name) {
			var alias = arguments.length <= 1 || arguments[1] === undefined ? name : arguments[1];
			return (function () {
				this.qsParams[alias] = name;
				this.initValueFromQs(name);
				this.setDefaultVisibility(name);
				return this;
			}).apply(this, arguments);
		}
	}, {
		key: 'getParameter',
		value: function getParameter(name) {
			if (name) return this.qsParams[name];

			// use first registered parameter if no parameter specified

			for (var first in this.qsParams) break;
			return first;
		}
	}, {
		key: 'add',
		value: function add(value, param) {
			param = this.getParameter(param);

			// only add if value doesn't already exist
			var paramValue = this.value(param);
			if (typeof paramValue === 'string' && ! ~paramValue.indexOf(value)) {

				// prepend with valueDelimiter if first entry

				var result = paramValue + (paramValue ? valueDelimiter : '') + value;
				this.value(param, result);
				_modulesMediator2['default'].emit(events.addValue, this.name, value, param);
				_modulesMediator2['default'].emit(events.change);
			}
			return this;
		}
	}, {
		key: 'remove',
		value: function remove(value, param) {
			param = this.getParameter(param);

			// only remove if value already exists

			var paramValue = this.value(param);
			if (paramValue !== undefined && !! ~paramValue.indexOf(value)) {

				// remove value and delimiter

				var regex = new RegExp(value + valueDelimiter + '?' + '|' + valueDelimiter + '?' + value, 'ig');
				var result = paramValue.replace(regex, '');
				this.value(param, result);
				_modulesMediator2['default'].emit(events.removeValue, this.name, value, param);
				_modulesMediator2['default'].emit(events.change);
			}
			return this;
		}
	}, {
		key: 'update',
		value: function update(value, param) {
			var silent = arguments.length <= 2 || arguments[2] === undefined ? false : arguments[2];

			if (typeof value === 'object') {
				silent = param;
				this.updateMulti(value, silent);
				return;
			}
			param = this.getParameter(param);
			var paramValue = this.value(param);
			if (paramValue !== undefined) {
				this.value(param, value);
				if (!silent) {
					_modulesMediator2['default'].emit(events.updateValue, this.name, value, param);
					_modulesMediator2['default'].emit(events.change);
				}
			}
			return this;
		}
	}, {
		key: 'updateMulti',
		value: function updateMulti(properties) {
			var silent = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];

			// do not emit events for individual property updates
			for (var property in properties) {
				this.update(properties[property], property, true);
			}
			// emit event for all updates

			if (!silent) {
				_modulesMediator2['default'].emit(events.updateValue, this.name, properties);
				_modulesMediator2['default'].emit(events.change);
			}
			return this;
		}
	}, {
		key: 'clear',
		value: function clear() {
			var silent = arguments.length <= 0 || arguments[0] === undefined ? false : arguments[0];

			var values = this.value();
			for (var param in values) {
				this.value(param, '');
			}
			if (!silent) _modulesMediator2['default'].emit(events.clear, this.name);
			return this;
		}
	}, {
		key: 'toggle',
		value: function toggle() {
			this.visible = !this.visible;
			return this;
		}
	}, {
		key: 'visible',
		get: function get() {
			return this.state.visible;
		},
		set: function set(value) {
			this.state.visible = !!value;
			_modulesMediator2['default'].emit(events.toggle, this.name, this.state.visible);
		}
	}]);

	return Filter;
})();

exports['default'] = Filter;
module.exports = exports['default'];

},{"../../modules/mediator":"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/modules/mediator.js","../../modules/utils/qs":"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/modules/utils/qs.js"}],"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/modules/product-list/index.js":[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _modulesMediator = require('../../modules/mediator');

var _modulesMediator2 = _interopRequireDefault(_modulesMediator);

var _filter = require('./filter');

var _filter2 = _interopRequireDefault(_filter);

var events = {
	init: 'productList:init',
	toggle: 'filters:toggle',
	clear: 'filters:clear'
};

var ProductList = (function () {
	function ProductList() {
		var _this = this;

		_classCallCheck(this, ProductList);

		this.filters = [];
		this.state = {
			visible: true
		};

		// register events
		_modulesMediator2['default'].on(events.toggle, function (value) {
			return _this.state.visible = value;
		});
	}

	_createClass(ProductList, [{
		key: 'init',
		value: function init() {
			this.filters = [new _filter2['default']('category').addParameter('level3Filter', 'sub-category'), new _filter2['default']('colour').addParameter('colourFilter'), new _filter2['default']('clothingSize').addParameter('clothingSizeFilter'), new _filter2['default']('shoesSize').addParameter('shoesSizeFilter'), new _filter2['default']('brasSize').addParameter('brasSizeFilter'), new _filter2['default']('designer').addParameter('designerFilter'), new _filter2['default']('price').addParameter('min_priceFilter', 'min').addParameter('max_priceFilter', 'max')];

			this.sort = new _filter2['default']('sort').addParameter('sortBy');
			this.clothingLocale = new _filter2['default']('clothingLocale').addParameter('clothingLocale');
			this.shoeLocale = new _filter2['default']('shoeLocale').addParameter('shoesLocale');
			_modulesMediator2['default'].emit(events.init);
		}
	}, {
		key: 'on',
		value: function on() {
			for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
				args[_key] = arguments[_key];
			}

			_modulesMediator2['default'].on.apply(_modulesMediator2['default'], args);
		}
	}, {
		key: 'emit',
		value: function emit() {
			for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
				args[_key2] = arguments[_key2];
			}

			_modulesMediator2['default'].emit.apply(_modulesMediator2['default'], args);
		}
	}, {
		key: 'getFilter',
		value: function getFilter(name) {
			return this.filters.filter(function (filter) {
				return filter.name == name;
			})[0];
		}
	}, {
		key: 'clearFilters',
		value: function clearFilters() {
			var silent = arguments.length <= 0 || arguments[0] === undefined ? false : arguments[0];

			// change state as we don't want event to be fired
			this.state.category = '';
			this.filters.forEach(function (filter) {
				filter.clear(silent);
			});
			if (!silent) _modulesMediator2['default'].emit(events.clear);
		}
	}, {
		key: 'toggle',
		value: function toggle() {
			this.visible = !this.visible;
		}
	}, {
		key: 'visible',
		get: function get() {
			return this.state.visible;
		},
		set: function set(value) {
			this.state.visible = !!value;
			_modulesMediator2['default'].emit(events.toggle, this.state.visible);
		}
	}]);

	return ProductList;
})();

exports['default'] = ProductList;
module.exports = exports['default'];

},{"../../modules/mediator":"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/modules/mediator.js","./filter":"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/modules/product-list/filter.js"}],"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/modules/pullMarkup.js":[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

exports['default'] = function (markup, selector) {

	// We're pulling down the entire page.
	// To stop the loading of static assets
	// only pull in the body content of the markup
	var body = /<body.*?>([\s\S]*)<\/body>/.exec(markup);
	if (body) {
		var wrapper = document.createElement('div');
		wrapper.innerHTML = body[1];

		// store container just in case element is missing
		var container = wrapper.querySelector(selector);
		return container && container.innerHTML;
	}
	return null;
};

module.exports = exports['default'];

},{}],"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/modules/url.js":[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _utilsQs = require('./utils/qs');

var _utilsQs2 = _interopRequireDefault(_utilsQs);

var loc = location;

var Url = (function () {
	function Url() {
		var pattern = arguments.length <= 0 || arguments[0] === undefined ? '' : arguments[0];

		_classCallCheck(this, Url);

		this.origin = loc.origin;
		this.path = loc.pathname;
		this.qsMap = _utilsQs2['default'].getMap();

		// create a map of patterns
		// result: (/this/:my/:path) => [false, 'my','path']
		this.pattern = pattern.split('/').map(function (fragment) {
			return fragment.indexOf(':') === 0 ? fragment.substr(1) : false;
		});
	}

	_createClass(Url, [{
		key: 'addQsParam',
		value: function addQsParam(key, value) {
			this.qsMap[key] = value;
			return this;
		}
	}, {
		key: 'appendPath',
		value: function appendPath(path) {
			this.path += '/' + path;
		}
	}, {
		key: 'set',
		value: function set(url) {
			var a = document.createElement('a');
			a.href = url;
			this.origin = a.origin;
			this.path = a.pathname;
			var qsIndex = url.indexOf('?');
			this.qsMap = qsIndex > -1 ? _utilsQs2['default'].getMap(url.slice(qsIndex + 1)) : {};
		}
	}, {
		key: 'get',
		value: function get() {
			// return top level + qs
			var qs = '';
			for (var key in this.qsMap) {
				qs += '&' + key + '=' + this.qsMap[key];
			}
			if (qs) qs = '?' + qs.substr(1);

			return this.path + qs;
		}
	}, {
		key: 'getPath',
		value: function getPath(fragment) {
			if (fragment) {
				var patternIndex = this.pattern.indexOf(fragment);
				return this.path.split('/')[patternIndex];
			}
			return this.path;
		}
	}, {
		key: 'updatePath',
		value: function updatePath(fragment) {
			var value = arguments.length <= 1 || arguments[1] === undefined ? '' : arguments[1];

			if (fragment) {
				var patternIndex = this.pattern.indexOf(fragment);
				var fragments = this.path.split('/');
				fragments[patternIndex] = value;
				this.path = fragments.join('/');
			}
			return this.path;
		}
	}, {
		key: 'dropPath',
		value: function dropPath(fragment) {
			var result = this.path.split('/');
			if (fragment) {
				// safety feature drops path only if fragment
				// matches last pattern fragment
				var lastIndex = result.length - 1;
				var matchingFragment = this.pattern[lastIndex] === fragment;
				if (matchingFragment) result.pop();
			} else {
				result.pop();
			}
			this.path = result.join('/');
			return this;
		}
	}, {
		key: 'getQs',
		value: function getQs(value) {
			return value ? this.qsMap[value] : this.qsMap;
		}
	}, {
		key: 'removeQs',
		value: function removeQs(param) {
			if (!param) this.qsMap = {};else delete this.qsMap[param];
		}
	}]);

	return Url;
})();

exports['default'] = Url;
module.exports = exports['default'];

},{"./utils/qs":"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/modules/utils/qs.js"}],"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/modules/utils.js":[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _utilsDebounce = require('./utils/debounce');

var _utilsDebounce2 = _interopRequireDefault(_utilsDebounce);

var _utilsElementInView = require('./utils/elementInView');

var _utilsElementInView2 = _interopRequireDefault(_utilsElementInView);

var _utilsResponsiveProperty = require('./utils/responsiveProperty');

var _utilsResponsiveProperty2 = _interopRequireDefault(_utilsResponsiveProperty);

var _utilsQs = require('./utils/qs');

var _utilsQs2 = _interopRequireDefault(_utilsQs);

exports['default'] = {
	debounce: _utilsDebounce2['default'],
	elementInView: _utilsElementInView2['default'],
	qs: _utilsQs2['default'],
	responsiveProperty: _utilsResponsiveProperty2['default']
};
module.exports = exports['default'];

},{"./utils/debounce":"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/modules/utils/debounce.js","./utils/elementInView":"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/modules/utils/elementInView.js","./utils/qs":"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/modules/utils/qs.js","./utils/responsiveProperty":"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/modules/utils/responsiveProperty.js"}],"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/modules/utils/debounce.js":[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});
var debounceTimer = null;

exports["default"] = function (time, callback) {
	return time ? function () {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(callback, time);
	} : callback;
};

module.exports = exports["default"];

},{}],"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/modules/utils/elementInView.js":[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});

exports["default"] = function (element, viewport) {
	var buffer = arguments.length <= 2 || arguments[2] === undefined ? 0 : arguments[2];

	var rect = element.getBoundingClientRect();

	return element.offsetParent !== null && rect.bottom + buffer >= 0 && rect.right + buffer >= 0 && rect.top - buffer <= viewport.height && rect.left - buffer <= viewport.width;
};

module.exports = exports["default"];

},{}],"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/modules/utils/qs.js":[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});
var valueDivider = '=';
var paramDivider = '&';

exports['default'] = {
	getRaw: function getRaw() {
		// ignore the first '?'
		return window.location.search.substr(1);
	},
	has: function has(parameter) {
		return !! ~this.getRaw().indexOf(parameter);
	},
	prepare: function prepare() {
		var qs = arguments.length <= 0 || arguments[0] === undefined ? '' : arguments[0];

		// split by '&' param
		return (qs || this.getRaw()).split(paramDivider);
	},
	get: function get(parameter) {
		// return first instance of parameter
		return parameter && this.has(parameter)
		// group and split by '='
		? this.prepare().map(function (item) {
			return item.split(valueDivider);
		}).filter(function (qs) {
			return qs[0] === parameter;
		})[0][1] : undefined;
	},
	getMap: function getMap() {
		var qs = arguments.length <= 0 || arguments[0] === undefined ? '' : arguments[0];

		var map = {};
		this.prepare(qs).forEach(function (item) {
			var items = item.split('=');
			var param = items[0];
			if (param) map[param] = items[1];
		});
		return map;
	},
	set: function set(parameter, value, qs) {
		var result = '';
		if (parameter && this.has(parameter)) {
			result = this.prepare().map(function (item) {
				var qs = item.split(valueDivider);
				if (qs[0] === parameter) qs[1] = value;
				return qs.join(valueDivider);
			}).join(paramDivider);
		} else {
			// append to existing qs parameters
			var combined = parameter + valueDivider + value;
			var current = qs || this.getRaw();
			result = (current && current + '&') + combined;
		}
		return result;
	}
};
module.exports = exports['default'];

},{}],"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/modules/utils/responsiveProperty.js":[function(require,module,exports){
// NOTE: Current functionality loads images based on initial window size.
// Alternative would be to make this change on window resize event
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});
var windowWidth = window.innerWidth || document.documentElement.clientWidth;
var groupSeparator = '|';
var sizeSeparator = ',';

exports['default'] = function (element) {
	var baseAttribute = arguments.length <= 1 || arguments[1] === undefined ? 'data-src' : arguments[1];
	var targetAttribute = arguments.length <= 2 || arguments[2] === undefined ? 'src' : arguments[2];

	var srcs = element.getAttributeNode(baseAttribute);
	if (srcs) {

		// get src based on pattern
		// {condition}{width}|{url} e.g. >320|//image.com/mine.jpg
		var src = (srcs.value || '').replace(/\s/g, '').split(sizeSeparator).filter(function (item) {
			var data = item.split(groupSeparator);
			var conditionGroup = data[0];
			var condition = conditionGroup.substr(0, 1);
			var width = conditionGroup.substr(1);

			// no width specified
			if (!width) return false;
			switch (condition) {
				case '>':
					return windowWidth >= width;
				case '<':
					return windowWidth < width;
			}

			// no matching condition specified
			return false;
		});

		// if any conditions are met
		if (src.length) {

			// get first matching condition
			src = src[0].split(groupSeparator)[1];

			// if src exists
			if (src) {
				// replace default baseAttribute with src attribute
				element.removeAttribute(baseAttribute);
				element.setAttribute(targetAttribute, src);
			}
		}
	}
};

module.exports = exports['default'];

},{}],"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/pages/product-list/feature.ajax.js":[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _modulesHistory = require('../../modules/history');

var _modulesHistory2 = _interopRequireDefault(_modulesHistory);

var _modulesPullMarkup = require('../../modules/pullMarkup');

var _modulesPullMarkup2 = _interopRequireDefault(_modulesPullMarkup);

exports['default'] = function (pl) {

	var fetchByHrefSelectors = ['#pl-filters .filter-btn', '#pl-filters .dropdown-list a', '#sortBy .dropdown-list a', '.button.clear-section', '.pagination a'].join(',');

	pl.on('history:add', function (url) {
		_modulesHistory2['default'].add(url, {
			callback: function callback(url) {
				pl.emit('fetch', url, false);
			}
		});
	});

	pl.on('filters:bindEvents', function () {

		$(fetchByHrefSelectors).on('click', function (e) {
			var target = e.currentTarget;
			var category = target.getAttribute('data-category');
			var reset = target.getAttribute('data-reset');
			var sortBy = target.getAttribute('data-sort');
			var clothingLocale = target.getAttribute('data-clothing-locale');
			var shoeLocale = target.getAttribute('data-shoe-locale');
			var param = target.getAttribute('data-param');

			if (reset !== null) {
				pl.clearFilters();
				e.preventDefault();
			} else if (category !== null) {
				//clear level 3 filter value
				pl.getFilter('category').clear(true);
				pl.category = category;
				pl.emit('productList:categoryChange');
				e.preventDefault();
			} else if (sortBy !== null) {
				pl.sort.update(sortBy, param);
				e.preventDefault();
			} else if (clothingLocale !== null) {
				pl.getFilter('clothingSize').clear(true);
				pl.clothingLocale.update(clothingLocale, param);
				e.preventDefault();
			} else if (shoeLocale !== null) {
				pl.getFilter('shoesSize').clear(true);
				pl.shoeLocale.update(shoeLocale, param);
				e.preventDefault();
			} else {
				var filter = target.getAttribute('data-filter');
				var value = target.getAttribute('data-value');
				if (filter && value) {
					var isSelected = !! ~target.className.indexOf('button-selected');
					pl.getFilter(filter)[isSelected ? 'remove' : 'add'](value, param);
					e.preventDefault();
				}
			}
			var url = target.href;
			if (url) {
				pl.emit('fetch', url);
				e.preventDefault();
			}
		});

		// trigger filter visible state
		pl.filters.forEach(function (filter) {
			return filter.visible = filter.visible;
		});

		$('#pl-filters .size-guide-link').on('click', function () {
			pl.emit('filters:sizeChart');
		});
	});

	pl.on('fetch', function (url) {
		var addToHistory = arguments.length <= 1 || arguments[1] === undefined ? true : arguments[1];

		// fetch  markup
		$.ajax(url, {
			method: 'GET',
			dataType: 'html',
			success: function success(data) {
				var selector = '#pl-page';
				var markup = (0, _modulesPullMarkup2['default'])(data, selector);
				markup && $(selector).html(markup);

				// rebind events and display filters
				pl.emit('filters:bindEvents list:bindEvents');
				pl.emit('filters:toggle', pl.visible);

				// push updated url to history
				// prevent filters:refresh cyclic event
				if (addToHistory) {
					pl.emit('history:add', url);
				}

				pl.emit('fetch:complete');
			},
			error: function error() {
				document.location = url;
			}
		});
	});

	pl.on('productList:init', function () {
		pl.emit('history:add', pl.url);
	});
};

module.exports = exports['default'];

},{"../../modules/history":"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/modules/history.js","../../modules/pullMarkup":"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/modules/pullMarkup.js"}],"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/pages/product-list/feature.analytics.js":[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _analytics = require('../../analytics');

var _analytics2 = _interopRequireDefault(_analytics);

exports['default'] = function (pl) {

    function buildFilterSet() {
        var filterSet = [].concat(pl.filters);
        filterSet.push(pl.sort);
        filterSet.push(pl.clothingLocale);
        filterSet.push(pl.shoeLocale);
        return filterSet;
    }

    pl.on('filter:change', function () {
        _analytics2['default'].set('event', {
            name: 'filtersChanged',
            filters: buildFilterSet()
        });
    });

    pl.on('productList:categoryChange', function () {
        _analytics2['default'].set('event', {
            name: 'leftNav',
            category: pl.category,
            filters: buildFilterSet()
        });
    });

    pl.on('filters:userToggle', function (isVisible) {
        _analytics2['default'].set('event', {
            name: 'filtersToggled',
            visibility: isVisible
        });
    });

    pl.on('filters:clear', function () {
        _analytics2['default'].set('event', {
            name: 'filtersCleared'
        });
    });

    pl.on('filters:sizeChart', function () {
        _analytics2['default'].set('event', {
            name: 'filtersShowSizeChart'
        });
    });

    //move below somewhere more global?
    var $document = $(document);

    $document.on('click', '#pl-page .breadcrumbs a', function () {
        _analytics2['default'].set('event', {
            name: 'breadcrumb',
            title: $(undefined).text()
        });
    });

    $document.on('click', '#top-nav a', function (e) {
        var $that = $(this),
            linkText = $that.text(),
            $parentLink = $that.parent().parent(),
            $parentCat = $parentLink.siblings('a');

        if ($parentLink.hasClass('sub-menu')) {
            var parentCatText = $parentCat.text();
            linkText = parentCatText + ' - ' + linkText;
        }
        linkText = 'Top Nav: ' + linkText;
        NAP.browserLocalStorage.setLocalStorage('LinkTracking', linkText, 'string');
    });

    $document.on('click', '#footer ul a', function () {
        var linkText = $(this).text();
        linkText = 'Footer Nav: ' + linkText;
        NAP.browserLocalStorage.setLocalStorage('LinkTracking', linkText, 'string');
        if ($(this).attr('href').indexOf('/Help/') != -1) {
            return false;
        }
    });

    function trackNavigation(key) {
        var trackLink = NAP.browserLocalStorage.getLocalStorage(key, 'string'),
            inProgress = false;
        if (trackLink && !inProgress) {
            inProgress = true;
            NAP.analytics.trackElement(trackLink, null, NAP.analytics.LINK_CUSTOM, null, function () {
                NAP.browserLocalStorage.removeItemLocalStorage(key);
                trackLink = null;
                inProgress = false;
            });
        }
    }

    $document.ready(function () {
        trackNavigation('LinkTracking');
    });
};

module.exports = exports['default'];

},{"../../analytics":"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/analytics.js"}],"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/pages/product-list/feature.loadingSpinner.js":[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

exports['default'] = function (pl) {

    pl.on('fetch', function () {
        toggleSpinner(true);
    });

    pl.on('fetch:complete', function () {
        toggleSpinner(false);
    });

    function toggleSpinner(show) {
        var $spinner = $('.ajaxOverlay');
        if ($spinner.size() == 0) {
            var markup = '<div class="ajaxOverlay"><div id="floatingBarsG">';
            for (var i = 1; i < 9; i++) {
                markup += '<div class="blockG" id="rotateG_0' + i + '"/>';
            }
            markup += '</div></div>';
            $spinner = $(markup).hide();
            $('body').append($spinner);
        }
        $spinner[show ? 'show' : 'hide']();
    }
};

module.exports = exports['default'];

},{}],"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/pages/product-list/feature.scrollPosition.js":[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

exports['default'] = function (pl) {
    var mobileFilterSelector = '.touch .filters-visible #pl-filters',
        scrollPosition;

    if (Modernizr.touch) {
        pl.on('fetch', function () {
            scrollPosition = $(mobileFilterSelector).scrollTop();
        });

        pl.on('fetch:complete', function () {
            $(mobileFilterSelector).scrollTop(scrollPosition);
        });
    }
};

module.exports = exports['default'];

},{}],"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/pages/product-list/feature.stickyHeader.js":[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

exports['default'] = function (pl) {

	var $toggleHeader;
	var toggleHeaderHeight;
	var $filters;

	pl.on('filters:bindEvents', function () {
		$toggleHeader = $(document.querySelector('#pl-toggle-filters'));
		pl.visible ? enableStickyHeader() : disableStickyHeader();
	});

	pl.on('filters:toggle', function (isVisible) {
		isVisible ? enableStickyHeader() : disableStickyHeader();
	});

	pl.on('filter:toggle', function (name) {
		$('[data-name=' + name + ']').removeClass('sticky');
		setOpenFilters();
		stickyHeader();
	});

	function setOpenFilters() {
		$filters = $('#pl-filters').children('div:not(:has(.hidden))');
	}

	function enableStickyHeader() {
		toggleHeaderHeight = $toggleHeader.outerHeight();
		setOpenFilters();
		stickyHeader();
		$('#pl-filters').on('scroll', stickyHeader);
	}

	function disableStickyHeader() {
		$('#pl-filters').off('scroll', stickyHeader);
	}

	function stickyHeader() {
		$filters.each(function (index, filterSection) {
			var $filterSection = $(filterSection);
			var sectionHeader = $filterSection.children('.filter-header')[0];
			var $nextSection = $filterSection.next();
			if ($nextSection[0]) {
				makeHeaderSticky(sectionHeader, filterSection, $nextSection[0].getBoundingClientRect().top);
			} else {
				makeHeaderSticky(sectionHeader, filterSection);
			}
		});
	}

	function makeHeaderSticky(header, section) {
		var topOffset = arguments.length <= 2 || arguments[2] === undefined ? null : arguments[2];

		var $header = $(header);
		var headerHeight = $header.outerHeight();
		var sectionTop = section.getBoundingClientRect().top;

		var moveHeader = topOffset - toggleHeaderHeight < headerHeight && topOffset > toggleHeaderHeight;
		if (moveHeader) {
			$header.css('top', topOffset - headerHeight);
		} else {
			$header.removeAttr('style');
		}

		var sectionHeadingNotInView = sectionTop < toggleHeaderHeight;
		if (topOffset != null) {
			sectionHeadingNotInView = sectionHeadingNotInView && topOffset > toggleHeaderHeight;
		}

		$header[sectionHeadingNotInView ? 'addClass' : 'removeClass']('sticky');
	}
};

module.exports = exports['default'];

},{}],"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/pages/product-list/feature.toggle.js":[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

exports['default'] = function (pl) {

	// filter events
	pl.on('filters:bindEvents', function () {

		// toggle filter
		$('.filter-header').click(function (e) {
			var name = e.currentTarget.getAttribute('data-name');
			pl.getFilter(name).toggle();
		});

		$('#pl-toggle-filters').find('.btn-toggle').add($('#pl-apply-filters .button')).click(function (e) {
			pl.toggle();
			pl.emit('filters:userToggle', pl.visible);
			e.preventDefault();
		});
	});

	// toggle list
	pl.on('filters:toggle', function (isVisible) {
		var filtersVisibleClass = 'filters-visible';
		$('body')[isVisible ? 'addClass' : 'removeClass'](filtersVisibleClass);
	});

	// toggle individual filters
	pl.on('filter:toggle', function (name, isVisible) {

		var $element = $('.filter-header[data-name=' + name + ']');

		// add class to icon
		$element.find('.filter-section-toggle').removeClass('icon-plus-black icon-minus-black').addClass('icon-' + (isVisible ? 'minus' : 'plus') + '-black');

		// and toggle class for filter section
		$element.next()[isVisible ? 'removeClass' : 'addClass']('hidden');
	});

	// toggle filters container
	pl.on('filters:toggle', function (isVisible) {
		var $container = $('#pl-toggle-filters');
		var $button = $container.find('.btn-toggle');
		var text = $button.attr('data-text-' + (isVisible ? 'hide' : 'show'));
		$button.find('.toggle-text').text(text);

		// add specific classes
		$button[isVisible ? 'addClass' : 'removeClass']('btn-white');
		$container.find('.btn-chevron').removeClass('icon-arrow-right-white icon-arrow-left-black').addClass('icon-arrow-' + (isVisible ? 'left-black' : 'right-white'));
		$('body').removeClass('filters-not-toggled');
	});
};

module.exports = exports['default'];

},{}],"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/pages/product-list/filters.js":[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _config = require('../../config');

var _filtersPrice = require('./filters.price');

var _filtersPrice2 = _interopRequireDefault(_filtersPrice);

var _modulesUrl = require('../../modules/url');

var _modulesUrl2 = _interopRequireDefault(_modulesUrl);

exports['default'] = function (pl) {

	pl.on('filters:bindEvents', function () {

		// create filter price component
		(0, _filtersPrice2['default'])(_config.productList.filters.price, function () {
			var data = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

			var url = new _modulesUrl2['default']();
			url.set($('#filter-price-form').attr('action'));
			var priceFilter = pl.getFilter('price');
			url.addQsParam(priceFilter.getParameter('min'), data.min).addQsParam(priceFilter.getParameter('max'), data.max);

			pl.getFilter('price').update(data.min, 'min', true).update(data.max, 'max');

			pl.emit('fetch', url.get());
		});
	});
};

module.exports = exports['default'];

},{"../../config":"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/config.js","../../modules/url":"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/modules/url.js","./filters.price":"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/pages/product-list/filters.price.js"}],"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/pages/product-list/filters.price.js":[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _componentsSlider = require('../../components/slider');

var _componentsSlider2 = _interopRequireDefault(_componentsSlider);

var doc = document;
var round = Math.round;
var selectors = {
	slider: '#filter-price-slider',
	form: '#filter-price-form',
	minPrice: 'input[name=min_priceFilter]',
	maxPrice: 'input[name=max_priceFilter]'
};

exports['default'] = function (config, callback) {
	var $form = doc.querySelector(selectors.form);
	// Return if there is no price filter form on the page (e.g. if range is 0)
	if (!$form) return;

	var $slider = doc.querySelector(selectors.slider);
	var $minField = $form.querySelector(selectors.minPrice);
	var $maxField = $form.querySelector(selectors.maxPrice);
	var htmlCurrency = $slider.getAttribute('data-currency-symbol');
	var minValue = $slider.getAttribute('data-range-min');
	var maxValue = $slider.getAttribute('data-range-max');

	new _componentsSlider2['default']($slider, {
		values: [Math.floor($minField.value), Math.ceil($maxField.value)],
		between: [Math.floor(parseFloat(minValue)), Math.ceil(parseFloat(maxValue))],
		every: config.stepSize,
		margin: config.margin,
		beforeValue: htmlCurrency,
		display: function display(val) {
			return parseInt(round(val), 10);
		},
		link: {
			lower: $minField,
			upper: $maxField
		},
		onSet: function onSet() {
			$minField.value == minValue && $form.removeChild($minField);
			$maxField.value == maxValue && $form.removeChild($maxField);
			callback && callback({
				form: $form,
				min: $minField.value,
				max: $maxField.value
			});
		}
	});

	// hide form only if js doesn't fail earlier and slider available
	$form.style.display = 'none';
};

module.exports = exports['default'];

},{"../../components/slider":"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/components/slider.js"}],"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/pages/product-list/index.js":[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _config = require('../../config');

var _componentsDropdown = require('../../components/dropdown');

var _componentsDropdown2 = _interopRequireDefault(_componentsDropdown);

var _modulesProductListIndex = require('../../modules/product-list/index');

var _modulesProductListIndex2 = _interopRequireDefault(_modulesProductListIndex);

var _featureStickyHeader = require('./feature.stickyHeader');

var _featureStickyHeader2 = _interopRequireDefault(_featureStickyHeader);

var _featureAjax = require('./feature.ajax');

var _featureAjax2 = _interopRequireDefault(_featureAjax);

var _featureLoadingSpinner = require('./feature.loadingSpinner');

var _featureLoadingSpinner2 = _interopRequireDefault(_featureLoadingSpinner);

var _featureToggle = require('./feature.toggle');

var _featureToggle2 = _interopRequireDefault(_featureToggle);

var _filters = require('./filters');

var _filters2 = _interopRequireDefault(_filters);

var _featureScrollPosition = require('./feature.scrollPosition');

var _featureScrollPosition2 = _interopRequireDefault(_featureScrollPosition);

var _featureAnalytics = require('./feature.analytics');

var _featureAnalytics2 = _interopRequireDefault(_featureAnalytics);

var _list = require('./list');

var _list2 = _interopRequireDefault(_list);

// TODO: element selector cache
// TODO: element object cache

exports['default'] = function () {

    var pl = new _modulesProductListIndex2['default']();

    [_filters2['default'], _featureScrollPosition2['default'], _list2['default'], _featureToggle2['default'], _featureAjax2['default'], _featureStickyHeader2['default'], _featureLoadingSpinner2['default'], _featureAnalytics2['default']].forEach(function (func) {
        return func(pl);
    });

    pl.on('filters:bindEvents', function () {
        // initialize dropdown functionality
        (0, _componentsDropdown2['default'])();
    });

    // initialize product list, events and states
    pl.init();
    pl.emit('filters:bindEvents list:bindEvents');

    // if past mobile max-width breakpoint, initialize default filter visibility
    pl.emit('filters:toggle', $(window).width() >= _config.breakpoints.desktop && _config.productList.filters.visible);
};

module.exports = exports['default'];

},{"../../components/dropdown":"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/components/dropdown.js","../../config":"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/config.js","../../modules/product-list/index":"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/modules/product-list/index.js","./feature.ajax":"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/pages/product-list/feature.ajax.js","./feature.analytics":"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/pages/product-list/feature.analytics.js","./feature.loadingSpinner":"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/pages/product-list/feature.loadingSpinner.js","./feature.scrollPosition":"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/pages/product-list/feature.scrollPosition.js","./feature.stickyHeader":"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/pages/product-list/feature.stickyHeader.js","./feature.toggle":"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/pages/product-list/feature.toggle.js","./filters":"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/pages/product-list/filters.js","./list":"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/pages/product-list/list.js"}],"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/pages/product-list/list.infinite.js":[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _modulesUtils = require('../../modules/utils');

var _modulesMediator = require('../../modules/mediator');

var _modulesMediator2 = _interopRequireDefault(_modulesMediator);

var _modulesPullMarkup = require('../../modules/pullMarkup');

var _modulesPullMarkup2 = _interopRequireDefault(_modulesPullMarkup);

var _componentsInfiniteScroll = require('../../components/infiniteScroll');

var _componentsInfiniteScroll2 = _interopRequireDefault(_componentsInfiniteScroll);

var pageNumberQS = 'pn';
var selectors = {
	parent: 'pl-listing-container',
	container: 'pl-items',
	viewMore: 'pl-view-more',
	pagination: 'pagination'
};

exports['default'] = function () {
	var opts = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];
	var callback = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];

	// prevent from requesting xml response
	var baseUrl = location.pathname + '.html';
	var $element = $(document.getElementById(selectors.container));
	var $viewMore = $(document.getElementsByClassName(selectors.viewMore));
	var $pagination = $(document.getElementsByClassName(selectors.pagination));
	var parent = document.getElementById(selectors.parent);
	var params = $.extend({
		debounce: 20,
		buffer: 200,
		viewMoreAfter: 5
	}, opts);

	$pagination.addClass('hidden');
	$viewMore.removeClass('hidden');

	// TODO: turn this into a module
	var stats = {
		currentPage: parseInt(_modulesUtils.qs.get(pageNumberQS), 10) || 1,
		totalItems: parseInt(parent.getAttribute('data-total-item-count'), 10),
		numberOfItemsPerPage: parseInt(parent.getAttribute('data-default-items-count'), 10),
		totalPages: parseInt(parent.getAttribute('data-page-count'), 10)
	};

	function processUrl(page) {
		var searchUrl = _modulesUtils.qs.set(pageNumberQS, page);
		return baseUrl + '?' + searchUrl;
	}

	function updateViewMore(page) {
		var currentCount = --page * stats.numberOfItemsPerPage;
		var totalItems = stats.totalItems;
		var text = '(' + currentCount + ' of ' + totalItems + ')';

		// hide view more if on last page
		$viewMore[currentCount >= totalItems ? 'hide' : 'show']().find('.info').text(text);
	}

	var populate = {
		url: {},
		increment: function increment() {},
		set: function set(page, increment) {
			this.url = processUrl(page);
			this.increment = increment;
		},
		now: function now() {
			var self = this;
			$.get(self.url, function (data) {
				var markup = (0, _modulesPullMarkup2['default'])(data, '#' + selectors.container);
				$element.append(markup);
				callback && callback();
				self.increment();
			});
		}
	};

	$viewMore.click(function (e) {
		e.preventDefault();
		populate.now();
	});

	(0, _componentsInfiniteScroll2['default'])({
		debounce: params.debounce,
		buffer: params.buffer,
		startPage: stats.currentPage,
		callback: function callback(currentPage, increment) {
			populate.set(currentPage, increment);
			currentPage % params.viewMoreAfter === 0 ? updateViewMore(currentPage) : populate.now();
		}
	});
};

module.exports = exports['default'];

},{"../../components/infiniteScroll":"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/components/infiniteScroll.js","../../modules/mediator":"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/modules/mediator.js","../../modules/pullMarkup":"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/modules/pullMarkup.js","../../modules/utils":"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/modules/utils.js"}],"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/pages/product-list/list.js":[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _config = require('../../config');

var _componentsLazyLoad = require('../../components/lazyLoad');

var _componentsLazyLoad2 = _interopRequireDefault(_componentsLazyLoad);

var _modulesFeature = require('../../modules/feature');

var _modulesFeature2 = _interopRequireDefault(_modulesFeature);

var _listMultiImage = require('./list.multiImage');

var _listMultiImage2 = _interopRequireDefault(_listMultiImage);

var _listInfinite = require('./list.infinite');

var _listInfinite2 = _interopRequireDefault(_listInfinite);

var _listPagination = require('./list.pagination');

var _listPagination2 = _interopRequireDefault(_listPagination);

exports['default'] = function (pl) {

	var infiniteScrollEnabled = (0, _modulesFeature2['default'])('infiniteScroll');

	// initializing list elements
	pl.on('list:bindEvents', function () {
		var lazy = (0, _componentsLazyLoad2['default'])('#pl-items', _config.productList.lazyLoad);
		infiniteScrollEnabled && (0, _listInfinite2['default'])(_config.productList.infiniteScroll, lazy.refresh);
		(0, _listMultiImage2['default'])();
		(0, _listPagination2['default'])();
	});
};

module.exports = exports['default'];

},{"../../components/lazyLoad":"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/components/lazyLoad.js","../../config":"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/config.js","../../modules/feature":"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/modules/feature.js","./list.infinite":"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/pages/product-list/list.infinite.js","./list.multiImage":"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/pages/product-list/list.multiImage.js","./list.pagination":"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/pages/product-list/list.pagination.js"}],"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/pages/product-list/list.multiImage.js":[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

exports['default'] = function () {

	if (!Modernizr.touch) {
		$('#pl-items').on({
			mouseenter: function mouseenter() {
				var altImage = this.getAttribute('data-alt');
				if (altImage) {
					this.setAttribute('data-original', this.getAttribute('src'));
					this.setAttribute('src', altImage);
				}
			},
			mouseleave: function mouseleave() {
				var origImage = this.getAttribute('data-original');
				if (origImage && this.getAttribute('src') != origImage) {
					this.setAttribute('src', origImage);
				}
			}
		}, '.product-image');
	}
};

module.exports = exports['default'];

},{}],"/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/pages/product-list/list.pagination.js":[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

exports['default'] = function () {
    $('.listing-footer .pagination a').on('click', function () {
        document.location = '#pl-page';
    });
};

module.exports = exports['default'];

},{}]},{},["/Users/h.brahmbhatt/dev/storeton/src/main/webapp/storeton-assets/scripts/main.js"]);
