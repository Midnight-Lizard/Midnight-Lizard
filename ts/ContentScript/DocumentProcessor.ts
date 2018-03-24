/// <reference path="../DI/-DI.ts" />
/// <reference path="../Settings/-Settings.ts" />
/// <reference path="../Colors/-Colors.ts" />
/// <reference path="../Utils/-Utils.ts" />
/// <reference path="../Events/-Events.ts" />
/// <reference path="DocumentObserver.ts" />
/// <reference path="StyleSheetProcessor.ts" />
/// <reference path="SettingsManager.ts" />
/// <reference path="../Colors/BackgroundColorProcessor.ts" />
/// <reference path="../Colors/ForegroundColorProcessor.ts" />
/// <reference path="../Colors/ColorToRgbaStringConverter.ts" />

namespace MidnightLizard.ContentScript
{
    const chunkLength = 300;
    const dom = Events.HtmlEvent;
    const cx = Colors.RgbaColor;
    const cc = Colors.Component;
    const po = ProcessingOrder;
    const Status = Util.PromiseStatus;
    type PromiseResult<T> = Util.HandledPromiseResult<T>;
    type ArgEvent<TArgs> = MidnightLizard.Events.ArgumentedEvent<TArgs>;
    const ArgEventDispatcher = MidnightLizard.Events.ArgumentedEventDispatcher;
    const doNotInvertRegExp = /user|account|photo|importan|grey|gray|flag/gi;
    const maxAttrLen = 100;
    /** 2 fraction digits number format */
    const float = new Intl.NumberFormat('en-US', {
        useGrouping: false,
        maximumFractionDigits: 2
    });

    export abstract class IDocumentProcessor
    {
        abstract get onRootDocumentProcessing(): ArgEvent<Document>;
        abstract applyRoomRules(tag: HTMLElement | PseudoElement, roomRules: RoomRules, ns: any): void;
    }

    /** Base Document Processor */
    @DI.injectable(IDocumentProcessor)
    class DocumentProcessor implements IDocumentProcessor
    {
        protected _rootDocumentLoaded: boolean = false;
        protected readonly _standardPseudoCssTexts = new Map<PseudoStyleStandard, string>();
        protected readonly _images = new Map<string, BackgroundImage>();
        protected readonly _imagePromises = new Map<string, Promise<BackgroundImage>>();
        protected readonly _anchors = new WeakMap<Document, HTMLAnchorElement>();
        protected readonly _dorm = new WeakMap<Document, Map<string, RoomRules>>();
        protected readonly _boundUserActionHandler: (e: Event) => void;
        protected readonly _boundCheckedLabelHandler: (e: Event) => void;
        protected readonly _boundUserHoverHandler: (e: Event) => void;
        protected readonly _css: MidnightLizard.ContentScript.CssStyleKeys;
        protected readonly _transitionForbiddenProperties: Set<string>;
        protected readonly _boundParentBackgroundGetter: any;

        protected get shift() { return this._settingsManager.shift }

        protected _onRootDocumentProcessing = new ArgEventDispatcher<Document>();
        public get onRootDocumentProcessing()
        {
            return this._onRootDocumentProcessing.event;
        }

        /** DocumentProcessor constructor
         * @param _app - Application settings
         * @param _rootDocument - Root Document to be processed
         * @param _settingsManager - Settings manager
         */
        constructor(css: MidnightLizard.ContentScript.CssStyle,
            protected readonly _rootDocument: Document,
            protected readonly _app: MidnightLizard.Settings.IApplicationSettings,
            protected readonly _settingsManager: MidnightLizard.Settings.IBaseSettingsManager,
            protected readonly _documentObserver: MidnightLizard.ContentScript.IDocumentObserver,
            protected readonly _styleSheetProcessor: MidnightLizard.ContentScript.IStyleSheetProcessor,
            protected readonly _backgroundColorProcessor: MidnightLizard.Colors.IBackgroundColorProcessor,
            protected readonly _buttonBackgroundColorProcessor: MidnightLizard.Colors.IButtonBackgroundColorProcessor,
            protected readonly _svgColorProcessor: MidnightLizard.Colors.ISvgBackgroundColorProcessor,
            protected readonly _scrollbarHoverColorProcessor: MidnightLizard.Colors.IScrollbarHoverColorProcessor,
            protected readonly _scrollbarNormalColorProcessor: MidnightLizard.Colors.IScrollbarNormalColorProcessor,
            protected readonly _scrollbarActiveColorProcessor: MidnightLizard.Colors.IScrollbarActiveColorProcessor,
            protected readonly _textColorProcessor: MidnightLizard.Colors.ITextColorProcessor,
            protected readonly _textSelectionColorProcessor: MidnightLizard.Colors.ITextSelectionColorProcessor,
            protected readonly _highlightedTextColorProcessor: MidnightLizard.Colors.IHighlightedTextColorProcessor,
            protected readonly _linkColorProcessor: MidnightLizard.Colors.ILinkColorProcessor,
            protected readonly _visitedLinkColorProcessor: MidnightLizard.Colors.IVisitedLinkColorProcessor,
            protected readonly _textShadowColorProcessor: MidnightLizard.Colors.ITextShadowColorProcessor,
            protected readonly _borderColorProcessor: MidnightLizard.Colors.IBorderColorProcessor,
            protected readonly _buttonBorderColorProcessor: MidnightLizard.Colors.IButtonBorderColorProcessor,
            protected readonly _colorConverter: MidnightLizard.Colors.IColorToRgbaStringConverter,
            protected readonly _zoomObserver: MidnightLizard.ContentScript.IDocumentZoomObserver)
        {
            _rootDocument.documentElement.setAttribute("preload", "");
            this._css = css as any;
            this._transitionForbiddenProperties = new Set<string>(
                [
                    this._css.all,
                    this._css.background,
                    this._css.backgroundColor,
                    this._css.backgroundImage,
                    this._css.color,
                    this._css.border,
                    this._css.borderBottom,
                    this._css.borderBottomColor,
                    this._css.borderColor,
                    this._css.borderLeft,
                    this._css.borderLeftColor,
                    this._css.borderRight,
                    this._css.borderRightColor,
                    this._css.borderTop,
                    this._css.borderTopColor,
                    this._css.textShadow,
                    this._css.filter
                ]);
            this._boundUserActionHandler = this.onUserAction.bind(this);
            this._boundCheckedLabelHandler = this.onLabelChecked.bind(this);
            this._boundUserHoverHandler = this.onUserHover.bind(this);
            dom.addEventListener(this._rootDocument, "DOMContentLoaded", this.onDocumentContentLoaded, this);
            _settingsManager.onSettingsInitialized.addListener(this.onSettingsInitialized, this);
            _settingsManager.onSettingsChanged.addListener(this.onSettingsChanged, this, Events.EventHandlerPriority.Low);
            _documentObserver.onElementsAdded.addListener(this.onElementsAdded as any, this);
            _documentObserver.onClassChanged.addListener(this.onClassChanged as any, this);
            _documentObserver.onStyleChanged.addListener(this.onStyleChanged as any, this);
            this._boundParentBackgroundGetter = this.getParentBackground.bind(this);
        }

        protected createStandardPseudoCssTexts()
        {
            const
                invertedBackgroundImageFilter = [
                    this.shift.BackgroundImage.saturationLimit < 1 ? `saturate(${this.shift.BackgroundImage.saturationLimit})` : "",
                    `brightness(${float.format(1 - this.shift.Background.lightnessLimit)}) hue-rotate(180deg) invert(1)`,
                    this._settingsManager.currentSettings.blueFilter !== 0 ? `url("#ml-blue-filter")` : ""
                ].filter(f => f).join(" ").trim(),
                backgroundImageFilter = [
                    this.shift.BackgroundImage.saturationLimit < 1 ? `saturate(${this.shift.BackgroundImage.saturationLimit})` : "",
                    this.shift.BackgroundImage.lightnessLimit < 1 ? `brightness(${this.shift.BackgroundImage.lightnessLimit})` : "",
                    this._settingsManager.currentSettings.blueFilter !== 0 ? `url("#ml-blue-filter")` : ""
                ].filter(f => f).join(" ").trim();

            this._standardPseudoCssTexts.set(PseudoStyleStandard.InvertedBackgroundImage, `${this._css.filter}:${invertedBackgroundImageFilter}!${this._css.important}`);
            this._standardPseudoCssTexts.set(PseudoStyleStandard.BackgroundImage, `${this._css.filter}:${backgroundImageFilter}!${this._css.important}`);
        }

        protected onSettingsChanged(response: (scheme: Settings.ColorScheme) => void, shift?: Colors.ComponentShift): void
        {
            this._images.clear();
            this._imagePromises.clear();
            this.createStandardPseudoCssTexts();
            this.restoreDocumentColors(this._rootDocument);
            if (this._settingsManager.isActive)
            {
                this.createDynamicStyle(this._rootDocument);
                this.processRootDocument();
            }
            response(this._settingsManager.currentSettings);
        }

        protected onSettingsInitialized(shift?: Colors.ComponentShift): void
        {
            this._rootDocument.documentElement.removeAttribute("preload");
            if (this._settingsManager.isActive)
            {
                this.createStandardPseudoCssTexts();
                this.createDynamicStyle(this._rootDocument);
            }
            if (this._rootDocumentLoaded)
            {
                this.processRootDocument();
            }
            else if (this._settingsManager.isActive)
            {
                this.createLoadingStyles(this._rootDocument);
            }
        }

        protected onDocumentContentLoaded()
        {
            dom.removeEventListener(this._rootDocument, "DOMContentLoaded", this.onDocumentContentLoaded);
            this._rootDocumentLoaded = true;
            if (this._settingsManager.isActive)
            {
                this.processRootDocument();
            }
        }

        protected processRootDocument()
        {
            this._onRootDocumentProcessing.raise(this._rootDocument);
            this.processDocument(this._rootDocument);
        }

        protected processDocument(doc: Document)
        {
            if (doc.body && doc.defaultView && this._settingsManager.isActive)
            {
                this._zoomObserver.addDocument(doc);
                this._styleSheetProcessor.processDocumentStyleSheets(doc);
                this._dorm.set(doc, new Map<string, RoomRules>());
                doc.viewArea = doc.defaultView.innerHeight * doc.defaultView.innerWidth;
                if (this._settingsManager.currentSettings.restoreColorsOnCopy)
                {
                    dom.addEventListener(doc, "copy", this.onCopy, this, false, doc);
                }
                //this.applyLoadingShadow(doc.documentElement);
                this.removeLoadingStyles(doc);
                this.createPseudoStyles(doc);
                this.createSvgFilters(doc);
                this.createPageScript(doc);
                const defaultLinkColor = this._linkColorProcessor.calculateDefaultColor(doc);
                this._visitedLinkColorProcessor.calculateDefaultColor(doc, defaultLinkColor);
                this._textColorProcessor.calculateDefaultColor(doc);
                doc.body.isChecked = true;
                DocumentProcessor.processElementsChunk([doc.body], this, null, 0);
                this._documentObserver.startDocumentObservation(doc);
                let allTags = Array.from(doc.getElementsByTagName("*")).filter((tag) => this.checkElement(tag)) as HTMLElement[];
                DocumentProcessor.processAllElements(allTags, /*doc.documentElement*/null, this);
            }
        }

        protected hasPseudoClassOverrided(tag: HTMLElement, pseudo: PseudoClass)
        {
            return !!tag.computedStyle && tag.computedStyle.getPropertyValue(`--ml-pseudo-${PseudoClass[pseudo].toLowerCase()}`) === true.toString()
        }

        protected observeUserActions(tag: HTMLElement)
        {
            let hover = false, // this.hasPseudoClassOverrided(tag, PseudoClass.Hover),
                focus = false, // this.hasPseudoClassOverrided(tag, PseudoClass.Focus),
                active = false, // this.hasPseudoClassOverrided(tag, PseudoClass.Active),
                checked = false; // this.hasPseudoClassOverrided(tag, PseudoClass.Checked);

            const preFilteredSelectors = this._styleSheetProcessor.getPreFilteredSelectors(tag);
            if (preFilteredSelectors.length > 0)
            {
                hover = hover || this._styleSheetProcessor.canHavePseudoClass(tag, preFilteredSelectors, PseudoClass.Hover);
                focus = focus || this._styleSheetProcessor.canHavePseudoClass(tag, preFilteredSelectors, PseudoClass.Focus);
                active = active || this._styleSheetProcessor.canHavePseudoClass(tag, preFilteredSelectors, PseudoClass.Active);
                checked = checked || this._styleSheetProcessor.canHavePseudoClass(tag, preFilteredSelectors, PseudoClass.Checked);
            }

            if (hover)
            {
                dom.addEventListener(tag, "mouseenter", this._boundUserHoverHandler);
                dom.addEventListener(tag, "mouseleave", this._boundUserHoverHandler);
            }
            if (focus)
            {
                dom.addEventListener(tag, "focus", this._boundUserActionHandler);
                dom.addEventListener(tag, "blur", this._boundUserActionHandler);
            }
            if (active)
            {
                dom.addEventListener(tag, "mousedown", this._boundUserActionHandler);
                dom.addEventListener(tag, "mouseup", this._boundUserActionHandler);
            }
            if (checked)
            {
                if (tag instanceof HTMLInputElement || tag instanceof tag.ownerDocument.defaultView.HTMLInputElement)
                {
                    dom.addEventListener(tag, "input", this._boundUserActionHandler);
                    dom.addEventListener(tag, "change", this._boundUserActionHandler);
                }
                else if ((tag instanceof HTMLLabelElement || tag instanceof tag.ownerDocument.defaultView.HTMLLabelElement)
                    && (tag as HTMLLabelElement).htmlFor)
                {
                    const checkBox = tag.ownerDocument.getElementById((tag as HTMLLabelElement).htmlFor) as HTMLInputElement;
                    if (checkBox)
                    {
                        checkBox.labelElement = tag as any;
                        dom.addEventListener(checkBox, "input", this._boundCheckedLabelHandler);
                        dom.addEventListener(checkBox, "change", this._boundCheckedLabelHandler);
                    }
                }
            }
        }

        protected onLabelChecked(eArg: Event)
        {
            const labelElement = (eArg.currentTarget as HTMLInputElement).labelElement;
            if (labelElement)
            {
                this.onUserAction({ currentTarget: labelElement } as any);
            }
        }

        protected onUserHover(eArg: Event)
        {
            const tag = eArg.currentTarget as HTMLElement;
            const eventTargets = tag instanceof HTMLTableCellElement || tag instanceof tag.ownerDocument.defaultView.HTMLTableCellElement
                ? tag.parentElement!.children : [tag];
            for (let target of eventTargets)
            {
                // setTimeout(this._boundUserActionHandler, 0, { currentTarget: target });
                tag.ownerDocument.defaultView.requestAnimationFrame(
                    () => this.onUserAction({ currentTarget: target } as any));
            }
        }

        protected onUserAction(eArg: Event)
        {
            const target = eArg.currentTarget as HTMLElement;
            if (this._settingsManager.isActive && target.selectors !==
                this._styleSheetProcessor.getElementMatchedSelectors(target))
            {
                this.reCalcRootElement(target, false, true);
            }
        }

        protected onCopy(doc: Document)
        {
            let sel = doc.defaultView.getSelection();
            if (sel && !sel.isCollapsed)
            {
                let rootElem = sel.getRangeAt(0).commonAncestorContainer as HTMLElement;
                rootElem.mlBgColor = null;
                if (this.checkElement(rootElem) === false)
                {
                    rootElem = rootElem.parentElement || rootElem;
                }
                rootElem = this.getColoredParent(rootElem, true, true);
                this.reCalcRootElement(rootElem, true);
            }
        }

        protected reCalcRootElement(rootElem: HTMLElement, full: boolean, clearParentBgColors = false)
        {
            if (rootElem && (!rootElem.mlTimestamp || Date.now() - rootElem.mlTimestamp > 1))
            {
                rootElem.mlTimestamp = Date.now();
                let allTags: HTMLElement[] | null = rootElem.firstElementChild ? Array.prototype.slice.call(rootElem.getElementsByTagName("*")) : null;
                if (allTags && allTags.length > 0)
                {
                    let skipSelectors = full || (this._styleSheetProcessor.getSelectorsQuality(rootElem.ownerDocument) === 0);
                    let filteredTags = allTags.filter(el => el.isChecked && el.mlBgColor && (skipSelectors || el.selectors !== this._styleSheetProcessor.getElementMatchedSelectors(el)));
                    if (!skipSelectors && clearParentBgColors)
                    {
                        allTags.forEach(tag =>
                        {
                            tag.mlParentBgColor = null;
                            if (tag.mlBgColor && (tag.mlBgColor.color === null))
                            {
                                tag.mlBgColor.isUpToDate = false;
                            }
                        });
                    }
                    filteredTags.splice(0, 0, rootElem);
                    if (filteredTags.length < 100 || full)
                    {
                        const useShadow = false;//filteredTags.length > 50;
                        this._documentObserver.stopDocumentObservation(rootElem.ownerDocument);
                        filteredTags.forEach(tag => this.restoreElementColors(tag, true));
                        this._documentObserver.startDocumentObservation(rootElem.ownerDocument);
                        DocumentProcessor.processAllElements(filteredTags, useShadow ? rootElem : null, this, bigReCalculationDelays);
                        if (useShadow)
                        {
                            this._documentObserver.stopDocumentObservation(rootElem.ownerDocument);
                            this.applyLoadingShadow(rootElem);
                            this._documentObserver.startDocumentObservation(rootElem.ownerDocument);
                        }
                    }
                    else
                    {
                        this._documentObserver.stopDocumentObservation(rootElem.ownerDocument);
                        this.restoreElementColors(rootElem, true);
                        const results = DocumentProcessor.processElementsChunk([rootElem], this, null, 0);
                        DocumentProcessor.fixColorInheritance([rootElem], this, results);
                    }
                }
                else
                {
                    this._documentObserver.stopDocumentObservation(rootElem.ownerDocument);
                    this.restoreElementColors(rootElem, true);
                    const results = DocumentProcessor.processElementsChunk([rootElem], this, null, 0);
                    DocumentProcessor.fixColorInheritance([rootElem], this, results);
                }
            }
        }

        protected onStyleChanged(changedElements: Set<HTMLElement>)
        {
            let elementsForReCalculation = new Set<HTMLElement>();
            changedElements.forEach(tag =>
            {
                let needReCalculation = false, value: string | null | undefined;
                const ns = tag instanceof SVGElement || tag instanceof tag.ownerDocument.defaultView.SVGElement ? USP.svg : USP.htm;

                value = tag.style.getPropertyValue(ns.css.bgrColor);
                if (value && tag.style.getPropertyPriority(ns.css.bgrColor) !== this._css.important ||
                    tag.mlBgColor && tag.mlBgColor.color && tag.mlBgColor.color !== value)
                {
                    tag.originalBackgroundColor = value;
                    needReCalculation = true;
                }

                value = tag.style.getPropertyValue(this._css.zIndex);
                if (value && tag.style.getPropertyPriority(this._css.zIndex) !== this._css.important)
                {
                    tag.originalZIndex = value;
                    needReCalculation = true;
                }

                value = tag.style.getPropertyValue(ns.css.fntColor);
                if (value && tag.style.getPropertyPriority(ns.css.fntColor) !== this._css.important ||
                    tag.mlColor && tag.mlColor.color && tag.mlColor.color !== value)
                {
                    tag.originalColor = value;
                    needReCalculation = true;
                }

                value = tag.style.getPropertyValue(this._css.textShadow);
                if (value && tag.style.getPropertyPriority(this._css.textShadow) !== this._css.important)
                {
                    tag.originalTextShadow = value;
                    needReCalculation = true;
                }

                value = tag.style.getPropertyValue(ns.css.brdColor);
                if (value && tag.style.getPropertyPriority(ns.css.brdColor) !== this._css.important)
                {
                    tag.originalBorderColor = value;
                    needReCalculation = true;
                }

                value = tag.style.getPropertyValue(this._css.borderTopColor);
                if (value && tag.style.getPropertyPriority(this._css.borderTopColor) !== this._css.important)
                {
                    tag.originalBorderTopColor = value;
                    needReCalculation = true;
                }

                value = tag.style.getPropertyValue(this._css.borderRightColor);
                if (value && tag.style.getPropertyPriority(this._css.borderRightColor) !== this._css.important)
                {
                    tag.originalBorderRightColor = value;
                    needReCalculation = true;
                }

                value = tag.style.getPropertyValue(this._css.borderBottomColor);
                if (value && tag.style.getPropertyPriority(this._css.borderBottomColor) !== this._css.important)
                {
                    tag.originalBorderBottomColor = value;
                    needReCalculation = true;
                }

                value = tag.style.getPropertyValue(this._css.borderLeftColor);
                if (value && tag.style.getPropertyPriority(this._css.borderLeftColor) !== this._css.important)
                {
                    tag.originalBorderLeftColor = value;
                    needReCalculation = true;
                }

                value = tag.style.getPropertyValue(this._css.backgroundImage);
                if (value && tag.style.getPropertyPriority(this._css.backgroundImage) !== this._css.important)
                {
                    tag.originalBackgroundImage = value;
                    needReCalculation = true;
                }

                value = tag.style.getPropertyValue(this._css.backgroundSize);
                if (value && tag.style.getPropertyPriority(this._css.backgroundSize) !== this._css.important)
                {
                    tag.originalBackgroundSize = value;
                    needReCalculation = true;
                }

                value = tag.style.getPropertyValue(this._css.filter);
                if (value && tag.currentFilter !== value)
                {
                    tag.originalFilter = value;
                    needReCalculation = true;
                }

                value = tag.style.getPropertyValue(this._css.transitionDuration);
                if (value && tag.style.getPropertyPriority(this._css.transitionDuration) !== this._css.important)
                {
                    tag.originalTransitionDuration = value;
                    needReCalculation = true;
                }

                if (tag.className === "goog-color-menu-button-indicator" && /t-text-color/g.test(tag.path || ""))
                {
                    console.log(needReCalculation);
                    console.log(tag.style.cssText);
                }

                if (needReCalculation)
                {
                    elementsForReCalculation.add(tag);
                }
            });

            elementsForReCalculation.forEach(tag => this.reCalcRootElement(tag, false));
        }

        protected onClassChanged(changedElements: Set<HTMLElement>)
        {
            changedElements.forEach(tag => this.reCalcRootElement(tag, false));
        }

        protected onElementsAdded(addedElements: Set<HTMLElement>)
        {
            addedElements.forEach(tag => this.restoreElementColors(tag));
            let allNewTags = Array.from(addedElements.values())
                .filter(tag => this.checkElement(tag) && tag.parentElement);
            DocumentProcessor.processAllElements(allNewTags, null, this, bigReCalculationDelays);
            let allChildTags = new Set<HTMLElement>();
            allNewTags.forEach(newTag =>
            {
                Array.prototype.forEach.call(newTag.getElementsByTagName("*"), (childTag: HTMLElement) =>
                {
                    if (addedElements!.has(childTag) === false)
                    {
                        this.restoreElementColors(childTag);
                        if (this.checkElement(childTag))
                        {
                            allChildTags.add(childTag);
                        }
                    }
                });
            });
            DocumentProcessor.processAllElements(Array.from(allChildTags.values()), null, this, bigReCalculationDelays);
        }

        protected static processAllElements(allTags: HTMLElement[], shadowElement: HTMLElement | null, docProc: DocumentProcessor,
            delays = normalDelays, delayInvisibleElements = true): void
        {
            if (allTags.length > 0)
            {
                let otherInvisTags = new Array<HTMLElement>(), rowNumber = 0,
                    ns = USP.htm, isSvg: boolean, isVisible: boolean, isLink = false, hasBgColor = false, hasImage = false, inView: boolean,
                    hm = allTags[0].ownerDocument.defaultView.innerHeight,
                    wm = allTags[0].ownerDocument.defaultView.innerWidth;
                for (let tag of allTags)
                {
                    tag.rowNumber = rowNumber++;
                    isSvg = tag instanceof SVGElement || tag instanceof tag.ownerDocument.defaultView.SVGElement;
                    ns = isSvg ? USP.svg : USP.htm;
                    isVisible = tag.tagName == "BODY" || isSvg || tag.offsetParent !== null || !!tag.offsetHeight
                    if (isVisible || tag.computedStyle || !delayInvisibleElements || allTags.length < 2 * chunkLength)
                    {
                        tag.computedStyle = tag.computedStyle || tag.ownerDocument.defaultView.getComputedStyle(tag, "")
                        isLink = tag instanceof HTMLAnchorElement || tag instanceof tag.ownerDocument.defaultView.HTMLAnchorElement;
                        hasBgColor = tag.computedStyle!.getPropertyValue(ns.css.bgrColor) !== "rgba(0, 0, 0, 0)";
                        hasImage = tag.computedStyle!.backgroundImage !== docProc._css.none || (tag.tagName === ns.img);
                    }

                    if (isVisible)
                    {
                        tag.rect = tag.rect || tag.getBoundingClientRect();
                        isVisible = tag.rect.width !== 0 && tag.rect.height !== 0;
                        isVisible && (tag.area = tag.rect.width * tag.rect.height);
                        inView = isVisible &&
                            (tag.rect.bottom >= 0 && tag.rect.bottom <= hm || tag.rect.top >= 0 && tag.rect.top <= hm) &&
                            (tag.rect.right >= 0 && tag.rect.right <= wm || tag.rect.left >= 0 && tag.rect.left <= wm);
                        if (!isVisible)
                        {
                            tag.rect = null;
                            if (hasBgColor) tag.order = po.invisColorTags;
                            else if (hasImage) tag.order = po.invisImageTags;
                            else if (isLink) tag.order = po.invisLinks;
                            else tag.order = po.invisTransTags;
                        }
                        else if (hasBgColor)
                        {
                            if (inView) tag.order = po.viewColorTags;
                            else tag.order = po.visColorTags;
                        }
                        else if (hasImage)
                        {
                            if (inView) tag.order = po.viewImageTags;
                            else tag.order = po.visImageTags;
                        }
                        else if (isLink)
                        {
                            if (inView) tag.order = po.viewLinks;
                            else tag.order = po.visLinks;
                        }
                        else
                        {
                            if (inView) tag.order = po.viewTransTags;
                            else tag.order = po.visTransTags;
                        }
                    }
                    else if (tag.computedStyle)
                    {
                        if (hasBgColor) tag.order = po.invisColorTags;
                        else if (hasImage) tag.order = po.invisImageTags;
                        else tag.order = po.invisTransTags;
                    }
                    else
                    {
                        tag.order = po.delayedInvisTags;
                        otherInvisTags.push(tag);
                    }
                }

                allTags.sort((a, b) =>
                    a.order !== b.order ? a.order! - b.order!
                        : b.area && a.area && b.area !== a.area ? b.area - a.area
                            : a.rowNumber! - b.rowNumber!);
                allTags.splice(allTags.length - otherInvisTags.length, otherInvisTags.length);

                const results = Util.handlePromise(DocumentProcessor.processOrderedElements(allTags, shadowElement, docProc, delays)!);

                if (otherInvisTags.length > 0)
                {
                    Promise.all([otherInvisTags, docProc, delays, results])
                        .then(([otherTags, dp, dl]) => DocumentProcessor.processAllElements(otherTags, null, dp, dl, false));
                }

                DocumentProcessor.fixColorInheritance(allTags, docProc, results);
            }
            else if (shadowElement)
            {
                DocumentProcessor.removeLoadingShadow(shadowElement, docProc);
            }
        }

        protected static fixColorInheritance(allTags: HTMLElement[], docProc: DocumentProcessor, results: Promise<any>)
        {
            Promise.all([allTags, docProc, results])
                .then(([tags, dp]) =>
                {
                    if (tags && tags.length > 0)
                    {
                        tags[0].ownerDocument.defaultView.requestAnimationFrame(((t: HTMLElement[], dProc: DocumentProcessor) =>
                        {
                            const brokenTags = t.filter(tag => !tag.isPseudo && tag.mlColor
                                && tag.mlColor.reason === Colors.ColorReason.Inherited
                                && tag.mlColor.color === null
                                && tag.mlColor.intendedColor && tag.computedStyle
                                && tag.mlColor.intendedColor !== (tag instanceof tag.ownerDocument.defaultView.HTMLElement
                                    ? tag.computedStyle!.color
                                    : tag!.computedStyle!.fill));
                            if (brokenTags.length > 0)
                            {
                                dProc._documentObserver.stopDocumentObservation(brokenTags[0].ownerDocument);
                                brokenTags.forEach(tag =>
                                {
                                    const ns = tag instanceof tag.ownerDocument.defaultView.SVGElement ? USP.svg : USP.htm;
                                    const newColor = Object.assign({}, tag.mlColor!);
                                    newColor.base = dProc._app.isDebug ? tag.mlColor : null
                                    newColor.reason = Colors.ColorReason.FixedInheritance;
                                    newColor.color = newColor.intendedColor!;
                                    tag.mlColor = newColor;
                                    tag.originalColor = tag.style.getPropertyValue(ns.css.fntColor);
                                    tag.style.setProperty(ns.css.fntColor, newColor.color, dProc._css.important);
                                });
                                docProc._documentObserver.startDocumentObservation(brokenTags[0].ownerDocument);
                            }
                        }).bind(null, tags, dp));
                    }
                });
        }

        protected static processOrderedElements(tags: HTMLElement[], shadowElement: HTMLElement | null, docProc: DocumentProcessor, delays = normalDelays)
        {
            if (tags.length > 0)
            {
                const density = 2000 / tags.length
                let result: Promise<HTMLElement[]>, needObservation = docProc._styleSheetProcessor.getSelectorsCount(tags[0].ownerDocument);
                if (tags.length < chunkLength)
                {
                    result = DocumentProcessor.processElementsChunk(tags, docProc, null, delays.get(tags[0].order || po.viewColorTags)! / density);
                    shadowElement && DocumentProcessor.removeLoadingShadow(shadowElement, docProc);
                }
                else
                {
                    const getNextDelay = ((_delays: any, _density: any, [chunk]: [any]) =>
                        _delays.get(chunk[0].order || po.viewColorTags) / _density)
                        .bind(null, delays, density);
                    if (shadowElement)
                    {
                        let firstOrder = tags[0].order, firstOrderLenght = 0;
                        while (++firstOrderLenght < tags.length && tags[firstOrderLenght].order === firstOrder);
                        tags[firstOrderLenght].shadowElement = shadowElement;
                    }
                    result = Util.forEachPromise(
                        Util.sliceIntoChunks(tags, chunkLength).map(chunk => [chunk, docProc]),
                        DocumentProcessor.processElementsChunk, 0, getNextDelay);
                }
                if (needObservation)
                {
                    Promise.all([tags as any, docProc, Util.handlePromise(result), ...docProc._styleSheetProcessor.getCssPromises(tags[0].ownerDocument)!])
                        .then(([t, dp]) => dp._rootDocument.defaultView.requestAnimationFrame(() => DocumentProcessor.startObservation(t, dp)));
                }
                return result;
            }
            return undefined;
        }

        protected static processElementsChunk(chunk: HTMLElement[], docProc: DocumentProcessor, prev: null, delay: number)
        {
            const paramsForPromiseAll: any[] = [chunk, chunk[0].ownerDocument, delay];
            const results = chunk.map(tag => { return { tag: tag, result: docProc.calculateRoomRules(tag) } });
            docProc._documentObserver.stopDocumentObservation(chunk[0].ownerDocument);
            results
                .filter(r => r.result)
                .map(tr =>
                {
                    return Object.assign(tr, {
                        beforeRoomRules: tr.result!.before && docProc.calculateRoomRules(tr.result!.before!),
                        afterRoomRules: tr.result!.after && docProc.calculateRoomRules(tr.result!.after!)
                    });
                })
                .map(tr =>
                {
                    tr.tag.shadowElement && DocumentProcessor.removeLoadingShadow(tr.tag.shadowElement, docProc);
                    tr.tag.shadowElement = undefined;
                    docProc.applyRoomRules(tr.tag, tr.result!.roomRules);
                    if (tr.beforeRoomRules)
                    {
                        docProc.applyRoomRules(tr.result!.before!, tr.beforeRoomRules.roomRules);
                    }
                    if (tr.afterRoomRules)
                    {
                        docProc.applyRoomRules(tr.result!.after!, tr.afterRoomRules.roomRules);
                    }
                    return [tr.result!.before, tr.result!.after].filter(x => x).map(x => x!.stylePromise);
                })
                .filter(r => r).forEach(r => paramsForPromiseAll.push(...r!.map(Util.handlePromise)));
            docProc._documentObserver.startDocumentObservation(chunk[0].ownerDocument);
            return Promise.all(paramsForPromiseAll as [HTMLElement[], Document, number, PromiseResult<string>])
                .then(([tags, doc, dl, ...cssArray]) =>
                {
                    let css = (cssArray as PromiseResult<string>[])
                        .filter(result => result.status === Status.Success && result.data)
                        .map(result => result.data)
                        .join("\n");
                    if (css)
                    {
                        if (dl)
                        {
                            setTimeout((d: Document, c: string) => d.mlPseudoStyles!.appendChild(d.createTextNode(c)), dl, doc, css);
                        }
                        else
                        {
                            doc.mlPseudoStyles!.appendChild(doc.createTextNode(css));
                        }
                    }
                    return tags;
                });
        }

        protected static startObservation(tags: HTMLElement[], docProc: DocumentProcessor)
        {
            tags.forEach(tag =>
            {
                if (!tag.isObserved)
                {
                    docProc.observeUserActions(tag);
                    tag.isObserved = true;
                }
            });
        }

        protected tagIsSmall(tag: Element | PseudoElement): boolean
        {
            let maxSize = 50, maxAxis = 25,
                check = (w: number, h: number) => w > 0 && h > 0 && (w < maxSize && h < maxSize || w < maxAxis || h < maxAxis);
            tag.computedStyle = tag.computedStyle || tag.ownerDocument.defaultView.getComputedStyle(tag as Element, "");
            let width = parseInt(tag.computedStyle.width!), height = parseInt(tag.computedStyle.height!);
            if (!isNaN(width) && !isNaN(height))
            {
                tag.area = tag.area || width * height;
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

        protected calcTagArea(tag: Element | PseudoElement, tryClientRect = true)
        {
            if (tag.area === undefined)
            {
                tag.computedStyle = tag.computedStyle || tag.ownerDocument.defaultView.getComputedStyle(tag as Element, "");
                let width = parseInt(tag.computedStyle.width!), height = parseInt(tag.computedStyle.height!);
                if (!isNaN(width) && !isNaN(height))
                {
                    tag.area = width * height;
                }
                else if (tryClientRect)
                {
                    tag.rect = tag.rect || tag.getBoundingClientRect();
                    if (tag.rect.width || tag.rect.height)
                    {
                        tag.area = tag.rect.width * tag.rect.height;
                    }
                    else
                    {
                        tag.rect = null;
                    }
                }
            }
        }

        protected calcElementPath(tag: HTMLElement | PseudoElement)
        {
            var parentPath = "";
            if (tag.parentElement)
            {
                parentPath = (tag.parentElement.path ? tag.parentElement.path : this.calcElementPath(tag.parentElement as HTMLElement)) + " ";
            }
            tag.path = parentPath + tag.tagName;
            if (!tag.isPseudo)
            {
                var attr: Attr, length = (tag as Node).attributes.length;
                for (var i = 0; i < length; i++)
                {
                    attr = (tag as Node).attributes[i];
                    if (attr.value && attr.name && !attr.name.endsWith("timer") && attr.name !== "d")
                    {
                        tag.path += `${attr.name}=${attr.value.length > maxAttrLen ? attr.value.substr(0, maxAttrLen) : attr.value}`;
                    }
                }
            }
            return tag.path;
        }

        protected getElementIndex(tag: Element)
        {
            // do not remove {var}
            for (var i = 0; tag = tag.previousElementSibling!; i++);
            return i;
        }

        protected getParentBackground(tag: Element | PseudoElement, probeRect?: ClientRect)
        {
            let result = Object.assign({}, tag.ownerDocument.body.mlBgColor || Colors.NotFound);
            result.reason = Colors.ColorReason.NotFound;
            if (tag.parentElement)
            {
                let bgColor;
                let doc = tag.ownerDocument;
                let isSvg = (tag instanceof SVGElement || tag instanceof doc.defaultView.SVGElement) &&
                    (tag.parentElement instanceof SVGElement || tag.parentElement instanceof doc.defaultView.SVGElement);
                tag.computedStyle = tag.computedStyle || doc.defaultView.getComputedStyle(tag as HTMLElement, "");

                if (isRealElement(tag) && (tag.computedStyle!.position == this._css.absolute || tag.computedStyle!.position == this._css.relative || isSvg))
                {
                    tag.zIndex = isSvg ? this.getElementIndex(tag) : parseInt(tag.computedStyle!.zIndex || "0");
                    tag.zIndex = isNaN(tag.zIndex!) ? -999 : tag.zIndex;
                    let children: Element[] = Array.prototype.filter.call(tag.parentElement!.children,
                        (otherTag: Element, index: number) =>
                        {
                            if (otherTag != tag && (otherTag.isChecked || (otherTag.isChecked === undefined) && this.checkElement(otherTag)))
                            {
                                otherTag.zIndex = otherTag.zIndex || isSvg ? -index :
                                    parseInt((otherTag.computedStyle = otherTag.computedStyle ? otherTag.computedStyle
                                        : doc.defaultView.getComputedStyle(otherTag, "")).zIndex || "0");
                                otherTag.zIndex = isNaN(otherTag.zIndex) ? -999 : otherTag.zIndex;
                                if (otherTag.mlBgColor && otherTag.mlBgColor.color && otherTag.zIndex < tag.zIndex!)
                                {
                                    probeRect = probeRect || (tag.rect = tag.rect || tag.getBoundingClientRect());
                                    otherTag.rect = otherTag.rect || otherTag.getBoundingClientRect();
                                    if (otherTag.rect.left <= probeRect.left && otherTag.rect.top <= probeRect.top &&
                                        otherTag.rect.right >= probeRect.right && otherTag.rect.bottom >= probeRect.bottom)
                                    {
                                        return true;
                                    }
                                }
                            }
                            return false;
                        });
                    if (children.length > 0)
                    {
                        let maxZIndex = 0;
                        children.forEach(el =>
                        {
                            if (el.zIndex! > maxZIndex)
                            {
                                maxZIndex = el.zIndex!;
                                bgColor = el.mlBgColor;
                            }
                        });
                    }
                }
                bgColor = bgColor ||
                    (tag.parentElement!.mlBgColor && tag.parentElement!.mlBgColor!.isUpToDate ? tag.parentElement!.mlBgColor : null) ||
                    tag.parentElement!.mlParentBgColor;
                if (bgColor && bgColor.alpha > 0.2)
                {
                    result = bgColor;
                }
                else
                {
                    probeRect = probeRect || (tag.rect = tag.rect || tag.getBoundingClientRect());
                    result = this.getParentBackground(tag.parentElement!, probeRect);
                }
            }
            if (isRealElement(tag))
            {
                tag.mlParentBgColor = result;
            }
            return result;
        }

        protected getColoredParent(tag: HTMLElement, checkBackground: boolean, checkForeground: boolean): HTMLElement
        {
            let bgOk = !checkBackground || !!tag.style.backgroundColor,
                fgOk = !checkForeground || !!tag.style.color;
            if (bgOk && fgOk)
            {
                return tag;
            }
            else if (tag.parentElement)
            {
                return this.getColoredParent(tag.parentElement, !bgOk, !fgOk);
            }
            else
            {
                return tag;
            }
        }

        protected applyLoadingShadow(tag: HTMLElement)
        {
            if (tag.tagName != USP.htm.img)
            {
                tag.computedStyle = tag.computedStyle || tag.ownerDocument.defaultView.getComputedStyle(tag, "");
                let filter = [
                    this.shift.Background.lightnessLimit < 1 ? "brightness(" + this.shift.Background.lightnessLimit + ")" : "",
                    this._settingsManager.currentSettings.blueFilter !== 0 ? `url("#ml-blue-filter")` : "",
                    tag.computedStyle.filter != this._css.none ? tag.computedStyle.filter : ""
                ].filter(f => f).join(" ").trim();
                if (!tag.originalFilter)
                {
                    tag.originalFilter = tag.style.filter;
                }
                tag.currentFilter = filter;
                tag.style.setProperty(this._css.filter, filter);
            }
            return tag;
        }

        protected static removeLoadingShadow(tag: HTMLElement, docProc: DocumentProcessor)
        {
            docProc._rootDocument.defaultView.requestAnimationFrame(((_tag: HTMLElement, _docProc: DocumentProcessor) =>
            {
                let originalState = _docProc._documentObserver.stopDocumentObservation(_tag.ownerDocument);
                _tag.setAttribute(_docProc._css.transition, _docProc._css.filter);
                _tag.style.filter = _tag.originalFilter!;
                _tag.originalFilter = undefined;
                setTimeout((tg: HTMLElement, dp: DocumentProcessor) =>
                    dp._rootDocument.defaultView.requestAnimationFrame(tg.removeAttribute.bind(tg, dp._css.transition)), 200, _tag, _docProc);
                _docProc._documentObserver.startDocumentObservation(_tag.ownerDocument, originalState)
            }).bind(null, tag, docProc));
        }

        protected restoreDocumentColors(doc: Document)
        {
            this._documentObserver.stopDocumentObservation(doc);
            this.removeDynamicStyle(doc);
            this.removePageScript(doc);
            this.clearPseudoStyles(doc);
            for (let tag of doc.getElementsByTagName("*"))
            {
                this.restoreElementColors(tag as HTMLElement);
            }
        }

        protected restoreElementColors(tag: HTMLElement, keepTransitionDuration?: boolean)
        {
            if (tag.mlBgColor)
            {
                let ns = tag instanceof SVGElement || tag instanceof tag.ownerDocument.defaultView.SVGElement ? USP.svg : USP.htm;

                tag.mlBgColor = null;
                tag.mlColor = null;
                tag.mlTextShadow = null;
                tag.mlParentBgColor = null;
                tag.rect = null;
                tag.selectors = null;
                tag.path = null;

                if (tag.originalBackgroundColor !== undefined && tag.originalBackgroundColor !== tag.style.getPropertyValue(ns.css.bgrColor))
                {
                    tag.style.setProperty(ns.css.bgrColor, tag.originalBackgroundColor);
                }
                if (tag.originalDisplay !== undefined && tag.originalDisplay !== tag.style.display)
                {
                    tag.style.display = tag.originalDisplay;
                }
                if (tag.originalZIndex !== undefined && tag.style.zIndex !== tag.originalZIndex)
                {
                    tag.style.zIndex = tag.originalZIndex;
                }
                if (tag.originalColor !== undefined)
                {
                    if (tag.originalColor !== tag.style.getPropertyValue(ns.css.fntColor))
                    {
                        tag.style.setProperty(ns.css.fntColor, tag.originalColor);
                    }
                    tag.style.removeProperty(this._css.originalColor);
                    tag.style.removeProperty(this._css.linkColor);
                    tag.style.removeProperty(this._css.visitedColor);
                }
                if (tag.originalTextShadow !== undefined && tag.style.textShadow !== tag.originalTextShadow)
                {
                    tag.style.textShadow = tag.originalTextShadow;
                }
                if (tag.originalBorderColor !== undefined && tag.originalBorderColor !== tag.style.getPropertyValue(ns.css.brdColor))
                {
                    tag.style.setProperty(ns.css.brdColor, tag.originalBorderColor);
                }
                if (tag.originalBorderTopColor !== undefined && tag.style.borderTopColor !== tag.originalBorderTopColor)
                {
                    tag.style.borderTopColor = tag.originalBorderTopColor;
                }
                if (tag.originalBorderRightColor !== undefined && tag.style.borderRightColor !== tag.originalBorderRightColor)
                {
                    tag.style.borderRightColor = tag.originalBorderRightColor;
                }
                if (tag.originalBorderBottomColor !== undefined && tag.style.borderBottomColor !== tag.originalBorderBottomColor)
                {
                    tag.style.borderBottomColor = tag.originalBorderBottomColor;
                }
                if (tag.originalBorderLeftColor !== undefined && tag.style.borderLeftColor !== tag.originalBorderLeftColor)
                {
                    tag.style.borderLeftColor = tag.originalBorderLeftColor;
                }
                if (tag.originalBackgroundImage !== undefined && tag.style.backgroundImage !== tag.originalBackgroundImage)
                {
                    tag.style.backgroundImage = tag.originalBackgroundImage;
                    if (tag.originalBackgroundSize !== undefined && tag.style.backgroundSize !== tag.originalBackgroundSize)
                    {
                        tag.style.backgroundSize = tag.originalBackgroundSize;
                    }
                }
                if (tag.originalFilter !== undefined && tag.style.filter !== tag.originalFilter)
                {
                    tag.style.filter = tag.originalFilter;
                }
                if (tag.originalTransitionDuration !== undefined && !keepTransitionDuration && tag.style.transitionDuration !== tag.originalTransitionDuration)
                {
                    tag.style.transitionDuration = tag.originalTransitionDuration;
                }
                if (tag.hasAttribute(this._css.transition))
                {
                    tag.removeAttribute(this._css.transition)
                }
                if (tag.hasAttribute("before-style"))
                {
                    tag.removeAttribute("before-style")
                }
                if (tag.hasAttribute("after-style"))
                {
                    tag.removeAttribute("after-style")
                }

                if (tag instanceof HTMLIFrameElement || tag instanceof tag.ownerDocument.defaultView.HTMLIFrameElement)
                {
                    try
                    {
                        this.restoreDocumentColors(tag.contentDocument || tag.contentWindow.document);
                    }
                    catch (ex)
                    {
                        //this._app.isDebug && console.error(ex);
                    }
                }
            }
        }

        protected checkElement(tag: any)
        {
            return tag.isChecked =
                (tag instanceof Element || tag!.ownerDocument && tag!.ownerDocument.defaultView && tag instanceof tag!.ownerDocument.defaultView.Element) &&
                !tag.mlBgColor && !!tag.tagName && !tag.mlIgnore && !!(tag as HTMLElement).style;
        }

        protected calculateRoomRules(tag: HTMLElement | PseudoElement):
            {
                roomRules: RoomRules, before?: PseudoElement, after?: PseudoElement
            } | undefined
        {
            if (tag && tag.ownerDocument.defaultView && !(tag as HTMLElement).mlBgColor
                && (!tag.computedStyle || tag.computedStyle.getPropertyValue("--ml-ignore") !== true.toString()))
            {
                let doc = tag.ownerDocument;
                let isSmall, bgInverted;
                let bgLight: number, roomRules: RoomRules | undefined, room: string | null = null;
                let isSvg = tag instanceof SVGElement || tag instanceof doc.defaultView.SVGElement,
                    isSvgText = tag instanceof SVGTextContentElement || tag instanceof doc.defaultView.SVGTextContentElement,
                    isLink = tag instanceof HTMLAnchorElement || tag instanceof doc.defaultView.HTMLAnchorElement,
                    isButton = tag instanceof HTMLButtonElement || tag instanceof doc.defaultView.HTMLButtonElement ||
                        (tag instanceof HTMLInputElement || tag instanceof doc.defaultView.HTMLInputElement) &&
                        (tag.type === "button" || tag.type === "submit" || tag.type === "reset") ||
                        isRealElement(tag) && tag.getAttribute("role") === "button",
                    isTable =
                        tag instanceof HTMLTableElement || tag instanceof doc.defaultView.HTMLTableElement || tag instanceof HTMLTableCellElement || tag instanceof doc.defaultView.HTMLTableCellElement ||
                        tag instanceof HTMLTableRowElement || tag instanceof doc.defaultView.HTMLTableRowElement || tag instanceof HTMLTableSectionElement || tag instanceof doc.defaultView.HTMLTableSectionElement;
                let ns = isSvg ? USP.svg : USP.htm;
                let beforePseudoElement: PseudoElement | undefined, afterPseudoElement: PseudoElement | undefined;

                if (tag instanceof HTMLIFrameElement || tag instanceof doc.defaultView.HTMLIFrameElement)
                {
                    setTimeout(dom.addEventListener(tag, "load", this.onIFrameLoaded, this, false, tag), 1);
                }
                if (isRealElement(tag) && tag.contentEditable == true.toString()) this.overrideInnerHtml(tag);

                this.calcElementPath(tag);
                tag.selectors = this._styleSheetProcessor.getElementMatchedSelectors(tag);
                room = tag.path + tag.selectors;
                roomRules = this._dorm.get(doc)!.get(room);

                if (!roomRules)
                {
                    roomRules = new RoomRules();
                    this._app.isDebug && (roomRules.owner = tag);
                    tag.computedStyle = tag.computedStyle || doc.defaultView.getComputedStyle(tag as HTMLElement, "");
                    if (isRealElement(tag))
                    {
                        let beforeStyle = doc.defaultView.getComputedStyle(tag, ":before");
                        let afterStyle = doc.defaultView.getComputedStyle(tag, ":after");
                        let roomId = "";
                        if (beforeStyle && beforeStyle.content && beforeStyle.getPropertyValue("--ml-ignore") !== true.toString())
                        {
                            roomId = roomId || (room ? Util.hashCode(room).toString() : Util.guid());
                            beforePseudoElement = new PseudoElement(PseudoType.Before, tag, roomId, beforeStyle, roomRules);
                            roomRules.attributes = roomRules.attributes || new Map<string, string>();
                            roomRules.attributes.set("before-style", roomId);
                        }
                        if (afterStyle && afterStyle.content && afterStyle.getPropertyValue("--ml-ignore") !== true.toString())
                        {
                            roomId = roomId || (room ? Util.hashCode(room).toString() : Util.guid());
                            afterPseudoElement = new PseudoElement(PseudoType.After, tag, roomId, afterStyle, roomRules);
                            roomRules.attributes = roomRules.attributes || new Map<string, string>();
                            roomRules.attributes.set("after-style", roomId);
                        }
                    }
                    if (tag.computedStyle && tag.computedStyle.transitionDuration !== this._css._0s)
                    {
                        let hasForbiddenTransition = false;
                        let durations = tag.computedStyle.transitionDuration!.split(", ");
                        tag.computedStyle.transitionProperty!.split(", ").forEach((prop, index) =>
                        {
                            if (this._transitionForbiddenProperties.has(prop))
                            {
                                durations[index] = this._css._0s;
                                hasForbiddenTransition = true;
                            }
                        });
                        if (hasForbiddenTransition)
                        {
                            roomRules.transitionDuration = { value: durations.join(", ") };
                        }
                    }
                    if (!isSvgText)
                    {
                        if (isSvg)
                        {
                            if (this.tagIsSmall(tag) && tag.computedStyle!.getPropertyValue("--ml-small-svg-is-text") === true.toString())
                            {
                                isSvgText = true;
                                roomRules.backgroundColor = Object.assign({}, this.getParentBackground(tag));
                                roomRules.backgroundColor.reason = Colors.ColorReason.SvgText;
                                roomRules.backgroundColor.color = null;
                            }
                            else
                            {
                                roomRules.backgroundColor = this.changeColor({ role: cc.SvgBackground, property: ns.css.bgrColor, tag: tag });
                            }
                        }
                        else
                        {
                            roomRules.backgroundColor = this.changeColor(
                                { role: isButton ? cc.ButtonBackground : cc.Background, property: ns.css.bgrColor, tag: tag });
                        }

                        if (this._app.preserveDisplay && roomRules.backgroundColor && roomRules.backgroundColor.color && tag.id && tag.className)
                        {
                            roomRules.display = tag.computedStyle!.display;
                        }
                    }

                    if (!roomRules.backgroundColor)
                    {
                        roomRules.backgroundColor = Object.assign({}, this.getParentBackground(tag));
                        roomRules.backgroundColor.color = null;
                    }

                    if ((tag.tagName == ns.img || (tag instanceof HTMLInputElement || tag instanceof doc.defaultView.HTMLInputElement) &&
                        (tag.type == "checkbox" || tag.type == "radio") &&
                        (tag.computedStyle!.webkitAppearance && tag.computedStyle!.webkitAppearance !== this._css.none ||
                            tag.computedStyle!.getPropertyValue("-moz-appearance") &&
                            tag.computedStyle!.getPropertyValue("-moz-appearance") !== this._css.none)) &&
                        (this.shift.Image.lightnessLimit < 1 || this.shift.Image.saturationLimit < 1 ||
                            this._settingsManager.currentSettings.blueFilter !== 0))
                    {
                        const customImageRole = tag.computedStyle!.getPropertyValue(`--ml-${cc[cc.Image].toLowerCase()}`) as keyof Colors.ComponentShift;
                        let imgSet = this.shift[customImageRole] || this.shift.Image;
                        roomRules.filter =
                            {
                                value: [
                                    tag.computedStyle!.filter != this._css.none ? tag.computedStyle!.filter : "",
                                    imgSet.saturationLimit < 1 ? `saturate(${imgSet.saturationLimit})` : "",
                                    this._settingsManager.currentSettings.blueFilter !== 0 ? `url("#ml-blue-filter")` : "",
                                    imgSet.lightnessLimit < 1 ? `brightness(${imgSet.lightnessLimit})` : ""
                                ].filter(f => f).join(" ").trim()
                            };
                        roomRules.keepFilter = true;
                        roomRules.attributes = roomRules.attributes || new Map<string, string>();
                        if (this._settingsManager.currentSettings.useImageHoverAnimation)
                        {
                            roomRules.attributes.set(this._css.transition, this._css.filter);
                        }
                    }
                    const bgInverted = roomRules.backgroundColor.originalLight - roomRules.backgroundColor.light > 0.4;

                    if (tag.computedStyle!.content!.substr(0, 3) == "url")
                    {
                        let doInvert = (!isTable) && bgInverted && (tag.computedStyle!.content!.search(doNotInvertRegExp) === -1) &&
                            (
                                this.tagIsSmall(tag)

                                || tag.isPseudo && tag.parentElement!.parentElement &&
                                this.tagIsSmall(tag.parentElement!.parentElement!) &&
                                tag.parentElement!.parentElement!.computedStyle!.overflow === this._css.hidden

                                || !tag.isPseudo && this.tagIsSmall(tag.parentElement!) &&
                                tag.parentElement!.computedStyle!.overflow === this._css.hidden
                            );
                        if (this.shift.Image.lightnessLimit < 1 || this.shift.Image.saturationLimit < 1 || doInvert || this._settingsManager.currentSettings.blueFilter !== 0)
                        {
                            let imgSet = this.shift.Image;
                            roomRules.filter =
                                {
                                    value: [
                                        tag.computedStyle!.filter != this._css.none ? tag.computedStyle!.filter : "",
                                        imgSet.saturationLimit < 1 ? `saturate(${imgSet.saturationLimit})` : "",
                                        imgSet.lightnessLimit < 1 && !doInvert ? `brightness(${imgSet.lightnessLimit})` : "",
                                        doInvert ? `brightness(${float.format(1 - this.shift.Background.lightnessLimit)})` : "",
                                        doInvert ? "hue-rotate(180deg) invert(1)" : "",
                                        this._settingsManager.currentSettings.blueFilter !== 0 ? `url("#ml-blue-filter")` : ""
                                    ].filter(f => f).join(" ").trim()
                                };
                        }
                    }

                    if (tag.computedStyle!.backgroundImage && tag.computedStyle!.backgroundImage !== this._css.none)
                    {//-webkit-gradient(linear, 0% 0%, 0% 100%, from(rgb(246, 246, 245)), to(rgb(234, 234, 234)))
                        let backgroundImage = tag.computedStyle!.backgroundImage!;
                        let gradientColorMatches = backgroundImage.match(/rgba?\([^)]+\)|(color-stop|from|to)\((rgba?\([^)]+\)|[^)]+)\)/gi);
                        let gradientColors = new Map<string, string>();
                        if (gradientColorMatches)
                        {
                            gradientColorMatches.forEach(color => gradientColors.set(color, Math.random().toString()));
                            gradientColors.forEach((id, color) => backgroundImage =
                                backgroundImage.replace(new RegExp(Util.escapeRegex(color), "g"), id));
                        }
                        let backgroundSizes = tag.computedStyle!.backgroundSize!.match(/\b[^,]+/gi)!;
                        let backgroundImages = backgroundImage.match(/[\w-]+\([^)]+\)/gi)!;
                        let bgImgLight = 1, doInvert = false, isPseudoContent = false, bgFilter = "", haveToProcBgImg = false,
                            haveToProcBgGrad = /gradient/gi.test(backgroundImage), isInput = false;
                        if (/\burl\(/gi.test(backgroundImage))
                        {
                            const customBgImageRole = tag.computedStyle!.getPropertyValue(`--ml-${cc[cc.BackgroundImage].toLowerCase()}`) as keyof Colors.ComponentShift;
                            let bgImgSet = this.shift[customBgImageRole] || this.shift.BackgroundImage;

                            doInvert = (!isTable) && bgInverted && (backgroundImage.search(doNotInvertRegExp) === -1) &&
                                tag.computedStyle!.getPropertyValue("--ml-no-invert") !== true.toString() &&
                                (
                                    this.tagIsSmall(tag) || !!tag.parentElement && !!tag.parentElement.parentElement &&
                                    this.tagIsSmall(tag.parentElement.parentElement) &&
                                    (tag.parentElement.parentElement.computedStyle!.overflow === this._css.hidden)
                                );

                            if (bgImgSet.lightnessLimit < 1 || bgImgSet.saturationLimit < 1 || doInvert || this._settingsManager.currentSettings.blueFilter !== 0)
                            {
                                isPseudoContent = tag.isPseudo && tag.computedStyle.content !== "''" && tag.computedStyle!.content !== '""';

                                if (bgImgSet.lightnessLimit < 1 && !doInvert)
                                {
                                    this.calcTagArea(tag);
                                    let area = 1 - Math.min(Math.max(tag.area!, 1) / doc.viewArea!, 1),
                                        lim = bgImgSet.lightnessLimit,
                                        txtLim = this.shift.Text.lightnessLimit;
                                    bgImgLight = Math.min(((lim ** (1 / 2) - lim) ** (1 / 3) * area) ** 3 + lim, Math.max(lim, txtLim));
                                }

                                bgFilter = [
                                    bgImgSet.saturationLimit < 1 ? `saturate(${bgImgSet.saturationLimit})` : "",
                                    bgImgLight < 1 && !doInvert ? `brightness(${float.format(bgImgLight)})` : "",
                                    doInvert ? `brightness(${float.format(1 - this.shift.Background.lightnessLimit)})` : "",
                                    doInvert ? "hue-rotate(180deg) invert(1)" : "",
                                    this._settingsManager.currentSettings.blueFilter !== 0 ? `url("#ml-blue-filter")` : ""
                                ].filter(f => f).join(" ").trim();

                                if (tag.tagName !== "INPUT" && tag.tagName !== "TEXTAREA")
                                {
                                    roomRules.filter = { value: bgFilter };
                                }
                                else isInput = true;

                                haveToProcBgImg = isRealElement(tag) && !!tag.firstChild || isPseudoContent ||
                                    !!roomRules.backgroundColor.color || haveToProcBgGrad || isInput;
                            }
                        }
                        if (haveToProcBgImg || haveToProcBgGrad)
                        {
                            roomRules.backgroundImages = backgroundImages.map((bgImg, index) =>
                            {
                                gradientColors.forEach((id, color) => bgImg = bgImg.replace(new RegExp(id, "g"), color));
                                let size = backgroundSizes[Math.min(index, backgroundSizes.length)];
                                if (haveToProcBgImg && bgImg.substr(0, 3) == "url")
                                {
                                    return this.processBackgroundImage(tag, index, bgImg, size, roomRules!, doInvert, isPseudoContent, bgFilter);
                                }
                                else if (/gradient/gi.test(bgImg))
                                {
                                    return this.processBackgroundGradient(tag, isButton, index, bgImg, size, roomRules!);
                                }
                                else
                                {
                                    return new BackgroundImage(size, bgImg, BackgroundImageType.Image);
                                }
                            });
                        }
                    }

                    let bgLight = roomRules.backgroundColor.light;
                    if (!isSvg || isSvgText)
                    {
                        const textRole = isLink || tag.isPseudo
                            && (tag.parentElement instanceof HTMLAnchorElement || tag.parentElement instanceof doc.defaultView.HTMLAnchorElement)
                            ? cc.Link
                            : cc.Text;
                        roomRules.color = this.changeColor({ role: textRole, property: ns.css.fntColor, tag: tag, bgLight: bgLight });
                        if (textRole === cc.Link)
                        {
                            roomRules.visitedColor = this.changeColor({ role: cc.VisitedLink, property: ns.css.fntColor, tag: tag, bgLight: bgLight });
                        }
                        if (roomRules.color)
                        {
                            let originalTextContrast = Math.abs(roomRules.backgroundColor.originalLight - roomRules.color.originalLight);
                            let currentTextContrast = Math.abs(roomRules.backgroundColor.light - roomRules.color.light);
                            if (currentTextContrast != originalTextContrast && roomRules.color.originalLight != roomRules.color.light &&
                                tag.computedStyle!.textShadow && tag.computedStyle!.textShadow !== this._css.none)
                            {
                                let newTextShadow = tag.computedStyle!.textShadow!, newColor: Colors.ColorEntry | null = null, prevColor: string | null,
                                    prevHslColor: Colors.HslaColor, shadowContrast: number, inheritedShadowColor;
                                let uniqColors = new Set<string>(newTextShadow
                                    .replace(/([\.\d]+px)/gi, '')
                                    .match(/(rgba?\([^\)]+\)|#[a-z\d]+|[a-z]+)/gi) || []);
                                if (uniqColors.size > 0)
                                {
                                    uniqColors.forEach(c =>
                                    {
                                        prevColor = /rgb/gi.test(c) ? c : this._colorConverter.convert(c);
                                        if (prevColor)
                                        {
                                            inheritedShadowColor = this._textShadowColorProcessor.getInheritedColor(tag as HTMLElement, prevColor);
                                            inheritedShadowColor && (prevColor = inheritedShadowColor.originalColor);
                                            prevHslColor = Colors.RgbaColor.toHslaColor(Colors.RgbaColor.parse(prevColor));
                                            shadowContrast = Math.abs(prevHslColor.lightness - roomRules!.color!.originalLight) / originalTextContrast * currentTextContrast;
                                            newColor = this._textShadowColorProcessor.changeColor(prevColor, roomRules!.color!.light, tag, shadowContrast);
                                            if (newColor.color)
                                            {
                                                newTextShadow = newTextShadow.replace(new RegExp(Util.escapeRegex(c), "gi"), newColor.color);
                                            }
                                        }
                                    });
                                    if (newTextShadow !== tag.computedStyle!.textShadow)
                                    {
                                        roomRules.textShadow = { value: newTextShadow, color: newColor };
                                    }
                                }
                            }
                        }
                    }

                    if (tag instanceof HTMLCanvasElement || tag instanceof doc.defaultView.HTMLCanvasElement)
                    {
                        let filterValue: Array<string>;
                        const customCanvasRole = tag.computedStyle!.getPropertyValue(`--ml-${cc[cc.Background].toLowerCase()}-${this._css.backgroundColor}`) as keyof Colors.ComponentShift;
                        let bgrSet = this.shift[customCanvasRole] || this.shift.Background,
                            txtSet = this.shift.Text;

                        if (this.shift.Background.lightnessLimit < 0.3 && tag.computedStyle!.getPropertyValue("--ml-no-invert") !== true.toString())
                        {
                            roomRules.backgroundColor.color = null;
                            filterValue = [
                                tag.computedStyle!.filter != this._css.none ? tag.computedStyle!.filter! : "",
                                bgrSet.saturationLimit < 1 ? `saturate(${bgrSet.saturationLimit})` : "",
                                `brightness(${float.format(1 - bgrSet.lightnessLimit)})`,
                                `hue-rotate(180deg) invert(1)`,
                                this._settingsManager.currentSettings.blueFilter !== 0 ? `url("#ml-blue-filter")` : "",
                                `brightness(${txtSet.lightnessLimit})`
                            ];
                        }
                        else
                        {
                            filterValue = [
                                tag.computedStyle!.filter != this._css.none ? tag.computedStyle!.filter! : "",
                                bgrSet.saturationLimit < 1 ? `saturate(${bgrSet.saturationLimit})` : "",
                                this._settingsManager.currentSettings.blueFilter !== 0 ? `url("#ml-blue-filter")` : "",
                                bgrSet.lightnessLimit < 1 ? `brightness(${bgrSet.lightnessLimit})` : ""
                            ];
                        }
                        roomRules.filter = { value: filterValue.filter(f => f).join(" ").trim() };
                    }

                    if (isSvg && tag.computedStyle!.stroke !== this._css.none || !isSvg && tag.computedStyle!.borderStyle !== this._css.none)
                    {
                        let brdColor = tag.computedStyle!.getPropertyValue(ns.css.brdColor);
                        if (brdColor.indexOf(" r") == -1 && brdColor != "")
                        {
                            if (brdColor === tag.computedStyle!.getPropertyValue(ns.css.bgrColor))
                            {
                                let result = Object.assign({}, roomRules.backgroundColor);
                                roomRules.borderColor = Object.assign(result, { reason: Colors.ColorReason.SameAsBackground, owner: this._app.isDebug ? tag : null });
                            }
                            else
                            {
                                roomRules.borderColor = this.changeColor({ role: isButton ? cc.ButtonBorder : cc.Border, property: ns.css.brdColor, tag: tag, bgLight: bgLight });
                            }
                        }
                        else if (!isSvg)
                        {
                            let borderRole = isButton ? cc.ButtonBorder : cc.Border, transBordersCount = 0;
                            if (tag.isPseudo && tag.computedStyle!.width === this._css._0px && tag.computedStyle!.height === this._css._0px &&
                                ((transBordersCount = [
                                    tag.computedStyle!.borderTopColor,
                                    tag.computedStyle!.borderRightColor,
                                    tag.computedStyle!.borderBottomColor,
                                    tag.computedStyle!.borderLeftColor
                                ].filter(c => c === Colors.RgbaColor.Transparent).length) === 3 ||
                                    transBordersCount === 2 && [
                                        tag.computedStyle!.borderTopWidth,
                                        tag.computedStyle!.borderRightWidth,
                                        tag.computedStyle!.borderBottomWidth,
                                        tag.computedStyle!.borderLeftWidth
                                    ].filter(c => c === this._css._0px).length === 1))
                            {
                                borderRole = cc.Background;
                            }
                            roomRules.borderTopColor = this.changeColor(
                                { role: borderRole, property: this._css.borderTopColor, tag: tag, bgLight: bgLight });

                            roomRules.borderRightColor = this.changeColor(
                                { role: borderRole, property: this._css.borderRightColor, tag: tag, bgLight: bgLight });

                            roomRules.borderBottomColor = this.changeColor(
                                { role: borderRole, property: this._css.borderBottomColor, tag: tag, bgLight: bgLight });

                            roomRules.borderLeftColor = this.changeColor(
                                { role: borderRole, property: this._css.borderLeftColor, tag: tag, bgLight: bgLight });
                        }
                    }
                }

                //this.applyRoomRules(tag, roomRules, ns);

                // beforePseudoElement && this.processElement(beforePseudoElement);
                // afterPseudoElement && this.processElement(afterPseudoElement);

                if (room)
                {
                    this._dorm.get(doc)!.set(room, roomRules);
                }

                if (isRealElement(tag))
                {
                    tag.mlBgColor = roomRules.backgroundColor;
                    tag.mlColor = roomRules.color;
                    if (roomRules.textShadow)
                    {
                        tag.mlTextShadow = roomRules.textShadow.color;
                    }
                }

                // return [beforePseudoElement, afterPseudoElement].filter(x => x).map(x => x!.stylePromise);

                return { roomRules: roomRules, before: beforePseudoElement, after: afterPseudoElement };
            }
            return undefined;
        }

        protected changeColor(
            {
                role: component, property: property, tag: tag, bgLight: bgLight
            }:
                {
                    role: Colors.Component, property: string, tag: HTMLElement | PseudoElement, bgLight?: number
                }): Colors.ColorEntry | undefined
        {
            if (tag.computedStyle)
            {
                const propRole = (cc as any as { [p: string]: Colors.Component })
                [tag.computedStyle.getPropertyValue(`--ml-${cc[component].toLowerCase()}-${property}`)];
                if (propRole !== undefined)
                {
                    const propVal = tag.computedStyle!.getPropertyValue(property);
                    let bgLightVal = 1;
                    switch (propRole)
                    {
                        case cc.Background:
                            return this._backgroundColorProcessor.changeColor(propVal, true, tag, this._boundParentBackgroundGetter);

                        case cc.ButtonBackground:
                            return this._buttonBackgroundColorProcessor.changeColor(propVal, true, tag, this._boundParentBackgroundGetter);

                        case cc.Text:
                            bgLightVal = bgLight !== undefined ? bgLight : this.getParentBackground(tag).light;
                            return this._textColorProcessor.changeColor(propVal, bgLightVal, tag);

                        case cc.HighlightedText:
                            bgLightVal = bgLight !== undefined ? bgLight : this.getParentBackground(tag).light;
                            return this._highlightedTextColorProcessor.changeColor(propVal, bgLightVal, tag);

                        case cc.Link:
                            bgLightVal = bgLight !== undefined ? bgLight : this.getParentBackground(tag).light;
                            return this._linkColorProcessor.changeColor(propVal, bgLightVal, tag);

                        case cc.VisitedLink:
                            bgLightVal = bgLight !== undefined ? bgLight : this.getParentBackground(tag).light;
                            return this._visitedLinkColorProcessor.changeColor(propVal, bgLightVal, tag);

                        case cc.Border:
                            bgLightVal = bgLight !== undefined ? bgLight : this.getParentBackground(tag).light;
                            return this._borderColorProcessor.changeColor(propVal, bgLightVal, tag);

                        case cc.ButtonBorder:
                            bgLightVal = bgLight !== undefined ? bgLight : this.getParentBackground(tag).light;
                            return this._buttonBorderColorProcessor.changeColor(propVal, bgLightVal, tag);

                        case cc.SvgBackground:
                            return this._svgColorProcessor.changeColor(propVal, false, tag, this._boundParentBackgroundGetter);

                        case cc.TextSelection:
                            return this._textSelectionColorProcessor.changeColor(propVal, true, tag, this._boundParentBackgroundGetter);
                    }
                }
            }
            return undefined;
        }

        protected removeTemporaryFilter(tag: HTMLElement | PseudoElement)
        {
            if (!tag.keepFilter)
            {
                if (tag.originalFilter !== undefined)
                {
                    tag.style.setProperty(this._css.filter, tag.originalFilter)
                }
                isRealElement(tag) && tag.removeAttribute(this._css.transition);
            }
        }

        protected processBackgroundGradient(tag: HTMLElement | PseudoElement, isButton: boolean, index: number, gradient: string, size: string, roomRules: RoomRules)
        {
            let mainColor: Colors.ColorEntry | null = null, lightSum = 0;
            let uniqColors = new Set<string>(gradient // -webkit-gradient(linear, 0% 0%, 0% 100%, from(rgb(246, 246, 245)), to(rgb(234, 234, 234)))
                .replace(/webkit|moz|ms|repeating|linear|radial|from|\bto\b|gradient|circle|ellipse|top|left|bottom|right|farthest|closest|side|corner|color|stop|[\.\d]+%|[\.\d]+[a-z]{2,3}/gi, '')
                .match(/(rgba?\([^\)]+\)|#[a-z\d]{6}|[a-z]+)/gi) || []);
            if (uniqColors.size > 0)
            {
                uniqColors.forEach(c =>
                {
                    let prevColor = /rgb/gi.test(c) ? c : this._colorConverter.convert(c);
                    let newColor = isButton
                        ? this._buttonBackgroundColorProcessor.changeColor(prevColor, false, tag)
                        : this._backgroundColorProcessor.changeColor(prevColor, false, tag);
                    lightSum += newColor.light;
                    if (newColor.color)
                    {
                        gradient = gradient.replace(new RegExp(Util.escapeRegex(c), "gi"), newColor.color);
                    }
                    if (!mainColor && newColor.alpha > 0.5 && roomRules.backgroundColor)
                    {
                        mainColor = roomRules.backgroundColor = Object.assign({}, roomRules.backgroundColor);
                        mainColor.light = newColor.light;
                    }
                });
                mainColor && (mainColor!.light = lightSum / uniqColors.size);
            }
            return new BackgroundImage(size, gradient, BackgroundImageType.Gradient);
        }

        protected getAbsoluteUrl(doc: Document, relativeUrl: string): string
        {
            let anchor = this._anchors.get(doc);
            if (!anchor)
            {
                anchor = doc.createElement("a");
                this._anchors.set(doc, anchor);
            }
            anchor.href = relativeUrl;
            return anchor.href;
        }

        protected processBackgroundImage(tag: HTMLElement | PseudoElement, index: number, url: string,
            size: string, roomRules: RoomRules, doInvert: boolean, isPseudoContent: boolean, bgFilter: string):
            BackgroundImage | Promise<BackgroundImage>
        {
            let imageKey = [url, size, doInvert].join("-");
            roomRules.backgroundImageKeys = roomRules.backgroundImageKeys || {};
            roomRules.backgroundImageKeys[index] = imageKey;
            let prevImage = this._images.get(imageKey);
            if (prevImage)
            {
                return prevImage;
            }
            let prevPromise = this._imagePromises.get(imageKey);
            if (prevPromise)
            {
                roomRules.hasBackgroundImagePromises = true;
                return prevPromise;
            }
            url = this.getAbsoluteUrl(tag.ownerDocument, Util.trim(url.substr(3), "()'\""));
            let dataPromise = fetch(url, { cache: "force-cache" })
                .then(resp => resp.blob())
                .then(blob => new Promise<string>((resolve, reject) =>
                {
                    let rdr = new FileReader();
                    rdr.onload = (e) => resolve((e.target as FileReader).result);
                    rdr.readAsDataURL(blob);
                }))
                .then(dataUrl => new Promise<{ data: string, width: number, height: number }>((resolve, reject) =>
                {
                    let img = new Image();
                    img.onload = (e) =>
                    {
                        let trg = (e.target as HTMLImageElement);
                        resolve({ data: trg.src, width: trg.naturalWidth, height: trg.naturalHeight })
                    };
                    img.src = dataUrl;
                }));

            const bgFltr = bgFilter.replace('"#ml-blue-filter"', '#ml-blue-filter');
            let result = Promise.all([dataPromise, size, bgFltr, this._settingsManager.currentSettings.blueFilter / 100]).then(
                ([img, bgSize, fltr, blueFltr]) =>
                {
                    let imgWidth = img.width + this._css.px, imgHeight = img.height + this._css.px;
                    return new BackgroundImage(
                        /^(auto\s?){1,2}$/i.test(bgSize) ? imgWidth + " " + imgHeight : bgSize,
                        "url(data:image/svg+xml," + encodeURIComponent
                            (
                            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${img.width} ${img.height}" filter="${fltr}">` +
                            `<filter id="ml-blue-filter"><feColorMatrix type="matrix" values="` +
                            `1 0 ${blueFltr} 0 0 0 1 0 0 0 0 0 ${1 - blueFltr} 0 0 0 0 0 1 0"/></filter>` +
                            `<image width="${imgWidth}" height="${imgHeight}" href="${img.data}"/></svg>`
                            ).replace(/\(/g, "%28").replace(/\)/g, "%29") + ")",
                        BackgroundImageType.Image
                    );
                });
            this._imagePromises.set(imageKey, result);
            roomRules.hasBackgroundImagePromises = true;
            return result;
        }

        protected applyBackgroundImages(tag: HTMLElement | PseudoElement, backgroundImages: BackgroundImage[])
        {
            let originalState = this._documentObserver.stopDocumentObservation(tag.ownerDocument);
            this.removeTemporaryFilter(tag);
            tag.style.setProperty(this._css.backgroundImage, backgroundImages.map(bgImg => bgImg.data).join(","), this._css.important);
            tag.style.setProperty(this._css.backgroundSize, backgroundImages.map(bgImg => bgImg.size).join(","), this._css.important);
            this._documentObserver.startDocumentObservation(tag.ownerDocument, originalState);
            return tag;
        }

        protected onIFrameLoaded(iframe: HTMLIFrameElement)
        {
            try
            {
                let childDoc = iframe.contentDocument || iframe.contentWindow.document;
                setTimeout(dom.addEventListener(childDoc, "DOMContentLoaded", this.onIFrameDocumentLaoded, this, false, childDoc), 1);
            }
            catch (ex)
            {
                //docProc._app.isDebug && console.error(ex);
            }
        }

        protected onIFrameDocumentLaoded(doc: Document)
        {
            if (doc.readyState != "loading" && doc.readyState != "uninitialized" && doc.body && !doc.body.mlBgColor)
            {
                this.createDynamicStyle(doc);
                this.processDocument(doc);
            }
        }

        protected overrideInnerHtml(tag: HTMLElement)
        {
            if (!tag.innerHtmlGetter)
            {
                tag.innerHtmlGetter = tag.__lookupGetter__<string>('innerHTML');
                Object.defineProperty(tag, "innerHTML",
                    {
                        get: this.getInnerHtml.bind(this, tag),
                        set: tag.__lookupSetter__('innerHTML').bind(tag)
                    });
            }
        }

        protected getInnerHtml(tag: HTMLElement)
        {
            if (!tag.innerHtmlCache || Date.now() - tag.innerHtmlCache.timestamp > 5000)
            {
                this.restoreDocumentColors(tag.ownerDocument);
                tag.innerHtmlCache = { timestamp: Date.now(), value: tag.innerHtmlGetter() };
                setTimeout(this.processDocument, 1, tag.ownerDocument);
            }
            return tag.innerHtmlCache.value;
        }

        protected removeDynamicStyle(doc: Document)
        {
            const dynamicStyle = doc.getElementById("midnight-lizard-dynamic-style");
            dynamicStyle && dynamicStyle.remove();
            const svgFilters = doc.getElementById("midnight-lizard-filters");
            svgFilters && svgFilters.remove();
        }

        protected createDynamicStyle(doc: Document)
        {
            const sheet = doc.createElement('style');
            sheet.id = "midnight-lizard-dynamic-style";
            sheet.mlIgnore = true;
            const sbSize = this._settingsManager.currentSettings.scrollbarSize;
            const selectionColor = this._textSelectionColorProcessor.changeColor(cx.White, false, doc).color;
            const bgLight = this.shift.Background.lightnessLimit;
            const thumbHoverColor = this._scrollbarHoverColorProcessor.changeColor(cx.White, bgLight).color;
            const thumbNormalColor = this._scrollbarNormalColorProcessor.changeColor(cx.White, bgLight).color;
            const thumbActiveColor = this._scrollbarActiveColorProcessor.changeColor(cx.White, bgLight).color;
            const trackColor = this._backgroundColorProcessor.changeColor(cx.White, false, doc.documentElement).color;
            let globalVars = "";
            let component: keyof Colors.ComponentShift,
                property: keyof Colors.ColorShift;
            for (component in this.shift)
            {
                for (property in this.shift[component])
                {
                    globalVars += `\n--ml${
                        component.replace("$", "").replace(/([A-Z])/g, "-$1")
                        }-${
                        property.replace(/([A-Z])/g, "-$1")
                        }:${
                        this.shift[component][property]
                        };`.toLowerCase();
                }
            }
            globalVars += `\n--ml-invert:${bgLight < 0.3 ? 1 : 0};`;
            globalVars += `\n--ml-is-active:${this._settingsManager.isActive ? 1 : 0};`;
            let selection = `:not(imp)::{x}selection{ background-color: ${selectionColor}!important; color: white!important; text-shadow: rgba(0, 0, 0, 0.8) 0px 0px 1px!important; border:solid 1px red!important; }`;
            const mozSelection = selection.replace("{x}", "-moz-");
            selection = selection.replace("{x}", "");
            const linkColors =
                "[style*=--link]:link:not(imp),a[style*=--link]:not(:visited) { color: var(--link-color)!important; }" +
                "[style*=--visited]:visited:not(imp) { color: var(--visited-color)!important; }";
            let scrollbars = "";
            if (sbSize)
            {
                scrollbars = `
                scrollbar { width: calc(${sbSize}px / var(--ml-zoom))!important; height: calc(${sbSize}px / var(--ml-zoom))!important; background: ${thumbNormalColor}!important; }
                scrollbar-button:hover { --bg-color: ${thumbHoverColor}; }
                scrollbar-button:active { --bg-color: ${thumbActiveColor}; }
                scrollbar-button
                {
                    --bg-color: ${thumbNormalColor};
                    width:calc(${sbSize}px / var(--ml-zoom))!important; height:calc(${sbSize}px / var(--ml-zoom))!important;
                    box-shadow: inset 0 0 1px rgba(0,0,0,0.3)!important;
                    background:
                        linear-gradient(var(--deg-one), var(--bg-color) 34%, transparent 35%, transparent 55%, var(--bg-color) 56%),
                        linear-gradient(var(--deg-two), var(--bg-color) 34%, transparent 35%, transparent 55%, var(--bg-color) 56%),
                        linear-gradient(var(--deg-one), transparent 49%, currentColor 50%, currentColor 55%, transparent 56%),
                        linear-gradient(var(--deg-two), transparent 49%, currentColor 50%, currentColor 55%, transparent 56%),
                        var(--bg-color)!important;
                }
                scrollbar-button:vertical:decrement { --deg-one: 45deg; --deg-two: -45deg; }
                scrollbar-button:vertical:increment { --deg-one: 135deg; --deg-two: -135deg; }
                scrollbar-button:horizontal:decrement { --deg-one: -135deg; --deg-two: -45deg; }
                scrollbar-button:horizontal:increment { --deg-one: 45deg; --deg-two: 135deg; }
                scrollbar-thumb:hover { --bg-color: ${thumbHoverColor}; }
                scrollbar-thumb:active { --bg-color: ${thumbActiveColor}; }
                scrollbar-thumb:horizontal { --deg-one: 90deg; --deg-two: 0deg; min-width: calc(${sbSize * 2}px / var(--ml-zoom))!important; }
                scrollbar-thumb:vertical { --deg-one: 0deg; --deg-two: 90deg; min-height: calc(${sbSize * 2}px / var(--ml-zoom))!important; }
                scrollbar-thumb
                {
                    --bg-color: ${thumbNormalColor};
                    border-radius: calc(${sbSize / 10}px / var(--ml-zoom))!important; border: none!important;
                    box-shadow: inset 0 0 1px rgba(0,0,0,0.3)!important;
                    background:
                        linear-gradient(var(--deg-two),
                            var(--bg-color) 30%,
                            transparent 30%, transparent 70%,
                            var(--bg-color) 70%),
                        linear-gradient(var(--deg-one),
                            transparent 9%,
                            currentColor 10%, currentColor 15%,
                            transparent 16%, transparent 34%,
                            currentColor 35%, currentColor 40%,
                            transparent 41%, transparent 59%,
                            currentColor 60%, currentColor 65%,
                            transparent 66%, transparent 84%,
                            currentColor 85%, currentColor 90%,
                            transparent 91%),
                        var(--bg-color)!important;
                    background-size: calc(${sbSize}px / var(--ml-zoom)) calc(${sbSize}px / var(--ml-zoom))!important;
                    background-repeat: no-repeat!important;
                    background-position: center!important;
                }
                scrollbar-track { background: ${trackColor}!important; box-shadow: inset 0 0 calc(${sbSize * 0.6}px / var(--ml-zoom)) rgba(0,0,0,0.3)!important; border-radius: 0px!important; border: none!important; }
                scrollbar-track-piece { background: transparent!important; border: none!important; box-shadow: none!important; }
                scrollbar-corner { background: ${thumbNormalColor}!important; }`
                    .replace(/\sscrollbar/g, " :not(impt)::-webkit-scrollbar");
            }
            sheet.innerHTML = `:root { ${globalVars} }\n${selection}\n${mozSelection}\n${linkColors}\n${scrollbars}`
                .replace(/\s{16}(?=\S)/g, "");
            (doc.head || doc.documentElement).appendChild(sheet);
        }

        protected createSvgFilters(doc: Document)
        {
            const svgFilter = document.createElementNS("http://www.w3.org/2000/svg", "svg"),
                blueFltr = this._settingsManager.currentSettings.blueFilter / 100,
                redShiftMatrix = `1 0 ${blueFltr} 0 0 0 1 0 0 0 0 0 ${1 - blueFltr} 0 0 0 0 0 1 0`;
            svgFilter.id = "midnight-lizard-filters"
            svgFilter.mlIgnore = true;
            svgFilter.style.height = this._css._0px;
            svgFilter.style.position = this._css.absolute;
            svgFilter.innerHTML = `<filter id="ml-blue-filter"><feColorMatrix type="matrix" values="${redShiftMatrix}"/></filter>`;
            doc.body.appendChild(svgFilter);
        }

        protected createPseudoStyles(doc: Document)
        {
            if (!doc.mlPseudoStyles)
            {
                doc.mlPseudoStyles = doc.createElement('style');
                doc.mlPseudoStyles.id = "midnight-lizard-pseudo-styles";
                doc.mlPseudoStyles.mlIgnore = true;
                doc.mlPseudoStyles.innerHTML = this.getStandardPseudoStyles();
                (doc.head || doc.documentElement).appendChild(doc.mlPseudoStyles);
            }
        }

        protected getStandardPseudoStyles()
        {
            const css = new Array<string>();
            for (let pseudoType of Util.getEnumValues<PseudoType>(PseudoType))
            {
                for (let pseudoStandard of Util.getEnumValues<PseudoStyleStandard>(PseudoStyleStandard))
                {
                    css.push(this.getStandardPseudoStyleSelector(pseudoType, pseudoStandard, this._standardPseudoCssTexts.get(pseudoStandard)))
                }
            }
            return css.join("\n");
        }

        protected getStandardPseudoStyleSelector(pseudoType: PseudoType, pseudoStyleStandard: PseudoStyleStandard, cssText?: string)
        {
            const pseudo = PseudoType[pseudoType].toLowerCase();
            return `[${pseudo}-style="${PseudoStyleStandard[pseudoStyleStandard]}"]:not(impt)::${pseudo} { ${cssText} }`;
        }

        protected clearPseudoStyles(doc: Document)
        {
            if (doc.mlPseudoStyles)
            {
                doc.mlPseudoStyles.innerHTML = this.getStandardPseudoStyles();
            }
        }

        protected createLoadingStyles(doc: Document)
        {
            let noTrans = doc.createElement('style');
            noTrans.id = "midnight-lizard-no-trans-style";
            noTrans.mlIgnore = true;
            noTrans.innerHTML = ":not([transition]) { transition: all 0s ease 0s !important; }";
            (doc.head || doc.documentElement).appendChild(noTrans);

            let bgrLight = this.shift.Background.lightnessLimit,
                imgLight = this.shift.Image.lightnessLimit,
                imgSatrt = this.shift.Image.saturationLimit,
                bgrColor = this._backgroundColorProcessor.changeColor(cx.White, false, doc.documentElement).color,
                txtColor = this._textColorProcessor.changeColor(cx.Black, bgrLight, doc.documentElement).color,
                brdColor = this._borderColorProcessor.changeColor(cx.Black, bgrLight, doc.documentElement).color,
                style = doc.createElement('style');
            style.id = "midnight-lizard-loading-style";
            style.mlIgnore = true;
            style.innerHTML =
                `img[src]:not(impt),iframe:not(impt){filter:brightness(${imgLight}) saturate(${imgSatrt})!important}` +
                `:not(impt),:not(impt):before,:not(impt):after` +
                `{` +
                ` background-image:none!important;` +
                ` background-color:${bgrColor}!important;` +
                ` color:${txtColor}!important;` +
                ` border-color:${brdColor}!important` +
                `}`;
            (doc.head || doc.documentElement).appendChild(style);
        }

        protected removeLoadingStyles(doc: Document)
        {
            let style = doc.getElementById("midnight-lizard-loading-style");
            style && style.remove();
            const removeNoTrans = ((d: Document) => 
            {
                let noTrans = d.getElementById("midnight-lizard-no-trans-style");
                noTrans && noTrans.remove();
            }).bind(null, doc);
            setTimeout(requestAnimationFrame.bind(doc.defaultView, removeNoTrans), 100);
        }

        protected createPageScript(doc: Document)
        {
            try
            {
                let pageScript = doc.createElement("script");
                pageScript.id = "midnight-lizard-page-script";
                pageScript.type = "text/javascript";
                pageScript.src = this._app.getFullPath("/js/page-script.js");
                (doc.head || doc.documentElement).appendChild(pageScript);
            }
            catch (ex)
            {
                this._app.isDebug && console.error(ex);
            }
        }

        protected removePageScript(doc: Document)
        {
            let pageScript = doc.getElementById("midnight-lizard-page-script");
            pageScript && pageScript.remove();
        }

        public applyRoomRules(tag: HTMLElement | PseudoElement, roomRules: RoomRules, _ns?: any)
        {
            let isSvg = tag instanceof SVGElement || tag instanceof tag.ownerDocument.defaultView.SVGElement;
            let applyBgPromise;
            let ns = USP.htm;
            ns = _ns || (isSvg ? USP.svg : USP.htm);
            if (isRealElement(tag) && roomRules.attributes && roomRules.attributes.size > 0)
            {
                roomRules.attributes.forEach((attrValue, attrName) => tag.setAttribute(attrName, attrValue));
            }
            if (roomRules.filter && roomRules.filter.value)
            {
                tag.keepFilter = roomRules.keepFilter;
                tag.originalFilter = tag.style.filter;
                tag.currentFilter = roomRules.filter.value;
                if (tag.isPseudo)
                {
                    tag.style.setProperty(this._css.filter, roomRules.filter.value, this._css.important);
                }
                else
                {
                    tag.style.setProperty(this._css.filter, roomRules.filter.value);
                }
            }

            if (roomRules.transitionDuration && roomRules.transitionDuration.value)
            {
                tag.originalTransitionDuration = tag.style.transitionDuration;
                tag.style.setProperty(this._css.transitionDuration, roomRules.transitionDuration.value, this._css.important)
            }

            if (roomRules.backgroundImages)
            {
                tag.originalBackgroundImage = tag.style.backgroundImage;
                tag.originalBackgroundSize = tag.style.backgroundSize;
                if (roomRules.hasBackgroundImagePromises)
                {
                    applyBgPromise = Promise.all
                        ([tag, roomRules, ...roomRules.backgroundImages] as [HTMLElement | PseudoElement, RoomRules, BackgroundImage])
                        .then(([t, rr, ...bgImgs]) =>
                        {
                            rr.backgroundImages = bgImgs as BackgroundImage[];
                            rr.hasBackgroundImagePromises = false;
                            (bgImgs as BackgroundImage[]).forEach((img: BackgroundImage, index) =>
                            {
                                this._images.set(rr.backgroundImageKeys[index], img);
                            });
                            return this.applyBackgroundImages(t, bgImgs as BackgroundImage[]);
                        });
                    Promise
                        .all([tag, Util.handlePromise(applyBgPromise)])
                        .then(([tag, result]) => 
                        {
                            if (result && result.status === Util.PromiseStatus.Failure)
                            {
                                this._app.isDebug && console.error("Can not fetch background image: " + result.data);
                                let originalState = this._documentObserver.stopDocumentObservation(tag.ownerDocument);
                                this.removeTemporaryFilter(tag);
                                this._documentObserver.startDocumentObservation(tag.ownerDocument, originalState);
                            }
                        });
                }
                else
                {
                    this.applyBackgroundImages(tag, roomRules.backgroundImages as BackgroundImage[]);
                }
            }

            if (roomRules.textShadow && roomRules.textShadow.value)
            {
                tag.originalTextShadow = tag.style.textShadow;
                tag.style.setProperty(ns.css.shdColor, roomRules.textShadow.value, this._css.important);
            }

            if (roomRules.display)
            {
                tag.originalDisplay = tag.style.display;
                tag.style.setProperty(this._css.display, roomRules.display, this._css.important);
            }

            if (roomRules.backgroundColor && roomRules.backgroundColor.color)
            {
                tag.originalBackgroundColor = tag.style.getPropertyValue(ns.css.bgrColor);
                tag.style.setProperty(ns.css.bgrColor, roomRules.backgroundColor.color, this._css.important);
            }

            if (roomRules.color && roomRules.color.color)
            {
                tag.originalColor = tag.style.getPropertyValue(ns.css.fntColor);
                if (tag.originalColor && isRealElement(tag) && ((tag.parentElement &&
                    (tag.parentElement instanceof HTMLElement || tag.parentElement && (tag.parentElement as any) instanceof tag.ownerDocument.defaultView.HTMLElement) &&
                    tag.parentElement!.contentEditable === true.toString()) || tag.contentEditable === true.toString()))
                {
                    tag.style.setProperty(this._css.originalColor, tag.originalColor!);
                }
                if (roomRules.visitedColor && roomRules.visitedColor.color)
                {
                    tag.style.setProperty(this._css.linkColor, roomRules.color.color, this._css.important);
                    tag.style.setProperty(this._css.visitedColor, roomRules.visitedColor.color, this._css.important);
                }
                else
                {
                    tag.style.setProperty(ns.css.fntColor, roomRules.color.color, this._css.important);
                }
            }
            else if (roomRules.color && (roomRules.color.reason === Colors.ColorReason.Inherited) && tag.style.getPropertyValue(ns.css.fntColor))
            {
                tag.originalColor = "";
            }

            if (roomRules.borderColor && roomRules.borderColor.color)
            {
                tag.originalBorderColor = tag.style.getPropertyValue(ns.css.brdColor);
                tag.style.setProperty(ns.css.brdColor, roomRules.borderColor.color, this._css.important);
            }
            else
            {
                if (roomRules.borderTopColor && roomRules.borderTopColor.color)
                {
                    tag.originalBorderTopColor = tag.style.borderTopColor;
                    tag.style.setProperty(this._css.borderTopColor, roomRules.borderTopColor.color, this._css.important);
                }

                if (roomRules.borderRightColor && roomRules.borderRightColor.color)
                {
                    tag.originalBorderRightColor = tag.style.borderRightColor;
                    tag.style.setProperty(this._css.borderRightColor, roomRules.borderRightColor.color, this._css.important);
                }

                if (roomRules.borderBottomColor && roomRules.borderBottomColor.color)
                {
                    tag.originalBorderBottomColor = tag.style.borderBottomColor;
                    tag.style.setProperty(this._css.borderBottomColor, roomRules.borderBottomColor.color, this._css.important);
                }

                if (roomRules.borderLeftColor && roomRules.borderLeftColor.color)
                {
                    tag.originalBorderLeftColor = tag.style.borderLeftColor;
                    tag.style.setProperty(this._css.borderLeftColor, roomRules.borderLeftColor.color, this._css.important);
                }
            }

            if (tag.className === "goog-color-menu-button-indicator" && /t-text-color/g.test(tag.path || ""))
            {
                console.log(roomRules);
                console.log(tag.style.cssText);
            }

            if (isPseudoElement(tag))
            {
                if (applyBgPromise)
                {
                    applyBgPromise.then(x => (x as PseudoElement).applyStyleChanges());
                    Promise.all([tag, applyBgPromise.catch(ex => ex)]).then(([t]) => t.applyStyleChanges());
                }
                else
                {
                    let cssText = tag.style.cssText;
                    if (cssText)
                    {
                        for (let [standardType, standardCssText] of this._standardPseudoCssTexts)
                        {
                            if (cssText === standardCssText)
                            {
                                const attrName = `${tag.tagName}-style`,
                                    attrValue = PseudoStyleStandard[standardType];
                                if (!tag.parentRoomRules.attributes)
                                {
                                    tag.parentRoomRules.attributes = new Map<string, string>();
                                }
                                tag.parentRoomRules.attributes.set(attrName, attrValue);
                                tag.parentElement.setAttribute(attrName, attrValue);
                                cssText = "";
                                break;
                            }
                        }
                    }
                    if (cssText && tag.ownerDocument.mlPseudoStyles && Array.prototype.find.call(
                        (tag.ownerDocument.mlPseudoStyles.sheet as CSSStyleSheet).cssRules,
                        (rule: CSSStyleRule) => rule.selectorText === tag.selectorText))
                    {
                        cssText = "";
                    }
                    tag.applyStyleChanges(cssText);
                }
            }

            if (isRealElement(tag) && tag.onRoomRulesApplied)
            {
                tag.onRoomRulesApplied.raise(roomRules);
            }
        }
    }
}