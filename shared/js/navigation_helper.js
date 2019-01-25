'use strict';

const DIR = Object.freeze({
  LEFT: 0,
  RIGHT: 1,
  UP: 2,
  DOWN: 3,
});

(function(exports) {
   var NavigationHelper = {
    controls: null,

    resetMenu: function() {
      var selector = 'form[data-subtype=menu]';
      var postfix = '>button.menu-button';
      var  menuform = document.querySelector(selector);
      for (var i=1; i<menuform.children.length; i++) {
        var subid = menuform.children[i].id;
        if(subid && subid.indexOf('submenu_') === 0) {
          this.reset(VerticalNavigator, () => {
            return document.querySelectorAll('#' + subid + postfix);
          }, 0, subid);
        }
      }
      return this.reset(VerticalNavigator, () => {
        return document.querySelectorAll('#mainmenu' + postfix);
      }, 0, 'mainmenu');
    },

    reset: function(navigator, getControls, getFocusIndex, navPrefix, notSetFocus) {
      if (!navigator) {
        return null;
      }
      if(typeof getControls !== 'function') {
        return null;
      }
      this.controls = getControls();
      if (!this.controls || this.controls.length === 0) {
        return null;
      }
      navigator.count = this.controls.length;
      this.updateNav(navigator, navPrefix);

      var focusIndex = typeof getFocusIndex === 'function'
        ? getFocusIndex() : 0;
      var focusedElement = this.controls[focusIndex];
      if(!notSetFocus) this.setFocus(focusedElement);
      return focusedElement;
    },

    setFocus: function(element) {
      if(!element) return;
      var focused = document.querySelectorAll('.focus');
      if(focused.length > 0) {
        focused[0].classList.remove('focus');
      }
      element.setAttribute('tabindex', 1);
      element.classList.add('focus');
      if('undefined' != typeof inputHandler)
        inputHandler.focusChanged(element);
      else element.focus();
    },

    updateNav: function(navigator, navPrefix) {
      for(var i=0; i<this.controls.length; i++) {
        var control = this.controls[i];
        control.setAttribute('data-nav-id', str(i));
        control.style.setProperty('--nav-left',  str(navigator.left(i)));
        control.style.setProperty('--nav-right', str(navigator.right(i)));
        control.style.setProperty('--nav-up',    str(navigator.up(i)));
        control.style.setProperty('--nav-down',  str(navigator.down(i)));
        control.setAttribute('tabindex', 0);
      }
      function str(navIndex) {
        if(navPrefix === undefined) navPrefix = '';
        return navPrefix + navIndex;
      }
    },

    elementIsVisible: function(element, top, bottom) {
      var visible = true;
      if (element.offsetWidth === 0 || element.offsetHeight === 0)
        return visible;
      var rects = element.getClientRects();
      for (var rect of rects) {
        if (rect.bottom + bottom > window.innerHeight || rect.top < top) {
          visible = false;
          break;
        }
      }
      return visible;
    },

    //gaia-header: 50px, softkey: 40px, (ignore statusbar: 30px)
    scrollToElement: function(element, event, top, bottom) {
      if(!this.elementIsVisible(element, top, bottom)) {
        if (event) {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp')
            element.scrollIntoView(false);
        } else {
          element.scrollIntoView(false);
        }
      }
    },

    Key2Dir: function(key) {
      var dir = undefined;
      switch (key) {
      case "ArrowLeft":
        dir = DIR.LEFT;
        break;
      case "ArrowRight":
        dir = DIR.RIGHT;
        break;
      case "ArrowUp":
        dir = DIR.UP;
        break;
      case "ArrowDown":
        dir = DIR.DOWN;
        break;
      }
      return dir;
    },

  };

  //Horizontal Navigator
  var HorizontalNavigator = {
    count: 0,
    left: function(navIndex) {
      return (0 === navIndex) ? this.count - 1 : navIndex - 1;
    },
    right: function(navIndex) {
      return (this.count - 1 === navIndex) ? 0 : navIndex + 1;
    },
    up: function(navIndex) {
      return navIndex;
    },
    down: function(navIndex) {
      return navIndex;
    },
  };

  //Vertical Navigator
  var VerticalNavigator = {
    count: 0,
    left: function(navIndex) {
      return navIndex;
    },
    right: function(navIndex) {
      return navIndex;
    },
    up: function(navIndex) {
      return (0 === navIndex) ? this.count - 1 : navIndex - 1;
    },
    down: function(navIndex) {
      return (this.count - 1 === navIndex) ? 0 : navIndex + 1;
    },
  };

  //Box Navigator
  var BoxNavigator = {
    count: 0,
    columnCount: 2,
    left: function(navIndex) {
      return (navIndex> 0 && navIndex < this.count)
        ? --navIndex : this.count - 1;
    },
    right: function(navIndex) {
      return (navIndex >=0 && navIndex < this.count-1)
        ? ++navIndex : 0;
    },
    up: function(navIndex) {
      navIndex -= this.columnCount;
      if (navIndex < 0) {
        navIndex += this.columnCount *
          Math.ceil(this.count / this.columnCount);
        if(navIndex == this.count && this.count % this.columnCount !== 0)
          navIndex = this.count - 1;
        if(navIndex > this.count)
          navIndex -= this.columnCount;
      }
      return navIndex;
    },
    down: function(navIndex) {
      navIndex += this.columnCount;
      var remainder = this.count % this.columnCount;
      if(navIndex == this.count && remainder !== 0)
        navIndex = this.count - 1;
      if(navIndex > this.count || (navIndex == this.count && remainder == 0))
        navIndex %= this.columnCount;
      return navIndex;
    },
  };

  // Group Navigator
  var GroupNavigator = {
    count: 0,
    columnCount: 3,
    getGroupInfo: null,
    left: function(navIndex) {
      return (navIndex> 0 && navIndex < this.count)
        ? --navIndex : this.count - 1;
    },
    right: function(navIndex) {
      return (navIndex >=0 && navIndex < this.count-1)
        ? ++navIndex : 0;
    },
    up: function(navIndex) {
      var index = -1;
      if(typeof this.getGroupInfo !== 'function') {
        return index;
      }
      var groupInfo = this.getGroupInfo(navIndex, true);
      var curIdx = groupInfo.curGroupIndex;
      var curLen = groupInfo.curGroupLen;
      var destLen = groupInfo.destGroupLen;
      if(curIdx >= this.columnCount) { //in the current group
        index = navIndex - this.columnCount;
      } else { //in the destination group
        index = navIndex - curIdx;
        if (0 === index) index = this.count;
        var lastRowCount = destLen % this.columnCount;
        if(0 === lastRowCount) lastRowCount = this.columnCount;
        index -= lastRowCount;
        var pos = curIdx % this.columnCount;
        if(pos < lastRowCount) {
          index += pos;
        } else if (destLen > this.columnCount) { //more than 1 row
          index = index - this.columnCount + pos;
        } else {
          index += lastRowCount - 1;
        }
      }
      return index;
    },

    down: function(navIndex) {
      var index = -1;
      var groupInfo = this.getGroupInfo(navIndex, false);
      var curIdx = groupInfo.curGroupIndex;
      var curLen = groupInfo.curGroupLen;
      if(curIdx + this.columnCount < curLen) { //in the current group
        index = navIndex + this.columnCount;
      } else { //in the destination group
        index = navIndex + (curLen - curIdx);
        if (this.count === index) index = 0;
        var pos = curIdx % this.columnCount;
        index += Math.min(pos, groupInfo.destGroupLen - 1);
      }
      return index;
    },
  };

  exports.NavigationHelper = NavigationHelper;
  exports.HorizontalNavigator = HorizontalNavigator;
  exports.VerticalNavigator = VerticalNavigator;
  exports.BoxNavigator = BoxNavigator;
  exports.GroupNavigator = GroupNavigator;
})(window);

