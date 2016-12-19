var debug = chrome.runtime.id != "pbnndmlekkboofhnbonilimejonapojg";
var colors, frontColors, imagePromises, images, lights;
var currentSettings = {}, curSet = {};
var chromePromise = new ChromePromise();
var classObserverConfig = { attributes: true, subtree: true, attributeFilter: ["class"] };
var classObserver = new MutationObserver(
	function (mutations) {
		mutations.forEach(
			function (mutation) {
				if (mutation.target.is && mutation.target.is.checked && mutation.target.cbBgColor) {
					if (mutation.target.firstElementChild) {
						reCalcRootElement(mutation.target, false);
					}
					else {
						restoreElementColors(mutation.target);
						procElement(mutation.target);
					}
				}
			});
	});

var childObserverConfig = { childList: true, subtree: true };
var childObserver = new MutationObserver(
	function (mutations) {
		var allNewTags = [];
		mutations.forEach(m => Array.prototype.push.apply(allNewTags, m.addedNodes));
		procAllElementsWithChildren(allNewTags);
	});
var nameResources =
	{
		htm:
		{
			dom:
			{
				bgrColor: "backgroundColor",
				brdColor: "borderColor",
				fntColor: "color",
				shdColor: "textShadow"
			},
			css:
			{
				bgrColor: "background-color",
				brdColor: "border-color",
				fntColor: "color",
				shdColor: "text-shadow"
			},
			img: "IMG"
		},
		svg:
		{
			dom:
			{
				bgrColor: "fill",
				brdColor: "stroke",
				fntColor: "fill",
				shdColor: "textShadow"
			},
			css:
			{
				bgrColor: "fill",
				brdColor: "stroke",
				fntColor: "fill",
				shdColor: "text-shadow"
			},
			img: "IMAGE"
		}
	};

var styleProps =
[
	{ prop: "backgroundColor", priority: 1 },
	{ prop: "color", priority: 1 },
	{ prop: "fill", priority: 2 },
	{ prop: "borderColor", priority: 2 },
	{ prop: "stroke", priority: 2 },
	{ prop: "backgroundImage", priority: 3 },
	{ prop: "backgroundPosition", priority: 3 },
	{ prop: "backgroundSize", priority: 4 },
	{ prop: "textShadow", priority: 4 }
];

function initSettings()
{
	getStorage().then(storage =>
	{
		currentSettings.isEnabled = storage.isEnabled === undefined || storage.isEnabled;
		Object.assign(currentSettings, colorSchemes.dimmedDust);
		if(storage.settingsVersion !== undefined)
		{
			currentSettings.settingsVersion = storage.settingsVersion;
			let settings = getSettings(storage.settingsVersion);
			if(settings.exist)
			{
				setRealSettings(settings);
			}
			else
			{
				initDefaultSettings(storage.settingsVersion);
			}
		}
		else
		{
			currentSettings.settingsVersion = guid().replace(/-/g, "");
			setSettingsVersion(currentSettings.settingsVersion);
		}
	});
}

function initDefaultSettings(version)
{
	let settings = getSettings(version, "default");
	if(settings.exist)
	{
		setDefaultSettings(settings, version);
	}
	else
	{
		chrome.runtime.sendMessage({ action: "getDefaultSettings", version: version }, applyDefaultSettings);
	}
}

function setDefaultSettings(settings, version)
{
	currentSettings.isDefault = true;
	Object.assign(currentSettings, settings);
	initCurSet();
	preLoadStyles();
	chrome.runtime.sendMessage({ action: "getDefaultSettings", version: version }, saveDefaultSettings);
}

function setRealSettings(settings)
{
	Object.assign(currentSettings, settings);
	initCurSet();
	preLoadStyles();
	setTimeout(set => 
	{
		saveSettings(set);
		delSettings("default");
	}, 10000, settings);
}

function initCurSet()
{
	Object.assign(curSet, currentSettings);
	for(let setting in curSet)
	{
		if(!/Hue/g.test(setting)) switch (typeof curSet[setting])
		{
			case "number":
				curSet[setting] /= 100;
				break;
			default: break;
		}
	}
}

function saveDefaultSettings(settings)
{
	!settings.exist && (settings.runOnThisSite = true);
	saveSettings(settings, "default");
}

function applyDefaultSettings(settings)
{
	!settings.exist && (settings.runOnThisSite = true);
	currentSettings.isDefault = true;
	Object.assign(currentSettings, settings);
	initCurSet();
	preLoadStyles();
	setTimeout(set => saveSettings(set, "default"), 10000, settings);
}

function preLoadStyles()
{
	if (curSet.runOnThisSite && curSet.isEnabled)
    {
        createLoadingStyles(document);
        createScrollbarStyle(document);
    }
}

function resetPrevColors() {
	colors = {};
	frontColors = {};
	imagePromises = {};
	images = {};
	lights = new Map();
}

function procDocument(doc) {
	if (doc.body && doc.defaultView && curSet.runOnThisSite && curSet.isEnabled) // 
	{
		let procEvent = new CustomEvent("processing", { detail: doc });
		document.dispatchEvent(procEvent);
		var allTags;
		doc.isfb = /facebook/gi.test(doc.defaultView.location.hostname);
		resetPrevColors();
		curSet.restoreColorsOnCopy && (doc.oncopy = onCopy);
		doc.dorm = {};
		doc.viewArea = doc.defaultView.innerHeight * doc.defaultView.innerWidth;
		createLoadingShadow(doc.documentElement);
		removeLoadingStyles(doc);
		initSelectors(doc);
		createPseudoStyles(doc);
		procElement(doc.body);
		if (!doc.body.childObserved)
		{
			childObserver.observe(doc.body, childObserverConfig);
			doc.body.childObserved = true;
		}
		if (!doc.body.calssObserved)
		{
			classObserver.observe(doc.body, classObserverConfig);
			doc.body.calssObserved = true;
		}
		allTags = Array.prototype.slice.call(doc.getElementsByTagName("*")).filter(checkElement);
		procAllElements(allTags, doc.documentElement);
	}
}

function onCopy() {
	var sel = this.defaultView.getSelection(), rootElem, allTags;
	if (sel && !sel.isCollapsed) {
		rootElem = sel.getRangeAt(0).commonAncestorContainer;
		rootElem.cbBgColor = null;
		if (!checkElement(rootElem)) {
			rootElem = rootElem.parentElement;
		}
		rootElem = getColoredParent(rootElem, true, true);
		reCalcRootElement(rootElem, true);
	}
}

function initSelectors(doc)
{
	if (!doc.selectors)
	{
		doc.selectors = [];
		var styleRules = [];
		var styles = Array.prototype.slice.call(doc.styleSheets);
		for (var sheet = 0; sheet < styles.length; sheet++)
		{
			var rules = styles[sheet].cssRules;
			if (rules && rules.length > 0 && (!styles[sheet].ownerNode || styles[sheet].ownerNode.id != "cbScrollbarStyle"))
			{
				for (var rule = 0; rule < rules.length; rule++)
				{
					if (rules[rule].selectorText && rules[rule].style)
					{
						var style = rules[rule].style;
						if(styleProps.some(p => style[p.prop] !== "" && style[p.prop] != "initial" && style[p.prop] != "inherited"))
						{
							styleRules.push(rules[rule]);
						}
					}
					else if (rules[rule].styleSheet)
					{
						styles.push(rules[rule].styleSheet);
					}
				}
			}
		}

		let maxPriority = 1, stylesLimit = 300; 
		let filteredStyleRules = styleRules;
		styleProps.forEach(p => maxPriority = p.priority > maxPriority ? p.priority : maxPriority);
		doc.selectorsQuality = maxPriority;
		while (maxPriority-- > 1 && filteredStyleRules.length > stylesLimit)
		{
			doc.selectorsQuality--;
			styleProps = styleProps.filter(p => p.priority <= maxPriority);
			filteredStyleRules = filteredStyleRules.filter(r => styleProps.some(p => r.style[p.prop] !== "" && r.style[p.prop] != "initial" && r.style[p.prop] != "inherited"));
		}
		
		if(filteredStyleRules.length > stylesLimit)
		{
			doc.selectorsQuality = 0;
			let trimmer = x =>
				 /active|hover|disabled|checked|visited|selected|focus|enabled|child|nth|last|first/gi.test(x.selectorText) && 
				!/scrollbar/gi.test(x.selectorText);
			let trimmedStyleRules = styleRules.filter(trimmer);
			if(trimmedStyleRules.length > stylesLimit)
			{
				filteredStyleRules = filteredStyleRules.filter(trimmer);
			}
			else
			{
				filteredStyleRules = trimmedStyleRules;
			}
		}

		filteredStyleRules.forEach(sr => doc.selectors.push(sr.selectorText));
	}
}

function getElementMatchedSelectors(tag)
{
	if(tag.isPseudo)
	{
		return [tag.selectors];
	}
	else
	{
		let className = tag.className.baseVal || tag.className;
		let key = tag.tagName + "#" + tag.id + "." + className;
		tag.ownerDocument.preFilteredSelectors = tag.ownerDocument.preFilteredSelectors || {};
		let preFilteredSelectors = tag.ownerDocument.preFilteredSelectors[key];
		if (!preFilteredSelectors) {

			var notTagId = tag.id ? "(?!#"+tag.id+"\\b)" : "";
			var notClassNames = className && className.replace ? "(?!\\." + escapeRegex(className).replace(/ /g, "\\b|\\.") + "\\b)" : "";

			var excludeRegExp = "^(?:::).+$|^(?:(?:[^,]*\\s|^)(?:(?:(?:(?!"+tag.tagName+"\\b)\\w+(?:#[\\w-_]+)?)|(?:\\w*"+notTagId+"#[\\w-]+))(?:\\[[^\\]]+\\])?(?:\\.[\\w-_]+)*|#?\\w*(?:\\[[^\\]]+\\])?(?:"+notClassNames+"\\.[\\w-_]+"+notClassNames+")+)(?:::?[\\w-]+(?:\\([^\\)]+\\))*)*(?:,|$))+$";

			excludeRegExp = new RegExp(excludeRegExp, "i");
			tag.ownerDocument.preFilteredSelectors[key] = preFilteredSelectors =
				tag.ownerDocument.selectors.filter((selector) => !excludeRegExp.test(selector));
		}
		var wrongSelectors = [];
		var result = preFilteredSelectors.filter((selector) =>
		{
			try
			{
				return tag.matches(selector);
			}
			catch (ex)
			{
				wrongSelectors.push(selector);
				// console.log(ex);
				return false;
			}
		});
		wrongSelectors.forEach(w => preFilteredSelectors.splice(preFilteredSelectors.indexOf(w), 1))
		return result;
	}
}

function observeElementHover(tag)
{
	let className = tag.className.baseVal || tag.className;
	var key = tag.tagName + "#" + tag.id + "." + className;
	var preFilteredSelectors = tag.ownerDocument.preFilteredSelectors[key];
	if (preFilteredSelectors && preFilteredSelectors.some(s => s.indexOf(":hover") != -1 && tag.matches(s.replace(/:hover/gi, ""))))
	{
		tag.addEventListener("mouseenter", onMouseEnterOrLeave);
		tag.addEventListener("mouseleave", onMouseEnterOrLeave);
	}
}

function onMouseEnterOrLeave()
{
	if(curSet.runOnThisSite && curSet.isEnabled && this.selectors != getElementMatchedSelectors(this).join(";"))
	{
		reCalcRootElement(this);
	}
}

function reCalcRootElement(rootElem, full) {
	if (rootElem) {
		var allTags;
		allTags = rootElem.firstElementChild ? Array.prototype.slice.call(rootElem.getElementsByTagName("*")) : null;
		if (allTags && allTags.length > 0)
		{
			let skipSelectors = full || rootElem.ownerDocument.selectors.length >= 500 || (rootElem.ownerDocument.selectorsQuality === 0 && allTags.length < 10);
			allTags = allTags.filter(el =>
			{
				return el.is && el.is.checked && el.cbBgColor && (skipSelectors || el.selectors != getElementMatchedSelectors(el).join(";"));
			});
			allTags.splice(0, 0, rootElem);
		}
		else {
			allTags = [rootElem];
		}
		if (full || allTags.length < 500)
		{
			if (allTags.length < 10)
			{
				var pseudoStyles = [allTags[0].ownerDocument];
				let results = allTags.map(tg =>
				{
					restoreElementColors(tg);
					return procElement(tg);
				});
				results.filter(r=>r).forEach(r => pseudoStyles.push(...r));
				Promise.all(pseudoStyles).then(cssArray =>
				{
					let doc = cssArray.shift();
					let css = cssArray.filter(css => css !== "").join("\n");
					css !== "" && doc.cbPseudoStyles.appendChild(doc.createTextNode(css));
				});
			}
			else
			{
				createLoadingShadow(rootElem);
				allTags.forEach(restoreElementColors);
				procAllElements(allTags, rootElem);
			}
		}
	}
}

function getColoredParent(tag, checkBackground, checkForeground)
{
	if (tag) {
		var bgOk = !checkBackground || tag.style.backgroundColor !== "",
			fgOk = !checkForeground || tag.style.color !== "";
		if (bgOk && fgOk) {
			return tag;
		}
		else {
			return getColoredParent(tag.parentElement, !bgOk, !fgOk);
		}
	}
}

function procAllElementsWithChildren(allTags)
{
	var allChildTags = [], childTags;
	var allNewTags = allTags.filter(checkElement)
	procAllElements(allNewTags);
	allNewTags.forEach((newNode) =>
	{
		newNode.done = true;
		childTags = newNode.getElementsByTagName("*");
		for (let ct in childTags)
		{
			if (!childTags[ct].done && checkElement(childTags[ct]))
			{
				allChildTags.push(childTags[ct]);
				childTags[ct].done = true;
			}
		}
	});
	procAllElements(allChildTags);
}

function procAllElements(allTags, shadow)
{
	if (allTags.length > 0)
	{
		let viewColorTags = [], visColorTags = [], invisColorTags = [],
			viewImageTags = [], visImageTags = [], invisImageTags = [],
			viewTransTags = [], visTransTags = [], invisTransTags = [],
			style, nr, isSvg, bgrColor, altText, isVisible, hasBgColor, hasImage, inView,
			hm = allTags[0].ownerDocument.defaultView.innerHeight,
			wm = allTags[0].ownerDocument.defaultView.innerWidth;
		for (let tag of allTags)
		{
			isSvg = tag instanceof tag.ownerDocument.defaultView.SVGElement;
			nr = isSvg ? nameResources.svg : nameResources.htm;
			tag.computedStyle = tag.computedStyle || tag.ownerDocument.defaultView.getComputedStyle(tag, "");
			isVisible = tag.tagName == "BODY" || !isSvg && tag.offsetParent !== null || tag.computedStyle.position == "fixed" || isSvg;
			bgrColor = tag.computedStyle[nr.dom.bgrColor];
			hasBgColor = bgrColor && bgrColor != "rgba(0, 0, 0, 0)";
			hasImage = tag.computedStyle.backgroundImage !== "none" || tag.name == "IMAGE";

			if (isVisible)
			{
				tag.rect = tag.rect || tag.getBoundingClientRect();
				isVisible = tag.rect.width !== 0 && tag.rect.hight !== 0;
				inView = isVisible &&
						 (tag.rect.bottom > 0  && tag.rect.bottom < hm || tag.rect.top  > 0 && tag.rect.top  < hm) &&
						 (tag.rect.right  > 0  && tag.rect.right  < wm || tag.rect.left > 0 && tag.rect.left < wm);
				if(!isVisible)
				{
					tag.rect = null;
					if (hasBgColor)		invisColorTags.push(tag);
					else if (hasImage)	invisImageTags.push(tag);
					else				invisTransTags.push(tag);
				}
				else if (hasBgColor)
				{
					if(inView) viewColorTags.push(tag);
					else       visColorTags.push(tag);
				}
				else if (hasImage)
				{
					if(inView) viewImageTags.push(tag);
					else       visImageTags.push(tag);
				}
				else
				{
					if(inView)	viewTransTags.push(tag);
					else		visTransTags.push(tag);
				}
			}
			else
			{
				if (hasBgColor)		invisColorTags.push(tag);
				else if (hasImage)	invisImageTags.push(tag);
				else				invisTransTags.push(tag);
			}
		}
		let tagsArray =
			[
				[viewColorTags, null],	[visColorTags,  null],	[viewImageTags, null],
				[viewTransTags, null],	[visTransTags,  null],	[visImageTags,  null],
				[invisColorTags,null],	[invisImageTags,null],	[invisTransTags,null]
			].filter(param => param[0].length > 0);
		if(tagsArray.length > 0)
		{
			tagsArray[0][1] = shadow;
			let density = 2000 / allTags.length
			let delayArray = [0,1,10,50,100,250,500,750,1000].map(d => Math.round(d/density));
			forEachPromise(tagsArray, procElements, 0, (prevDelay, index) => delayArray[index]);
		}
		else shadow && removeLoadingShadow(shadow);
	}
	else shadow && removeLoadingShadow(shadow);
}

function procElements(tags, shadow, prev, delay)
{
	shadow && removeLoadingShadow(shadow);
	if (tags.length > 0)
	{
		let chunkLength = 500;
		if (tags.length < chunkLength)
		{
			procElementsChunk(tags, null, delay);
		}
		else
		{
			return forEachPromise(sliceIntoChunks(tags, chunkLength).map(chunk => [chunk]), procElementsChunk, delay);
		}
	}
}

function procElementsChunk(chunk, prev, delay)
{
	let pseudoStyles = [chunk[0].ownerDocument];
	let results = chunk.map(procElement);
	results.filter(r => r).forEach(r => pseudoStyles.push(...r));
	startObservation(chunk);
	return Promise.all(pseudoStyles).then(cssArray =>
	{
		let doc = cssArray.shift();
		let css = cssArray.filter(css => css !== "").join("\n");
		
		if(css !== "")
		{
			setTimeout((d,c) => d.cbPseudoStyles.appendChild(d.createTextNode(c)), delay || 1, doc, css);
		}
	});
}

function startObservation(forObservation) {
	if(forObservation[0].ownerDocument.selectors.length < 500)
	{
		setTimeout(tags =>
		{
			for (x = 0; x < tags.length; x++)
			{
				if (!tags[x].observed)
				{
					observeElementHover(tags[x]);
					tags[x].observed = true;
				}
			}
		}, 1, forObservation);
	}
}

function createPseudoElement(ownerTag, pseudoStyle, roomId, pseudoType)
{
	var PseudoElementStyle = class
	{
		constructor() { this.cssText = ""; }
		setProperty(prop, val, priority)
		{
			this.cssText += ";" + prop + ":" + val + (priority ? "!" + priority : "");
		}
	};

	let doc = ownerTag.ownerDocument;
	let pseudoElement =
	{
		id: roomId,
		className: "::" + pseudoType,
		tagName: pseudoType,
		isPseudo: true,
		parentElement: ownerTag,
		computedStyle: pseudoStyle,
		rect: ownerTag.rect,
		style: new PseudoElementStyle(),
		ownerDocument: doc,
		selectors: roomId,
		getBoundingClientRect: () => ownerTag.rect = ownerTag.rect || ownerTag.getBoundingClientRect(),
		applyStyle: (pseudo) =>
		{
			let css = pseudo.style.cssText === ""
				? ""
				: "[" + pseudo.tagName + "-style=\"" + pseudo.id + "\"]:not(important)" + pseudo.className + "{ " + pseudo.style.cssText + " }";
			pseudo.resolve(css);
		}
	};
	pseudoElement.stylePromise = new Promise((resolve, reject) => pseudoElement.resolve = resolve);
	return pseudoElement;
}

function tagIsSmall(tag)
{
	let maxSize = 40, maxAxis = 16,
		check = (w,h) => w > 0 && h > 0 && (w < maxSize && h < maxSize || w < maxAxis || h < maxAxis);
	tag.computedStyle = tag.computedStyle || tag.ownerDocument.defaultView.getComputedStyle(tag, "");
	let width = parseInt(tag.computedStyle.width), height = parseInt(tag.computedStyle.height);
	if(!isNaN(width) && !isNaN(height))
	{
		tag.area = width * height;
		return check(width, height);
	}
	else if (!isNaN(width) && width < maxAxis && width > 0)
	{
		return true;
	}
	else if (!isNaN(height) && height < maxAxis && height > 0)
	{
		return true;
	}
	else
	{
		tag.rect = tag.rect || tag.getBoundingClientRect();
		tag.area = tag.rect.width * tag.rect.height;
		return check(tag.rect.width, tag.rect.height);
	}
}

function calcTagArea(tag)
{
	tag.computedStyle = tag.computedStyle || tag.ownerDocument.defaultView.getComputedStyle(tag, "");
	let width = parseInt(tag.computedStyle.width), height = parseInt(tag.computedStyle.height);
	if(!isNaN(width) && !isNaN(height))
	{
		tag.area = width * height;
	}
	else
	{
		tag.rect = tag.rect || tag.getBoundingClientRect();
		tag.area = tag.rect.width * tag.rect.height;
	}
}

function procElement(tag)
{
	if (tag && !tag.cbBgColor && tag.ownerDocument.defaultView)
	{
		let doc = tag.ownerDocument;
		let isSmall, bgInverted;
		let result = {}, bgLight, brdColor, roomRules, room;
		let isSvg = tag instanceof doc.defaultView.SVGElement,
			isSvgText = tag instanceof doc.defaultView.SVGTextContentElement,
			isTable = tag instanceof doc.defaultView.HTMLTableElement || tag instanceof doc.defaultView.HTMLTableCellElement || tag instanceof doc.defaultView.HTMLTableRowElement || tag instanceof doc.defaultView.HTMLTableSectionElement;
		let nr = isSvg ? nameResources.svg : nameResources.htm;
		let beforePseudoElement, afterPseudoElement, roomId;

		if (tag.tagName == "IFRAME")
		{
			tag.onload = onIframeLoaded;
			setTimeout(t => { onIframeLoaded.call(t); }, 1, tag);
		}
		if (tag.contentEditable == "true") overrideInnerHtml(tag);
		
		if(tag.ownerDocument.selectors.length < 500)
		{
			calcElementPath(tag);
			tag.selectors = getElementMatchedSelectors(tag).join(";");
			room = [tag.path, tag.selectors, tag.style.cssText, tag.color,
				isSvg && tag.getAttribute("fill") || 
				isTable && (tag.bgColor || tag.background || tag.getAttribute("background")),
				isSvg].join("\n");
			roomRules = doc.dorm[room];
		}

		if (!roomRules)
		{
			roomRules = { owner: debug && tag };
			tag.computedStyle = tag.computedStyle || doc.defaultView.getComputedStyle(tag, "");
			if(tag.id == "hc_extension_bkgnd")
			{
				roomRules.display = "none";
			}
			if(!tag.isPseudo)
			{
				let beforeStyle = doc.defaultView.getComputedStyle(tag, ":before");
				let afterStyle = doc.defaultView.getComputedStyle(tag, ":after");
				if(beforeStyle && beforeStyle.content != "")
				{
				 	roomId = roomId || room ? hashCode(room) : guid();
					beforePseudoElement = createPseudoElement(tag, beforeStyle, roomId, "before");
					roomRules.attributes = roomRules.attributes || [];
					roomRules.attributes.push( { name: "before-style", value: roomId });
				}
				if(afterStyle && afterStyle.content != "")
				{
					roomId = roomId || room ? hashCode(room) : guid();
					afterPseudoElement =  createPseudoElement(tag, afterStyle, roomId, "after");
					roomRules.attributes = roomRules.attributes || [];
					roomRules.attributes.push( { name: "after-style", value: roomId });
				}
			}
			if(!isSvgText)
			{
				if(isSvg)
				{
					if(tagIsSmall(tag))
					{
						isSvgText = true;
						roomRules.backgroundColor = Object.assign({}, getParentBackground(tag));
						roomRules.backgroundColor.color = null;
					}
					else
					{
						roomRules.backgroundColor = calcColor(tag.computedStyle[nr.dom.bgrColor], curSet.borderGraySaturation, tag, curSet.imageLightnessLimit, curSet.backgroundSaturationLimit, curSet.borderGrayHue, curSet.backgroundContrast, true);
					}
				}
				else
				{
					roomRules.backgroundColor = calcColor(tag.computedStyle[nr.dom.bgrColor], curSet.backgroundGraySaturation, tag, curSet.backgroundLightnessLimit, curSet.backgroundSaturationLimit, curSet.backgroundGrayHue, curSet.backgroundContrast, false);
				}

				if(doc.isfb && roomRules.backgroundColor.color && tag.id != "" && tag.className != "")
				{
					roomRules.display = tag.computedStyle.display;
				}
			}
			else
			{
				roomRules.backgroundColor = Object.assign({}, getParentBackground(tag));
				roomRules.backgroundColor.color = null;
			}

			if ((tag.tagName == nr.img || tag.tagName == "INPUT" && (tag.type == "checkbox" || tag.type == "radio") && tag.computedStyle.webkitAppearance != "none") &&
				(curSet.backgroundImageLightnessLimit < 1 || curSet.imageSaturationLimit < 1))
			{
				roomRules.filter =
					{
						value: [
							curSet.imageLightnessLimit < 1 ? "brightness(" + curSet.imageLightnessLimit + ")" : "",
							curSet.imageSaturationLimit < 1 ? "saturate(" + curSet.imageSaturationLimit + ")" : "",
							tag.computedStyle.filter != "none" ? tag.computedStyle.filter : ""
						].join(" ").trim()
					};
				roomRules.attributes = roomRules.attributes || [];
				roomRules.attributes.push( { name: "transition", value: "filter" });
			}

			let doNotInvertRegExp = /user|account|photo|importan|light-grey/gi;
			let bgInverted = roomRules.backgroundColor.originalLight - roomRules.backgroundColor.light > curSet.textContrast;

			if(tag.isPseudo && tag.computedStyle.content.substr(0,3) == "url")
			{
				let doInvert = !isTable && bgInverted && !doNotInvertRegExp.test(tag.computedStyle.content) &&
					(tagIsSmall(tag) || tagIsSmall(tag.parentElement.parentElement) && tag.parentElement.parentElement.computedStyle.overflow == "hidden");
				if(curSet.backgroundImageLightnessLimit < 1 || curSet.backgroundImageSaturationLimit < 1 || doInvert)
				{
					roomRules.filter =
						{
							value: [
								curSet.backgroundImageLightnessLimit < 1 && !doInvert ? "brightness(" + curSet.backgroundImageLightnessLimit + ")" : "",
								curSet.backgroundImageSaturationLimit < 1 ? "saturate(" + curSet.backgroundImageSaturationLimit + ")" : "",
								doInvert ? "brightness(" + (1 - curSet.backgroundLightnessLimit) + ")" : "",
								doInvert ? "invert(1)" : "",
								tag.computedStyle.filter != "none" ? tag.computedStyle.filter : ""
							].join(" ").trim()
						};
				}
			}

			if(tag.computedStyle.backgroundImage != "none")
			{
				if(tag.computedStyle.backgroundImage.substr(0,3) == "url")
				{
					let doInvert = !isTable && bgInverted && !doNotInvertRegExp.test(tag.computedStyle.backgroundImage) &&
						(tagIsSmall(tag) || tag.parentElement && tag.parentElement.parentElement && tagIsSmall(tag.parentElement.parentElement) && tag.parentElement.parentElement.computedStyle.overflow == "hidden");
					let isPseudoContent = tag.isPseudo && tag.computedStyle.content === "''" && tag.computedStyle.content !== '""'
					let bgImgLight = 1;
					if(curSet.backgroundImageLightnessLimit < 1 && !doInvert)
					{
						calcTagArea(tag);
						let area = 1 - Math.min(Math.max(tag.area, 1) / doc.viewArea, 1),
							lim = curSet.backgroundImageLightnessLimit,
							txtLim = curSet.textLightnessLimit;
						bgImgLight = Math.min(Math.pow(Math.pow(Math.pow(lim, 1/2) - lim, 1/3) * area, 3) + lim, Math.max(lim, txtLim));
					}
					let bgFilter = [
						bgImgLight < 1 ? "brightness(" + bgImgLight + ")" : "",
						curSet.backgroundImageSaturationLimit < 1 ? "saturate(" + curSet.backgroundImageSaturationLimit + ")" : "",
						doInvert ? "brightness(" + (1 - curSet.backgroundLightnessLimit) + ")" : "",
						doInvert ? "invert(1)" : ""
					].join(" ").trim();
					if(curSet.backgroundImageLightnessLimit < 1 || curSet.backgroundImageSaturationLimit < 1 || doInvert)
					{
						if(tag.tagName != "INPUT") roomRules.filter = { value: bgFilter };
						if(tag.firstChild || isPseudoContent || roomRules.backgroundColor.color)
						{
							if(!tag.isPseudo)
							{
								roomRules.attributes = roomRules.attributes || [];
								roomRules.attributes.push( { name: "transition", value: "filter" });
							}
							let imageKey = [tag.computedStyle.backgroundImage, tag.computedStyle.backgroundSize, doInvert].join("-");
							roomRules.backgroundImageKey = imageKey;
							let prevImage = images[imageKey];
							let prevPromise = imagePromises[imageKey];
							if(prevImage)
							{
								roomRules.backgroundImage = prevImage;
							}
							else if(prevPromise)
							{
								roomRules.backgroundImagePromise = prevPromise;
							}
							else
							{
								
								let url = trim(tag.computedStyle.backgroundImage.substr(3), "()'\"");
								let dataPromise = 
									fetch(url /*, { cache: "force-cache" }*/)
									.then(resp => resp.blob())
									.then(blob => new Promise((resolve, reject) =>
									{
										let rdr = new FileReader();
										rdr.mimeType = blob.type;
										rdr.onload = (e) => resolve({ dataUrl: e.target.result, mimeType: e.target.mimeType });
										rdr.readAsDataURL(blob);
									}))
									.then(imgData => new Promise((resolve, reject) =>
									{
										let img = new Image();
										img.mimeType = imgData.mimeType;
										img.onload = (e) => resolve({ data: e.target.src, width: e.target.naturalWidth, height: e.target.naturalHeight, mimeType: e.target.mimeType });
										img.src = imgData.dataUrl;
									}));

									imagePromises[imageKey] = roomRules.backgroundImagePromise = Promise
										.all([dataPromise, tag.computedStyle.backgroundSize, bgFilter])
										.then(x =>
										{
											let img = x[0], bgSize = x[1], fltr = x[2];
											let isSvgImg = img.mimeType == "image/svg+xml";
											let imgWidth = img.width + "px", imgHeight = img.height + "px";
											return {
												size: /^(auto,?\s?){1,2}$/i.test(bgSize) ? imgWidth + " " + imgHeight : null,
												url: "url(data:image/svg+xml," + encodeURIComponent
												(
													'<svg xmlns="http://www.w3.org/2000/svg"' +
															' viewBox="0 0 ' + img.width + ' ' + img.height + '"' +
															' filter="' + fltr + '">' +
														'<image width="' + imgWidth + '" height="' + imgHeight + '" href="' + img.data + '"/>' +
													'</svg>'
												).replace(/\(/g, "%28").replace(/\)/g, "%29") + ")"
											};
										});
							}
						}
					}
				}
				else if(/gradient/gi.test(tag.computedStyle.backgroundImage) && !/url/gi.test(tag.computedStyle.backgroundImage))
				{
					let mainColor, lightSum = 0;
					let newGradient = tag.computedStyle.backgroundImage;
					let uniqColors = [], colors = newGradient
								.replace(/(webkit|repeating|linear|radial|from|\bto\b|gradient|circle|ellipse|top|left|bottom|right|farthest|closest|side|corner|\d+%|\d+deg|\d+px)/gi,'')
								.match(/(rgba?\([^\)]+\)|#[a-z\d]+|[a-z]+)/gi)
					colors && colors.forEach(c => c !== "" && uniqColors.indexOf(c) === -1 && uniqColors.push(c));
					if(uniqColors.length > 0)
					{
						uniqColors.forEach(c =>
						{
							let prevColor = /rgb/gi.test(c) ? c : convertToRgbaString(doc, c);
							let newColor = calcColor(prevColor, curSet.backgroundGraySaturation, tag, curSet.backgroundLightnessLimit, curSet.backgroundSaturationLimit, curSet.backgroundGrayHue, curSet.backgroundContrast, true);
							lightSum += newColor.light;
							if(newColor.color)
							{
								newGradient = newGradient.replace(new RegExp(escapeRegex(c), "gi"), newColor.color);
							}
							if(!mainColor && newColor.alpha > 0.5)
							{
								mainColor = roomRules.backgroundColor = Object.assign({}, newColor);
							}
						});
						mainColor && (mainColor.light = lightSum / uniqColors.length);
						if(tag.computedStyle.backgroundImage != newGradient)
						{
							roomRules.backgroundImage = { url: newGradient };
						}
					}
				}
			}
			
			roomRules.bgLight = roomRules.backgroundColor.light;
			if (!isSvg || isSvgText)
			{
				roomRules.color = calcFrontColor(tag.computedStyle[nr.dom.fntColor], curSet.textGraySaturation, curSet.textContrast, roomRules.bgLight, curSet.textLightnessLimit, curSet.textSaturationLimit, tag, curSet.textGrayHue, "font");
				let originalTextContrast = Math.abs(roomRules.backgroundColor.originalLight - roomRules.color.originalLight);
				let currentTextContrast = Math.abs(roomRules.backgroundColor.light - roomRules.color.light);
				if(currentTextContrast != originalTextContrast && roomRules.color.originalLight != roomRules.color.light && tag.computedStyle.textShadow != "none")
				{
					let newTextShadow = tag.computedStyle.textShadow, newColor, prevColor, prevHslColor, shadowLightDiff, inheritedShadowColor;
					let uniqColors = [], colors = newTextShadow
								.replace(/(\d+px)/gi,'')
								.match(/(rgba?\([^\)]+\)|#[a-z\d]+|[a-z]+)/gi)
					colors && colors.forEach(c => c !== "" && uniqColors.indexOf(c) === -1 && uniqColors.push(c));
					if(uniqColors.length > 0)
					{
						uniqColors.forEach(c =>
						{
							prevColor = /rgb/gi.test(c) ? c : convertToRgbaString(doc, c);
							inheritedShadowColor = getInheritedTextShadowColor(tag, prevColor);
							inheritedShadowColor && (prevColor = inheritedShadowColor.from);
							prevHslColor = rgbToHsl(...Object.values(convertToRgbaColor(prevColor)));
							shadowLightDiff = Math.abs(prevHslColor.l - roomRules.color.originalLight) / originalTextContrast * currentTextContrast;
							newColor = calcFrontColor(prevColor, curSet.textGraySaturation, shadowLightDiff, roomRules.color.light, 1, curSet.textSaturationLimit, tag, curSet.textGrayHue, "text-shadow");
							if(newColor.color)
							{
								newTextShadow = newTextShadow.replace(new RegExp(escapeRegex(c), "gi"), newColor.color);
							}
						});
						if(newTextShadow != tag.computedStyle.textShadow)
						{
							roomRules.textShadow = { value: newTextShadow, color: newColor };
						}
					}
				}
			}

			if(isSvg || tag.computedStyle.borderStyle != "none")
			{
				brdColor = tag.computedStyle[nr.dom.brdColor];
				if (brdColor.indexOf(" r") == -1) {
					result = calcFrontColor(brdColor, curSet.borderGraySaturation, curSet.borderContrast, roomRules.bgLight, curSet.borderLightnessLimit, curSet.borderSaturationLimit, tag, curSet.borderGrayHue);
					roomRules[nr.dom.brdColor] = result.color ? result : null;
				}
				else if (!isSvg) {
					result = calcFrontColor(tag.computedStyle.borderTopColor, curSet.borderGraySaturation, curSet.borderContrast, roomRules.bgLight, curSet.borderLightnessLimit, curSet.borderSaturationLimit, tag, curSet.borderGrayHue);
					roomRules.borderTopColor = result.color ? result : null;
					result = calcFrontColor(tag.computedStyle.borderRightColor, curSet.borderGraySaturation, curSet.borderContrast, roomRules.bgLight, curSet.borderLightnessLimit, curSet.borderSaturationLimit, tag, curSet.borderGrayHue);
					roomRules.borderRightColor = result.color ? result : null;
					result = calcFrontColor(tag.computedStyle.borderBottomColor, curSet.borderGraySaturation, curSet.borderContrast, roomRules.bgLight, curSet.borderLightnessLimit, curSet.borderSaturationLimit, tag, curSet.borderGrayHue);
					roomRules.borderBottomColor = result.color ? result : null;
					result = calcFrontColor(tag.computedStyle.borderLeftColor, curSet.borderGraySaturation, curSet.borderContrast, roomRules.bgLight, curSet.borderLightnessLimit, curSet.borderSaturationLimit, tag, curSet.borderGrayHue);
					roomRules.borderLeftColor = result.color ? result : null;
				}
			}
		}

		applyRoomRules(tag, roomRules, nr);

		beforePseudoElement && procElement(beforePseudoElement);
		afterPseudoElement && procElement(afterPseudoElement);

		room && (doc.dorm[room] = roomRules);

		return [beforePseudoElement, afterPseudoElement].filter(x => x).map(x => x.stylePromise);
	}
}

function applyBackgroundImage(tag, img)
{
	if(tag.originalFilter != undefined) tag.style.filter = tag.originalFilter;
	tag.style.setProperty("background-image", img.url, "important")
	!tag.isPseudo && tag.removeAttribute("transition");
	if(img.size)
	{
		tag.style.setProperty("background-size", img.size, "important")
	}
	return tag;
}

function applyRoomRules(tag, roomRules, nr, isVirtual)
{
	var applyPromise;
	if(!isVirtual)
	{
		tag.cbBgColor = roomRules.backgroundColor;
		tag.cbColor = roomRules.color;
		tag.cbTextShadow = roomRules.textShadow;
	}

	if (roomRules.filter && roomRules.filter !== "")
	{
		tag.originalFilter = tag.style.filter;
		tag.style.setProperty("filter", roomRules.filter.value)
	}

	if (!tag.isPseudo && roomRules.attributes && roomRules.attributes.length > 0)
	{
		roomRules.attributes.forEach(attr => tag.setAttribute(attr.name, attr.value));
	}

	if(roomRules.backgroundImage)
	{
		tag.originalBackgroundImage = tag.style.backgroundImage;
		tag.originalBackgroundSize = tag.style.backgroundSize;
		applyBackgroundImage(tag, roomRules.backgroundImage);
	}
	else if(roomRules.backgroundImagePromise)
	{
		tag.originalBackgroundImage = tag.style.backgroundImage;
		tag.originalBackgroundSize = tag.style.backgroundSize;
		applyPromise = Promise
			.all([tag, roomRules.backgroundImagePromise, roomRules])
			.then(x =>
			{
				x[2].backgroundImage = x[1];
				!images[x[2].backgroundImageKey] && (images[x[2].backgroundImageKey] = x[1]);
				return applyBackgroundImage(x[0], x[1]);
			});
	}
	
	if(roomRules.textShadow && roomRules.textShadow.value)
	{
		tag.originalTextShadow = tag.style.textShadow;
		tag.style.setProperty(nr.css.shdColor, roomRules.textShadow.value, "important")
	}

	if(roomRules.display)
	{
		tag.originalDisplay = tag.style.display;
		tag.style.setProperty("display", roomRules.display, "important")
	}

	if (roomRules.backgroundColor && roomRules.backgroundColor.color)
	{
		tag.originalBackgroundColor = tag.style[nr.dom.bgrColor];
		tag.style.setProperty(nr.css.bgrColor, roomRules.backgroundColor.color, "important")
	}

	if (roomRules.color && roomRules.color.color) {
		tag.originalColor = tag.style[nr.dom.fntColor];
		tag.style.setProperty(nr.css.fntColor, roomRules.color.color, "important")
	}
	else if (roomRules.color && tag.style[nr.dom.fntColor] !== "" && roomRules.color.reason == "inherited") {
		tag.originalColor = "";
	}

	if (roomRules[nr.dom.brdColor]) {
		tag.originalBorderColor = tag.style[nr.dom.brdColor];
		tag.style.setProperty(nr.css.brdColor, roomRules[nr.dom.brdColor].color, "important")
	}
	else {
		if (roomRules.borderTopColor) {
			tag.originalBorderTopColor = tag.style.borderTopColor;
			tag.style.setProperty("border-top-color", roomRules.borderTopColor.color, "important")
		}

		if (roomRules.borderRightColor) {
			tag.originalBorderRightColor = tag.style.borderRightColor;
			tag.style.setProperty("border-right-color", roomRules.borderRightColor.color, "important")
		}

		if (roomRules.borderBottomColor) {
			tag.originalBorderBottomColor = tag.style.borderBottomColor;
			tag.style.setProperty("border-bottom-color", roomRules.borderBottomColor.color, "important")
		}

		if (roomRules.borderLeftColor) {
			tag.originalBorderLeftColor = tag.style.borderLeftColor;
			tag.style.setProperty("border-left-color", roomRules.borderLeftColor.color, "important")
		}
	}

	if(tag.isPseudo)
	{
		if(applyPromise)
		{
			applyPromise.then(x => x.applyStyle(x));
			Promise.all([tag, applyPromise.catch(ex => ex)]).then(x => x[0].applyStyle(x[0]));
		}
		else
		{
			tag.applyStyle(tag);
		}
	}

	if(tag.onRoomRulesApplied)
	{
		tag.onRoomRulesApplied(tag, roomRules, nr);
	}
}

function calcElementPath(tag) {
	var parentPath = "";
	if (tag.parentElement) {
		parentPath = tag.parentElement.path ? tag.parentElement.path : calcElementPath(tag.parentElement);
	}
	tag.path = parentPath + " " + tag.tagName + "." + (tag.className.baseVal || tag.className) + "#" + tag.id + tag.style.backgroundColor + (tag.bgColor || "");
	return tag.path;
}

function onIframeLoaded() {
	try {
		var childDoc = (this.contentDocument || this.contentWindow.document);
		childDoc.addEventListener("DOMContentLoaded", onIframeDocumentLaoded);
		setTimeout(() => onIframeDocumentLaoded.call(childDoc), 1);
	}
	catch (ex) { /*debug && console.log(ex);*/ }
}

function onIframeDocumentLaoded() {
	if (this.readyState != "loading" && this.readyState != "uninitialized" && this.body && !this.body.cbBgColor)
	{
		this.body.style.setProperty("color", "rgb(5,5,5)", "important");
		createScrollbarStyle(this);
		procDocument(this);
	}
}

function overrideInnerHtml(tag) {
	if (!tag.innerHtmlOverriden) {
		tag.innerHtmlGetter = tag.__lookupGetter__('innerHTML');
		tag.innerHtmlSetter = tag.__lookupSetter__('innerHTML');
		Object.defineProperty(
			tag, "innerHTML",
			{
				get: function () {
					if (!this.innerHtmlCache || Date.now() - this.innerHtmlCache.time > 5000) {
						restoreAllColors(this.ownerDocument);
						var innerHtml = this.innerHtmlGetter();
						this.innerHtmlCache = { time: Date.now(), value: innerHtml };
						setTimeout(function () { procDocument(this.ownerDocument); }, 1);
					}
					return this.innerHtmlCache.value;
				},
				set: function (val) {
					this.innerHtmlSetter(val);
				}
			});
		tag.innerHtmlOverriden = true;
	}
}

function restoreAllColors(doc)
{
	var scrollbarStyle = doc.getElementById("cbScrollbarStyle");
	scrollbarStyle && doc.documentElement.removeChild(scrollbarStyle);
	var pseudoStyle = doc.getElementById("cbPseudoStyles");
	pseudoStyle && (pseudoStyle.innerText = "");

	var tags = doc.getElementsByTagName("*");
	for (el = tags.length; el--;)
	{
		restoreElementColors(tags[el]);
	}
}

function restoreElementColors(tag)
{
	var nr = tag instanceof SVGElement ? nameResources.svg : nameResources.htm;

	tag.cbBgColor = null;
	tag.cbColor = null;
	tag.cbTextShadow = null;
	tag.cbParentBgColor = null;
	tag.computedStyle = null;
	tag.rect = null;
	tag.selectors = null;

	if (tag.originalBackgroundColor !== undefined) {
		tag.style[nr.dom.bgrColor] = tag.originalBackgroundColor;
	}
	if (tag.originalDisplay !== undefined) {
		tag.style.display = tag.originalDisplay;
	}
	if(tag.originalZIndex !== undefined)
	{
		tag.style.zIndex = tag.originalZIndex;
	}
	if (tag.originalColor !== undefined) {
		tag.style[nr.dom.fntColor] = tag.originalColor;
	}
	if (tag.originalTextShadow !== undefined) {
		tag.style.textShadow = tag.originalTextShadow;
	}
	if (tag.originalBorderColor !== undefined) {
		tag.style[nr.dom.brdColor] = tag.originalBorderColor;
	}
	if (tag.originalBorderTopColor !== undefined) {
		tag.style.borderTopColor = tag.originalBorderTopColor;
	}
	if (tag.originalBorderRightColor !== undefined) {
		tag.style.borderRightColor = tag.originalBorderRightColor;
	}
	if (tag.originalBorderBottomColor !== undefined) {
		tag.style.borderBottomColor = tag.originalBorderBottomColor;
	}
	if (tag.originalBorderLeftColor !== undefined) {
		tag.style.borderLeftColor = tag.originalBorderLeftColor;
	}
	if (tag.originalOpacity !== undefined) {
		tag.style.opacity = tag.originalOpacity;
	}
	if (tag.originalBackgroundImage !== undefined)
	{
		tag.style.backgroundImage = tag.originalBackgroundImage;
		if (tag.originalBackgroundSize !== undefined)
		{
			tag.style.backgroundSize = tag.originalBackgroundSize;
		}
	}
	if(tag.originalFilter !== undefined)
	{
		tag.style.filter = tag.originalFilter;
	}
	if(tag.hasAttribute("transition"))
	{
		tag.removeAttribute("transition")
	}
	if(tag.hasAttribute("before-style"))
	{
		tag.removeAttribute("before-style")
	}
	if(tag.hasAttribute("after-style"))
	{
		tag.removeAttribute("after-style")
	}
}

function checkElement(tag) {
	tag.is =
	{
		checked:
		(tag instanceof Element || tag.ownerDocument && tag.ownerDocument.defaultView && tag instanceof tag.ownerDocument.defaultView.HTMLElement) &&
		!tag.cbBgColor && tag.tagName && !tag.cbIgnore && tag.style
	};
	return tag.is && tag.is.checked;
}

// ------------------------------------- CALCULATIONS ------------------------------------- //

function calcFrontColor(rgbStr, sDiff, lDiff, bgLight, lMax, sMax, tag, gHue, frontType)
{
	let set = [sDiff, lDiff, bgLight, lMax].join("-");
	let prevColor = frontColors[rgbStr];
	let inheritedColor;
	switch(frontType) {
		case "font": inheritedColor = getInheritedFontColor(tag, rgbStr); break;
		case "text-shadow": inheritedColor = getInheritedTextShadowColor(tag, rgbStr); break
	}

	if (inheritedColor && inheritedColor.set == set)
	{
		let newColor = Object.assign({}, inheritedColor);
		return Object.assign(newColor, { color: null, reason: "inherited", owner: debug?tag:null, base: inheritedColor, from: rgbStr });
	}
	else if (inheritedColor && inheritedColor.set != set)
	{
		rgbStr = inheritedColor.from;
	}

	if (prevColor && prevColor[set] !== undefined)
	{
		let newColor = Object.assign({}, prevColor[set]);
		return Object.assign(newColor, { reason: "prevColor", owner: debug?tag:null, base: prevColor[set], from: rgbStr });
	}
	else
	{
		let rgbColor = convertToRgbaColor(rgbStr);
		if (rgbColor.alpha === 0)
		{
			return saveFrontColor(null, rgbStr, set, 0, 0, "transparent", tag);
		}
		else
		{
			let hslColor = rgbToHsl(rgbColor.red, rgbColor.green, rgbColor.blue);
			let originalLight = hslColor.l;
			changeFrontHslColor(hslColor, sDiff, lDiff / rgbColor.alpha, bgLight, lMax, sMax, gHue);
			let newRgbColor = hslToRgb(hslColor.h, hslColor.s, hslColor.l);
			newRgbColor.alpha = rgbColor.alpha;
			return saveFrontColor(newRgbColor, rgbStr, set, hslColor.l, originalLight, rgbStr + ".ok", tag);
		}
	}
}

function calcColor(rgbStr, sDiff, tag, lMax, sMax, gHue, bgCtr, isGradientStop) {
	var set = [lMax].join("-");
	var prevColor = colors[rgbStr], rgbColor;
	if (!isGradientStop && prevColor && prevColor[set])
	{
		let newColor = Object.assign({}, prevColor[set]);
		return Object.assign(newColor, { reason: "prevColor", owner: debug?tag:null, base: prevColor[set] });
	}
	else
	{
		rgbColor = convertToRgbaColor(rgbStr);

		if (tag.tagName == "BODY" && rgbColor.alpha === 0)
		{
			rgbStr = "bodyTrans";
			rgbColor = { red: 255, green: 255, blue: 255, alpha: 1 };
		}

		if (rgbColor.alpha === 0)
		{
			var parentBgColor = getParentBackground(tag);
			let newColor = Object.assign({}, parentBgColor);
			return Object.assign(newColor, { color: null, reason: "parent", owner: debug?tag:null, base: parentBgColor });
		}
		else
		{
			let hslColor = rgbToHsl(rgbColor.red, rgbColor.green, rgbColor.blue);
			let originalLight = hslColor.l;
			changeHslColor(hslColor, sDiff, lMax, sMax, gHue, bgCtr, isGradientStop);
			let newRgbColor = hslToRgb(hslColor.h, hslColor.s, hslColor.l);
			newRgbColor.alpha = rgbColor.alpha;
			return saveColor(newRgbColor, rgbStr, set, hslColor.l, originalLight, rgbStr + ".ok", tag);
		}
	}
}

function calcScrollbarThumbColor(light) {
	let hslColor = { h: 0, s: 0, l: light };
	changeFrontHslColor(hslColor, curSet.scrollbarSaturationLimit, curSet.scrollbarContrast, curSet.backgroundLightnessLimit, 1, curSet.scrollbarSaturationLimit, curSet.scrollbarGrayHue);
	let rgbColor = hslToRgb(hslColor.h, hslColor.s, hslColor.l);
	rgbColor.alpha = 1;
	return convertToRgbString(rgbColor);
}

function calcMainBorderColor(light) {
	let hslColor = { h: 0, s: 0, l: light };
	changeFrontHslColor(hslColor, curSet.borderGraySaturation, curSet.borderContrast, curSet.backgroundLightnessLimit, curSet.borderLightnessLimit, curSet.borderSaturationLimit, curSet.borderGrayHue);
	let rgbColor = hslToRgb(hslColor.h, hslColor.s, hslColor.l);
	rgbColor.alpha = 1;
	return convertToRgbString(rgbColor);
}

function calcMainFontColor(light) {
	let hslColor = { h: 0, s: 0, l: light };
	changeFrontHslColor(hslColor, curSet.textGraySaturation, curSet.textContrast, curSet.backgroundLightnessLimit, curSet.textLightnessLimit, curSet.textSaturationLimit, curSet.textGrayHue);
	let rgbColor = hslToRgb(hslColor.h, hslColor.s, hslColor.l);
	rgbColor.alpha = 1;
	return convertToRgbString(rgbColor);
}

function calcMainBackgroundColor(light) {
	let hslColor = { h: 0, s: 0, l: light };
	changeHslColor(hslColor, curSet.backgroundGraySaturation, curSet.backgroundLightnessLimit, curSet.backgroundSaturationLimit, curSet.backgroundGrayHue, curSet.backgroundContrast, false);
	let rgbColor = hslToRgb(hslColor.h, hslColor.s, hslColor.l);
	rgbColor.alpha = 1;
	return convertToRgbString(rgbColor);
}

function saveFrontColor(rgbColor, rgbStr, set, light, originalLight, reason, tag, base) {
	let prevColor = rgbColor ? convertToRgbString(rgbColor) : null;
	frontColors[rgbStr] = frontColors[rgbStr] || {};
	frontColors[rgbStr][set] = { color: prevColor, light: light, originalLight: originalLight, reason: reason, owner: debug?tag:null, base: base, set: set, from: rgbStr };

	return frontColors[rgbStr][set];
}

function saveColor(rgbColor, rgbStr, set, bgLight, originalLight, reason, tag, base) {
	let prevColor = rgbColor ? convertToRgbString(rgbColor) : null;
	colors[rgbStr] = colors[rgbStr] || {};
	colors[rgbStr][set] = { color: prevColor, light: bgLight, originalLight: originalLight, alpha: rgbColor.alpha, reason: reason, owner: debug?tag:null, base: base };

	return colors[rgbStr][set];
}

function changeFrontHslColor(hslColorObject, sDiff, lDiffMin, bgLight, lMax, sMax, gHue)
{
	if(hslColorObject.s === 0 && gHue !== 0)
	{
		hslColorObject.h = gHue;
		hslColorObject.s = sDiff;
	}
	else
	{
		hslColorObject.s = scaleValue(hslColorObject.s, sMax);
	}
	hslColorObject.l = scaleValue(hslColorObject.l, lMax);
	let lDiffCur = hslColorObject.l - bgLight,
		down = Math.max(bgLight - Math.min(Math.max(bgLight - lDiffMin, 0), lMax), 0),
		up = Math.max(Math.min(bgLight + lDiffMin, lMax) - bgLight, 0);
	if (lDiffCur < 0) // background is lighter
	{
		if (down >= up)
		{
			hslColorObject.l = Math.max(bgLight + Math.min(lDiffCur, -lDiffMin), 0);
		}
		else // invert
		{
			hslColorObject.l = Math.min(bgLight + lDiffMin, lMax);
		}
	}
	else // background is darker
	{
		if (up >= down)
		{
			hslColorObject.l = Math.min(bgLight + Math.max(lDiffCur, lDiffMin), lMax);
		}
		else // invert
		{
			hslColorObject.l = Math.max(bgLight - lDiffMin, 0);
		}
	}
}

function changeHslColor(hslColorObject, gSat, lMax, sMax, gHue, bgCtr, isGradientStop)
{
	if(hslColorObject.s === 0 && gHue !== 0)
	{
		hslColorObject.h = gHue;
		hslColorObject.s = gSat;
	}
	else
	{
		hslColorObject.s = scaleValue(hslColorObject.s, sMax);
	}
	const minLightDiff = bgCtr * Math.atan(-lMax * Math.PI/2) + bgCtr/0.9;
	let light = hslColorObject.l;
	if(!isGradientStop)
	{
		let oldLight = lights && lights.get(light);
		if(oldLight)
		{
			light = oldLight.light;
		}
		else
		{
			if(lights && lights.size > 0 && minLightDiff > 0)
			{
				let prevLight = -1, nextLight = +2;
				for (let [originalLight, other] of lights)
				{
					if(other.light < light && other.light > prevLight)
					{
						prevLight = other.light;
					}
					if(other.light > light && other.light < nextLight)
					{
						nextLight = other.light;
					}
				}
				if (nextLight - prevLight < minLightDiff*2) light = (prevLight + nextLight) / 2;
				else if(light - prevLight < minLightDiff) 	light =  prevLight + minLightDiff;
				else if(nextLight - light < minLightDiff) 	light =  nextLight - minLightDiff;
				light = Math.max(Math.min(light, 1), 0);
			}
			lights && lights.set(hslColorObject.l, { light: light });
		}
	}
	hslColorObject.l = scaleValue(light, lMax);
}

function scaleValue(currentValue, scaleLimit)
{
	return Math.min(Math.min(currentValue, scaleLimit * Math.atan(currentValue * Math.PI/2)), scaleLimit);
}

function getElementIndex(tag)
{
	let i = 0;
    while(tag = tag.previousElementSibling) i++;
	return i;
}

function getInheritedTextShadowColor(tag, rgbStr)
{
	if (tag.parentElement)
	{
		if(tag.parentElement.style.textShadow !== "none")
		{
			if(tag.parentElement.cbTextShadow && tag.parentElement.cbTextShadow.color.color == rgbStr)
			{
				return tag.parentElement.cbTextShadow.color;
			}
		}
		else
		{
			return getInheritedTextShadowColor(tag.parentElement, rgbStr)
		}
	}
	else
	{
		return null;
	}
}

function getInheritedFontColor(tag, rgbStr)
{
	if (tag.parentElement)
	{
		if(tag.parentElement.style.color !== "")
		{
			if(tag.parentElement.cbColor && tag.parentElement.cbColor.color == rgbStr)
			{
				return tag.parentElement.cbColor;
			}
		}
		else
		{
			return getInheritedFontColor(tag.parentElement, rgbStr)
		}
	}
	else
	{
		return null;
	}
}

function getParentBackground(tag, probeRect) {
	var result = { color: "rgb(0,0,0)", light: 1, reason: "not found" };
	if (tag.parentElement)
	{
		var childNodes, bgColor;
		var doc = tag.ownerDocument;
		var isSvg = tag instanceof SVGElement && tag.parentElement instanceof SVGElement;
		tag.computedStyle = tag.computedStyle || doc.defaultView.getComputedStyle(tag, "");

		if ((tag.computedStyle.position == "absolute" || tag.computedStyle.position == "relative" || isSvg) && !tag.isPseudo)
		{
			probeRect = probeRect ? probeRect : (tag.rect = tag.rect || tag.getBoundingClientRect());
			if (probeRect.width !== 0)
			{
				tag.zIndex = isSvg ? getElementIndex(tag) : tag.computedStyle.zIndex;
				childNodes = Array.prototype.slice.call(tag.parentElement.childNodes).filter(
					function (otherTag, index) {
						if (otherTag != tag && (otherTag.is && otherTag.is.checked || checkElement(otherTag))) {
							otherTag.rect = otherTag.rect || otherTag.getBoundingClientRect();
							otherTag.zIndex = otherTag.zIndex || isSvg ? -index :
								(otherTag.computedStyle = otherTag.computedStyle ? otherTag.computedStyle : doc.defaultView.getComputedStyle(otherTag, "")).zIndex;
							otherTag.zIndex = otherTag.zIndex == "auto" ? -999 : otherTag.zIndex;
							if (otherTag.cbBgColor && otherTag.cbBgColor.color &&
								otherTag.zIndex < tag.zIndex &&
								otherTag.rect.left <= probeRect.left &&
								otherTag.rect.top <= probeRect.top &&
								otherTag.rect.right >= probeRect.right &&
								otherTag.rect.bottom >= probeRect.bottom)
								return true;
						}
						return false;
					});
				if (childNodes.length > 0) {
					childNodes = childNodes.sort(
						function (e1, e2) {
							return e2.zIndex - e1.zIndex;
						});
					bgColor = childNodes[0].cbBgColor;
				}
			}
		}
		bgColor = bgColor ? bgColor : (tag.parentElement.cbBgColor || tag.parentElement.cbParentBgColor);
		if (bgColor)
		{
			result = bgColor;
		}
		else
		{
			probeRect = probeRect ? probeRect : (tag.rect = tag.rect || tag.getBoundingClientRect());
			result = getParentBackground(tag.parentElement, probeRect);
		}
	}
	tag.cbParentBgColor = result;
	return result;
}

function convertToRgbaColor(rgbString) {
	var hasAlfa = rgbString[3] == "a";
	rgbString = rgbString.substr(hasAlfa ? 5 : 4, rgbString.length - 1);
	var colorArr = rgbString.split(",");
	var rgbaColor =
		{
			red: parseInt(colorArr[0]),
			green: parseInt(colorArr[1]),
			blue: parseInt(colorArr[2])
		};
	rgbaColor.alpha = hasAlfa ? parseFloat(colorArr[3]) : 1.0;
	return rgbaColor;
}

function convertToRgbString(rgbColorObject) {
	if (rgbColorObject.alpha == 1) {
		return "rgb(" + Math.round(rgbColorObject.red) + ", " + Math.round(rgbColorObject.green) + ", " + Math.round(rgbColorObject.blue) + ")";
	}
	return "rgba(" + Math.round(rgbColorObject.red) + ", " + Math.round(rgbColorObject.green) + ", " + Math.round(rgbColorObject.blue) + ", " + rgbColorObject.alpha + ")";
}

/**переводит цвет в RGBA через создание реального елемента*/
function convertToRgbaString(doc, colorString)
{
	var div = doc.createElement("div");
	div.style.display = "none";
	div.style.color = colorString;
	div.cbIgnore = true;
	doc.body.appendChild(div);
	var rgbStr = doc.defaultView.getComputedStyle(div, "").color;
	doc.body.removeChild(div)
	return rgbStr;
}

function convertToHslString(hslColorObject) {
	return "hsl(" + hslColorObject.h + ", " + hslColorObject.s + ", " + hslColorObject.l + ")";
}

function rgbToHsl(r, g, b)
{
	let min, max, i, l, s, maxcolor, h, rgb = [];
	rgb[0] = r / 255;
	rgb[1] = g / 255;
	rgb[2] = b / 255;
	min = rgb[0];
	max = rgb[0];
	maxcolor = 0;
	for (i = 0; i < rgb.length - 1; i++) {
		if (rgb[i + 1] <= min) { min = rgb[i + 1]; }
		if (rgb[i + 1] >= max) { max = rgb[i + 1]; maxcolor = i + 1; }
	}
	if (maxcolor === 0) {
		h = (rgb[1] - rgb[2]) / (max - min);
	}
	if (maxcolor == 1) {
		h = 2 + (rgb[2] - rgb[0]) / (max - min);
	}
	if (maxcolor == 2) {
		h = 4 + (rgb[0] - rgb[1]) / (max - min);
	}
	if (isNaN(h)) { h = 0; }
	h = h * 60;
	if (h < 0) { h = h + 360; }
	l = (min + max) / 2;
	if (min == max) {
		s = 0;
	} else {
		if (l < 0.5) {
			s = (max - min) / (max + min);
		} else {
			s = (max - min) / (2 - max - min);
		}
	}
	s = s;
	return { h: h, s: s, l: l };
}

function hslToRgb(hue, sat, light) {
	var t1, t2, r, g, b;
	hue = hue / 60;
	if (light <= 0.5) {
		t2 = light * (sat + 1);
	} else {
		t2 = light + sat - (light * sat);
	}
	t1 = light * 2 - t2;
	r = hueToRgb(t1, t2, hue + 2) * 255;
	g = hueToRgb(t1, t2, hue) * 255;
	b = hueToRgb(t1, t2, hue - 2) * 255;
	return { red: r, green: g, blue: b };
}

function hueToRgb(t1, t2, hue) {
	if (hue < 0) hue += 6;
	if (hue >= 6) hue -= 6;
	if (hue < 1) return (t2 - t1) * hue + t1;
	else if (hue < 3) return t2;
	else if (hue < 4) return (t2 - t1) * (4 - hue) + t1;
	else return t1;
}

// ------------------------------------- INTERFACE ------------------------------------- //

function initChromeMessagePassing() {
	if(self == top)
	{
		chrome.runtime.onMessage.addListener(
			(request, sender, sendResponse) =>
			{
				if (!sender.tab)
				{
					switch (request.action)
					{
						case "getCurrentSettings":
							var settings = Object.assign({}, currentSettings);
							settings.hostname = window.location.hostname;
							sendResponse(settings);
							break;

						case "applyNewSettings":
							applyNewSettingsFormExt(request.settings);
							sendResponse(currentSettings);
							break;

						case "forgetSettings":
							delSettings();
							break;

						default:
							break;
					}
				}
			});
	}
}

function applyNewSettingsFormExt(newSettings)
{
	Object.assign(currentSettings, newSettings);
	saveSettings(currentSettings);
	delSettings("default");
	initCurSet();
	restoreAllColors(document);
	if(curSet.runOnThisSite && curSet.isEnabled)
	{
		createScrollbarStyle(document);
		procDocument(document);
	}
}

function removeLoadingShadow(parentElement) {
	parentElement.setAttribute("transition", "filter");
	parentElement.style.filter = parentElement.originalFilter;
}

function createPseudoStyles(doc)
{
	if(!doc.cbPseudoStyles)
	{
		doc.cbPseudoStyles = doc.createElement('style');
		doc.cbPseudoStyles.id = "cbPseudoStyles";
		doc.head.appendChild(doc.cbPseudoStyles);
	}
}

function createLoadingShadow(parentElement)
{
	if(parentElement.tagName != "IMG")
	{
		parentElement.computedStyle = parentElement.computedStyle 
			? parentElement.computedStyle 
			: parentElement.ownerDocument.defaultView.getComputedStyle(parentElement, "");
		let filter = [
			curSet.backgroundLightnessLimit < 1 ? "brightness(" + curSet.backgroundLightnessLimit + ")" : "",
			parentElement.computedStyle.filter != "none" ? parentElement.computedStyle.filter : ""
		].join(" ");
		parentElement.originalFilter = parentElement.style.filter;
		parentElement.style.setProperty("filter", filter);
	}
	return parentElement;
}

function createScrollbarStyle(doc) {
	var sheet = /*doc.getElementById("cbScrollbarStyle") ||*/ doc.createElement('style');
	sheet.id = "cbScrollbarStyle";
	sheet.innerHTML = "";

	var thumbHoverColor = calcScrollbarThumbColor(curSet.scrollbarLightnessLimit);
	var thumbNormalColor = calcScrollbarThumbColor(curSet.scrollbarLightnessLimit * 0.75);
	var thumbActiveColor = calcScrollbarThumbColor(curSet.scrollbarLightnessLimit * 0.5);
	var trackColor = calcMainBackgroundColor(1);

	sheet.innerHTML += ":not(important)::-webkit-scrollbar {" +
		"width: 12px!important; height: 12px!important; background: " + thumbNormalColor + "!important;" +
		"}";

	sheet.innerHTML += ":not(important)::-webkit-scrollbar-button {" +
		"background: " + thumbNormalColor + "!important; width:5px!important; height:5px!important;" +
		"}";

	sheet.innerHTML += ":not(important)::-webkit-scrollbar-button:hover {" +
		"background: " + thumbHoverColor + "!important;" +
		"}";

	sheet.innerHTML += ":not(important)::-webkit-scrollbar-button:active {" +
		"background: " + thumbActiveColor + "!important;" +
		"}";

	sheet.innerHTML += ":not(important)::-webkit-scrollbar-thumb {" +
		"background: " + thumbNormalColor + "!important; border-radius: 6px!important;" +
		"box-shadow: inset 0 0 8px rgba(0,0,0,0.5)!important;" +
		"border: none!important;" +
		"}";

	sheet.innerHTML += ":not(important)::-webkit-scrollbar-thumb:hover {" +
		"background: " + thumbHoverColor + "!important;" +
		"}";

	sheet.innerHTML += ":not(important)::-webkit-scrollbar-thumb:active {" +
		"background: " + thumbActiveColor + "!important; box-shadow: inset 0 0 8px rgba(0,0,0,0.3)!important;;" +
		"}";

	sheet.innerHTML += ":not(important)::-webkit-scrollbar-track {" +
		"background: " + trackColor + "!important; box-shadow: inset 0 0 6px rgba(0,0,0,0.3)!important;" +
		"border-radius: 6px!important; border: none!important;" +
		"}";

	sheet.innerHTML += ":not(important)::-webkit-scrollbar-track-piece {" +
		"background: transparent!important; border: none!important; box-shadow: none!important;" +
		"}";

	sheet.innerHTML += ":not(important)::-webkit-scrollbar-corner {" +
		"background: " + thumbNormalColor + "!important;" +
		"}";

	//if (!sheet.parentNode) {
		doc.documentElement.appendChild(sheet);
	//}
}

function removeLoadingStyles(doc)
{
	var style = doc.getElementById("cbLoadingStyle");
	style && style.parentElement && style.parentElement.removeChild(style);
	setTimeout(() => 
	{
		var noTrans = doc.getElementById("cbNoTransStyle");
		noTrans && noTrans.parentElement && noTrans.parentElement.removeChild(noTrans);
	}, 1);
}

function createLoadingStyles(doc) {
	var noTrans = doc.createElement('style');
	noTrans.id = "cbNoTransStyle";
	noTrans.innerHTML = ":not([transition]) { transition: background-color 0s,color 0s,border-color 0s,opacity 0s !important; }";

	var style = doc.createElement('style');
	style.id = "cbLoadingStyle";
	style.innerHTML = "";
	var bgColor = calcMainBackgroundColor(1);
	var fntColor = calcMainFontColor(1);
	var brdColor = calcMainBorderColor(1);

	style.innerHTML += "img[src], input[type=image], IFRAME {" +
		"filter: brightness(" + curSet.imageLightnessLimit + ") saturate(" + curSet.imageSaturationLimit + ") !important;" +
		"}";

	style.innerHTML += "* {" +
		"background-image: none !important;" +
		"background-color: " + bgColor + " !important;" +
		"color: " + fntColor + "!important;" +
		"border-color: " + brdColor + " !important;" +
		"}";

	doc.documentElement.appendChild(noTrans);
	doc.documentElement.appendChild(style);
}