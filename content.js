// Copyright (c) 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * This script will remove overlay popups in most of sites.
 * It does that, in most cases, by removing the highests layers (z-index).
 **/

var domainsWhiteList,domainsDelayedStart;
var interval;
var aggressiveMode = false;

// Restores domains white list stored in chrome.storage.
function restore_domainWhiteListFromCloud() {
	chrome.storage.sync.get("domainWhiteList", 
		function(data) {
			domainsWhiteList = data.domainWhiteList;
			if(domainsWhiteList == null || domainsWhiteList.indexOf(getCurrentHostName()) == -1){
				chrome.storage.sync.get("domainsDelayedStart", 
					function(data2) {
						domainsDelayedStart = data2.domainsDelayedStart;
						if(domainsDelayedStart != null && domainsDelayedStart.indexOf(getCurrentHostName()) > -1){
								delayeStartOptions(true);
						} else{
							delayeStartOptions(false);
						}
				});
			};
	});
	
}

function getSearchOverlayMode(){
	chrome.storage.sync.get("aggressiveSearch", 
	function(data) {
		aggressiveMode = data.aggressiveSearch;
	});
}

function getCurrentHostName() {
	var currentHostname = window.location.hostname;
	currentHostname = currentHostname.replace(/^www./,'');
	return currentHostname;
}

//remove overlay with higher z-index than overlay background layer
function RemoveOverlayByZIndex()
{
	var elems = document.getElementsByTagName('div');
	var highest = 0;
	var j = 0;
    var toEnableScroll = false; 
	for (var i = 0; i < elems.length; i++)
	{
		var elmnt_zindex = window.getComputedStyle(elems[i],null).getPropertyValue("z-index");
		var elmnt_opacity = Number(window.getComputedStyle(elems[i],null).getPropertyValue("opacity"));		
		var elmnt_height = window.getComputedStyle(elems[i],null).getPropertyValue("height");
		var elmnt_width = window.getComputedStyle(elems[i],null).getPropertyValue("width");
        var element_position = window.getComputedStyle(elems[i],null).getPropertyValue("position");
		var elmnt_rgba_color = document.defaultView.getComputedStyle(elems[i],null).getPropertyValue("background-color");
        var isElementFullScreenSize = false;
		var rgba_opacity_value = 1;
        var noPaddingMarginsTopBottom = false, noPaddingMarginRightLeft = false;
		
        //check if there is opacity value < 1 in Backgound-color (RGBA)
		if(elmnt_rgba_color != null && elmnt_rgba_color != '' && elmnt_rgba_color.includes("rgba")){
			var rgbaOacityStartIndex = elmnt_rgba_color.lastIndexOf(',') + 1; 
			var rgbaOacityEndIndex = elmnt_rgba_color.lastIndexOf(')');
			rgba_opacity_value =Number(elmnt_rgba_color.substring(rgbaOacityStartIndex,rgbaOacityEndIndex));
		}
        
		if ((elmnt_width == '100%' || elmnt_width == 'auto' )) {
			var myWidth = elems[i].offsetWidth;
			var rect = elems[i].getBoundingClientRect();
		}
		
		if ((elmnt_width == '100%' || elmnt_width == 'auto' ) && window.getComputedStyle(elems[i],null).getPropertyValue("padding-left") == '0px' &&  
			window.getComputedStyle(elems[i],null).getPropertyValue("padding-right") == '0px' && window.getComputedStyle(elems[i],null).getPropertyValue("margin-left") == '0px'
			&& window.getComputedStyle(elems[i],null).getPropertyValue("margin-right") == '0px') {
				noPaddingMarginRightLeft = true;
		}
		if ((elmnt_height == '100%' || elmnt_height == 'auto' ) && window.getComputedStyle(elems[i],null).getPropertyValue("padding-top") == '0px' &&  
			window.getComputedStyle(elems[i],null).getPropertyValue("padding-bottom") == '0px' && window.getComputedStyle(elems[i],null).getPropertyValue("margin-top") == '0px'
			&& window.getComputedStyle(elems[i],null).getPropertyValue("margin-bottom") == '0px') {
				noPaddingMarginsTopBottom = true;
			
		}
		//size of element is at least size of client size (-18px -> where overlay not cover height scroller)
        if ((document.documentElement.clientWidth != null && (Number(elmnt_width.replace('px', '')) >= document.documentElement.clientWidth - 18) || noPaddingMarginRightLeft) && 
                (document.documentElement.clientHeight != null && (Number(elmnt_height.replace('px', '')) >= document.documentElement.clientHeight) || noPaddingMarginsTopBottom)) {
                isElementFullScreenSize = true;
		}
        //remove overlay when there is no z-index
        if(isElementFullScreenSize 
            && ((elmnt_opacity > 0.1 && elmnt_opacity < 1) || (elmnt_rgba_color != 'rgba(0, 0, 0, 0)' && rgba_opacity_value < 1)) 
            && (elmnt_zindex == '' || elmnt_zindex == null || elmnt_zindex == 'auto' || elmnt_zindex == '0') 
            && (element_position != null && (element_position == 'fixed' || element_position == 'absolute'))){
                elems[i].style.setProperty("display", "none", "important");
                toEnableScroll = true;
        } 
        //search & remove z-indexed overlay background
        if (isElementFullScreenSize
            && ((elmnt_opacity > 0.1 && elmnt_opacity < 1) || (rgba_opacity_value > 0 && rgba_opacity_value < 1))
            && (parseInt(elmnt_zindex) > 40 && elmnt_zindex != 'auto' ) 
            && (element_position != null && (element_position == 'fixed' || element_position == 'absolute')))
		{
			highest = parseInt(elmnt_zindex);
			elems[i].style.setProperty("display", "none", "important");
            toEnableScroll = true;
			//search & remove overlay popup content
            for (j = 0 ; j < elems.length; j++) {
				var new_zindex = parseInt(window.getComputedStyle(elems[j],null).getPropertyValue("z-index"));
				if((new_zindex > highest) && (highest > 0)){
					elems[j].style.setProperty("display", "none", "important");
				}
			}
			if(!aggressiveMode)
				clearInterval(interval);
		}
	}
    if (toEnableScroll) {
        document.body.style.overflowY = "auto";   
    }
}

function runOverlayRemover(timeMilli){
	interval = setInterval(RemoveOverlayByZIndex, 250);
	setTimeout(function(){clearInterval(interval);},timeMilli);
}

function delayeStartOptions(isDelayed) {
  // Use default value runningMode = 'onPageLoad'.
	chrome.storage.sync.get({
	 	delayDuration: '',		
		preferedtiming: 'onPageLoad'
		}, function(items) {
			if (isDelayed) {
				items.preferedtiming = 'delayed';
			}
			switch (items.preferedtiming){
			case 'immediately':
				runOverlayRemover(13000);
				break;
			case 'onPageLoad':
				var loadfunction = window.onload;
				window.onload = function(event){
					runOverlayRemover(10000);
					if(loadfunction) loadfunction(event);
				}
				break;
			case 'delayed':
				setTimeout(runOverlayRemover,+items.delayDuration * 1000, 13000);
				break;
			default:
				runOverlayRemover(10000);
				break;
			}
	   }
    );
}
getSearchOverlayMode();
restore_domainWhiteListFromCloud();