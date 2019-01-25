/*global SoftkeyPanel*/
(function (exports) {
    'use strict';
    var buttonState = {
            leftKeyState: '',
            _cacheParams: null
        },
        firtsUpper = function (str) {
            return str.charAt(0).toUpperCase() + str.slice(1);
        };
    var OptionHelper = function () {
        this.option = {};
        this.optionParams = Object.create(null);
        this.softkeyPanel = undefined;
        this.optionsCallback = undefined;
        this.lastParamName = undefined;
    };
    OptionHelper.prototype.stopKeyEvents = function () {
        this.softkeyPanel.stopListener();
    };
    OptionHelper.prototype.startKeyEvents = function () {
        this.softkeyPanel.startListener();
    };
    OptionHelper.prototype.setOptionMenuCallBack = function (callback) {
        this.optionsCallback = callback;
    };
    OptionHelper.prototype._initSoftKeyPanel = function () {
        if (!this.softkeyPanel) {
            console.log('Option helper, _initSoftKeyPanel');
            if (typeof SoftkeyHelper != 'undefined') { //if we have SoftkeyHelper we don't need to implement new softkeypanel
                SoftkeyHelper.init(this._params, this.optionsCallback);
                this.softkeyPanel = SoftkeyHelper.getSoftkey();
            } else {
                this.softkeyPanel = new SoftkeyPanel(this._params, this.optionsCallback);
            }
            this.softkeyPanel.show();
            return;
        }
        this.softkeyPanel.initSoftKeyPanel(this._params);
    };
    OptionHelper.prototype.show = function (paramName) {
        this.lastParamName = paramName;
        console.log('Option helper, show paramName: ' + paramName);
        if (this.softkeyPanel && !this.softkeyPanel.softKeyVisible) {
            this.softkeyPanel.show();
        }
        try {
            if (this.optionParams[paramName]) {
                this._params = this.optionParams[paramName];
                navigator.mozL10n.ready(this._initSoftKeyPanel.bind(this));
            } else {
                console.log('Param <' + paramName + '> not found');
            }
        } catch (e) {
            console.log(e);
        }
    };
    OptionHelper.prototype.popAndRemoveElement = function (arr, paramName) {
        var item;
        arr.forEach(function (params) {
            if (params.name === paramName) {
                var index = arr.indexOf(params);
                if (index >= 0) {
                    item = arr.splice(index, 1);
                }
                return;
            }
        });
        /*if (item == undefined) {
            return item;
        }*/
        return item && item[0] || undefined;
    };
    OptionHelper.prototype.getParams = function (paramName) {
        return this.optionParams[paramName];
    };
    OptionHelper.prototype.getLastParamName = function () {
        return this.lastParamName;
    };
    OptionHelper.prototype.compare = function (a, b) {
        return (a.priority - b.priority);
    };

    OptionHelper.prototype.swapParams = function (paramsName, oldName, newName, render) {
        var thisParms = this.getParams(paramsName);
        var itemToHide = this.popAndRemoveElement(thisParms.items, oldName);
        if (itemToHide) {
            thisParms.hidenItems.push(itemToHide);
            thisParms.items.push(this.popAndRemoveElement(thisParms.hidenItems, newName));
            thisParms.items.sort(this.compare);
            if (render) {
                this.show(paramsName);
            }
        }
    };

    OptionHelper.prototype.showParams = function (paramsName, name, render) {
        var thisParms = this.getParams(paramsName);
        thisParms.items.push(this.popAndRemoveElement(thisParms.hidenItems, name));
        thisParms.items.sort(this.compare);
        if (render) {
            this.show(paramsName);
        }
    };
    OptionHelper.prototype.hideParams = function (paramsName, name, render) {
        var thisParms = this.getParams(paramsName);
        thisParms.hidenItems.push(this.popAndRemoveElement(thisParms.items, name));
        thisParms.items.sort(this.compare);
        if (render) {
            this.show(paramsName);
        }
    };
    OptionHelper.prototype.hideMenu = function () {
        this.softkeyPanel && this.softkeyPanel.hide();
        this.softkeyPanel.stopListener();
    };
    OptionHelper.prototype.showMenu = function () {
        this.softkeyPanel && this.softkeyPanel.show();
        this.softkeyPanel.startListener();
    };
    OptionHelper.prototype.saveContext = function () {
      if (this.softkeyPanel) {
        var leftKey = this.softkeyPanel.getLeftKey();
        buttonState.leftKeyState = leftKey.classList.contains('hide');
        leftKey.classList.remove('hide');
        buttonState._cacheParams = this.getLastParamName();
      }
    };
    OptionHelper.prototype.returnContext = function () {
      if (this.softkeyPanel) {
        this.show(buttonState._cacheParams);
        buttonState.leftKeyState && this.softkeyPanel.getLeftKey().classList.add('hide');
      }
    };
    OptionHelper.prototype.getLeftKey = function () {
        return this.softkeyPanel.getLeftKey();
    };
    OptionHelper.prototype.setLast = function (selector) {
        buttonState._cacheParams = selector;
    };
    OptionHelper.prototype.getSoftKeyByName = function (key) {
        var button;
        try {
            button = this.softkeyPanel['get' + firtsUpper(key) + 'Key']();
        } catch (err) { //if some st dev try to get not being existed button
            console.error(err);
            return null;
        }
        return button;
    }
    /*
     * get softkey button [left, center, right] and if it exists check visibility state if it does not hide return true
     * @param String one of [left, center, right] default value is left
     * @return Boolean
     */
    OptionHelper.prototype.isAvailable = function (key) {
        var result = false,
            button = this.getSoftKeyByName(key || (key = 'left'));
        button && (result = !button.classList.contains('hide'));
        return result;
    };
    /*
     * do softkey btns visible or invisible
     * @param btn String one of [left, center, right] default value is left
     * @param state String one of [show, hide] default value is show
     * @void
     */
    OptionHelper.prototype.changeBtnState = function (btn, state) {
        var button = this.getSoftKeyByName(btn || (btn = 'left'));
        try {
            button && this['do' + firtsUpper(state || (state = 'show')) + 'Btn'](button);
        } catch (err) { //if the same as first dev try to change not existed state
            console.error(err);
        }
    };

    OptionHelper.prototype.doShowBtn = function (button) {
        button.classList.remove('hide');
    };

    OptionHelper.prototype.doHideBtn = function (button) {
        button.classList.add('hide');
    };

    exports.OptionHelper = new OptionHelper();
})(window);
