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
/// <reference path="../Colors/RangeFillColorProcessor.ts" />
/// <reference path="./SvgFilters.ts" />
/// <reference path="./PreloadManager.ts" />

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
    const doNotInvertRegExp = /user|account|photo(?!.+black)|white|grey|gray|flag/gi;
    const maxAttrLen = 100;
    /** 2 fraction digits number format */
    const float = new Intl.NumberFormat('en-US', {
        useGrouping: false,
        maximumFractionDigits: 2
    });

    enum ProcessingStage
    {
        None = "none",
        Preload = "preload",
        Loading = "loading",
        Complete = "complete"
    }

    export abstract class IDocumentProcessor
    {
        abstract get onRootDocumentProcessing(): ArgEvent<Document>;
        abstract applyRoomRules(tag: HTMLElement | PseudoElement, roomRules: RoomRules, ns: any): void;
    }

    /** Base Document Processor */
    @DI.injectable(IDocumentProcessor)
    class DocumentProcessor implements IDocumentProcessor
    {
        protected _rootDocumentContentLoaded: boolean = false;
        protected readonly _rootImageUrl: string;
        protected readonly _isPdf: boolean;
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
            protected readonly _preloadManager: MidnightLizard.ContentScript.IPreloadManager,
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
            protected readonly _activeVisitedLinkColorProcessor: MidnightLizard.Colors.IActiveVisitedLinkColorProcessor,
            protected readonly _hoverVisitedLinkColorProcessor: MidnightLizard.Colors.IHoverVisitedLinkColorProcessor,
            protected readonly _activeLinkColorProcessor: MidnightLizard.Colors.IActiveLinkColorProcessor,
            protected readonly _hoverLinkColorProcessor: MidnightLizard.Colors.IHoverLinkColorProcessor,
            protected readonly _textShadowColorProcessor: MidnightLizard.Colors.ITextShadowColorProcessor,
            protected readonly _rangeFillColorProcessor: MidnightLizard.Colors.IRangeFillColorProcessor,
            protected readonly _borderColorProcessor: MidnightLizard.Colors.IBorderColorProcessor,
            protected readonly _buttonBorderColorProcessor: MidnightLizard.Colors.IButtonBorderColorProcessor,
            protected readonly _colorConverter: MidnightLizard.Colors.IColorToRgbaStringConverter,
            protected readonly _zoomObserver: MidnightLizard.ContentScript.IDocumentZoomObserver,
            protected readonly _svgFilters: MidnightLizard.ContentScript.ISvgFilters)
        {
            this.setDocumentProcessingStage(_rootDocument, ProcessingStage.Preload);
            this._rootImageUrl = `url("${_rootDocument.location.href}")`;
            this._isPdf = /.+\.pdf(#.*)?/i.test(_rootDocument.location.href);
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
                    this._settingsManager.currentSettings.blueFilter !== 0 ? `var(--${FilterType.BlueFilter})` : ""
                ].filter(f => f).join(" ").trim(),
                backgroundImageFilter = [
                    this.shift.BackgroundImage.saturationLimit < 1 ? `saturate(${this.shift.BackgroundImage.saturationLimit})` : "",
                    this.shift.BackgroundImage.lightnessLimit < 1 ? `brightness(${this.shift.BackgroundImage.lightnessLimit})` : "",
                    this._settingsManager.currentSettings.blueFilter !== 0 ? `var(--${FilterType.BlueFilter})` : ""
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
                this.injectDynamicValues(this._rootDocument);
                this.processRootDocument();
            }
            if (window.top === window.self)
            {
                response(this._settingsManager.currentSettings);
            }
        }

        protected onSettingsInitialized(shift?: Colors.ComponentShift): void
        {
            if (this._settingsManager.isActive)
            {
                this.createStandardPseudoCssTexts();
                this.injectDynamicValues(this._rootDocument);
                if (this._rootDocumentContentLoaded)
                {
                    this.processRootDocument();
                }
                else
                {
                    this.setDocumentProcessingStage(this._rootDocument, ProcessingStage.Loading);
                    // this.createLoadingStyles(this._rootDocument);
                }
            }
            else
            {
                this.setDocumentProcessingStage(this._rootDocument, ProcessingStage.None);
            }
        }

        protected onDocumentContentLoaded()
        {
            dom.removeEventListener(this._rootDocument, "DOMContentLoaded", this.onDocumentContentLoaded);
            this._rootDocumentContentLoaded = true;
            if (this._settingsManager.isActive)
            {
                this.processRootDocument();
            }
        }

        protected setDocumentProcessingStage(doc: Document, stage: ProcessingStage)
        {
            if (stage === ProcessingStage.None)
            {
                doc.documentElement.removeAttribute("ml-stage");
                doc.documentElement.removeAttribute("ml-mode");
                doc.documentElement.removeAttribute("ml-stage-mode");
            }
            else
            {
                doc.documentElement.setAttribute("ml-stage", stage);
                if (this._settingsManager.isActive)
                {
                    doc.documentElement.setAttribute("ml-mode", this._settingsManager.currentSettings.mode);
                    doc.documentElement.setAttribute("ml-stage-mode",
                        stage + "-" + this._settingsManager.currentSettings.mode);
                }
            }
        }

        protected getLastDoccumentProcessingMode(doc: Document)
        {
            return doc.documentElement.getAttribute("ml-mode") as Settings.ProcessingMode || Settings.ProcessingMode.Complex;
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
                doc.viewArea = doc.defaultView.innerHeight * doc.defaultView.innerWidth;
                this._dorm.set(doc, new Map<string, RoomRules>());
                this.setDocumentProcessingStage(doc, ProcessingStage.Complete);
                if (this._settingsManager.currentSettings.mode === Settings.ProcessingMode.Complex)
                {
                    this._styleSheetProcessor.processDocumentStyleSheets(doc);
                    if (this._settingsManager.currentSettings.restoreColorsOnCopy)
                    {
                        dom.addEventListener(doc, "copy", this.onCopy, this, false, doc);
                    }
                    if (this._settingsManager.currentSettings.restoreColorsOnPrint)
                    {
                        const printMedia = doc.defaultView.matchMedia("print");
                        printMedia.addListener(mql =>
                        {
                            if (mql.matches)
                            {
                                this.restoreDocumentColors(doc);
                            }
                            else
                            {
                                this.injectDynamicValues(doc);
                                this.processDocument(doc);
                            }
                        });
                    }
                    //this.applyLoadingShadow(doc.documentElement);
                    // this.removeLoadingStyles(doc);
                    this.createPseudoStyles(doc);
                    this.createPageScript(doc);
                    this.calculateDefaultColors(doc);
                    doc.body.isChecked = true;
                    DocumentProcessor.processElementsChunk([doc.body], this, null, 0);
                    this._documentObserver.startDocumentObservation(doc);
                    let allTags = Array.from(doc.getElementsByTagName("*"))
                        .filter(this.getFilterOfElementsForComplexProcessing()) as HTMLElement[];
                    DocumentProcessor.processAllElements(allTags, this);
                }
                else
                {
                    this._documentObserver.startDocumentObservation(doc);
                    let allTags = Array.from(doc.getElementsByTagName("*"))
                        .filter(this.getFilterOfElementsForSimplifiedProcessing()) as HTMLElement[];
                    DocumentProcessor.processAllElements(allTags, this, smallReCalculationDelays, false);
                }
            }
        }

        private getFilterOfElements()
        {
            if (this._settingsManager.isComplex)
            {
                return this.getFilterOfElementsForComplexProcessing();
            }
            return this.getFilterOfElementsForSimplifiedProcessing();
        }

        private getFilterOfElementsForComplexProcessing(): (value: Element) => boolean
        {
            return (tag) => this.checkElement(tag) && (!!tag.parentElement || tag === tag.ownerDocument.documentElement);
        }

        private getFilterOfElementsForSimplifiedProcessing(): (value: Element) => boolean
        {
            return (tag) =>
            {
                if (this.checkElement(tag) && (tag.parentElement || tag === tag.ownerDocument.documentElement))
                {
                    if (tag instanceof tag.ownerDocument.defaultView.HTMLIFrameElement ||
                        tag instanceof tag.ownerDocument.defaultView.HTMLCanvasElement ||
                        this._isPdf && tag instanceof HTMLEmbedElement)
                    {
                        return true;
                    }
                    tag.computedStyle = tag.computedStyle || tag.ownerDocument.defaultView.getComputedStyle(tag, "");
                    return tag.computedStyle.backgroundImage !== this._css.none;
                }
                return false;
            };
        }

        private calculateDefaultColors(doc: Document, defaultLinkColor?: string, defaultTextColor?: string)
        {
            defaultLinkColor = this._linkColorProcessor.calculateDefaultColor(doc, defaultLinkColor);
            this._visitedLinkColorProcessor.calculateDefaultColor(doc, defaultLinkColor);
            this._activeLinkColorProcessor.calculateDefaultColor(doc, defaultLinkColor);
            this._hoverLinkColorProcessor.calculateDefaultColor(doc, defaultLinkColor);
            this._activeVisitedLinkColorProcessor.calculateDefaultColor(doc, defaultLinkColor);
            this._hoverVisitedLinkColorProcessor.calculateDefaultColor(doc, defaultLinkColor);
            this._textColorProcessor.calculateDefaultColor(doc, defaultTextColor);
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
                if (tag instanceof tag.ownerDocument.defaultView.HTMLInputElement)
                {
                    dom.addEventListener(tag, "input", this._boundUserActionHandler);
                    dom.addEventListener(tag, "change", this._boundUserActionHandler);
                }
                else if (tag instanceof tag.ownerDocument.defaultView.HTMLLabelElement && tag.htmlFor)
                {
                    const checkBox = tag.ownerDocument.getElementById(tag.htmlFor) as HTMLInputElement;
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
            const eventTargets = tag instanceof tag.ownerDocument.defaultView.HTMLTableCellElement
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
            if (this._settingsManager.isActive && this._settingsManager.isComplex &&
                target.selectors !== this._styleSheetProcessor.getElementMatchedSelectors(target))
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
                    let skipSelectors = this._settingsManager.isSimple || full || (this._styleSheetProcessor.getSelectorsQuality(rootElem.ownerDocument) === 0);
                    let filteredTags = allTags.filter(el => el.isChecked && el.mlBgColor && (skipSelectors || el.selectors !== this._styleSheetProcessor.getElementMatchedSelectors(el)));
                    if (this._settingsManager.isSimple)
                    {
                        filteredTags = filteredTags.filter(this.getFilterOfElementsForSimplifiedProcessing());
                    }
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
                    if (filteredTags.length < 100 || full || this._settingsManager.isSimple)
                    {
                        this._documentObserver.stopDocumentObservation(rootElem.ownerDocument);
                        filteredTags.forEach(tag => this.restoreElementColors(tag, true));
                        this._documentObserver.startDocumentObservation(rootElem.ownerDocument);
                        DocumentProcessor.processAllElements(filteredTags, this, bigReCalculationDelays);
                    }
                    else
                    {
                        this._documentObserver.stopDocumentObservation(rootElem.ownerDocument);
                        this.restoreElementColors(rootElem, true);
                        const results = DocumentProcessor.processElementsChunk([rootElem], this, null, 0);
                        DocumentProcessor.fixColorInheritance([rootElem], this, results);
                    }
                }
                else if (this._settingsManager.isComplex ||
                    this.getFilterOfElementsForSimplifiedProcessing()(rootElem))
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
            const filter = this.getFilterOfElements();
            addedElements.forEach(tag => this.restoreElementColors(tag));
            const
                allAddedElements = Array.from(addedElements.values()),
                allNewTags = allAddedElements.filter(filter);
            DocumentProcessor.processAllElements(allNewTags, this,
                this._settingsManager.isComplex ? bigReCalculationDelays : smallReCalculationDelays);
            const allChildTags = new Set<HTMLElement>();
            (this._settingsManager.isComplex ? allNewTags :
                allAddedElements.filter(this.getFilterOfElementsForComplexProcessing()))
                .forEach(newTag =>
                {
                    if (newTag.getElementsByTagName)
                    {
                        Array.prototype.forEach.call(newTag.getElementsByTagName("*"), (childTag: HTMLElement) =>
                        {
                            if (addedElements!.has(childTag) === false)
                            {
                                this.restoreElementColors(childTag);
                                if (filter(childTag))
                                {
                                    allChildTags.add(childTag);
                                }
                            }
                        });
                    }
                });
            DocumentProcessor.processAllElements(Array.from(allChildTags.values()), this,
                this._settingsManager.isComplex ? bigReCalculationDelays : smallReCalculationDelays);
        }

        protected static processAllElements(allTags: HTMLElement[], docProc: DocumentProcessor,
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
                    isSvg = tag instanceof tag.ownerDocument.defaultView.SVGElement;
                    ns = isSvg ? USP.svg : USP.htm;
                    isVisible = tag.tagName == "BODY" || isSvg || tag.offsetParent !== null || !!tag.offsetHeight
                    if (isVisible || tag.computedStyle || !delayInvisibleElements || allTags.length < 2 * chunkLength)
                    {
                        tag.computedStyle = tag.computedStyle || tag.ownerDocument.defaultView.getComputedStyle(tag, "")
                        isLink = tag instanceof tag.ownerDocument.defaultView.HTMLAnchorElement;
                        hasBgColor = tag.computedStyle!.getPropertyValue(ns.css.bgrColor) !== Colors.RgbaColor.Transparent;
                        hasImage = tag.computedStyle!.backgroundImage !== docProc._css.none || (tag.tagName === ns.img) ||
                            tag instanceof tag.ownerDocument.defaultView.HTMLIFrameElement;
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

                const results = Util.handlePromise(DocumentProcessor.processOrderedElements(allTags, docProc, delays)!);

                if (otherInvisTags.length > 0)
                {
                    Promise.all([otherInvisTags, docProc, delays, results])
                        .then(([otherTags, dp, dl]) => DocumentProcessor.processAllElements(otherTags, dp, dl, false));
                }

                DocumentProcessor.fixColorInheritance(allTags, docProc, results);
            }
        }

        protected static fixColorInheritance(allTags: HTMLElement[], docProc: DocumentProcessor, results: Promise<any>)
        {
            if (docProc._settingsManager.isComplex)
            {
                const waitResults = Promise.all([allTags, docProc, results]);
                waitResults.then(([tags, dp]) =>
                {
                    if (tags && tags.length > 0)
                    {
                        setTimeout(((t: HTMLElement[], dProc: DocumentProcessor) =>
                        {
                            const brokenColorTags = t.filter(tag =>
                                tag.ownerDocument.defaultView &&
                                !tag.isPseudo && tag.mlColor && tag.mlColor.color === null &&
                                tag.mlColor.reason === Colors.ColorReason.Inherited &&
                                tag.mlColor.intendedColor && tag.computedStyle &&
                                tag.mlColor.intendedColor !== (tag instanceof tag.ownerDocument.defaultView.HTMLElement
                                    ? tag.computedStyle!.color
                                    : tag!.computedStyle!.fill));

                            if (brokenColorTags.length > 0)
                            {
                                dProc._documentObserver.stopDocumentObservation(brokenColorTags[0].ownerDocument);
                                brokenColorTags.forEach(tag =>
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
                                docProc._documentObserver.startDocumentObservation(brokenColorTags[0].ownerDocument);
                            }
                        }), 0, tags, dp);
                    }
                });
                waitResults.then(([tags, dp]) =>
                {
                    if (tags && tags.length > 0)
                    {
                        setTimeout(((t: HTMLElement[], dProc: DocumentProcessor) =>
                        {
                            const brokenTransparentTags = t.filter(tag =>
                                tag.ownerDocument.defaultView && tag.mlBgColor &&
                                !tag.mlBgColor.color && tag.computedStyle &&
                                tag.mlBgColor.reason === Colors.ColorReason.Parent &&
                                tag instanceof tag.ownerDocument.defaultView.HTMLElement &&
                                tag.computedStyle!.backgroundColor !== Colors.RgbaColor.Transparent &&
                                !tag.hasAttribute("fixed")
                            );
                            if (brokenTransparentTags.length > 0)
                            {
                                dProc._documentObserver.stopDocumentObservation(brokenTransparentTags[0].ownerDocument);
                                brokenTransparentTags.forEach(tag =>
                                {
                                    dProc.restoreElementColors(tag, true);
                                    tag.setAttribute("fixed", "bgcolor");
                                });
                                dProc._documentObserver.startDocumentObservation(brokenTransparentTags[0].ownerDocument);
                                DocumentProcessor.processAllElements(brokenTransparentTags, dProc, bigReCalculationDelays);
                            }
                        }), 0, tags, dp);
                    }
                });
            }
        }

        protected static processOrderedElements(tags: HTMLElement[], docProc: DocumentProcessor, delays = normalDelays)
        {
            if (tags.length > 0)
            {
                const density = 2000 / tags.length
                let result: Promise<HTMLElement[]>, needObservation = docProc._settingsManager.isComplex &&
                    docProc._styleSheetProcessor.getSelectorsCount(tags[0].ownerDocument);
                if (tags.length < chunkLength)
                {
                    result = DocumentProcessor.processElementsChunk(tags, docProc, null, delays.get(tags[0].order || po.viewColorTags)! / density);
                }
                else
                {
                    const getNextDelay = ((_delays: any, _density: any, [chunk]: [any]) =>
                        _delays.get(chunk[0].order || po.viewColorTags) / _density)
                        .bind(null, delays, density);
                    result = Util.forEachPromise(
                        Util.sliceIntoChunks(tags, chunkLength).map(chunk => [chunk, docProc]),
                        DocumentProcessor.processElementsChunk, 0, getNextDelay);
                }
                if (needObservation)
                {
                    Promise.all([tags as any, docProc, Util.handlePromise(result), ...docProc._styleSheetProcessor.getCssPromises(tags[0].ownerDocument)!])
                        .then(([t, dp]) => DocumentProcessor.startObservation(t, dp));
                }
                return result;
            }
            return undefined;
        }

        protected static processElementsChunk(chunk: HTMLElement[], docProc: DocumentProcessor, prev: null, delay: number)
        {
            const paramsForPromiseAll: any[] = [chunk, chunk[0].ownerDocument, delay];
            const results = chunk.map(tag =>
            {
                return {
                    tag: tag, result: docProc._settingsManager.isComplex
                        ? docProc.calculateRoomRules(tag)
                        : docProc.caclulateSimplifiedRoomRules(tag)
                }
            });
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
                    else if (attr.name === "disabled")
                    {
                        tag.path += "X";
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
                let isSvg = tag instanceof doc.defaultView.SVGElement &&
                    tag.parentElement instanceof doc.defaultView.SVGElement;
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

        protected restoreDocumentColors(doc: Document)
        {
            this._documentObserver.stopDocumentObservation(doc);
            this.removeDynamicValuesStyle(doc);
            this.removePageScript(doc);
            this.clearPseudoStyles(doc);
            const lastProcMode = this.getLastDoccumentProcessingMode(doc);
            this.setDocumentProcessingStage(doc, ProcessingStage.None);
            for (let tag of doc.getElementsByTagName("*"))
            {
                this.restoreElementColors(tag as HTMLElement, this._settingsManager.isActive, lastProcMode);
            }
        }

        protected restoreElementColors(tag: HTMLElement, keepTransitionDuration?: boolean, lastProcMode?: Settings.ProcessingMode)
        {
            if (tag.mlBgColor || tag instanceof tag.ownerDocument.defaultView.Element && (
                lastProcMode === Settings.ProcessingMode.Simplified ||
                this._settingsManager.isSimple))
            {
                let ns = tag instanceof tag.ownerDocument.defaultView.SVGElement ? USP.svg : USP.htm;

                delete tag.mlBgColor;
                delete tag.mlColor;
                delete tag.mlTextShadow;
                delete tag.mlParentBgColor;
                delete tag.rect;
                delete tag.selectors;
                delete tag.path;
                if (tag instanceof tag.ownerDocument.defaultView.HTMLIFrameElement)
                {
                    delete tag.mlInaccessible;
                }

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
                    tag.style.removeProperty(this._css.linkColorActive);
                    tag.style.removeProperty(this._css.visitedColorActive);
                    tag.style.removeProperty(this._css.linkColorHover);
                    tag.style.removeProperty(this._css.visitedColorHover);
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
                if (tag.originalTransitionDuration !== undefined && !keepTransitionDuration &&
                    tag.style.transitionDuration !== tag.originalTransitionDuration)
                {
                    tag.style.transitionDuration = tag.originalTransitionDuration;
                }
                if (keepTransitionDuration && !tag.originalTransitionDuration &&
                    tag.computedStyle && tag.computedStyle.transitionDuration !== this._css._0s)
                {
                    const { hasForbiddenTransition, durations } = this.calculateTransitionDuration(tag);
                    if (hasForbiddenTransition)
                    {
                        tag.originalTransitionDuration = tag.style.transitionDuration;
                        tag.style.setProperty(this._css.transitionDuration, durations.join(", "), this._css.important)
                    }
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
                if (tag.hasAttribute("fixed"))
                {
                    tag.removeAttribute("fixed");
                }
                if (tag.hasAttribute("ml-no-bg-image"))
                {
                    tag.removeAttribute("ml-no-bg-image");
                }
            }
        }

        protected checkElement(tag: any)
        {
            return tag.isChecked =
                (tag instanceof Element || tag!.ownerDocument && tag!.ownerDocument.defaultView && tag instanceof tag!.ownerDocument.defaultView.Element) &&
                !tag.mlBgColor && !!tag.tagName && !tag.mlIgnore && !!(tag as HTMLElement).style;
        }

        protected caclulateSimplifiedRoomRules(tag: HTMLElement)
        {
            if (tag && tag.ownerDocument.defaultView &&
                (!tag.computedStyle || tag.computedStyle.getPropertyValue("--ml-ignore") !== true.toString()))
            {
                const doc = tag.ownerDocument, roomRules = new RoomRules(),
                    bgInverted = this._settingsManager.shift.Background.lightnessLimit < 0.3,
                    isButton = tag instanceof doc.defaultView.HTMLButtonElement ||
                        tag instanceof doc.defaultView.HTMLInputElement &&
                        (tag.type === "button" || tag.type === "submit" || tag.type === "reset") ||
                        isRealElement(tag) && tag.getAttribute("role") === "button",
                    isTable =
                        tag instanceof doc.defaultView.HTMLTableElement || tag instanceof doc.defaultView.HTMLTableCellElement ||
                        tag instanceof doc.defaultView.HTMLTableRowElement || tag instanceof doc.defaultView.HTMLTableSectionElement;;

                tag.computedStyle = tag.computedStyle || doc.defaultView.getComputedStyle(tag as HTMLElement, "");

                if (tag.computedStyle && tag.computedStyle.transitionDuration !== this._css._0s)
                {
                    let { hasForbiddenTransition, durations } = this.calculateTransitionDuration(tag);
                    if (hasForbiddenTransition)
                    {
                        roomRules.transitionDuration = { value: durations.join(", ") };
                    }
                }

                if (tag.computedStyle!.backgroundImage && tag.computedStyle!.backgroundImage !== this._css.none &&
                    tag.computedStyle!.backgroundImage !== this._rootImageUrl)
                {
                    this.processBackgroundImagesAndGradients(tag, doc, roomRules, isButton, isTable, bgInverted);
                }

                if (tag instanceof doc.defaultView.HTMLIFrameElement && !tag.mlInaccessible)
                {
                    //dom.addEventListener(tag, "load", this.onIFrameLoaded, this, false, tag)();
                }

                if (tag instanceof doc.defaultView.HTMLCanvasElement ||
                    tag instanceof doc.defaultView.HTMLIFrameElement && tag.mlInaccessible ||
                    this._isPdf && tag instanceof HTMLEmbedElement)
                {
                    this.processInaccessibleTextContent(tag, roomRules);
                }

                return { roomRules, before: undefined, after: undefined };
            }
            return undefined;
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
                let isSvg = tag instanceof doc.defaultView.SVGElement,
                    isSvgText = tag instanceof doc.defaultView.SVGTextContentElement,
                    isLink = tag instanceof doc.defaultView.HTMLAnchorElement,
                    isButton = tag instanceof doc.defaultView.HTMLButtonElement ||
                        tag instanceof doc.defaultView.HTMLInputElement &&
                        (tag.type === "button" || tag.type === "submit" || tag.type === "reset") ||
                        isRealElement(tag) && tag.getAttribute("role") === "button",
                    isTable =
                        tag instanceof doc.defaultView.HTMLTableElement || tag instanceof doc.defaultView.HTMLTableCellElement ||
                        tag instanceof doc.defaultView.HTMLTableRowElement || tag instanceof doc.defaultView.HTMLTableSectionElement;
                let ns = isSvg ? USP.svg : USP.htm;
                let beforePseudoElement: PseudoElement | undefined, afterPseudoElement: PseudoElement | undefined;

                if (!isButton && tag instanceof doc.defaultView.HTMLLabelElement && tag.htmlFor)
                {
                    const labeledElement = doc.getElementById(tag.htmlFor);
                    isButton = labeledElement instanceof doc.defaultView.HTMLInputElement &&
                        labeledElement.type === "file";
                }

                if (isLink && !isButton && !isSvg &&
                    tag.className && tag.className && tag.className &&
                    (tag.className.includes("button") || tag.className.includes("btn")))
                {
                    isButton = true;
                }

                if (tag instanceof doc.defaultView.HTMLIFrameElement && !tag.mlInaccessible)
                {
                    //dom.addEventListener(tag, "load", this.onIFrameLoaded, this, false, tag)();
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
                        if (beforeStyle && beforeStyle.content &&
                            beforeStyle.content !== this._css.none &&
                            beforeStyle.getPropertyValue("--ml-ignore") !== true.toString())
                        {
                            roomId = roomId || (room ? Util.hashCode(room).toString() : Util.guid());
                            beforePseudoElement = new PseudoElement(PseudoType.Before, tag, roomId, beforeStyle, roomRules);
                            roomRules.attributes = roomRules.attributes || new Map<string, string>();
                            roomRules.attributes.set("before-style", roomId);
                        }
                        if (afterStyle && afterStyle.content &&
                            afterStyle.content !== this._css.none &&
                            afterStyle.getPropertyValue("--ml-ignore") !== true.toString())
                        {
                            roomId = roomId || (room ? Util.hashCode(room).toString() : Util.guid());
                            afterPseudoElement = new PseudoElement(PseudoType.After, tag, roomId, afterStyle, roomRules);
                            roomRules.attributes = roomRules.attributes || new Map<string, string>();
                            roomRules.attributes.set("after-style", roomId);
                        }
                    }
                    if (tag.computedStyle && tag.computedStyle.transitionDuration !== this._css._0s)
                    {
                        let { hasForbiddenTransition, durations } = this.calculateTransitionDuration(tag);
                        if (hasForbiddenTransition)
                        {
                            roomRules.transitionDuration = { value: durations.join(", ") };
                        }
                    }
                    if (!isSvgText)
                    {
                        if (tag instanceof SVGElement)
                        {
                            if (this.tagIsSmall(tag instanceof SVGSVGElement ? tag : tag.ownerSVGElement) &&
                                tag.computedStyle!.getPropertyValue("--ml-small-svg-is-text") === true.toString())
                            {
                                isSvgText = true;
                                roomRules.backgroundColor = Object.assign({}, this.getParentBackground(
                                    tag.ownerSVGElement || tag));
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

                    if (tag.tagName == ns.img &&
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
                                    this._settingsManager.currentSettings.blueFilter !== 0 ? `var(--${FilterType.BlueFilter})` : "",
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

                    if (tag.computedStyle!.content!.startsWith("url") &&
                        (this._app.browserName === Settings.BrowserName.Chrome ||
                            !(beforePseudoElement && beforePseudoElement.computedStyle.content === tag.computedStyle!.content) &&
                            !(afterPseudoElement && afterPseudoElement.computedStyle.content === tag.computedStyle!.content)))
                    {
                        let doInvert = (!isTable) && bgInverted &&
                            (tag.computedStyle!.content!.search(doNotInvertRegExp) === -1) &&
                            tag.computedStyle!.getPropertyValue("--ml-no-invert") !== true.toString() &&
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
                                        this._settingsManager.currentSettings.blueFilter !== 0 ? `var(--${FilterType.BlueFilter})` : ""
                                    ].filter(f => f).join(" ").trim()
                                };
                        }
                    }

                    if (tag.computedStyle!.backgroundImage && tag.computedStyle!.backgroundImage !== this._css.none &&
                        tag.computedStyle!.backgroundImage !== this._rootImageUrl)
                    {
                        this.processBackgroundImagesAndGradients(tag, doc, roomRules, isButton, isTable, bgInverted);
                    }

                    let bgLight = roomRules.backgroundColor.light;
                    if (!isSvg || isSvgText)
                    {
                        if (isLink || !isSvg && ( //tag.isPseudo &&
                            tag.parentElement instanceof doc.defaultView.HTMLAnchorElement ||
                            tag.parentElement && tag.parentElement.mlColor && tag.parentElement.mlColor.role === cc.Link))
                        {
                            roomRules.color = this.changeColor({ role: cc.Link, property: ns.css.fntColor, tag: tag, bgLight: bgLight });
                            if (!(tag instanceof doc.defaultView.HTMLFontElement))
                            {
                                roomRules.color$Avtive = this.changeColor({ role: cc.Link$Active, property: ns.css.fntColor, tag: tag, bgLight: bgLight });
                                roomRules.color$Hover = this.changeColor({ role: cc.Link$Hover, property: ns.css.fntColor, tag: tag, bgLight: bgLight });

                                roomRules.visitedColor = this.changeColor({ role: cc.VisitedLink, property: ns.css.fntColor, tag: tag, bgLight: bgLight });
                                roomRules.visitedColor$Active = this.changeColor({ role: cc.VisitedLink$Active, property: ns.css.fntColor, tag: tag, bgLight: bgLight });
                                roomRules.visitedColor$Hover = this.changeColor({ role: cc.VisitedLink$Hover, property: ns.css.fntColor, tag: tag, bgLight: bgLight });
                            }
                        }
                        else
                        {
                            roomRules.color = this.changeColor({ role: cc.Text, property: ns.css.fntColor, tag: tag, bgLight: bgLight });
                        }
                        if (roomRules.color)
                        {
                            let originalTextContrast = Math.abs(roomRules.backgroundColor.originalLight - roomRules.color.originalLight);
                            let currentTextContrast = Math.abs(roomRules.backgroundColor.light - roomRules.color.light);
                            if (currentTextContrast != originalTextContrast && roomRules.color.originalLight != roomRules.color.light &&
                                tag.computedStyle!.textShadow && tag.computedStyle!.textShadow !== this._css.none)
                            {
                                let newTextShadow = tag.computedStyle!.textShadow!,
                                    newColor: Colors.ColorEntry | undefined = undefined, currentTextShadowColor: string | null,
                                    prevHslColor: Colors.HslaColor, shadowContrast: number, inheritedShadowColor;
                                let uniqColors = new Set<string>(newTextShadow
                                    .replace(/([\.\d]+px)/gi, '')
                                    .match(/(rgba?\([^\)]+\)|#[a-z\d]+|[a-z]+)/gi) || []);
                                if (uniqColors.size > 0)
                                {
                                    uniqColors.forEach(c =>
                                    {
                                        currentTextShadowColor = /rgb/gi.test(c) ? c : this._colorConverter.convert(c);
                                        if (currentTextShadowColor)
                                        {
                                            newColor = this.changeColor({
                                                role: cc.TextShadow, property: ns.css.shdColor,
                                                bgLight: roomRules!.color!.light,
                                                propVal: currentTextShadowColor, tag
                                            });
                                            if (newColor && newColor.color)
                                            {
                                                newTextShadow = newTextShadow.replace(new RegExp(Util.escapeRegex(c), "gi"), newColor.color);
                                            }
                                        }
                                    });
                                    if (newTextShadow !== tag.computedStyle!.textShadow)
                                    {
                                        roomRules.textShadow = { value: newTextShadow, color: newColor || null };
                                    }
                                }
                            }
                        }
                    }

                    if (tag instanceof doc.defaultView.HTMLCanvasElement ||
                        tag instanceof doc.defaultView.HTMLIFrameElement && tag.mlInaccessible ||
                        this._isPdf && tag instanceof HTMLEmbedElement)
                    {
                        this.processInaccessibleTextContent(tag, roomRules);
                    }

                    if (isSvg && tag.computedStyle!.stroke !== this._css.none || !isSvg && (
                        tag.computedStyle!.borderStyle && tag.computedStyle!.borderStyle !== this._css.none ||
                        !tag.computedStyle!.borderStyle && (
                            tag.computedStyle!.borderTopStyle !== this._css.none ||
                            tag.computedStyle!.borderRightStyle !== this._css.none ||
                            tag.computedStyle!.borderBottomStyle !== this._css.none ||
                            tag.computedStyle!.borderLeftStyle !== this._css.none)))
                    {
                        let brdColor = tag.computedStyle!.getPropertyValue(ns.css.brdColor);
                        const brdColorIsSingle = brdColor && brdColor.indexOf(" r") === -1 || !brdColor &&
                            tag.computedStyle!.borderTopColor === tag.computedStyle!.borderRightColor &&
                            tag.computedStyle!.borderRightColor === tag.computedStyle!.borderBottomColor &&
                            tag.computedStyle!.borderBottomColor === tag.computedStyle!.borderLeftColor;
                        const bgrColor = tag.computedStyle!.getPropertyValue(ns.css.bgrColor);

                        if (brdColorIsSingle)
                        {
                            brdColor = brdColor || tag.computedStyle!.borderTopColor!;
                            if (brdColor === bgrColor)
                            {
                                roomRules.borderColor = Object.assign(Object.assign({},
                                    roomRules.backgroundColor), {
                                        reason: Colors.ColorReason.SameAsBackground,
                                        owner: this._app.isDebug ? tag : null
                                    });
                            }
                            else
                            {
                                roomRules.borderColor = this.changeColor({ role: isButton ? cc.ButtonBorder : cc.Border, property: ns.css.brdColor, tag: tag, bgLight: bgLight, propVal: brdColor });
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
                            if (tag.computedStyle!.borderTopColor === bgrColor)
                            {
                                roomRules.borderTopColor = Object.assign(Object.assign({},
                                    roomRules.backgroundColor), {
                                        reason: Colors.ColorReason.SameAsBackground,
                                        owner: this._app.isDebug ? tag : null
                                    });
                            }
                            else
                            {
                                roomRules.borderTopColor = this.changeColor(
                                    { role: borderRole, property: this._css.borderTopColor, tag: tag, bgLight: bgLight });
                            }

                            if (tag.computedStyle!.borderRightColor === bgrColor)
                            {
                                roomRules.borderRightColor = Object.assign(Object.assign({},
                                    roomRules.backgroundColor), {
                                        reason: Colors.ColorReason.SameAsBackground,
                                        owner: this._app.isDebug ? tag : null
                                    });
                            }
                            else
                            {
                                roomRules.borderRightColor = this.changeColor(
                                    { role: borderRole, property: this._css.borderRightColor, tag: tag, bgLight: bgLight });
                            }

                            if (tag.computedStyle!.borderBottomColor === bgrColor)
                            {
                                roomRules.borderBottomColor = Object.assign(Object.assign({},
                                    roomRules.backgroundColor), {
                                        reason: Colors.ColorReason.SameAsBackground,
                                        owner: this._app.isDebug ? tag : null
                                    });
                            }
                            else
                            {
                                roomRules.borderBottomColor = this.changeColor(
                                    { role: borderRole, property: this._css.borderBottomColor, tag: tag, bgLight: bgLight });
                            }

                            if (tag.computedStyle!.borderLeftColor === bgrColor)
                            {
                                roomRules.borderLeftColor = Object.assign(Object.assign({},
                                    roomRules.backgroundColor), {
                                        reason: Colors.ColorReason.SameAsBackground,
                                        owner: this._app.isDebug ? tag : null
                                    });
                            }
                            else
                            {
                                roomRules.borderLeftColor = this.changeColor(
                                    { role: borderRole, property: this._css.borderLeftColor, tag: tag, bgLight: bgLight });
                            }
                        }
                    }
                }

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

        private processInaccessibleTextContent(
            tag: HTMLIFrameElement | HTMLCanvasElement | HTMLEmbedElement,
            roomRules: RoomRules)
        {
            let filterValue: Array<string>;
            const customCanvasRole = tag.computedStyle!.getPropertyValue(`--ml-${cc[cc.Background].toLowerCase()}-${this._css.backgroundColor}`) as keyof Colors.ComponentShift;
            let bgrSet = this.shift[customCanvasRole] || this.shift.Background, txtSet = this.shift.Text;
            if (this.shift.Background.lightnessLimit < 0.3 && tag.computedStyle!.getPropertyValue("--ml-no-invert") !== true.toString())
            {
                roomRules.backgroundColor && (roomRules.backgroundColor.color = null);
                filterValue = [
                    tag.computedStyle!.filter != this._css.none ? tag.computedStyle!.filter! : "",
                    tag instanceof HTMLEmbedElement ? (`var(--${FilterType.PdfFilter})`) : "",
                    bgrSet.saturationLimit < 1 ? `saturate(${bgrSet.saturationLimit})` : "",
                    `brightness(${float.format(Math.max(1 - bgrSet.lightnessLimit, 0.88))})`,
                    `hue-rotate(180deg) invert(1)`,
                    this._settingsManager.currentSettings.blueFilter !== 0 ? `var(--${FilterType.BlueFilter})` : "",
                    `brightness(${float.format(Math.max(txtSet.lightnessLimit, 0.88))})`
                ];
            }
            else
            {
                filterValue = [
                    tag.computedStyle!.filter != this._css.none ? tag.computedStyle!.filter! : "",
                    bgrSet.saturationLimit < 1 ? `saturate(${bgrSet.saturationLimit})` : "",
                    this._settingsManager.currentSettings.blueFilter !== 0 ? `var(--${FilterType.BlueFilter})` : "",
                    bgrSet.lightnessLimit < 1 ? `brightness(${bgrSet.lightnessLimit})` : ""
                ];
            }
            roomRules.filter = { value: filterValue.filter(f => f).join(" ").trim() };
        }

        private calculateTransitionDuration(tag: HTMLElement | PseudoElement)
        {
            let hasForbiddenTransition = false;
            let durations = tag.computedStyle!.transitionDuration!.split(", ");
            tag.computedStyle!.transitionProperty!.split(", ").forEach((prop, index) =>
            {
                if (this._transitionForbiddenProperties.has(prop))
                {
                    durations[index] = this._css._0s;
                    hasForbiddenTransition = true;
                }
            });
            return { hasForbiddenTransition, durations };
        }

        protected changeColor(
            {
                role: component, property: property, tag: tag, bgLight: bgLight, propVal: propVal
            }:
                {
                    role: Colors.Component, property: string, tag: HTMLElement | PseudoElement, bgLight?: number, propVal?: string
                }): Colors.ColorEntry | undefined
        {
            if (tag.computedStyle)
            {
                let propRole = (cc as any as { [p: string]: Colors.Component })
                [tag.computedStyle.getPropertyValue(`--ml-${cc[component].replace("$", "-").toLowerCase()}-${property}`)];
                propRole = propRole !== undefined ? propRole : component;
                propVal = propVal || tag.computedStyle!.getPropertyValue(property);
                let bgLightVal = 1;
                switch (propRole)
                {
                    case cc.Background:
                        return this._backgroundColorProcessor.changeColor(propVal, true, tag, this._boundParentBackgroundGetter);

                    case cc.BackgroundNoContrast:
                        return this._backgroundColorProcessor.changeColor(propVal, false, tag, this._boundParentBackgroundGetter);

                    case cc.ButtonBackground:
                        bgLightVal = bgLight !== undefined ? bgLight : this.getParentBackground(tag).light;
                        return this._buttonBackgroundColorProcessor.changeColor(propVal, bgLightVal, tag);

                    case cc.Text:
                        bgLightVal = bgLight !== undefined ? bgLight : this.getParentBackground(tag).light;
                        return this._textColorProcessor.changeColor(propVal, bgLightVal, tag);

                    case cc.TextShadow:
                        return this._textShadowColorProcessor.changeColor(propVal, bgLight!, tag);

                    case cc.HighlightedText:
                        bgLightVal = bgLight !== undefined ? bgLight : this.getParentBackground(tag).light;
                        return this._highlightedTextColorProcessor.changeColor(propVal, bgLightVal, tag);

                    case cc.Link:
                        bgLightVal = bgLight !== undefined ? bgLight : this.getParentBackground(tag).light;
                        return this._linkColorProcessor.changeColor(propVal, bgLightVal, tag);

                    case cc.Link$Active:
                        bgLightVal = bgLight !== undefined ? bgLight : this.getParentBackground(tag).light;
                        return this._activeLinkColorProcessor.changeColor(propVal, bgLightVal, tag);

                    case cc.Link$Hover:
                        bgLightVal = bgLight !== undefined ? bgLight : this.getParentBackground(tag).light;
                        return this._hoverLinkColorProcessor.changeColor(propVal, bgLightVal, tag);

                    case cc.VisitedLink:
                        bgLightVal = bgLight !== undefined ? bgLight : this.getParentBackground(tag).light;
                        return this._visitedLinkColorProcessor.changeColor(propVal, bgLightVal, tag);

                    case cc.VisitedLink$Active:
                        bgLightVal = bgLight !== undefined ? bgLight : this.getParentBackground(tag).light;
                        return this._activeVisitedLinkColorProcessor.changeColor(propVal, bgLightVal, tag);

                    case cc.VisitedLink$Hover:
                        bgLightVal = bgLight !== undefined ? bgLight : this.getParentBackground(tag).light;
                        return this._hoverVisitedLinkColorProcessor.changeColor(propVal, bgLightVal, tag);

                    case cc.Border:
                        bgLightVal = bgLight !== undefined ? bgLight : this.getParentBackground(tag).light;
                        return this._borderColorProcessor.changeColor(propVal, bgLightVal, tag);

                    case cc.ButtonBorder:
                        bgLightVal = /*bgLight !== undefined ? bgLight :*/ this.getParentBackground(tag).light;
                        return this._buttonBorderColorProcessor.changeColor(propVal, bgLightVal, tag);

                    case cc.SvgBackground:
                        return this._svgColorProcessor.changeColor(propVal, false, tag, this._boundParentBackgroundGetter);

                    case cc.TextSelection:
                        return this._textSelectionColorProcessor.changeColor(propVal, true, tag, this._boundParentBackgroundGetter);
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

        protected processBackgroundImagesAndGradients(
            tag: HTMLElement | PseudoElement, doc: Document, roomRules: RoomRules,
            isButton: boolean, isTable: boolean, bgInverted: boolean)
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
                haveToProcBgGrad = /gradient/gi.test(backgroundImage), noFilters = false;
            if (/\burl\(/gi.test(backgroundImage))
            {
                const customBgImageRole = tag.computedStyle!.getPropertyValue(`--ml-${cc[cc.BackgroundImage].toLowerCase()}`) as keyof Colors.ComponentShift;
                let bgImgSet = this.shift[customBgImageRole] || this.shift.BackgroundImage;

                doInvert = !isTable && bgInverted && (backgroundImage.search(doNotInvertRegExp) === -1) &&
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
                        this._settingsManager.currentSettings.blueFilter !== 0 ? `var(--${FilterType.BlueFilter})` : ""
                    ].filter(f => f).join(" ").trim();

                    if (tag.tagName !== "INPUT" && tag.tagName !== "TEXTAREA" &&
                        tag.tagName !== "BODY" && tag !== doc.documentElement)
                    {
                        roomRules.filter = { value: bgFilter };
                    }
                    else
                    {
                        roomRules.attributes = roomRules.attributes || new Map<string, string>();
                        roomRules.attributes.set("ml-no-bg-image", "");
                        noFilters = true;
                    }

                    haveToProcBgImg = isRealElement(tag) && !!tag.firstChild || tag.tagName === "BODY" ||
                        isPseudoContent || roomRules.backgroundColor && !!roomRules.backgroundColor.color ||
                        haveToProcBgGrad || noFilters;

                    if (tag.tagName === USP.htm.img)
                    {
                        roomRules.keepFilter = true;
                        haveToProcBgImg = false;
                    }
                }
            }
            if (haveToProcBgImg || haveToProcBgGrad)
            {
                roomRules.backgroundImages = backgroundImages.map((bgImg, index) =>
                {
                    gradientColors.forEach((id, color) => bgImg = bgImg.replace(new RegExp(id, "g"), color));
                    let size = backgroundSizes[Math.min(index, backgroundSizes.length)];
                    if (haveToProcBgImg && bgImg.startsWith("url"))
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

        protected processBackgroundGradient(tag: HTMLElement | PseudoElement, isButton: boolean, index: number, gradient: string, size: string, roomRules: RoomRules)
        {
            let mainColor: Colors.ColorEntry | null = null, lightSum = 0;
            let uniqColors = new Set<string>(gradient // -webkit-gradient(linear, 0% 0%, 0% 100%, from(rgb(246, 246, 245)), to(rgb(234, 234, 234)))
                .replace(/webkit|moz|ms|repeating|linear|radial|from|\bto\b|gradient|circle|ellipse|top|left|bottom|right|farthest|closest|side|corner|color|stop|[\.\d]+%|[\.\d]+[a-z]{2,3}/gi, '')
                .match(/(rgba?\([^\)]+\)|#[a-z\d]{6}|[a-z]+)/gi) || []);
            const bgLight = isButton ? this.getParentBackground(tag).light : 0;
            if (uniqColors.size > 0)
            {
                uniqColors.forEach(c =>
                {
                    let prevColor = /rgb/gi.test(c) ? c : this._colorConverter.convert(c);
                    let newColor: Colors.ColorEntry;
                    if (isButton)
                    {
                        newColor = this._buttonBackgroundColorProcessor
                            .changeColor(prevColor, bgLight, tag);
                    }
                    else
                    {
                        newColor = this._backgroundColorProcessor.changeColor(prevColor, false, tag);
                    }
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
            roomRules.backgroundImageKeys = roomRules.backgroundImageKeys || [];
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

            const bgFltr = bgFilter.replace(`var(--${FilterType.BlueFilter})`, `url(#${FilterType.BlueFilter})`);
            let result = Promise.all([dataPromise, size, bgFltr, this._settingsManager.currentSettings.blueFilter / 100]).then(
                ([img, bgSize, fltr, blueFltr]) =>
                {
                    let imgWidth = img.width + this._css.px, imgHeight = img.height + this._css.px;
                    return new BackgroundImage(
                        /^(auto\s?){1,2}$/i.test(bgSize) ? imgWidth + " " + imgHeight : bgSize,
                        "url(data:image/svg+xml," + encodeURIComponent
                            (
                            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${img.width} ${img.height}" filter="${fltr}">` +
                            `<filter id="${FilterType.BlueFilter}"><feColorMatrix type="matrix" values="` +
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
                dom.addEventListener(childDoc, "DOMContentLoaded", this.onIFrameDocumentLaoded, this, false, childDoc)();
            }
            catch (ex)
            {
                if (this._settingsManager.currentSettings.applyEffectsOnInaccessibleExternalContent)
                {
                    iframe.mlInaccessible = true;
                    this._documentObserver.stopDocumentObservation(iframe.ownerDocument);
                    this.restoreElementColors(iframe, true);
                    iframe.setAttribute("fixed", "access");
                    DocumentProcessor.processElementsChunk([iframe], this, null, 0);
                    //docProc._app.isDebug && console.error(ex);
                }
            }
        }

        protected onIFrameDocumentLaoded(doc: Document)
        {
            if (doc.defaultView && this._settingsManager.isActive)
            {
                this.injectDynamicValues(doc);
                if (doc.readyState != "loading" && doc.readyState != "uninitialized")
                {
                    this.processDocument(doc);
                }
                else
                {
                    this.setDocumentProcessingStage(doc, ProcessingStage.Loading);
                }
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

        protected removeDynamicValuesStyle(doc: Document)
        {
            const dynamicStyle = doc.getElementById("midnight-lizard-dynamic-values");
            dynamicStyle && dynamicStyle.remove();
            this._svgFilters.remodeSvgFilters(doc);
        }

        protected createPseudoStyles(doc: Document)
        {
            if (!doc.mlPseudoStyles)
            {
                doc.mlPseudoStyles = doc.createElement('style');
                doc.mlPseudoStyles.id = "midnight-lizard-pseudo-styles";
                doc.mlPseudoStyles.mlIgnore = true;
                doc.mlPseudoStyles.textContent = this.getStandardPseudoStyles();
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
                doc.mlPseudoStyles.textContent = this.getStandardPseudoStyles();
            }
        }

        protected calculateMainColors(doc: Document)
        {
            this.calculateDefaultColors(doc, cx.Link, cx.Black);
            const bgLight = this.shift.Background.lightnessLimit,
                textColorEntry = this._textColorProcessor.changeColor(cx.Black, bgLight, doc.documentElement);
            const
                backgroundColor = this._backgroundColorProcessor.changeColor(cx.White, true, doc.documentElement).color!,
                altBackgroundColor = this._backgroundColorProcessor.changeColor("grb(250,250,250)", true, doc.documentElement).color!,
                transBackgroundColor = this._backgroundColorProcessor.changeColor("grba(255,255,255,0.5)", true, doc.documentElement).color!,
                transAltBackgroundColor = this._backgroundColorProcessor.changeColor("grba(250,250,250,0.3)", true, doc.documentElement).color!,
                textColor = textColorEntry.color!,
                borderColor = this._borderColorProcessor.changeColor(cx.Gray, bgLight, doc.documentElement).color!,
                selectionColor = this._textSelectionColorProcessor.changeColor(cx.White, false, doc.documentElement).color!,
                rangeFillColor = this._rangeFillColorProcessor.changeColor(
                    this._settingsManager.shift, textColorEntry.light, bgLight).color!,

                buttonBackgroundColor = this._buttonBackgroundColorProcessor.changeColor(cx.White, bgLight, doc.documentElement).color!,
                buttonBorderColor = this._buttonBorderColorProcessor.changeColor(cx.White, bgLight, doc.documentElement).color!,

                scrollbarThumbHoverColor = this._scrollbarHoverColorProcessor.changeColor(cx.White, bgLight).color!,
                scrollbarThumbNormalColor = this._scrollbarNormalColorProcessor.changeColor(cx.White, bgLight).color!,
                scrollbarThumbActiveColor = this._scrollbarActiveColorProcessor.changeColor(cx.White, bgLight).color!,
                scrollbarTrackColor = backgroundColor,
                scrollbarSize = `${this._settingsManager.currentSettings.scrollbarSize}px`,

                linkColor = this._linkColorProcessor.changeColor(cx.Link, bgLight, doc.documentElement).color!,
                linkColorHover = this._hoverLinkColorProcessor.changeColor(cx.Link, bgLight, doc.documentElement).color!,
                linkColorActive = this._activeLinkColorProcessor.changeColor(cx.Link, bgLight, doc.documentElement).color!,
                visitedColor = this._visitedLinkColorProcessor.changeColor(cx.Link, bgLight, doc.documentElement).color!,
                visitedColorHover = this._hoverVisitedLinkColorProcessor.changeColor(cx.Link, bgLight, doc.documentElement).color!,
                visitedColorActive = this._activeVisitedLinkColorProcessor.changeColor(cx.Link, bgLight, doc.documentElement).color!;

            this._backgroundColorProcessor.clear();

            return {
                backgroundColor, altBackgroundColor, transBackgroundColor, transAltBackgroundColor,
                textColor, borderColor, selectionColor, rangeFillColor,
                buttonBackgroundColor, buttonBorderColor,
                scrollbarThumbHoverColor, scrollbarThumbNormalColor, scrollbarThumbActiveColor, scrollbarTrackColor, scrollbarSize,
                linkColor, linkColorHover, linkColorActive,
                visitedColor, visitedColorHover, visitedColorActive
            };
        }

        protected injectDynamicValues(doc: Document)
        {
            this._svgFilters.createSvgFilters(doc);
            const mainColors = this.calculateMainColors(doc);
            let cssText = "";
            for (const color in mainColors)
            {
                const colorValue = mainColors[color as keyof typeof mainColors];
                cssText += `\n--ml-main-${
                    color.replace(/([A-Z])/g, "-$1").toLowerCase()
                    }:${(mainColors as any)[color]};`;
            }
            let component: keyof Colors.ComponentShift,
                property: keyof Colors.ColorShift;
            for (component in this.shift)
            {
                for (property in this.shift[component])
                {
                    cssText += `\n--ml${
                        component.replace("$", "").replace(/([A-Z])/g, "-$1")
                        }-${
                        property.replace(/([A-Z])/g, "-$1")
                        }:${
                        this.shift[component][property]
                        };`.toLowerCase();
                }
            }
            cssText += `\n--ml-browser:${this._app.browserName}!important;`;
            cssText += `\n--${FilterType.BlueFilter}:url("#${FilterType.BlueFilter}");`;
            cssText += `\n--${FilterType.PdfFilter}:url("#${FilterType.PdfFilter}");`;
            cssText += `\n--ml-invert:${this.shift.Background.lightnessLimit < 0.3 ? 1 : 0}!important;`;
            cssText += `\n--ml-is-active:${this._settingsManager.isActive ? 1 : 0}!important;`;

            const fakeCanvas = doc.createElement("canvas"), fakeCanvasRules = new RoomRules;
            fakeCanvas.computedStyle = fakeCanvas.style;
            this.processInaccessibleTextContent(fakeCanvas, fakeCanvasRules);
            cssText += `\n--ml-text-filter:${fakeCanvasRules.filter!.value}`;

            const mainColorsStyle = doc.createElement('style');
            mainColorsStyle.id = "midnight-lizard-dynamic-values";
            mainColorsStyle.mlIgnore = true;
            mainColorsStyle.textContent = `:root { ${cssText} }`;
            (doc.head || doc.documentElement).appendChild(mainColorsStyle);
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
            let isSvg = tag instanceof tag.ownerDocument.defaultView.SVGElement;
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
                                if (rr.backgroundImageKeys)
                                    this._images.set(rr.backgroundImageKeys[index], img);
                            });
                            return this.applyBackgroundImages(t, bgImgs as BackgroundImage[]);
                        });
                    Promise
                        .all([tag, Util.handlePromise(applyBgPromise), roomRules])
                        .then(([tag, result, rr]) =>
                        {
                            if (result && result.status === Util.PromiseStatus.Failure)
                            {
                                this._app.isDebug &&
                                    console.error(`Can not fetch background image\n${rr.backgroundImageKeys &&
                                        rr.backgroundImageKeys.join("\n")}: ` +
                                        result.data);
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
                    tag.parentElement instanceof tag.ownerDocument.defaultView.HTMLElement &&
                    tag.parentElement!.contentEditable === true.toString()) || tag.contentEditable === true.toString()))
                {
                    tag.style.setProperty(this._css.originalColor, tag.originalColor!);
                }
                if (roomRules.visitedColor && roomRules.visitedColor.color)
                {
                    tag.style.setProperty(this._css.linkColor, roomRules.color.color, this._css.important);
                    tag.style.setProperty(this._css.linkColorHover, roomRules.color$Hover!.color, this._css.important);
                    tag.style.setProperty(this._css.linkColorActive, roomRules.color$Avtive!.color, this._css.important);

                    tag.style.setProperty(this._css.visitedColor, roomRules.visitedColor.color, this._css.important);
                    tag.style.setProperty(this._css.visitedColorHover, roomRules.visitedColor$Hover!.color, this._css.important);
                    tag.style.setProperty(this._css.visitedColorActive, roomRules.visitedColor$Active!.color, this._css.important);
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