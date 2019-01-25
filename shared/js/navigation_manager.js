(function (exports) {
  'use strict';
  var _focusedEl; //for saving current focus element
  var isFunction = function (obj) {
    return !!(obj && obj.constructor && obj.call && obj.apply);
  };

  var NavigationManager = function () {
    this.context = {};
    this.currentSelector = undefined;
    this.nextId = this.generatorId(0);

    // for backward compatibility
    // some applications do not invoke init method and still use navigation_handler.js
    // TODO: move to init once navigation_handler.js has removed from Dialer and CallScreen
    document.addEventListener('focusChanged', this.focusChandedHandler.bind(this));
  };

  NavigationManager.prototype.CLASS_NAME = 'NavigationManager';
  NavigationManager.prototype.DEBUG = false;

  NavigationManager.prototype.init = function (config) {
    this.config = config || {
      clickHandler: undefined,
    };

    window.addEventListener('keydown', this.keyHandler.bind(this));
  };

  NavigationManager.prototype.keyHandler = function (evt) {
    var el = evt.target,
      focusElement,
      prevFocused;

    this.debug('key ' + evt.key);
    if (NavigationMap && NavigationMap.currentActivatedLength &&
        NavigationMap.currentActivatedLength > 0)  {
      return;
    }
    if (!el) {
      return;
    }

    if (evt.key === 'Enter' || evt.key === 'Accept') {
      this.click(el);
      this.dispatchEvent('accepted', {
        acceptedEl: el
      });
    } else {
      if (!el.classList) {
        return;
      }
      if (!el.classList.contains('focus')) {
        this.debug('event target does not have focus');
        el = document.querySelector('.focus');
      }

      focusElement = this.findElementFromNavProp(el, evt);
      if (focusElement) {
        prevFocused = document.querySelectorAll('.focus');
        if (focusElement == prevFocused[0]) {
          return;
        }
        if (prevFocused.length) {
          prevFocused[0].classList.remove('focus');
        }
        if (isFunction(this.scrollToElement)) {
          this.scrollToElement(focusElement, evt);
        } else {
          focusElement.scrollIntoView(false);
        }
        focusElement.classList.add('focus');
        _focusedEl = focusElement;
        var inPutForT9 = focusElement.querySelector('input[type="text"]');

        if (inPutForT9) {
          inPutForT9.focus();
        } else {
          focusElement.focus();
        }
        this.dispatchEvent('focusChanged', {
          focusedElement: focusElement
        });
      }
    }
  };

  NavigationManager.prototype.findElementFromNavProp = function (currentlyFocused, evt) {
    if (!currentlyFocused) {
      return null;
    }

    var elementID,
        elmStyle = currentlyFocused.style,
        handled = true,
        selector;

    switch (evt.key) {
    case "ArrowLeft":
      elementID = elmStyle.getPropertyValue('--nav-left');
      break;
    case "ArrowRight":
      elementID = elmStyle.getPropertyValue('--nav-right');
      break;
    case "ArrowUp":
      elementID = elmStyle.getPropertyValue('--nav-up');
      break;
    case "ArrowDown":
      elementID = elmStyle.getPropertyValue('--nav-down');
      break;
    case "Home":
    case "MozHomeScreen":
      elementID = elmStyle.getPropertyValue('--nav-home');
      break;
    default:
      handled = false;
    }
    if (!elementID) {
      return null;
    }
    if (handled) {
      evt.preventDefault();
    }
    selector = "[data-nav-id=\"" + elementID + "\"]";
    return document.querySelector(selector);
  };

  NavigationManager.prototype.click = function (el) {
    if (this.config.clickHandler) {
      this.config.clickHandler(el);
    } else {
      el.click();
    }
  };

  NavigationManager.prototype.dispatchEvent = function (event, data) {
    var data = (data && {
      detail: data
    }) || {};
    document.dispatchEvent(new CustomEvent(event, data));
  };

  NavigationManager.prototype.focusChandedHandler = function (e) {
    var focusElement = e.detail.focusedElement,
        id = focusElement && focusElement.getAttribute('data-nav-id');

    if (!focusElement)
      return;

    if (this.currentSelector) {
      this.context[this.currentSelector] = id;
    }
  };

  NavigationManager.prototype.generatorId = function (base) {
    var localId = base;

    return function () {
      return localId++;
    };
  };

  NavigationManager.prototype.delNavId = function (selector) {
    var items = document.querySelectorAll(selector);
    if (!items.length) {
      return;
    }

    Array.prototype.forEach.call(items, item => item.removeAttribute('data-nav-id'));
  }

  NavigationManager.prototype.initNavId = function (items) {
    Array.prototype.forEach.call(items, item => {
      var navId = item.getAttribute('data-nav-id');
      if (!navId) {
        item.setAttribute('data-nav-id', this.nextId());
      }
    });
  };

  NavigationManager.prototype.prepareElements = function (selector) {
    if (!selector) {
      throw Error('selector is undefined');
    }

    var items = document.querySelectorAll(selector),
      focused = Array.prototype.slice.call(document.querySelectorAll(".focus")),
      focusedLength = focused.length;

    this.currentSelector = selector;
    this.debug('items.length ' + items.length);
    if (!items.length) {
      this.dispatchEvent('focusChanged', {
        focusChanged: null
      });
      return;
    }
    if (focusedLength) {
      for (var j = 0; j < focusedLength; j++) {
        focused[j].classList.remove('focus');
      }
    }

    this.initNavId(items);
    return items;
  };

  NavigationManager.prototype.reset = function (selector, navId, direction, withoutUpdate) {
    var items = this.prepareElements(selector);
    _focusedEl = null; //clear current focused cache
    if (items) {
      var item = items[0],
        el;
      if (navId) {
        el = document.querySelector('[data-nav-id="' + navId + '"]');
        if (el) {
          item = el;
        }
      }
      this.context[selector] = item.dataset.navId;
      this.setFocus(item);
      if (!withoutUpdate) {
        this.update(selector, direction);
      }
    }
  };

  NavigationManager.prototype.unfocus = function () {
    var el = Array.prototype.slice.call(document.querySelectorAll('.focus'));
    el.forEach(item => {
      item.classList.remove('focus');
    });
  },

  NavigationManager.prototype.resetByNode = function (selector, node, direction) {
    var items = this.prepareElements(selector);
    _focusedEl = null;
    if (items) {
      var item = items[0],
        j, el, arrElements, checkNodeInSelector;
      if (node) {
        arrElements = Array.prototype.slice.call(document.querySelectorAll(selector));
        checkNodeInSelector = arrElements.some(function (elem) {
          return elem === node ? true : false;
        });
        if (!checkNodeInSelector) {
          console.error('node is not exist in selector');
          return;
        }
        item = node;
      }
      this.context[selector] = item.dataset.navId;
      this.setFocus(item);
      this.update(selector, direction);
    }
  };

  // TODO: this code is specific. Further clients should implement update logic and
  // pass it to Navigation Manager
  NavigationManager.prototype.update = function (selector, direction) {
    var i, j = 0,
      items,
      item, prevItem, nextItem;

    if (!document.querySelectorAll(".focus").length) {
      this.reset(selector);
      return;
    }
    if (!selector) {
      throw Error('selector is undefined');
    }

    items = document.querySelectorAll(selector);

    this.debug('items.length ' + items.length);
    this.initNavId(items);

    if (items.length <= 1) {
      if (item = items[0]) {
        item.style.removeProperty('--nav-down');
        item.style.removeProperty('--nav-up');
      }
      return;
    }
    this.debug(selector + '.length = ' + items.length);
    if (!direction) {
      direction = 'vertical';
    }

    if (typeof this.doUpdateCb === "function") {
      this.doUpdateCb(items);
      return;
    }

    switch (direction) {
    case 'vertical':
      for (j = 0; j < items.length; j++) {
        item = items[j];
        prevItem = items[j - 1] || items[items.length - 1];
        nextItem = items[j + 1] || items[0];

        item.style.setProperty('--nav-down', nextItem.getAttribute('data-nav-id'));
        item.style.setProperty('--nav-up', prevItem.getAttribute('data-nav-id'));
      }
      break;
    case 'horizontal':
      for (j = 0; j < items.length; j++) {
        item = items[j];
        prevItem = items[j - 1] || items[items.length - 1];
        nextItem = items[j + 1] || items[0];

        item.style.setProperty('--nav-right', nextItem.getAttribute('data-nav-id'));
        item.style.setProperty('--nav-left', prevItem.getAttribute('data-nav-id'));
      }
      break;
    }
  };

  NavigationManager.prototype._linkToUp = function(from, to) {
    from.style.setProperty('--nav-up', to.getAttribute('data-nav-id'));
  };

  NavigationManager.prototype._linkToDown = function(from, to) {
    from.style.setProperty('--nav-down', to.getAttribute('data-nav-id'));
  };

  NavigationManager.prototype._linkToLeft = function(from, to) {
    from.style.setProperty('--nav-left', to.getAttribute('data-nav-id'));
  };

  NavigationManager.prototype._linkToRight = function(from, to) {
    from.style.setProperty('--nav-right', to.getAttribute('data-nav-id'));
  };

  NavigationManager.prototype.appendToList = function (listContainer, items, direction) {
    var firstItem, lastItem;

    var len = listContainer.children.length;

    if (len) {
      firstItem = listContainer.children[0];
      lastItem = listContainer.children[len - 1];
    }

    var itemsLen = items.length;

    items.forEach((item) => {
      listContainer.appendChild(item);
      item.setAttribute('data-nav-id', this.nextId());
    });

    var linkToPrv, linkToNxt;
    direction = direction || 'vertical';

    switch (direction) {
      case 'vertical':
        linkToPrv = this['_linkToUp'];
        linkToNxt = this['_linkToDown'];
        break;

      case 'horizontal':
        linkToPrv = this['_linkToLeft'];
        linkToNxt = this['_linkToRight'];
        break;
    }

    if (len) {
      linkToPrv(items[0], listContainer.children[len - 1]);
      linkToNxt(items[itemsLen - 1], listContainer.children[0]);

      linkToNxt(listContainer.children[len - 1], items[0]);
      linkToPrv(listContainer.children[0], items[itemsLen - 1]);
    } else {
      linkToPrv(items[0], items[itemsLen - 1]);
      linkToNxt(items[itemsLen - 1], items[0]);
    }

    if (itemsLen > 1) {
      linkToNxt(items[0], items[1]);
      linkToPrv(items[itemsLen - 1], items[itemsLen - 2]);

      for (i = 1; i < itemsLen - 2; i++) {
        linkToPrv(items[i], items[i - 1]);
        linkToNxt(items[i], items[i + 1]);
      }
    }
  };

  NavigationManager.prototype.setFocus = function (item) {
    item.classList.add('focus');
    item.focus();
    _focusedEl = item;
    this.dispatchEvent('focusChanged', {
      focusedElement: item
    });
  };

  NavigationManager.prototype.getElementByNavId = function (navId) {
    return document.querySelector('[data-nav-id="' + navId + '"]');
  };

  NavigationManager.prototype.switchContext = function (selector, id, direction) {
    if (!selector) {
      throw Error('selector is undefined');
    }

    var selected = id ? id : this.context[selector];
    this.reset(selector, selected, direction);
  };

  NavigationManager.prototype.debug = function (message) {
    if (this.DEBUG) {
      console.log(this.CLASS_NAME + ": " + message);
    }
  };

  NavigationManager.prototype.getFocusedEl = function () {
    return _focusedEl;
  };

  exports.NavigationManager = new NavigationManager();

})(window);
