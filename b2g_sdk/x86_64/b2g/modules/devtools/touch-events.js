let{CC,Cc,Ci,Cu,Cr}=require('chrome');Cu.import('resource://gre/modules/Services.jsm');let handlerCount=0;let orig_w3c_touch_events=Services.prefs.getIntPref('dom.w3c_touch_events.enabled');let systemAppOrigin=(function(){let systemOrigin="_";try{systemOrigin=Services.io.newURI(Services.prefs.getCharPref('b2g.system_manifest_url'),null,null).prePath;}catch(e){}
return systemOrigin;})();let trackedWindows=new WeakMap();function TouchEventHandler(window){ let cached=trackedWindows.get(window);if(cached){return cached;}
let contextMenuTimeout=0;let threshold=25;try{threshold=Services.prefs.getIntPref('ui.dragThresholdX');}catch(e){}
let delay=500;try{delay=Services.prefs.getIntPref('ui.click_hold_context_menus.delay');}catch(e){}
let TouchEventHandler={enabled:false,events:['mousedown','mousemove','mouseup','touchstart','touchend'],start:function teh_start(){if(this.enabled)
return false;this.enabled=true;let isReloadNeeded=Services.prefs.getIntPref('dom.w3c_touch_events.enabled')!=1;Services.prefs.setIntPref('dom.w3c_touch_events.enabled',1);this.events.forEach((function(evt){
 window.addEventListener(evt,this,true,false);}).bind(this));return isReloadNeeded;},stop:function teh_stop(){if(!this.enabled)
return;this.enabled=false;Services.prefs.setIntPref('dom.w3c_touch_events.enabled',orig_w3c_touch_events);this.events.forEach((function(evt){window.removeEventListener(evt,this,true);}).bind(this));},handleEvent:function teh_handleEvent(evt){

let content=this.getContent(evt.target);if(!content){return;}
let isSystemWindow=content.location.toString().startsWith(systemAppOrigin);
if(evt.type.startsWith('touch')&&!isSystemWindow){let sysFrame=content.realFrameElement;let sysDocument=sysFrame.ownerDocument;let sysWindow=sysDocument.defaultView;let touchEvent=sysDocument.createEvent('touchevent');let touch=evt.touches[0]||evt.changedTouches[0];let point=sysDocument.createTouch(sysWindow,sysFrame,0,touch.pageX,touch.pageY,touch.screenX,touch.screenY,touch.clientX,touch.clientY,1,1,0,0);let touches=sysDocument.createTouchList(point);let targetTouches=touches;let changedTouches=touches;touchEvent.initTouchEvent(evt.type,true,true,sysWindow,0,false,false,false,false,touches,targetTouches,changedTouches);sysFrame.dispatchEvent(touchEvent);return;}

if(evt.button||evt.mozInputSource!=Ci.nsIDOMMouseEvent.MOZ_SOURCE_MOUSE||evt.isSynthesized){return;}
let eventTarget=this.target;let type='';switch(evt.type){case'mousedown':this.target=evt.target;contextMenuTimeout=this.sendContextMenu(evt.target,evt.pageX,evt.pageY,delay);this.cancelClick=false;this.startX=evt.pageX;this.startY=evt.pageY;
evt.target.setCapture(false);type='touchstart';break;case'mousemove':if(!eventTarget)
return;if(!this.cancelClick){if(Math.abs(this.startX-evt.pageX)>threshold||Math.abs(this.startY-evt.pageY)>threshold){this.cancelClick=true;content.clearTimeout(contextMenuTimeout);}}
type='touchmove';break;case'mouseup':if(!eventTarget)
return;this.target=null;content.clearTimeout(contextMenuTimeout);type='touchend';

if(evt.detail==1){window.addEventListener('click',this,true,false);}
break;case'click':
 evt.preventDefault();evt.stopImmediatePropagation();window.removeEventListener('click',this,true,false);if(this.cancelClick)
return;ignoreEvents=true;content.setTimeout(function dispatchMouseEvents(self){try{self.fireMouseEvent('mousedown',evt);self.fireMouseEvent('mousemove',evt);self.fireMouseEvent('mouseup',evt);}catch(e){Cu.reportError('Exception in touch event helper: '+e);}
ignoreEvents=false;},0,this);return;}
let target=eventTarget||this.target;if(target&&type){this.sendTouchEvent(evt,target,type);}
if(!isSystemWindow){evt.preventDefault();evt.stopImmediatePropagation();}},fireMouseEvent:function teh_fireMouseEvent(type,evt){let content=this.getContent(evt.target);var utils=content.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils);utils.sendMouseEvent(type,evt.clientX,evt.clientY,0,1,0,true,0,Ci.nsIDOMMouseEvent.MOZ_SOURCE_TOUCH);},sendContextMenu:function teh_sendContextMenu(target,x,y,delay){let doc=target.ownerDocument;let evt=doc.createEvent('MouseEvent');evt.initMouseEvent('contextmenu',true,true,doc.defaultView,0,x,y,x,y,false,false,false,false,0,null);let content=this.getContent(target);let timeout=content.setTimeout((function contextMenu(){target.dispatchEvent(evt);this.cancelClick=true;}).bind(this),delay);return timeout;},sendTouchEvent:function teh_sendTouchEvent(evt,target,name){
if(target.localName=="iframe"&&target.mozbrowser===true){if(name=="touchstart"){this.touchstartTime=Date.now();}else if(name=="touchend"){
if(Date.now()-this.touchstartTime<delay){this.cancelClick=true;}}
function clone(obj){return Cu.cloneInto(obj,target);}
let unwraped=XPCNativeWrapper.unwrap(target);unwraped.sendTouchEvent(name,clone([0]), clone([evt.clientX]), clone([evt.clientY]), clone([1]),clone([1]), clone([0]),clone([0]), 1); return;}
let document=target.ownerDocument;let content=this.getContent(target);if(!content){return null;}
let touchEvent=document.createEvent('touchevent');let point=document.createTouch(content,target,0,evt.pageX,evt.pageY,evt.screenX,evt.screenY,evt.clientX,evt.clientY,1,1,0,0);let touches=document.createTouchList(point);let targetTouches=touches;let changedTouches=touches;touchEvent.initTouchEvent(name,true,true,content,0,false,false,false,false,touches,targetTouches,changedTouches);target.dispatchEvent(touchEvent);return touchEvent;},getContent:function teh_getContent(target){let win=(target&&target.ownerDocument)?target.ownerDocument.defaultView:null;return win;}};trackedWindows.set(window,TouchEventHandler);return TouchEventHandler;}
exports.TouchEventHandler=TouchEventHandler;