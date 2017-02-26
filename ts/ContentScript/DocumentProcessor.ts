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
    const dom = Events.HtmlEvent;
    const cx = Colors.RgbaColor;
    const Status = Util.PromiseStatus;
    type PromiseResult<T> = Util.HandledPromiseResult<T>;
    type ArgEvent<TArgs> = MidnightLizard.Events.ArgumentedEvent<TArgs>;
    const ArgEventDispatcher = MidnightLizard.Events.ArgumentedEventDispatcher;
    const normalDelays = [0, 1, 10, 50, 100, 250, 500, 750, 1000];
    const smallReCalculationDelays = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    const bigReCalculationDelays = [0, 1, 5, 10, 20, 50, 75, 100, 150];
    const doNotInvertRegExp = /user|account|photo|importan|light|grey|flag/gi;

    export abstract class IDocumentProcessor
    {
        abstract get onRootDocumentProcessing(): ArgEvent<Document>;
        abstract applyRoomRules(tag: HTMLElement | PseudoElement, roomRules: RoomRules, ns: any, isVirtual: boolean): void;
    }

    /** Base Document Processor */
    @DI.injectable(IDocumentProcessor)
    class DocumentProcessor implements IDocumentProcessor
    {
        protected _rootDocumentLoaded: boolean = false;
        protected readonly _images = new Map<string, BackgroundImage>();
        protected readonly _imagePromises = new Map<string, Promise<BackgroundImage>>();
        protected readonly _dorm = new WeakMap<Document, Map<string, RoomRules>>();
        protected readonly _boundUserActionHandler: (e: Event) => void;
        protected readonly _css: MidnightLizard.ContentScript.CssStyleKeys;
        protected readonly _transitionForbiddenProperties: Set<string>;

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
            protected readonly _svgColorProcessor: MidnightLizard.Colors.ISvgBackgroundColorProcessor,
            protected readonly _scrollbarHoverColorProcessor: MidnightLizard.Colors.IScrollbarHoverColorProcessor,
            protected readonly _scrollbarNormalColorProcessor: MidnightLizard.Colors.IScrollbarNormalColorProcessor,
            protected readonly _scrollbarActiveColorProcessor: MidnightLizard.Colors.IScrollbarActiveColorProcessor,
            protected readonly _textColorProcessor: MidnightLizard.Colors.ITextColorProcessor,
            protected readonly _textShadowColorProcessor: MidnightLizard.Colors.ITextShadowColorProcessor,
            protected readonly _borderColorProcessor: MidnightLizard.Colors.IBorderColorProcessor,
            protected readonly _colorConverter: MidnightLizard.Colors.IColorToRgbaStringConverter)
        {
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
            dom.addEventListener(this._rootDocument, "DOMContentLoaded", this.onDocumentContentLoaded, this);
            _settingsManager.onSettingsInitialized.addListener(this.onSettingsInitialized, this);
            _settingsManager.onSettingsChanged.addListener(this.onSettingsChanged, this, Events.EventHandlerPriority.Low);
            _documentObserver.onElementsAdded.addListener(this.onElementsAdded, this);
            _documentObserver.onClassChanged.addListener(this.onClassChanged, this);
            _documentObserver.onStyleChanged.addListener(this.onStyleChanged, this);
        }

        protected onSettingsChanged(response: (scheme: Settings.ColorScheme) => void, shift: Colors.ComponentShift): void
        {
            this._images.clear();
            this._imagePromises.clear();
            this.restoreDocumentColors(this._rootDocument);
            if (this._settingsManager.isActive)
            {
                this.createDynamicStyle(this._rootDocument);
                this.processRootDocument();
            }
            response(this._settingsManager.currentSettings);
        }

        protected onSettingsInitialized(shift: Colors.ComponentShift): void
        {
            if (this._rootDocumentLoaded)
            {
                this.processRootDocument();
            }
            else if (this._settingsManager.isActive)
            {
                this.createLoadingStyles(this._rootDocument);
            }
            if (this._settingsManager.isActive)
            {
                this.createDynamicStyle(this._rootDocument);
            }
        }

        protected onDocumentContentLoaded()
        {
            dom.removeEventListener(this._rootDocument, "DOMContentLoaded", this.onDocumentContentLoaded);
            this._rootDocumentLoaded = true;
            if (this._settingsManager.isActive !== undefined)
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
                document.dispatchEvent(new CustomEvent("processing", { detail: doc }));
                this._styleSheetProcessor.processDocumentStyleSheets(doc);
                this._dorm.set(doc, new Map<string, RoomRules>());
                doc.viewArea = doc.defaultView.innerHeight * doc.defaultView.innerWidth;
                if (this._settingsManager.currentSettings.restoreColorsOnCopy)
                {
                    dom.addEventListener(doc, "copy", this.onCopy, this, false, doc);
                }
                this.applyLoadingShadow(doc.documentElement);
                this.removeLoadingStyles(doc);
                this.createPseudoStyles(doc);
                doc.body.isChecked = true;
                this.processElement(doc.body);
                this._documentObserver.startDocumentObservation(doc);
                let allTags = Array.prototype.slice.call(doc.getElementsByTagName("*"))
                    .filter((tag: HTMLElement) => this.checkElement(tag));
                DocumentProcessor.processAllElements(allTags, doc.documentElement, this);
            }
        }

        protected observeUserActions(tag: HTMLElement)
        {
            let preFilteredSelectors = this._styleSheetProcessor.getPreFilteredSelectors(tag);
            if (preFilteredSelectors.length > 0)
            {
                if (this._styleSheetProcessor.canHavePseudoClass(tag, preFilteredSelectors, PseudoClass.Hover))
                {
                    dom.addEventListener(tag, "mouseenter", this._boundUserActionHandler);
                    dom.addEventListener(tag, "mouseleave", this._boundUserActionHandler);
                }
                if (this._styleSheetProcessor.canHavePseudoClass(tag, preFilteredSelectors, PseudoClass.Focus))
                {
                    dom.addEventListener(tag, "focus", this._boundUserActionHandler);
                    dom.addEventListener(tag, "blur", this._boundUserActionHandler);
                }
                if (this._styleSheetProcessor.canHavePseudoClass(tag, preFilteredSelectors, PseudoClass.Active))
                {
                    dom.addEventListener(tag, "mousedown", this._boundUserActionHandler);
                    dom.addEventListener(tag, "mouseup", this._boundUserActionHandler);
                }
                if (this._styleSheetProcessor.canHavePseudoClass(tag, preFilteredSelectors, PseudoClass.Checked))
                {
                    dom.addEventListener(tag, "input", this._boundUserActionHandler);
                    dom.addEventListener(tag, "change", this._boundUserActionHandler);
                }
            }
        }

        protected onUserAction(eArg: Event)
        {
            if (this._settingsManager.isActive && (eArg.currentTarget as HTMLElement).selectors !==
                this._styleSheetProcessor.getElementMatchedSelectors(eArg.currentTarget as HTMLElement))
            {
                this.reCalcRootElement(eArg.currentTarget as HTMLElement, false, true);
            }
        }

        protected onCopy(doc: Document)
        {
            let sel = doc.defaultView.getSelection();
            if (sel && !sel.isCollapsed)
            {
                let rootElem = sel.getRangeAt(0).commonAncestorContainer as HTMLElement;
                rootElem.mlBgColor = null;
                if (!this.checkElement(rootElem))
                {
                    rootElem = rootElem.parentElement || rootElem;
                }
                rootElem = this.getColoredParent(rootElem, true, true);
                this.reCalcRootElement(rootElem, true);
            }
        }

        protected reCalcRootElement(rootElem: HTMLElement, full: boolean, clearParentBgColors = false)
        {
            if (rootElem)
            {
                let allTags: HTMLElement[] | null = rootElem.firstElementChild ? Array.prototype.slice.call(rootElem.getElementsByTagName("*")) : null;
                if (allTags && allTags.length > 0)
                {
                    let skipSelectors = full || allTags.length < 10 || this._styleSheetProcessor.getSelectorsQuality(rootElem.ownerDocument) === 0;
                    let filteredTags = allTags.filter(el => el.isChecked && el.mlBgColor && (skipSelectors || el.selectors !== this._styleSheetProcessor.getElementMatchedSelectors(el)));
                    if (!skipSelectors && clearParentBgColors)
                    {
                        allTags.forEach(tag =>
                        {
                            tag.mlParentBgColor = null;
                            if (tag.mlBgColor && tag.mlBgColor.color === null)
                            {
                                tag.mlBgColor = null;
                            }
                        });
                    }
                    filteredTags.splice(0, 0, rootElem);
                    if (filteredTags.length < 10 || full)
                    {
                        this._documentObserver.stopDocumentObservation(rootElem.ownerDocument);
                        filteredTags.forEach(tag => this.restoreElementColors(tag));
                        this._documentObserver.startDocumentObservation(rootElem.ownerDocument);
                        DocumentProcessor.processAllElements(filteredTags, rootElem, this, smallReCalculationDelays);
                    }
                    else
                    {
                        this._documentObserver.stopDocumentObservation(rootElem.ownerDocument);
                        this.applyLoadingShadow(rootElem);
                        filteredTags.forEach(tag => this.restoreElementColors(tag));
                        this._documentObserver.startDocumentObservation(rootElem.ownerDocument);
                        DocumentProcessor.processAllElements(filteredTags, rootElem, this, bigReCalculationDelays);
                    }
                }
                else
                {
                    this._documentObserver.stopDocumentObservation(rootElem.ownerDocument);
                    this.restoreElementColors(rootElem);
                    DocumentProcessor.procElementsChunk([rootElem], this, null, 0);
                }
            }
        }

        protected onStyleChanged(changedElements: Set<HTMLElement>)
        {
            let elementsForReCalculation = new Set<HTMLElement>();
            changedElements.forEach(tag =>
            {
                let needReCalculation = false, value: string | null | undefined;
                const ns = tag instanceof tag.ownerDocument.defaultView.SVGElement ? USP.svg : USP.htm;

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
                if (value && tag.style.getPropertyPriority(this._css.filter) !== this._css.important)
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
            let allNewTags = Array.from(addedElements.values()).filter(tag => this.checkElement(tag));
            DocumentProcessor.processAllElements(allNewTags, null, this);
            let allChildTags = new Set<HTMLElement>();
            allNewTags.forEach(newTag =>
            {
                Array.prototype.forEach.call(newTag.getElementsByTagName("*"), (childTag: HTMLElement) =>
                {
                    if (!addedElements.has(childTag) && this.checkElement(childTag))
                    {
                        allChildTags.add(childTag);
                    }
                });
            });
            DocumentProcessor.processAllElements(Array.from(allChildTags.values()), null, this);
        }

        protected static processAllElements(allTags: HTMLElement[], shadowElement: HTMLElement | null, docProc: DocumentProcessor, delays = normalDelays): void
        {
            if (allTags.length > 0)
            {
                let viewColorTags = new Array<HTMLElement>(), visColorTags = new Array<HTMLElement>(), invisColorTags = new Array<HTMLElement>(),
                    viewImageTags = new Array<HTMLElement>(), visImageTags = new Array<HTMLElement>(), invisImageTags = new Array<HTMLElement>(),
                    viewTransTags = new Array<HTMLElement>(), visTransTags = new Array<HTMLElement>(), invisTransTags = new Array<HTMLElement>(),
                    ns = USP.htm, isSvg: boolean, bgrColor: string, isVisible: boolean, hasBgColor: boolean, hasImage: boolean, inView: boolean,
                    hm = allTags[0].ownerDocument.defaultView.innerHeight,
                    wm = allTags[0].ownerDocument.defaultView.innerWidth;
                for (let tag of allTags)
                {
                    isSvg = tag instanceof tag.ownerDocument.defaultView.SVGElement;
                    ns = isSvg ? USP.svg : USP.htm;
                    tag.computedStyle = tag.computedStyle || tag.ownerDocument.defaultView.getComputedStyle(tag, "");
                    isVisible = tag.tagName == "BODY" || !isSvg && tag.offsetParent !== null || tag.computedStyle.position == docProc._css.fixed || isSvg;
                    bgrColor = tag.computedStyle.getPropertyValue(ns.css.bgrColor);
                    hasBgColor = !!bgrColor && bgrColor !== "rgba(0, 0, 0, 0)";
                    hasImage = tag.computedStyle.backgroundImage !== docProc._css.none || tag.tagName === ns.img;

                    if (isVisible)
                    {
                        tag.rect = tag.rect || tag.getBoundingClientRect();
                        isVisible = tag.rect.width !== 0 && tag.rect.height !== 0;
                        inView = isVisible &&
                            (tag.rect.bottom > 0 && tag.rect.bottom < hm || tag.rect.top > 0 && tag.rect.top < hm) &&
                            (tag.rect.right > 0 && tag.rect.right < wm || tag.rect.left > 0 && tag.rect.left < wm);
                        if (!isVisible)
                        {
                            tag.rect = null;
                            if (hasBgColor) invisColorTags.push(tag);
                            else if (hasImage) invisImageTags.push(tag);
                            else invisTransTags.push(tag);
                        }
                        else if (hasBgColor)
                        {
                            if (inView) viewColorTags.push(tag);
                            else visColorTags.push(tag);
                        }
                        else if (hasImage)
                        {
                            if (inView) viewImageTags.push(tag);
                            else visImageTags.push(tag);
                        }
                        else
                        {
                            if (inView) viewTransTags.push(tag);
                            else visTransTags.push(tag);
                        }
                    }
                    else
                    {
                        if (hasBgColor) invisColorTags.push(tag);
                        else if (hasImage) invisImageTags.push(tag);
                        else invisTransTags.push(tag);
                    }
                }
                let tagsArray: (HTMLElement[] | HTMLElement | null | DocumentProcessor)[][] =
                    [
                        [viewColorTags, null, docProc], [visColorTags, null, docProc], [viewImageTags, null, docProc],
                        [viewTransTags, null, docProc], [visTransTags, null, docProc], [visImageTags, null, docProc],
                        [invisColorTags, null, docProc], [invisImageTags, null, docProc], [invisTransTags, null, docProc]
                    ].filter(param => (param[0] as HTMLElement[]).length > 0);
                if (tagsArray.length > 0)
                {
                    tagsArray[0][1] = shadowElement;
                    let density = 2000 / allTags.length
                    let delayArray = delays.map(d => Math.round(d / density));
                    Util.forEachPromise(tagsArray, DocumentProcessor.processElements, 0, (prevDelay, index) => delayArray[index]);
                }
                else if (shadowElement)
                {
                    DocumentProcessor.removeLoadingShadow(shadowElement, docProc);
                }
            }
            else if (shadowElement)
            {
                DocumentProcessor.removeLoadingShadow(shadowElement, docProc);
            }
        }

        protected static processElements(tags: HTMLElement[], shadowElement: HTMLElement, docProc: DocumentProcessor, prev: null, delay: number)
        {
            shadowElement && DocumentProcessor.removeLoadingShadow(shadowElement, docProc);
            if (tags.length > 0)
            {
                let chunkLength = 500, cssPromises: IterableIterator<Promise<PromiseResult<void>>> | null = null;
                let needObservation = docProc._styleSheetProcessor.getSelectorsCount(tags[0].ownerDocument);
                if (needObservation)
                {
                    cssPromises = docProc._styleSheetProcessor.getCssPromises(tags[0].ownerDocument);
                }
                if (tags.length < chunkLength)
                {
                    let result = DocumentProcessor.procElementsChunk(tags, docProc, null, delay);
                    if (needObservation)
                    {
                        Promise.all([tags, docProc, result as any, ...cssPromises!])
                            .then(([t, dp]) => DocumentProcessor.startObservation(t, dp));
                    }
                    return result;
                }
                else
                {
                    let result = Util.forEachPromise(
                        Util.sliceIntoChunks(tags, chunkLength).map(chunk => [chunk, docProc]),
                        DocumentProcessor.procElementsChunk, delay);
                    if (needObservation)
                    {
                        Promise.all([tags, docProc, result as any, ...cssPromises!])
                            .then(([t, dp]) => DocumentProcessor.startObservation(t, dp));
                    }
                    return result;
                }
            }
            return undefined;
        }

        protected static procElementsChunk(chunk: HTMLElement[], docProc: DocumentProcessor, prev: null, delay: number)
        {
            let paramsForPromiseAll: [HTMLElement[] | Document | number | Promise<PromiseResult<string>>] =
                [chunk, chunk[0].ownerDocument, delay];
            docProc._documentObserver.stopDocumentObservation(chunk[0].ownerDocument);
            let results = chunk.map(tag => docProc.processElement(tag));
            docProc._documentObserver.startDocumentObservation(chunk[0].ownerDocument);
            results.filter(r => r).forEach(r => paramsForPromiseAll.push(...r!.map(Util.handlePromise)));
            return Promise.all<HTMLElement[] | Document | number | PromiseResult<string>>(paramsForPromiseAll)
                .then(([tags, doc, dl, ...cssArray]: [HTMLElement[], Document, number, PromiseResult<string>]) =>
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
            let maxSize = 40, maxAxis = 16,
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

        protected calcTagArea(tag: Element | PseudoElement)
        {
            if (tag.area === undefined)
            {
                tag.computedStyle = tag.computedStyle || tag.ownerDocument.defaultView.getComputedStyle(tag as Element, "");
                let width = parseInt(tag.computedStyle.width!), height = parseInt(tag.computedStyle.height!);
                if (!isNaN(width) && !isNaN(height))
                {
                    tag.area = width * height;
                }
                else
                {
                    tag.rect = tag.rect || tag.getBoundingClientRect();
                    tag.area = tag.rect.width * tag.rect.height;
                }
            }
        }

        protected calcElementPath(tag: HTMLElement | PseudoElement)
        {
            let parentPath = "";
            if (tag.parentElement)
            {
                parentPath = (tag.parentElement.path ? tag.parentElement.path : this.calcElementPath(tag.parentElement as HTMLElement)) + " ";
            }
            tag.path = parentPath + tag.tagName + "." + tag.classList.toString() + "#" + tag.id + tag.style.backgroundColor + ((tag as any).bgColor || "");
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
            let result = Colors.ColorEntry.NotFound;
            if (tag.parentElement)
            {
                let bgColor;
                let doc = tag.ownerDocument;
                let isSvg = tag instanceof doc.defaultView.SVGElement && tag.parentElement instanceof doc.defaultView.SVGElement;
                tag.computedStyle = tag.computedStyle || doc.defaultView.getComputedStyle(tag as HTMLElement, "");

                if (isRealElement(tag) && (tag.computedStyle!.position == this._css.absolute || tag.computedStyle!.position == this._css.relative || isSvg))
                {
                    tag.zIndex = isSvg ? this.getElementIndex(tag) : parseInt(tag.computedStyle!.zIndex || "0");
                    tag.zIndex = isNaN(tag.zIndex!) ? -999 : tag.zIndex;
                    let children: Element[] = Array.prototype.filter.call(tag.parentElement!.children,
                        (otherTag: Element, index: number) =>
                        {
                            if (otherTag != tag && (otherTag.isChecked || otherTag.isChecked === undefined && this.checkElement(otherTag)))
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
                bgColor = bgColor || tag.parentElement!.mlBgColor || tag.parentElement!.mlParentBgColor;
                if (bgColor)
                {
                    result = bgColor;
                }
                else
                {
                    probeRect = probeRect || (tag.rect = tag.rect || tag.getBoundingClientRect());
                    result = this.getParentBackground(tag.parentElement!, probeRect);
                }
            }
            isRealElement(tag) && (tag.mlParentBgColor = result);
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

        protected getInheritedFontColor(tag: Element | PseudoElement, rgbStr: string): Colors.ColorEntry | null
        {
            if (tag.parentElement)
            {
                if ((tag.parentElement as HTMLElement).style.color !== "")
                {
                    if (tag.parentElement.mlColor && tag.parentElement.mlColor.color === rgbStr)
                    {
                        return tag.parentElement.mlColor;
                    }
                }
                else
                {
                    return this.getInheritedFontColor(tag.parentElement, rgbStr)
                }
            }
            return null;
        }

        protected getInheritedTextShadowColor(tag: Element | PseudoElement, rgbStr: string): Colors.ColorEntry | null
        {
            if (tag.parentElement)
            {
                if ((tag.parentElement as HTMLElement).style.textShadow !== this._css.none)
                {
                    if (tag.parentElement.mlTextShadow && tag.parentElement.mlTextShadow.color == rgbStr)
                    {
                        return tag.parentElement.mlTextShadow;
                    }
                }
                else
                {
                    return this.getInheritedTextShadowColor(tag.parentElement, rgbStr)
                }
            }
            return null;
        }

        protected applyLoadingShadow(tag: HTMLElement)
        {
            if (tag.tagName != USP.htm.img)
            {
                tag.computedStyle = tag.computedStyle || tag.ownerDocument.defaultView.getComputedStyle(tag, "");
                let filter = [
                    this.shift.Background.lightnessLimit < 1 ? "brightness(" + this.shift.Background.lightnessLimit + ")" : "",
                    tag.computedStyle.filter != this._css.none ? tag.computedStyle.filter : ""
                ].join(" ");
                if (!tag.originalFilter)
                {
                    tag.originalFilter = tag.style.filter;
                }
                tag.style.setProperty(this._css.filter, filter);
            }
            return tag;
        }

        protected static removeLoadingShadow(tag: HTMLElement, docProc: DocumentProcessor)
        {
            let originalState = docProc._documentObserver.stopDocumentObservation(tag.ownerDocument);
            tag.setAttribute(docProc._css.transition, docProc._css.filter);
            tag.style.filter = tag.originalFilter!;
            tag.originalFilter = undefined;
            docProc._documentObserver.startDocumentObservation(tag.ownerDocument, originalState);
        }

        protected restoreDocumentColors(doc: Document)
        {
            this._documentObserver.stopDocumentObservation(doc);
            this.removeDynamicStyle(doc);
            this.clearPseudoStyles(doc);
            for (let tag of doc.getElementsByTagName("*"))
            {
                this.restoreElementColors(tag as HTMLElement);
            }
        }

        protected restoreElementColors(tag: HTMLElement)
        {
            if (tag.mlBgColor)
            {
                let ns = tag instanceof tag.ownerDocument.defaultView.SVGElement ? USP.svg : USP.htm;

                tag.mlBgColor = null;
                tag.mlColor = null;
                tag.mlTextShadow = null;
                tag.mlParentBgColor = null;
                tag.computedStyle = null;
                tag.rect = null;
                tag.selectors = null;

                if (tag.originalBackgroundColor !== undefined)
                {
                    tag.style.setProperty(ns.css.bgrColor, tag.originalBackgroundColor);
                }
                if (tag.originalDisplay !== undefined)
                {
                    tag.style.display = tag.originalDisplay;
                }
                if (tag.originalZIndex !== undefined)
                {
                    tag.style.zIndex = tag.originalZIndex;
                }
                if (tag.originalColor !== undefined)
                {
                    tag.style.setProperty(ns.css.fntColor, tag.originalColor);
                }
                if (tag.originalTextShadow !== undefined)
                {
                    tag.style.textShadow = tag.originalTextShadow;
                }
                if (tag.originalBorderColor !== undefined)
                {
                    tag.style.setProperty(ns.css.brdColor, tag.originalBorderColor);
                }
                if (tag.originalBorderTopColor !== undefined)
                {
                    tag.style.borderTopColor = tag.originalBorderTopColor;
                }
                if (tag.originalBorderRightColor !== undefined)
                {
                    tag.style.borderRightColor = tag.originalBorderRightColor;
                }
                if (tag.originalBorderBottomColor !== undefined)
                {
                    tag.style.borderBottomColor = tag.originalBorderBottomColor;
                }
                if (tag.originalBorderLeftColor !== undefined)
                {
                    tag.style.borderLeftColor = tag.originalBorderLeftColor;
                }
                if (tag.originalBackgroundImage !== undefined)
                {
                    tag.style.backgroundImage = tag.originalBackgroundImage;
                    if (tag.originalBackgroundSize !== undefined)
                    {
                        tag.style.backgroundSize = tag.originalBackgroundSize;
                    }
                }
                if (tag.originalFilter !== undefined)
                {
                    tag.style.filter = tag.originalFilter;
                }
                if (tag.originalTransitionDuration !== undefined)
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

                if (tag instanceof tag.ownerDocument.defaultView.HTMLIFrameElement)
                {
                    try
                    {
                        this.restoreDocumentColors(tag.contentDocument || tag.contentWindow.document);
                    }
                    catch (ex)
                    {
                        this._app.isDebug && console.error(ex);
                    }
                }
            }
        }

        protected checkElement(tag: Element)
        {
            return tag.isChecked =
                (tag instanceof Element || tag!.ownerDocument && tag!.ownerDocument.defaultView && tag instanceof tag!.ownerDocument.defaultView.HTMLElement) &&
                !tag.mlBgColor && !!tag.tagName && !tag.mlIgnore && !!(tag as HTMLElement).style;
        }

        protected processElement(tag: HTMLElement | PseudoElement): Promise<string>[] | void
        {
            if (tag && tag.ownerDocument.defaultView && !(tag as HTMLElement).mlBgColor)
            {
                let doc = tag.ownerDocument;
                let isSmall, bgInverted;
                let bgLight: number, roomRules: RoomRules | undefined, room: string | null = null;
                let isSvg = tag instanceof doc.defaultView.SVGElement,
                    isSvgText = tag instanceof doc.defaultView.SVGTextContentElement,
                    isTable =
                        tag instanceof doc.defaultView.HTMLTableElement || tag instanceof doc.defaultView.HTMLTableCellElement ||
                        tag instanceof doc.defaultView.HTMLTableRowElement || tag instanceof doc.defaultView.HTMLTableSectionElement;
                let ns = isSvg ? USP.svg : USP.htm;
                let beforePseudoElement: PseudoElement | undefined, afterPseudoElement: PseudoElement | undefined;

                if (tag instanceof doc.defaultView.HTMLIFrameElement)
                {
                    setTimeout(dom.addEventListener(tag, "load", this.onIFrameLoaded, this, false, tag), 1);
                }
                if (isRealElement(tag) && tag.contentEditable == true.toString()) this.overrideInnerHtml(tag);

                this.calcElementPath(tag);
                tag.selectors = this._styleSheetProcessor.getElementMatchedSelectors(tag);
                room = [
                    tag.path, tag.selectors, tag.style.cssText, (tag as any).color,
                    isSvg && (tag as any).getAttribute(this._css.fill) ||
                    isTable && ((tag as any).bgColor || (tag as any).background || (tag as any).getAttribute(this._css.background)), isSvg
                ].join("\n");
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
                        if (beforeStyle && beforeStyle.content)
                        {
                            roomId = roomId || (room ? Util.hashCode(room).toString() : Util.guid());
                            beforePseudoElement = new PseudoElement(PseudoType.Before, tag, roomId, beforeStyle);
                            roomRules.attributes = roomRules.attributes || new Map<string, string>();
                            roomRules.attributes.set("before-style", roomId);
                        }
                        if (afterStyle && afterStyle.content)
                        {
                            roomId = roomId || (room ? Util.hashCode(room).toString() : Util.guid());
                            afterPseudoElement = new PseudoElement(PseudoType.After, tag, roomId, afterStyle);
                            roomRules.attributes = roomRules.attributes || new Map<string, string>();
                            roomRules.attributes.set("after-style", roomId);
                        }
                    }
                    this.processTransitions(tag, roomRules);
                    if (!isSvgText)
                    {
                        if (isSvg)
                        {
                            if (this.tagIsSmall(tag))
                            {
                                isSvgText = true;
                                roomRules.backgroundColor = Object.assign({}, this.getParentBackground(tag));
                                roomRules.backgroundColor.color = null;
                            }
                            else
                            {
                                roomRules.backgroundColor = this._svgColorProcessor.changeColor(
                                    tag.computedStyle!.getPropertyValue(ns.css.bgrColor), false, tag, this.getParentBackground.bind(this));
                            }
                        }
                        else
                        {
                            roomRules.backgroundColor = this._backgroundColorProcessor.changeColor(
                                tag.computedStyle!.getPropertyValue(ns.css.bgrColor), true, tag, this.getParentBackground.bind(this));
                        }

                        if (this._app.preserveDisplay && roomRules.backgroundColor.color && tag.id && tag.className)
                        {
                            roomRules.display = tag.computedStyle!.display;
                        }
                    }
                    else
                    {
                        roomRules.backgroundColor = Object.assign({}, this.getParentBackground(tag));
                        roomRules.backgroundColor.color = null;
                    }

                    if ((tag.tagName == ns.img || tag instanceof doc.defaultView.HTMLInputElement &&
                        (tag.type == "checkbox" || tag.type == "radio") && tag.computedStyle!.webkitAppearance !== this._css.none) &&
                        (this.shift.Image.lightnessLimit < 1 || this.shift.Image.saturationLimit < 1))
                    {
                        let imgSet = this.shift.Image;
                        roomRules.filter =
                            {
                                value: [
                                    imgSet.lightnessLimit < 1 ? `brightness(${imgSet.lightnessLimit})` : "",
                                    imgSet.saturationLimit < 1 ? `saturate(${imgSet.saturationLimit})` : "",
                                    tag.computedStyle!.filter != this._css.none ? tag.computedStyle!.filter : ""
                                ].join(" ").trim()
                            };
                        roomRules.attributes = roomRules.attributes || new Map<string, string>();
                        roomRules.attributes.set(this._css.transition, this._css.filter);
                    }
                    let bgInverted = roomRules.backgroundColor.originalLight - roomRules.backgroundColor.light > this.shift.Text.contrast;

                    if (tag instanceof doc.defaultView.HTMLCanvasElement)
                    {
                        let filterValue = new Array<string>();
                        let bgrSet = this.shift.Background,
                            txtSet = this.shift.Text;

                        if (bgInverted)
                        {
                            filterValue.push(
                                `brightness(${1 - bgrSet.lightnessLimit})`,
                                bgrSet.saturationLimit < 1 ? `saturate(${bgrSet.saturationLimit})` : "",
                                `invert(1)`,
                                `brightness(${txtSet.lightnessLimit})`,
                                tag.computedStyle!.filter != this._css.none ? tag.computedStyle!.filter! : ""
                            );
                        }
                        else
                        {
                            filterValue.push(
                                bgrSet.lightnessLimit < 1 ? `brightness(${bgrSet.lightnessLimit})` : "",
                                bgrSet.saturationLimit < 1 ? `saturate(${bgrSet.saturationLimit})` : "",
                                tag.computedStyle!.filter != this._css.none ? tag.computedStyle!.filter! : ""
                            );
                        }
                        roomRules.filter = { value: filterValue.join(" ").trim() };
                    }

                    if (tag.isPseudo && tag.computedStyle!.content!.substr(0, 3) == "url")
                    {
                        let doInvert = !isTable && bgInverted && !doNotInvertRegExp.test(tag.computedStyle!.content!) &&
                            (
                                this.tagIsSmall(tag) || tag.parentElement!.parentElement &&
                                this.tagIsSmall(tag.parentElement!.parentElement!) &&
                                tag.parentElement!.parentElement!.computedStyle!.overflow === this._css.hidden
                            );
                        if (this.shift.Image.lightnessLimit < 1 || this.shift.Image.saturationLimit < 1 || doInvert)
                        {
                            let imgSet = this.shift.Image;
                            roomRules.filter =
                                {
                                    value: [
                                        imgSet.lightnessLimit < 1 && !doInvert ? `brightness(${imgSet.lightnessLimit})` : "",
                                        imgSet.saturationLimit < 1 ? `saturate(${imgSet.saturationLimit})` : "",
                                        doInvert ? `brightness(${1 - this.shift.Background.lightnessLimit})` : "",
                                        doInvert ? "invert(1)" : "",
                                        tag.computedStyle.filter != this._css.none ? tag.computedStyle.filter : ""
                                    ].join(" ").trim()
                                };
                        }
                    }

                    if (tag.computedStyle!.backgroundImage && tag.computedStyle!.backgroundImage !== this._css.none)
                    {
                        let backgroundImage = tag.computedStyle!.backgroundImage!;
                        let gradientColorMatches = backgroundImage.match(/rgba?\([^)]+\)/gi);
                        let gradientColors = new Map<string, string>();
                        if (gradientColorMatches)
                        {
                            gradientColorMatches.forEach(color => gradientColors.set(color, Math.random().toString()));
                            gradientColors.forEach((id, color) => backgroundImage =
                                backgroundImage.replace(new RegExp(Util.escapeRegex(color), "g"), id));
                        }
                        let backgroundSizes = tag.computedStyle!.backgroundSize!.match(/\b[^,]+/gi)!;
                        let backgroundImages = backgroundImage.match(/[\w-]+\([^)]+\)/gi)!;
                        let bgImgLight = 1, doInvert: boolean = false, isPseudoContent = false, bgFilter = "", haveToProcBgImg = false,
                            haveToProcBgGrad = /gradient/gi.test(backgroundImage), isInput = false;
                        if (/\burl\(/gi.test(backgroundImage))
                        {
                            let bgImgSet = this.shift.BackgroundImage;

                            doInvert = !isTable && bgInverted && !doNotInvertRegExp.test(backgroundImage) &&
                                (
                                    this.tagIsSmall(tag) || !!tag.parentElement && !!tag.parentElement.parentElement &&
                                    this.tagIsSmall(tag.parentElement.parentElement) &&
                                    tag.parentElement.parentElement.computedStyle!.overflow === this._css.hidden
                                );

                            if (bgImgSet.lightnessLimit < 1 || bgImgSet.saturationLimit < 1 || doInvert)
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
                                    bgImgLight < 1 ? `brightness(${bgImgLight})` : "",
                                    bgImgSet.saturationLimit < 1 ? `saturate(${bgImgSet.saturationLimit})` : "",
                                    doInvert ? `brightness(${1 - this.shift.Background.lightnessLimit})` : "",
                                    doInvert ? "invert(1)" : ""
                                ].join(" ").trim();

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
                                    return this.processBackgroundGradient(tag, index, bgImg, size, roomRules!);
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
                        let textColor = tag.computedStyle!.getPropertyValue(ns.css.fntColor),
                            inheritedTextColor = this.getInheritedFontColor(tag, textColor);
                        roomRules.color = this._textColorProcessor.changeColor(textColor, bgLight, inheritedTextColor, tag);
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
                                        inheritedShadowColor = this.getInheritedTextShadowColor(tag, prevColor);
                                        inheritedShadowColor && (prevColor = inheritedShadowColor.originalColor);
                                        prevHslColor = Colors.RgbaColor.toHslaColor(Colors.RgbaColor.parse(prevColor));
                                        shadowContrast = Math.abs(prevHslColor.lightness - roomRules!.color!.originalLight) / originalTextContrast * currentTextContrast;
                                        newColor = this._textShadowColorProcessor.changeColor(prevColor, roomRules!.color!.light, null, tag, shadowContrast);
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

                    if (isSvg || tag.computedStyle!.borderStyle != this._css.none)
                    {
                        let brdColor = tag.computedStyle!.getPropertyValue(ns.css.brdColor),
                            result: Colors.ColorEntry;
                        if (brdColor.indexOf(" r") == -1)
                        {
                            if (brdColor == tag.computedStyle!.getPropertyValue(ns.css.bgrColor))
                            {
                                result = Object.assign({}, roomRules.backgroundColor);
                                Object.assign(result, { reason: Colors.ColorReason.SameAsBackground, owner: this._app.isDebug ? tag : null });
                            }
                            else
                            {
                                result = this._borderColorProcessor.changeColor(brdColor, bgLight, null, tag);
                            }
                            roomRules.borderColor = result.color ? result : null;
                        }
                        else if (!isSvg)
                        {
                            result = this._borderColorProcessor.changeColor(tag.computedStyle!.borderTopColor, bgLight, null, tag);
                            roomRules.borderTopColor = result.color ? result : null;
                            result = this._borderColorProcessor.changeColor(tag.computedStyle!.borderRightColor, bgLight, null, tag);
                            roomRules.borderRightColor = result.color ? result : null;
                            result = this._borderColorProcessor.changeColor(tag.computedStyle!.borderBottomColor, bgLight, null, tag);
                            roomRules.borderBottomColor = result.color ? result : null;
                            result = this._borderColorProcessor.changeColor(tag.computedStyle!.borderLeftColor, bgLight, null, tag);
                            roomRules.borderLeftColor = result.color ? result : null;
                        }
                    }
                }

                this.applyRoomRules(tag, roomRules, ns);

                beforePseudoElement && this.processElement(beforePseudoElement);
                afterPseudoElement && this.processElement(afterPseudoElement);

                room && this._dorm.get(doc)!.set(room, roomRules);

                return [beforePseudoElement, afterPseudoElement].filter(x => x).map(x => x!.stylePromise);
            }
        }

        protected processTransitions(tag: HTMLElement | PseudoElement, roomRules: RoomRules)
        {
            if (tag.computedStyle && tag.computedStyle.transitionDuration !== this._css.zeroSec)
            {
                let hasForbiddenTransition = false;
                let durations = tag.computedStyle.transitionDuration!.split(", ");
                tag.computedStyle.transitionProperty!.split(", ").forEach((prop, index) =>
                {
                    if (this._transitionForbiddenProperties.has(prop))
                    {
                        durations[index] = this._css.zeroSec;
                        hasForbiddenTransition = true;
                    }
                });
                if (hasForbiddenTransition)
                {
                    roomRules.transitionDuration = { value: durations.join(", ") };
                }
            }
        }

        protected removeTemporaryFilter(tag: HTMLElement | PseudoElement)
        {
            if (tag.originalFilter !== undefined)
            {
                tag.style.setProperty(this._css.filter, tag.originalFilter)
            }
            isRealElement(tag) && tag.removeAttribute(this._css.transition);
        }

        protected processBackgroundGradient(tag: HTMLElement | PseudoElement, index: number, gradient: string, size: string, roomRules: RoomRules)
        {
            let mainColor: Colors.ColorEntry | null = null, lightSum = 0;
            let uniqColors = new Set<string>(gradient
                .replace(/webkit|repeating|linear|radial|from|\bto\b|gradient|circle|ellipse|top|left|bottom|right|farthest|closest|side|corner|[\.\d]+%|[\.\d]+[a-z]{2,3}/gi, '')
                .match(/(rgba?\([^\)]+\)|#[a-z\d]{6}|[a-z]+)/gi) || []);
            if (uniqColors.size > 0)
            {
                uniqColors.forEach(c =>
                {
                    let prevColor = /rgb/gi.test(c) ? c : this._colorConverter.convert(c);
                    let newColor = this._backgroundColorProcessor.changeColor(prevColor, false, tag, this.getParentBackground.bind(this));
                    lightSum += newColor.light;
                    if (newColor.color)
                    {
                        gradient = gradient.replace(new RegExp(Util.escapeRegex(c), "gi"), newColor.color);
                    }
                    if (!mainColor && newColor.alpha > 0.5)
                    {
                        mainColor = roomRules.backgroundColor = Object.assign({}, newColor);
                    }
                });
                mainColor && (mainColor!.light = lightSum / uniqColors.size);
            }
            return new BackgroundImage(size, gradient, BackgroundImageType.Gradient);
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
            url = Util.trim(url.substr(3), "()'\"");
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

            let result = Promise.all([dataPromise, size, bgFilter]).then(
                ([img, bgSize, fltr]) =>
                {
                    let imgWidth = img.width + this._css.px, imgHeight = img.height + this._css.px;
                    return new BackgroundImage(
                        /^(auto\s?){1,2}$/i.test(bgSize) ? imgWidth + " " + imgHeight : bgSize,
                        "url(data:image/svg+xml," + encodeURIComponent
                            (
                            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${img.width} ${img.height}" filter="${fltr}">` +
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
                doc.body.style.setProperty(this._css.color, "rgb(5,5,5)");
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
            let dynamicStyle = doc.getElementById("midnight-lizard-dynamic-style");
            dynamicStyle && dynamicStyle.remove();
        }

        protected createDynamicStyle(doc: Document)
        {
            let sheet = doc.createElement('style');
            sheet.id = "midnight-lizard-dynamic-style";
            sheet.mlIgnore = true;
            let bgLight = this.shift.Background.lightnessLimit;
            let thumbHoverColor = this._scrollbarHoverColorProcessor.changeColor(cx.White, bgLight).color;
            let thumbNormalColor = this._scrollbarNormalColorProcessor.changeColor(cx.White, bgLight).color;
            let thumbActiveColor = this._scrollbarActiveColorProcessor.changeColor(cx.White, bgLight).color;
            let trackColor = this._backgroundColorProcessor.changeColor(cx.White, false, doc).color;
            let globalVars = "";
            let component: keyof Colors.ComponentShift,
                property: keyof Colors.ColorShift;
            for (component in this.shift)
            {
                for (property in this.shift[component])
                {
                    globalVars += `\n-${
                        component.replace("$", "").replace(/([A-Z])/g, "-$1")
                        }-${
                        property.replace(/([A-Z])/g, "-$1")
                        }:${
                        this.shift[component][property]
                        };`.toLowerCase();
                }
            }
            sheet.innerHTML = `:root { ${globalVars} }
                scrollbar { width: 12px!important; height: 12px!important; background: ${thumbNormalColor}!important; }
                scrollbar-button:hover { background: ${thumbHoverColor}!important; }
                scrollbar-button { background: ${thumbNormalColor}!important; width:5px!important; height:5px!important; }
                scrollbar-button:active { background: ${thumbActiveColor}!important; }
                scrollbar-thumb:hover { background: ${thumbHoverColor}!important; }
                scrollbar-thumb { background: ${thumbNormalColor}!important; border-radius: 6px!important; box-shadow: inset 0 0 8px rgba(0,0,0,0.5)!important; border: none!important; }
                scrollbar-thumb:active { background: ${thumbActiveColor}!important; box-shadow: inset 0 0 8px rgba(0,0,0,0.2)!important; }
                scrollbar-track { background: ${trackColor}!important; box-shadow: inset 0 0 6px rgba(0,0,0,0.3)!important; border-radius: 6px!important; border: none!important; }
                scrollbar-track-piece { background: transparent!important; border: none!important; box-shadow: none!important; }
                scrollbar-corner { background: ${thumbNormalColor}!important; }`.replace(/\s{16}(?=\S)/g, ":not(impt)::-webkit-");
            doc.head.appendChild(sheet);
        }

        protected createPseudoStyles(doc: Document)
        {
            if (!doc.mlPseudoStyles)
            {
                doc.mlPseudoStyles = doc.createElement('style');
                doc.mlPseudoStyles.id = "midnight-lizard-pseudo-styles";
                doc.mlPseudoStyles.mlIgnore = true;
                doc.head.appendChild(doc.mlPseudoStyles);
            }
        }

        protected clearPseudoStyles(doc: Document)
        {
            let pseudoStyle = doc.getElementById("midnight-lizard-pseudo-styles");
            pseudoStyle && (pseudoStyle.innerHTML = "");
        }

        protected createLoadingStyles(doc: Document)
        {
            let noTrans = doc.createElement('style');
            noTrans.id = "midnight-lizard-no-trans-style";
            noTrans.mlIgnore = true;
            noTrans.innerHTML = ":not([transition]) { transition: all 0s ease 0s !important; }";
            doc.head.appendChild(noTrans);

            let bgrLight = this.shift.Background.lightnessLimit,
                imgLight = this.shift.Image.lightnessLimit,
                imgSatrt = this.shift.Image.saturationLimit,
                bgrColor = this._backgroundColorProcessor.changeColor(cx.White, false, doc).color,
                txtColor = this._textColorProcessor.changeColor(cx.Black, bgrLight).color,
                brdColor = this._borderColorProcessor.changeColor(cx.Black, bgrLight).color,
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
            doc.head.appendChild(style);
        }

        protected removeLoadingStyles(doc: Document)
        {
            let style = doc.getElementById("midnight-lizard-loading-style");
            style && style.remove();
            setTimeout((d: Document) => 
            {
                let noTrans = d.getElementById("midnight-lizard-no-trans-style");
                noTrans && noTrans.remove();
            }, 1, doc);
        }

        public applyRoomRules(tag: HTMLElement | PseudoElement, roomRules: RoomRules, ns = USP.htm, isVirtual = false)
        {
            let applyBgPromise;
            if (isRealElement(tag))
            {
                if (!isVirtual)
                {
                    tag.mlBgColor = roomRules.backgroundColor;
                    tag.mlColor = roomRules.color;
                    roomRules.textShadow && (tag.mlTextShadow = roomRules.textShadow.color);
                }
                if (roomRules.attributes && roomRules.attributes.size > 0)
                {
                    roomRules.attributes.forEach((attrValue, attrName) => tag.setAttribute(attrName, attrValue));
                }
            }
            if (roomRules.filter && roomRules.filter.value)
            {
                tag.originalFilter = tag.style.filter;
                tag.style.setProperty(this._css.filter, roomRules.filter.value, this._css.important)
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
                    let fuck = [tag, roomRules, ...roomRules.backgroundImages];
                    applyBgPromise = Promise.all<HTMLElement | PseudoElement | RoomRules | BackgroundImage | Promise<BackgroundImage>>
                        ([tag, roomRules, ...roomRules.backgroundImages])
                        .then(([t, rr, ...bgImgs]: [HTMLElement | PseudoElement, RoomRules, BackgroundImage]) =>
                        {
                            rr.backgroundImages = bgImgs as BackgroundImage[];
                            roomRules.hasBackgroundImagePromises = false;
                            bgImgs.forEach((img: BackgroundImage, index) =>
                            {
                                this._images.set(rr.backgroundImageKeys[index], img);
                            });
                            return this.applyBackgroundImages(t, bgImgs as BackgroundImage[]);
                        });
                    Promise
                        .all([tag, applyBgPromise.catch(ex => this._app.isDebug && console.error("Exception in backgroundImagePromise: " + ex))])
                        .then(([tag]) => this.removeTemporaryFilter(tag));
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
                tag.style.setProperty(ns.css.fntColor, roomRules.color.color, this._css.important);
            }
            else if (roomRules.color && roomRules.color.reason === Colors.ColorReason.Inherited && tag.style.getPropertyValue(ns.css.fntColor))
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
                if (roomRules.borderTopColor)
                {
                    tag.originalBorderTopColor = tag.style.borderTopColor;
                    tag.style.setProperty(this._css.borderTopColor, roomRules.borderTopColor.color, this._css.important);
                }

                if (roomRules.borderRightColor)
                {
                    tag.originalBorderRightColor = tag.style.borderRightColor;
                    tag.style.setProperty(this._css.borderRightColor, roomRules.borderRightColor.color, this._css.important);
                }

                if (roomRules.borderBottomColor)
                {
                    tag.originalBorderBottomColor = tag.style.borderBottomColor;
                    tag.style.setProperty(this._css.borderBottomColor, roomRules.borderBottomColor.color, this._css.important);
                }

                if (roomRules.borderLeftColor)
                {
                    tag.originalBorderLeftColor = tag.style.borderLeftColor;
                    tag.style.setProperty(this._css.borderLeftColor, roomRules.borderLeftColor.color, this._css.important);
                }
            }

            if (isPseudoElement(tag))
            {
                if (applyBgPromise)
                {
                    applyBgPromise.then((x: PseudoElement) => x.applyStyleChanges());
                    Promise.all([tag, applyBgPromise.catch(ex => ex)]).then(([t]) => t.applyStyleChanges());
                }
                else
                {
                    tag.applyStyleChanges();
                }
            }

            if (isRealElement(tag) && tag.onRoomRulesApplied)
            {
                tag.onRoomRulesApplied.raise(roomRules);
            }
        }
    }
}