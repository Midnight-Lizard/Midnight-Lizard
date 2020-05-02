import { HtmlEvent } from "../Events/HtmlEvent";
import { RgbaColor } from "../Colors/RgbaColor";
import { Component, ComponentShift } from "../Colors/ComponentShift";
import { PromiseStatus, HandledPromiseResult, handlePromise, forEachPromise } from "../Utils/Promise";
import { ArgumentedEvent, EventHandlerPriority } from "../Events/Event";
import { ArgumentedEventDispatcher } from "../Events/EventDispatcher";
import { PseudoElement, PseudoStyleStandard, PseudoClass, PseudoType } from "./Pseudos";
import { RoomRules } from "./RoomRules";
import { injectable } from "../Utils/DI";
import { CssStyleKeys, CssStyle, USP } from "./CssStyle";
import { CurrentExtensionModule, ExtensionModule } from "../Settings/ExtensionModule";
import { IApplicationSettings, BrowserName } from "../Settings/IApplicationSettings";
import { IBaseSettingsManager } from "../Settings/BaseSettingsManager";
import { IPreloadManager } from "./PreloadManager";
import { IDocumentObserver } from "./DocumentObserver";
import { IStyleSheetProcessor } from "./StyleSheetProcessor";
import
{
    IBackgroundColorProcessor, ISvgBackgroundColorProcessor, ITextSelectionColorProcessor
} from "../Colors/BackgroundColorProcessor";
import
{
    IButtonBackgroundColorProcessor, IScrollbarHoverColorProcessor,
    IScrollbarNormalColorProcessor, IScrollbarActiveColorProcessor, ITextColorProcessor,
    IHighlightedTextColorProcessor, IHighlightedBackgroundColorProcessor,
    IVisitedLinkColorProcessor, IActiveVisitedLinkColorProcessor, ILinkColorProcessor,
    IHoverLinkColorProcessor, ITextShadowColorProcessor, IBorderColorProcessor,
    IButtonBorderColorProcessor, IActiveLinkColorProcessor, IHoverVisitedLinkColorProcessor
} from "../Colors/ForegroundColorProcessor";
import { IRangeFillColorProcessor } from "../Colors/RangeFillColorProcessor";
import { IColorToRgbaStringConverter } from "../Colors/ColorToRgbaStringConverter";
import { IDocumentZoomObserver } from "./DocumentZoomObserver";
import { ISvgFilters, FilterType, colorOverlayLimit } from "./SvgFilters";
import { IBackgroundImageProcessor } from "./BackgroundImageProcessor";
import { INoneColorProcessor } from "../Colors/NoneColorProcessor";
import { ColorScheme, ProcessingMode } from "../Settings/ColorScheme";
import { sliceIntoChunks } from "../Utils/Array";
import { ColorReason, NotFound, ColorEntry } from "../Colors/ColorEntry";
import { HslaColor } from "../Colors/HslaColor";
import { escapeRegex } from "../Utils/String";
import { BackgroundImage, BackgroundImageType } from "./BackgroundImage";
import { getEnumNames, getEnumValues } from "../Utils/Enum";
import { BaseColorProcessor } from "../Colors/BaseColorProcessor";
import { ColorShift } from "../Colors/ColorShift";
import
{
    ProcessingOrder, normalDelays, smallReCalculationDelays, onCopyReCalculationDelays,
    bigReCalculationDelays
} from "./ProcessingOrder";

let chunkLength = 300;
let minChunkableLength = 700;
const dom = HtmlEvent;
const cx = RgbaColor;
const cc = Component;
const po = ProcessingOrder;
const Status = PromiseStatus;
type PromiseResult<T> = HandledPromiseResult<T>;
type ArgEvent<TArgs> = ArgumentedEvent<TArgs>;
const ArgEventDispatcher = ArgumentedEventDispatcher;
const doNotInvertRegExp = /user|account|avatar|photo(?!.+black)|white|grey|gray|flag|emoji/i;
const notTextureRegExp = /user|account|avatar|photo|flag|emoji/i;
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

enum UpdateStage
{
    Aware = "aware",
    Requested = "requested",
    Ready = "ready"
}

export abstract class IDocumentProcessor
{
    abstract get onRootDocumentProcessing(): ArgEvent<Document>;
    abstract get onMainColorsCalculated(): ArgEvent<any>;
    abstract applyRoomRules(tag: HTMLElement | PseudoElement, roomRules: RoomRules, ns: any): void;
}

/** Base Document Processor */
@injectable(IDocumentProcessor)
class DocumentProcessor implements IDocumentProcessor
{
    protected _rootDocumentContentLoaded: boolean = false;
    protected readonly _rootImageUrl: string;
    protected readonly _standardPseudoCssTexts = new Map<PseudoStyleStandard, string>();
    /** key = cssText, value = pseudoId */
    private readonly _pseudoStyles = new Map<string, string>();
    protected readonly _boundUserActionHandler: (e: Event) => void;
    protected readonly _boundCheckedLabelHandler: (e: Event) => void;
    protected readonly _boundUserHoverHandler: (e: Event) => void;
    protected readonly _css: CssStyleKeys;
    protected readonly _transitionForbiddenProperties: Set<string>;
    protected readonly _boundParentBackgroundGetter: any;
    protected _autoUpdateTask?: number;
    protected readonly _filterForFilterProcessing = this.getFilterOfElementsForFilterProcessing();

    protected get shift() { return this._settingsManager.shift }

    protected _onRootDocumentProcessing = new ArgEventDispatcher<Document>();
    public get onRootDocumentProcessing()
    {
        return this._onRootDocumentProcessing.event;
    }

    protected _onMainColorsCalculated = new ArgEventDispatcher<any>();
    public get onMainColorsCalculated()
    {
        return this._onMainColorsCalculated.event;
    }

    /** DocumentProcessor constructor
     * @param _app - Application settings
     * @param _rootDocument - Root Document to be processed
     * @param _settingsManager - Settings manager
     */
    constructor(css: CssStyle,
        protected readonly _rootDocument: Document,
        protected readonly _module: CurrentExtensionModule,
        protected readonly _app: IApplicationSettings,
        protected readonly _settingsManager: IBaseSettingsManager,
        protected readonly _preloadManager: IPreloadManager,
        protected readonly _documentObserver: IDocumentObserver,
        protected readonly _styleSheetProcessor: IStyleSheetProcessor,
        protected readonly _backgroundColorProcessor: IBackgroundColorProcessor,
        protected readonly _buttonBackgroundColorProcessor: IButtonBackgroundColorProcessor,
        protected readonly _svgColorProcessor: ISvgBackgroundColorProcessor,
        protected readonly _scrollbarHoverColorProcessor: IScrollbarHoverColorProcessor,
        protected readonly _scrollbarNormalColorProcessor: IScrollbarNormalColorProcessor,
        protected readonly _scrollbarActiveColorProcessor: IScrollbarActiveColorProcessor,
        protected readonly _textColorProcessor: ITextColorProcessor,
        protected readonly _textSelectionColorProcessor: ITextSelectionColorProcessor,
        protected readonly _highlightedTextColorProcessor: IHighlightedTextColorProcessor,
        protected readonly _highlightedBackgroundColorProcessor: IHighlightedBackgroundColorProcessor,
        protected readonly _linkColorProcessor: ILinkColorProcessor,
        protected readonly _visitedLinkColorProcessor: IVisitedLinkColorProcessor,
        protected readonly _activeVisitedLinkColorProcessor: IActiveVisitedLinkColorProcessor,
        protected readonly _hoverVisitedLinkColorProcessor: IHoverVisitedLinkColorProcessor,
        protected readonly _activeLinkColorProcessor: IActiveLinkColorProcessor,
        protected readonly _hoverLinkColorProcessor: IHoverLinkColorProcessor,
        protected readonly _textShadowColorProcessor: ITextShadowColorProcessor,
        protected readonly _rangeFillColorProcessor: IRangeFillColorProcessor,
        protected readonly _borderColorProcessor: IBorderColorProcessor,
        protected readonly _buttonBorderColorProcessor: IButtonBorderColorProcessor,
        protected readonly _colorConverter: IColorToRgbaStringConverter,
        protected readonly _zoomObserver: IDocumentZoomObserver,
        protected readonly _svgFilters: ISvgFilters,
        protected readonly _backgroundImageProcessor: IBackgroundImageProcessor,
        protected readonly _noneColorProcessor: INoneColorProcessor)
    {
        if (_module.name === ExtensionModule.PopupWindow)
        {
            chunkLength = 250;
            minChunkableLength = 600;
            normalDelays.set(ProcessingOrder.delayedInvisTags, 1000);
        }
        this._rootImageUrl = `url("${_rootDocument.location!.href}")`;
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
        this._boundParentBackgroundGetter = this.getParentBackground.bind(this);
        if (this.setDocumentProcessingStage(_rootDocument, ProcessingStage.Preload))
        {
            this.addListeners();
        }
        this._documentObserver.startDocumentUpdateObservation(_rootDocument);
        this._documentObserver.onUpdateChanged.addListener(this.onDocumentUpdateStageChanged as any, this);
    }

    private addListeners()
    {
        dom.addEventListener(this._rootDocument, "DOMContentLoaded", this.onDocumentContentLoaded, this);
        this._settingsManager.onSettingsInitialized.addListener(this.onSettingsInitialized, this);
        this._settingsManager.onSettingsChanged.addListener(this.onSettingsChanged, this, EventHandlerPriority.Low);
        this._documentObserver.onElementsAdded.addListener(this.onElementsAdded as any, this);
        this._documentObserver.onClassChanged.addListener(this.onClassChanged as any, this);
        this._documentObserver.onStyleChanged.addListener(this.onStyleChanged as any, this);
        this._styleSheetProcessor.onElementsForUserActionObservationFound
            .addListener(this.onElementsForUserActionObservationFound as any, this);
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

    protected onSettingsChanged(response: (scheme: ColorScheme) => void, shift?: ComponentShift): void
    {
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

    protected onSettingsInitialized(): void
    {
        if (this._settingsManager.isActive)
        {
            this.createStandardPseudoCssTexts();
            this.injectDynamicValues(this._rootDocument);
            if (this._rootDocumentContentLoaded || this._rootDocument.readyState === "complete")
            {
                this._rootDocumentContentLoaded = true;
                this.processRootDocument();
            }
            else
            {
                this.setDocumentProcessingStage(this._rootDocument,
                    this._settingsManager.isActive
                        ? ProcessingStage.Loading
                        : ProcessingStage.None);
            }
        }
        else
        {
            this.setDocumentProcessingStage(this._rootDocument, ProcessingStage.None);
        }
    }

    protected onDocumentUpdateStageChanged(html: HTMLHtmlElement)
    {
        switch (html.getAttribute("ml-update"))
        {
            // received by the old version
            case UpdateStage.Requested:
                this._settingsManager.deactivateOldVersion();
                this.restoreDocumentColors(html.ownerDocument!);
                html.setAttribute("ml-update", UpdateStage.Ready);
                break;

            // received by the new version
            case UpdateStage.Ready:
                this._autoUpdateTask && clearTimeout(this._autoUpdateTask);
                this.addListeners();
                this.onSettingsInitialized();
                break;

            default:
                break;
        }
    }

    protected onDocumentContentLoaded()
    {
        dom.removeEventListener(this._rootDocument, "DOMContentLoaded", this.onDocumentContentLoaded);
        if (!this._rootDocumentContentLoaded)
        {
            this._rootDocumentContentLoaded = true;
            if (this._settingsManager.isActive)
            {
                this.processRootDocument();
            }
        }
    }

    protected setDocumentProcessingStage(doc: Document, stage: ProcessingStage)
    {
        const html = doc.documentElement!;
        if (stage === ProcessingStage.None)
        {
            html.removeAttribute("ml-stage");
            html.removeAttribute("ml-mode");
            html.removeAttribute("ml-stage-mode");
            html.removeAttribute("ml-platform");
            html.removeAttribute("ml-scrollbar-style");
            html.removeAttribute("ml-invert");
            html.removeAttribute("ml-view");
            html.removeAttribute("ml-embed");
            html.removeAttribute("ml-image");
        }
        else
        {
            if (stage === ProcessingStage.Preload &&
                html.getAttribute("ml-stage") === ProcessingStage.Complete)
            {
                // check if old version is update aware
                if (html.hasAttribute("ml-update") &&
                    this._app.browserName !== BrowserName.Firefox)
                {
                    html.setAttribute("ml-update", UpdateStage.Requested);
                }
                else
                {
                    this._settingsManager.onSettingsChanged.addListener((response, shift) =>
                    {
                        throw new Error("Midnight Lizard has been updated. Please refresh the page.");
                    }, this);
                }
                return false;
            }
            else
            {
                html.setAttribute("ml-update", UpdateStage.Aware);
                html.setAttribute("ml-stage", stage);
                html.setAttribute("ml-view", window.top === window.self ? "top" : "child");
                if (this._settingsManager.isActive)
                {
                    if (this._rootDocument.body && this._rootDocument.body.childElementCount === 1)
                    {
                        if (this._rootDocument.body.firstElementChild instanceof HTMLEmbedElement)
                        {
                            html.setAttribute("ml-embed", "");
                        }
                        else if (this._rootDocument.body.firstElementChild instanceof HTMLImageElement)
                        {
                            html.setAttribute("ml-image", "");
                        }
                    }
                    html.setAttribute("ml-platform",
                        this._app.isDesktop ? "desktop" : "mobile");
                    if (this.shift.Background.lightnessLimit < 0.3)
                    {
                        html.setAttribute("ml-invert", "");
                    }
                    html.setAttribute("ml-scrollbar-style",
                        this._settingsManager.currentSettings.scrollbarStyle ? "ml-simple" : "original");
                    html.setAttribute("ml-mode", this._settingsManager.computedMode);
                    html.setAttribute("ml-stage-mode",
                        stage + "-" + this._settingsManager.computedMode);
                }
            }
        }
        return true;
    }

    protected getLastDoccumentProcessingMode(doc: Document)
    {
        return doc.documentElement!.getAttribute("ml-mode") as ProcessingMode || ProcessingMode.Complex;
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
            doc.mlTimestamp = Date.now();
            doc.viewArea = doc.defaultView.innerHeight * doc.defaultView.innerWidth;
            this._settingsManager.computeProcessingMode(doc);
            this.processMetaTheme(doc);
            this.setDocumentProcessingStage(doc, ProcessingStage.Complete);
            if (this._settingsManager.isComplex)
            {
                this._styleSheetProcessor.processDocumentStyleSheets(doc);
                if (this._settingsManager.currentSettings.restoreColorsOnCopy)
                {
                    dom.addEventListener(doc, "copy", this.onCopy, this, false, doc);
                }
                this.processEditableContent(doc);
                if (this._settingsManager.currentSettings.restoreColorsOnPrint)
                {
                    const printMedia = doc.defaultView.matchMedia("print");
                    printMedia.addListener(mql =>
                    {
                        if (this._settingsManager.currentSettings.restoreColorsOnPrint)
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
                        }
                    });
                }
                this.createPseudoStyles(doc);
                this.createPageScript(doc);
                this.calculateDefaultColors(doc);
                this._documentObserver.startDocumentObservation(doc);
                let allTags = Array.from(doc.body.getElementsByTagName("*"))
                    .concat([doc.body, doc.documentElement!])
                    .filter(this.getFilterOfElementsForComplexProcessing()) as HTMLElement[];
                DocumentProcessor.processAllElements(allTags, this, normalDelays, true, false);
            }
            else if (this._settingsManager.isSimple)
            {
                this._documentObserver.startDocumentObservation(doc);
                let allTags = Array.from(doc.body.getElementsByTagName("*"))
                    .filter(this.getFilterOfElementsForComplexProcessing()) as HTMLElement[];
                DocumentProcessor.processAllElements(allTags, this, smallReCalculationDelays);
            }
            else if (this._settingsManager.isFilter && this.shift.Background.lightnessLimit < 0.3)
            {
                this._documentObserver.startDocumentObservation(doc);
                let allTags = Array.from(doc.body.getElementsByTagName("*"))
                    .filter(this.getFilterOfElementsForFilterProcessing()) as HTMLElement[];
                DocumentProcessor.processAllElements(allTags, this, smallReCalculationDelays);
            }
        }
        else
        {
            this.setDocumentProcessingStage(this._rootDocument, ProcessingStage.None);
        }
    }

    private processEditableContent(doc: Document)
    {
        dom.addEventListener(doc.documentElement!, "before-get-inner-html", (e: Event) =>
        {
            const rootElement = e.target as HTMLElement;
            if (rootElement && this._settingsManager.isActive && this._settingsManager.isComplex)
            {
                const state = this._documentObserver.stopDocumentObservation(doc); //----------

                const allElements = Array.from(rootElement.getElementsByTagName("*")) as HTMLElement[];
                allElements.splice(0, 0, rootElement);
                allElements.forEach(tag =>
                {
                    tag.isEditableContent = true;
                    this.restoreElementColors(tag)
                });
                rootElement.originalColor = rootElement.style.color;
                rootElement.style.setProperty(this._css.color, cx.Black, this._css.important);

                dom.addEventListener(rootElement, "after-get-inner-html", (e: Event) =>
                {
                    dom.removeAllEventListeners(rootElement, "after-get-inner-html");
                    rootElement.style.setProperty(this._css.color, rootElement.originalColor || "");
                    DocumentProcessor.processAllElements(allElements, this, smallReCalculationDelays);
                });

                this._documentObserver.startDocumentObservation(doc, state); //----------------
            }
        });
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
        return (tag) => this.checkElement(tag) && (!!tag.parentElement || tag === tag.ownerDocument!.documentElement);
    }

    private getFilterOfElementsForFilterProcessing(): (value: Element) => boolean
    {
        return (tag) =>
        {
            if (this.checkElement(tag) && (!!tag.parentElement || tag === tag.ownerDocument!.documentElement) &&
                !(tag instanceof HTMLOptionElement))
            {
                tag.mlComputedStyle = tag.mlComputedStyle || tag.ownerDocument!.defaultView!.getComputedStyle(tag, "");
                if (this._backgroundColorProcessor.isDark(tag.mlComputedStyle.backgroundColor))
                {
                    tag.mlInvert = true;
                }
                return tag.mlComputedStyle.filter === this._css.none && !!tag.mlInvert;
            }
            return false;
        };
    }

    private getFilterOfElementsForSimplifiedProcessing(): (value: Element) => boolean
    {
        return (tag) =>
        {
            if (this.checkElement(tag) && (!!tag.parentElement || tag === tag.ownerDocument!.documentElement))
            {
                if (tag instanceof HTMLCanvasElement ||
                    tag instanceof HTMLEmbedElement && tag.getAttribute("type") === "application/pdf")
                {
                    return true;
                }
                tag.mlComputedStyle = tag.mlComputedStyle || tag.ownerDocument!.defaultView!.getComputedStyle(tag, "");
                return tag.mlComputedStyle.backgroundImage !== this._css.none;
            }
            return false;
        };
    }

    private calculateDefaultColors(doc: Document, defaultLinkColor?: string, defaultTextColor?: string)
    {
        if (!defaultLinkColor)
        {
            const aWithoutClass = doc.body.querySelector("a:not([class])");
            if (aWithoutClass)
            {
                defaultLinkColor = doc.defaultView!.getComputedStyle(aWithoutClass).color!;
            }
        }
        if (!defaultTextColor)
        {
            defaultTextColor = doc.defaultView!.getComputedStyle(doc.body).color!;
        }
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
        return !!tag.mlComputedStyle && tag.mlComputedStyle.getPropertyValue(`--ml-pseudo-${PseudoClass[pseudo].toLowerCase()}`) === true.toString()
    }

    protected onElementsForUserActionObservationFound([pseudoClass, tags]: [PseudoClass, NodeListOf<Element>])
    {
        Array.prototype.forEach.call(tags, (tag: HTMLElement) =>
        {
            if (tag instanceof Element)
            {
                tag.isObserved = true;
                tag.alwaysRecalculateStyles = true;
                switch (pseudoClass)
                {
                    case PseudoClass.Active:
                        dom.addEventListener(tag, "mousedown", this._boundUserActionHandler);
                        dom.addEventListener(tag, "mouseup", this._boundUserActionHandler);
                        break;

                    case PseudoClass.Checked:
                        this.observeCheckedUserAction(tag);
                        break;

                    case PseudoClass.Focus:

                        dom.addEventListener(tag, "focus", this._boundUserActionHandler);
                        dom.addEventListener(tag, "blur", this._boundUserActionHandler);
                        break;

                    case PseudoClass.Hover:
                        dom.addEventListener(tag, "mouseenter", this._boundUserHoverHandler);
                        dom.addEventListener(tag, "mouseleave", this._boundUserHoverHandler);
                        break;
                }
            }
        });
    }

    protected observeUserActions(tag: HTMLElement)
    {
        let hover = false, focus = false, active = false, checked = false;
        tag.isObserved = true;

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
            this.observeCheckedUserAction(tag);
        }
    }

    protected observeCheckedUserAction(tag: Element)
    {
        if (tag instanceof HTMLInputElement)
        {
            dom.addEventListener(tag, "input", this._boundUserActionHandler);
            dom.addEventListener(tag, "change", this._boundUserActionHandler);
        }
        else if (tag instanceof HTMLLabelElement && tag.htmlFor)
        {
            const checkBox = tag.ownerDocument!.getElementById(tag.htmlFor) as HTMLInputElement;
            if (checkBox)
            {
                checkBox.labelElement = tag as any;
                dom.addEventListener(checkBox, "input", this._boundCheckedLabelHandler);
                dom.addEventListener(checkBox, "change", this._boundCheckedLabelHandler);
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
        if (this._settingsManager.isActive && this._settingsManager.isComplex)
        {
            const tag = eArg.currentTarget as HTMLElement;
            const eventTargets = tag instanceof HTMLTableCellElement
                ? Array.from(tag.parentElement!.children) as HTMLElement[] : [tag];

            this.reCalcAllRootElements(new Set(
                eventTargets.filter(target => (target.alwaysRecalculateStyles ||
                    target.mlSelectors !== this._styleSheetProcessor
                        .getElementMatchedSelectors(target)))), false);
        }
    }

    protected onUserAction(eArg: Event)
    {
        const target = eArg.currentTarget as HTMLElement;
        if (this._settingsManager.isActive && this._settingsManager.isComplex &&
            (target.alwaysRecalculateStyles ||
                target.mlSelectors !== this._styleSheetProcessor
                    .getElementMatchedSelectors(target)))
        {
            this.reCalcAllRootElements(new Set([target]), false);
        }
    }

    protected onCopy(doc: Document)
    {
        let sel = doc.defaultView!.getSelection();
        if (sel && !sel.isCollapsed)
        {
            let rootElem = sel.getRangeAt(0).commonAncestorContainer as HTMLElement;
            rootElem.mlBgColor = null;
            if (this.checkElement(rootElem) === false)
            {
                rootElem = rootElem.parentElement || rootElem;
            }
            rootElem = this.getColoredParent(rootElem, true, true);

            this.reCalcAllRootElements(new Set([rootElem]), true);
        }
    }

    private reCalcAllRootElements(rootElements: Set<HTMLElement>, andAllChildren: boolean, skipSelectors = false)
    {
        if (rootElements && rootElements.size)
        {
            const allElements = Array.from(rootElements)
                .reduce((allElems, rootElement) => allElems.concat(this
                    .reCalcRootElement(rootElement, andAllChildren, skipSelectors)),
                    new Array<HTMLElement>());
            if (allElements.length)
            {
                this._documentObserver.stopDocumentObservation(allElements[0].ownerDocument!);
                allElements.forEach(tag => this.restoreElementColors(tag, true));
                this._documentObserver.startDocumentObservation(allElements[0].ownerDocument!);
                DocumentProcessor.processAllElements(allElements, this,
                    andAllChildren ? onCopyReCalculationDelays :
                        allElements.length < 50 ? smallReCalculationDelays :
                            bigReCalculationDelays, true, false);
            }
        }
    }

    protected reCalcRootElement(rootElem: HTMLElement, andAllChildren: boolean, skipSelectors = false): HTMLElement[]
    {
        if (rootElem && (rootElem.mlBgColor || rootElem.mlInvert) &&
            (!rootElem.mlTimestamp || Date.now() - rootElem.mlTimestamp > 1))
        {
            rootElem.mlTimestamp = Date.now();
            let allTags = rootElem.firstElementChild
                ? Array.from(rootElem.getElementsByTagName("*")) as HTMLElement[] : null;
            if (allTags && allTags.length > 0)
            {
                skipSelectors = skipSelectors || !this._settingsManager.isComplex || andAllChildren ||
                    (this._styleSheetProcessor.getSelectorsQuality(rootElem.ownerDocument!) === 0) ||
                    allTags.length > chunkLength;
                let filteredTags = allTags.filter(el =>
                {
                    if (!el.mlBgColor) return false;
                    if (!skipSelectors)
                    {
                        const newSelectors = this._styleSheetProcessor.getElementMatchedSelectors(el);
                        if (el.mlSelectors !== newSelectors)
                        {
                            el.mlSelectors = newSelectors;
                            return true;
                        }
                        else return false;
                    }
                    return true;
                });

                if (filteredTags.length < 100 || andAllChildren || this._settingsManager.isSimple)
                {
                    allTags.forEach(tag =>
                    {
                        tag.mlParentBgColor = null;
                        if (tag.mlBgColor && (tag.mlBgColor.color === null))
                        {
                            tag.mlBgColor.isUpToDate = false;
                        }
                    });
                    filteredTags.splice(0, 0, rootElem);
                    return filteredTags;
                }
                else return [rootElem];
            }
            else return [rootElem];
        }
        return [];
    }

    protected onStyleChanged(changedElements: Set<HTMLElement>)
    {
        let elementsForReCalculation = new Set<HTMLElement>();
        changedElements.forEach(tag =>
        {
            let needReCalculation = !!tag.mlVisualAttributeChanged, value: string | null | undefined;
            const ns = tag instanceof SVGElement ? USP.svg : USP.htm;

            value = tag.style.getPropertyValue(ns.css.bgrColor);
            if (value && tag.style.getPropertyPriority(ns.css.bgrColor) !== this._css.important ||
                tag.mlBgColor && tag.mlBgColor.color && tag.mlBgColor.color !== value)
            {
                tag.originalBackgroundColor = value;
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

            value = tag.style.getPropertyValue(this._css.filter);
            if (value && tag.currentFilter !== value)
            {
                tag.originalFilter = value;
                needReCalculation = true;
            }

            value = tag.style.getPropertyValue(this._css.transitionProperty);
            if (value && tag.style.getPropertyPriority(this._css.transitionProperty) !== this._css.important)
            {
                const { hasForbiddenTransition } = this.calculateTransition(value);
                if (hasForbiddenTransition)
                {
                    tag.originalTransitionProperty = value;
                    needReCalculation = true;
                }
            }

            if (needReCalculation)
            {
                elementsForReCalculation.add(tag);
            }
        });

        this.reCalcAllRootElements(elementsForReCalculation, false, true);
    }

    protected onClassChanged(changedElements: Set<HTMLElement>)
    {
        this.reCalcAllRootElements(changedElements, false);
    }

    private IsIgnored(tag: Element): boolean
    {
        if ("mlIgnore" in tag as any)
        {
            return !!tag.mlIgnore;
        }
        if (tag.parentElement)
        {
            return tag.mlIgnore = this.IsIgnored(tag.parentElement);
        }
        return tag.mlIgnore = false;
    }

    protected onElementsAdded(addedElements: Set<HTMLElement>)
    {
        const filter = this.getFilterOfElementsForComplexProcessing();
        addedElements.forEach(tag => this.restoreElementColors(tag));
        const allNewTags = Array.from(addedElements.values())
            .filter(x => !this.IsIgnored(x) && this.checkElement(x));
        const allChildTags = new Set<HTMLElement>();
        allNewTags.forEach(newTag =>
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
        DocumentProcessor.processAllElements(allNewTags.concat(Array.from(allChildTags.values())), this,
            this._settingsManager.isComplex ? bigReCalculationDelays : smallReCalculationDelays);
    }

    protected static processAllElements(
        allTags: HTMLElement[], docProc: DocumentProcessor,
        delays = normalDelays, delayInvisibleElements = true,
        needObservation = true): void
    {
        if (allTags.length > 0)
        {
            let rowNumber = 0, ns = USP.htm, isSvg: boolean, isVisible: boolean, isImage = false,
                isLink = false, hasBgColor = false, hasBgImage = false, inView: boolean,
                otherInvisTags = new Array<HTMLElement>(),
                doc = allTags[0].ownerDocument!,
                hm = doc.defaultView!.innerHeight,
                wm = doc.defaultView!.innerWidth;

            let elementsFilter: ((tag: HTMLElement) => boolean) | null = null;
            if (!delayInvisibleElements)
            {
                if (docProc._settingsManager.isSimple)
                {
                    elementsFilter = docProc.getFilterOfElementsForSimplifiedProcessing();
                }
                else if (docProc._settingsManager.isFilter)
                {
                    elementsFilter = docProc.getFilterOfElementsForFilterProcessing();
                }
            }

            for (let tag of allTags)
            {
                tag.mlRowNumber = rowNumber++;
                isSvg = tag instanceof SVGElement;
                ns = isSvg ? USP.svg : USP.htm;
                if (elementsFilter && !elementsFilter(tag))
                {
                    break;
                }
                isVisible = isSvg || tag.offsetParent !== null || !!tag.offsetHeight
                if (isVisible || tag.mlComputedStyle || !delayInvisibleElements || allTags.length < minChunkableLength)
                {
                    tag.mlComputedStyle = tag.mlComputedStyle || doc.defaultView!.getComputedStyle(tag, "")
                    if (!tag.mlComputedStyle) break; // something is wrong with this element
                    isLink = tag instanceof HTMLAnchorElement;
                    hasBgColor = tag.mlComputedStyle!.getPropertyValue(ns.css.bgrColor) !== RgbaColor.Transparent;
                    isImage = (tag.tagName === ns.img) || tag instanceof HTMLCanvasElement;
                    hasBgImage = !hasBgColor && tag.mlComputedStyle!.backgroundImage !== docProc._css.none;
                }

                if (isVisible)
                {
                    tag.mlRect = tag.mlRect || tag.getBoundingClientRect();
                    isVisible = tag.mlRect.width !== 0 && tag.mlRect.height !== 0;
                    isVisible && (tag.mlArea = tag.mlArea || tag.mlRect.width * tag.mlRect.height);
                    inView = isVisible &&
                        (tag.mlRect.bottom >= 0 && tag.mlRect.bottom <= hm || tag.mlRect.top >= 0 && tag.mlRect.top <= hm) &&
                        (tag.mlRect.right >= 0 && tag.mlRect.right <= wm || tag.mlRect.left >= 0 && tag.mlRect.left <= wm);
                    if (!isVisible)
                    {
                        tag.mlRect = tag.mlArea = undefined;
                        if (hasBgColor)
                        {
                            tag.mlOrder = po.invisColorTags;

                            if (tag instanceof SVGSVGElement && tag.parentElement)
                            {
                                DocumentProcessor.fixParentElementsOrder(
                                    tag.parentElement, po.invisColorTags);
                            }
                        }
                        else if (isImage) tag.mlOrder = po.invisImageTags;
                        else if (hasBgImage) tag.mlOrder = po.invisBgImageTags;
                        else if (isLink) tag.mlOrder = po.invisLinks;
                        else tag.mlOrder = po.invisTransTags;
                    }
                    else if (hasBgColor)
                    {
                        if (inView) tag.mlOrder = po.viewColorTags;
                        else tag.mlOrder = po.visColorTags;
                    }
                    else if (isImage)
                    {
                        if (inView) tag.mlOrder = po.viewImageTags;
                        else tag.mlOrder = po.visImageTags;
                    }
                    else if (hasBgImage)
                    {
                        if (inView) tag.mlOrder = po.viewBgImageTags;
                        else tag.mlOrder = po.visBgImageTags;
                    }
                    else if (isLink)
                    {
                        if (inView) tag.mlOrder = po.viewLinks;
                        else tag.mlOrder = po.visLinks;
                    }
                    else
                    {
                        if (inView) tag.mlOrder = po.viewTransTags;
                        else tag.mlOrder = po.visTransTags;
                    }
                }
                else if (tag.mlComputedStyle)
                {
                    if (hasBgColor) tag.mlOrder = po.invisColorTags;
                    else if (isImage) tag.mlOrder = po.invisImageTags;
                    else if (hasBgImage) tag.mlOrder = po.invisBgImageTags;
                    else if (isLink) tag.mlOrder = po.invisLinks;
                    else tag.mlOrder = po.invisTransTags;
                }
                else
                {
                    tag.mlOrder = po.delayedInvisTags;
                    otherInvisTags.push(tag);
                }
            }

            doc.body.mlOrder = po.viewColorTags;

            allTags.sort((a, b) =>
                a instanceof HTMLBodyElement ? -9999999999
                    : b instanceof HTMLBodyElement ? 9999999999
                        : a.mlOrder !== b.mlOrder ? a.mlOrder! - b.mlOrder!
                            : b.mlArea && a.mlArea && b.mlArea !== a.mlArea ? b.mlArea - a.mlArea
                                : a.mlRowNumber! - b.mlRowNumber!);

            otherInvisTags = otherInvisTags.filter(tag => tag.mlOrder === po.delayedInvisTags);
            if (otherInvisTags.length && otherInvisTags.length < allTags.length)
            {
                // removing invisible elements
                allTags.splice(allTags.length - otherInvisTags.length, otherInvisTags.length);
            }

            // always process first chunk in sync
            allTags[0].mlOrder = po.viewColorTags;

            const results = handlePromise(
                DocumentProcessor.processOrderedElements(allTags, docProc, delays, needObservation)!);

            if (otherInvisTags.length > 0)
            {
                Promise.all([otherInvisTags, docProc, delays, results]).then(([otherTags, dp, dl]) =>
                {
                    const density = 1000 / otherTags.length
                    const getNextDelay = ((_delays: any, _density: any, [chunk]: [any]) =>
                        Math.round(_delays.get(chunk[0].mlOrder || po.viewColorTags) / _density))
                        .bind(null, delays, density);
                    forEachPromise(
                        sliceIntoChunks(otherTags, chunkLength * 2).map(chunk => [chunk, dp, dl]),
                        DocumentProcessor.processAllElements,
                        Math.round(delays.get(po.delayedInvisTags)! / density),
                        getNextDelay as any);
                });
            }

            DocumentProcessor.fixColorInheritance(allTags, docProc, results);
        }
    }

    private static fixParentElementsOrder(parentElement: HTMLElement, procOrd: ProcessingOrder): any
    {
        if (parentElement.mlOrder && parentElement.mlOrder > procOrd)
        {
            parentElement.mlOrder = procOrd
            if (parentElement.parentElement)
            {
                DocumentProcessor.fixParentElementsOrder(parentElement.parentElement, procOrd);
            }
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
                            tag.ownerDocument!.defaultView &&
                            !tag.isPseudo && tag.mlColor && tag.mlColor.color === null &&
                            tag.mlColor.reason === ColorReason.Inherited &&
                            tag.mlColor.intendedColor && tag.mlComputedStyle &&
                            tag.mlColor.intendedColor !== (tag instanceof HTMLElement
                                ? tag.mlComputedStyle!.color
                                : tag!.mlComputedStyle!.fill));

                        if (brokenColorTags.length > 0)
                        {
                            dProc._documentObserver.stopDocumentObservation(brokenColorTags[0].ownerDocument!);
                            brokenColorTags.forEach(tag =>
                            {
                                const ns = tag instanceof SVGElement ? USP.svg : USP.htm;
                                const newColor = Object.assign({}, tag.mlColor!);
                                newColor.base = dProc._app.isDebug ? tag.mlColor : null
                                newColor.reason = ColorReason.FixedInheritance;
                                newColor.color = newColor.intendedColor!;
                                tag.mlColor = newColor;
                                tag.originalColor = tag.style.getPropertyValue(ns.css.fntColor);
                                tag.style.setProperty(ns.css.fntColor, newColor.color, dProc._css.important);
                            });
                            docProc._documentObserver.startDocumentObservation(brokenColorTags[0].ownerDocument!);
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
                            tag.ownerDocument!.defaultView && tag.mlBgColor &&
                            !tag.mlBgColor.color && tag.mlComputedStyle &&
                            tag.mlBgColor.reason === ColorReason.Parent &&
                            tag instanceof HTMLElement &&
                            tag.mlComputedStyle!.backgroundColor !== RgbaColor.Transparent &&
                            !tag.mlFixed
                        );
                        if (brokenTransparentTags.length > 0)
                        {
                            dProc._documentObserver.stopDocumentObservation(brokenTransparentTags[0].ownerDocument!);
                            brokenTransparentTags.forEach(tag =>
                            {
                                dProc.restoreElementColors(tag, true);
                                tag.mlFixed = "bgcolor";
                            });
                            dProc._documentObserver.startDocumentObservation(brokenTransparentTags[0].ownerDocument!);
                            DocumentProcessor.processAllElements(brokenTransparentTags, dProc, bigReCalculationDelays);
                        }
                    }), 0, tags, dp);
                }
            });
        }
    }

    private static getBrokenTransparentElements(prevChunk: HTMLElement[])
    {
        return prevChunk.filter(tag =>
            tag.ownerDocument!.defaultView && tag.mlBgColor &&
            !tag.mlBgColor.color && tag.mlComputedStyle &&
            tag.mlBgColor.reason === ColorReason.Parent &&
            tag instanceof HTMLElement &&
            tag.mlComputedStyle!.backgroundColor !== RgbaColor.Transparent &&
            !tag.mlFixed);
    }

    private static calculateNewRoomRulesToFixColorInheritanceInPrevChunk(
        prevChunk: HTMLElement[], docProc: DocumentProcessor):
        {
            tag: HTMLElement,
            result?: {
                roomRules: RoomRules,
                before?: PseudoElement,
                after?: PseudoElement
            }
        }[]
    {
        return prevChunk.filter(tag =>
            tag.ownerDocument!.defaultView &&
            tag.mlColor && tag.mlColor.color === null &&
            tag.mlColor.reason === ColorReason.Inherited &&
            tag.mlColor.intendedColor && tag.mlComputedStyle &&
            tag.mlColor.intendedColor !== (tag instanceof HTMLElement
                ? tag.mlComputedStyle!.color
                : tag!.mlComputedStyle!.fill)).map(tag =>
                {
                    const newColor = Object.assign({}, tag.mlColor!);
                    newColor.base = docProc._app.isDebug ? tag.mlColor : null
                    newColor.reason = ColorReason.FixedInheritance;
                    newColor.color = newColor.intendedColor!;
                    return {
                        tag: tag, result: { roomRules: { color: newColor } }
                    };
                });
    }

    protected static processOrderedElements(tags: HTMLElement[], docProc: DocumentProcessor,
        delays = normalDelays, needObservation = false)
    {
        if (tags.length > 0)
        {
            const density = 2000 / tags.length;
            needObservation = needObservation && docProc._settingsManager.isComplex &&
                !!docProc._styleSheetProcessor.getSelectorsCount(tags[0].ownerDocument!)
            let result: Promise<HTMLElement[]>;
            if (tags.length < minChunkableLength)
            {
                result = DocumentProcessor.processElementsChunk(tags, docProc, null,
                    delays.get(tags[0].mlOrder || po.viewColorTags)! / density);
            }
            else
            {
                const getNextDelay = ((_delays: any, _density: any, [chunk]: [any]) =>
                    Math.round(_delays.get(chunk[0].mlOrder || po.viewColorTags) / _density))
                    .bind(null, delays, density);
                result = forEachPromise(this.concatZeroDelayedChunks(
                    sliceIntoChunks(tags, chunkLength), getNextDelay as any)
                    .map(chunk => [chunk, docProc]),
                    DocumentProcessor.processElementsChunk, 0, getNextDelay as any);
            }
            if (needObservation)
            {
                Promise.all([tags as any, docProc, handlePromise(result), ...docProc._styleSheetProcessor.getCssPromises(tags[0].ownerDocument!)!])
                    .then(([t, dp]) => DocumentProcessor.startObservation(t, dp));
            }
            return result;
        }
        return undefined;
    }

    private static concatZeroDelayedChunks(
        chunks: HTMLElement[][],
        getNextDelay: (chunk: HTMLElement[][]) => number)
    {
        let zeroDelayedChunk: HTMLElement[] = [];
        let ix = 0, nextChunk = chunks[ix];
        while (nextChunk && getNextDelay([nextChunk]) === 0)
        {
            zeroDelayedChunk = zeroDelayedChunk.concat(nextChunk);
            nextChunk = chunks[++ix];
        }
        if (ix > 1 && zeroDelayedChunk.length)
        {
            chunks.splice(0, ix, zeroDelayedChunk);
        }
        return chunks;
    }

    protected static processElementsChunk(chunk: HTMLElement[], docProc: DocumentProcessor,
        prevChunk?: HTMLElement[] | null, delay?: number)
    {
        docProc._documentObserver.stopDocumentObservation(chunk[0].ownerDocument!);

        const paramsForPromiseAll: any[] = [[...chunk], chunk[0].ownerDocument!, delay];
        if (prevChunk)
        {
            const brokenTransparentElements = DocumentProcessor.getBrokenTransparentElements(prevChunk);
            if (brokenTransparentElements.length)
            {
                brokenTransparentElements.forEach(tag =>
                {
                    docProc.restoreElementColors(tag, true);
                    tag.mlFixed = "bgcolor";
                });
                chunk.splice(0, 0, ...brokenTransparentElements);
            }
        }
        const results = DocumentProcessor.calculateNewRoomRulesToFixColorInheritanceInPrevChunk(
            prevChunk || [], docProc).concat(chunk.map(tag => ({
                tag: tag, result: docProc._settingsManager.isComplex
                    ? docProc.calculateRoomRules(tag)
                    : docProc._settingsManager.isSimple
                        ? docProc.calculateSimplifiedRoomRules(tag)
                        : docProc.calculateFilterRoomRules(tag)
            })));
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
            .filter(r => r).forEach(r => paramsForPromiseAll.push(...r!.map(handlePromise)));

        docProc._documentObserver.startDocumentObservation(chunk[0].ownerDocument!);

        return Promise.all(paramsForPromiseAll as [HTMLElement[], Document, number, PromiseResult<string>])
            .then(([tags, doc, dl, ...cssArray]) =>
            {
                let css = (cssArray as PromiseResult<string>[])
                    .filter(result => result.status === Status.Success && result.data)
                    .map(result => result.data)
                    .join("\n");
                if (css)
                {
                    doc.mlPseudoStyles!.appendChild(doc.createTextNode(css));
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
            }
        });
    }

    protected tagIsSmall(tag: Element | PseudoElement): boolean
    {
        let maxSize = 50, maxAxis = 25,
            check = (w: number, h: number) => w > 0 && h > 0 && (w < maxSize && h < maxSize || w < maxAxis || h < maxAxis);
        tag.mlComputedStyle = tag.mlComputedStyle || tag.ownerDocument!.defaultView!.getComputedStyle(tag as Element, "");
        let width = parseInt(tag.mlComputedStyle.width!), height = parseInt(tag.mlComputedStyle.height!);
        if (!isNaN(width) && !isNaN(height))
        {
            tag.mlArea = tag.mlArea || width * height;
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
            tag.mlRect = tag.mlRect || tag.getBoundingClientRect();
            tag.mlArea = tag.mlRect.width * tag.mlRect.height;
            return check(tag.mlRect.width, tag.mlRect.height);
        }
    }

    protected calcTagArea(tag: Element | PseudoElement, tryClientRect = true)
    {
        if (tag.mlArea === undefined)
        {
            tag.mlComputedStyle = tag.mlComputedStyle || tag.ownerDocument!.defaultView!.getComputedStyle(tag as Element, "");
            let width = parseInt(tag.mlComputedStyle.width!), height = parseInt(tag.mlComputedStyle.height!);
            if (!isNaN(width) && !isNaN(height))
            {
                tag.mlArea = width * height;
            }
            else if (tryClientRect)
            {
                tag.mlRect = tag.mlRect || tag.getBoundingClientRect();
                if (tag.mlRect.width || tag.mlRect.height)
                {
                    tag.mlArea = tag.mlRect.width * tag.mlRect.height;
                }
                else
                {
                    tag.mlRect = null;
                }
            }
        }
    }

    protected getElementIndex(tag: Element)
    {
        // do not remove {var}
        for (var i = 0; tag = tag.previousElementSibling!; i++);
        return i;
    }

    private isEditableContent(tag: HTMLElement): boolean
    {
        if (tag.contentEditable === true.toString())
        {
            tag.isEditableContent = true;
        }
        else if (tag.contentEditable === false.toString())
        {
            tag.isEditableContent = false;
        }
        else if (tag.parentElement)
        {
            if (tag.parentElement.isEditableContent !== undefined)
            {
                tag.isEditableContent = tag.parentElement.isEditableContent
            }
            else
            {
                tag.isEditableContent = this.isEditableContent(tag.parentElement);
            }
            return tag.isEditableContent;
        }
        else
        {
            tag.isEditableContent = false;
        }
        return tag.isEditableContent;
    }

    protected getParentBackground(tag: Element | PseudoElement, probeRect?: ClientRect)
    {
        let result = Object.assign({}, tag.ownerDocument!.body.mlBgColor || NotFound);
        result.reason = ColorReason.NotFound;
        if (tag.parentElement)
        {
            let bgColor;
            let doc = tag.ownerDocument!;
            let isSvg = tag instanceof SVGElement &&
                tag.parentElement instanceof SVGElement;
            tag.mlComputedStyle = tag.mlComputedStyle || doc.defaultView!.getComputedStyle(tag as HTMLElement, "");

            if (tag.mlComputedStyle && tag instanceof HTMLElement &&
                (tag.mlComputedStyle!.position == this._css.absolute ||
                    tag.mlComputedStyle!.position == this._css.relative || isSvg))
            {
                tag.zIndex = isSvg ? this.getElementIndex(tag) : parseInt(tag.mlComputedStyle!.zIndex || "0");
                tag.zIndex = isNaN(tag.zIndex!) ? -999 : tag.zIndex;
                let children: Element[] = Array.prototype.filter.call(tag.parentElement!.children,
                    (otherTag: Element, index: number) =>
                    {
                        if (otherTag != tag)
                        {
                            otherTag.zIndex = otherTag.zIndex || isSvg ? -index :
                                parseInt((otherTag.mlComputedStyle = otherTag.mlComputedStyle ? otherTag.mlComputedStyle
                                    : doc.defaultView!.getComputedStyle(otherTag, "")).zIndex || "0");
                            otherTag.zIndex = isNaN(otherTag.zIndex) ? -999 : otherTag.zIndex;
                            if (otherTag.mlBgColor && otherTag.mlBgColor.color &&
                                otherTag.zIndex < tag.zIndex! && otherTag.mlBgColor.role !== cc.TextSelection)
                            {
                                probeRect = probeRect || (tag.mlRect = tag.mlRect || tag.getBoundingClientRect());
                                otherTag.mlRect = otherTag.mlRect || otherTag.getBoundingClientRect();
                                if (otherTag.mlRect.left <= probeRect.left && otherTag.mlRect.top <= probeRect.top &&
                                    otherTag.mlRect.right >= probeRect.right && otherTag.mlRect.bottom >= probeRect.bottom)
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
                ((tag.parentElement!.mlBgColor &&
                    tag.parentElement!.mlBgColor!.isUpToDate &&
                    !(tag.parentElement instanceof SVGGElement))
                    ? tag.parentElement!.mlBgColor : null) ||
                tag.parentElement!.mlParentBgColor;
            if (bgColor && bgColor.alpha > 0.2)
            {
                result = bgColor;
            }
            else
            {
                probeRect = probeRect || (tag.mlRect = tag.mlRect || tag.getBoundingClientRect());
                result = this.getParentBackground(tag.parentElement!, probeRect);
            }
        }
        if (tag instanceof Element)
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
        dom.removeAllEventListeners(doc);
        this._documentObserver.stopDocumentUpdateObservation(doc);
        this._documentObserver.stopDocumentObservation(doc);
        this.removeDynamicValuesStyle(doc);
        this.removePageScript(doc);
        this.clearPseudoStyles(doc);
        this.restoreMetaTheme(doc);
        const lastProcMode = this.getLastDoccumentProcessingMode(doc);
        this.setDocumentProcessingStage(doc, ProcessingStage.None);
        const isPopup = doc.location!.pathname === "/ui/popup.html";
        for (let tag of Array.from(doc.getElementsByTagName("*")))
        {
            if (!isPopup)
            {
                delete tag.isObserved;
                dom.removeAllEventListeners(tag);
            }
            this.restoreElementColors(tag as HTMLElement,
                this._settingsManager.isActive && this._settingsManager.isComplex,
                lastProcMode);
        }
    }

    protected restoreElementColors(tag: HTMLElement,
        keepTransition?: boolean,
        lastProcMode?: ProcessingMode)
    {
        delete tag.mlParentBgColor;
        delete tag.mlPath;

        if (tag.mlBgColor || tag.mlInvert || tag instanceof Element &&
            (lastProcMode === ProcessingMode.Simplified ||
                this._settingsManager.isSimple))
        {
            let ns = tag instanceof SVGElement ? USP.svg : USP.htm;
            const hasLinkColors = tag.mlColor && tag.mlColor.role === cc.Link;

            delete tag.mlBgColor;
            delete tag.mlInvert;
            delete tag.mlColor;
            delete tag.mlTextShadow;
            delete tag.mlRect;
            delete tag.mlSelectors;
            delete tag.mlFixed;
            delete tag.mlVisualAttributeChanged;

            if (tag.originalTransitionProperty !== undefined && !keepTransition &&
                tag.style.transitionProperty !== tag.originalTransitionProperty)
            {
                tag.style.transitionProperty = tag.originalTransitionProperty!;
            }
            if (keepTransition && tag.originalTransitionProperty === undefined &&
                tag.hasTransition && tag.mlComputedStyle)
            {
                if (tag.mlComputedStyle.transitionProperty &&
                    tag.mlComputedStyle.transitionDuration &&
                    tag.mlComputedStyle.transitionDuration !== this._css._0s &&
                    tag.mlComputedStyle.transitionProperty !== this._css.none)
                {
                    const { hasForbiddenTransition, newTransProps } = this.calculateTransition(
                        tag.mlComputedStyle.transitionProperty);
                    if (hasForbiddenTransition)
                    {
                        tag.originalTransitionProperty = tag.style.transitionProperty;
                        tag.style.setProperty(this._css.transitionProperty, newTransProps.join(", "), this._css.important);
                    }
                }
            }

            if (tag.originalBackgroundColor !== undefined &&
                tag.originalBackgroundColor !== tag.style.getPropertyValue(ns.css.bgrColor))
            {
                tag.style.setProperty(ns.css.bgrColor, tag.originalBackgroundColor);
            }
            if (tag.originalDisplay !== undefined && tag.originalDisplay !== tag.style.display)
            {
                tag.style.display = tag.originalDisplay!;
            }
            if (tag.originalColor !== undefined)
            {
                if (tag.originalColor !== tag.style.getPropertyValue(ns.css.fntColor))
                {
                    tag.style.setProperty(ns.css.fntColor, tag.originalColor);
                }
                tag.style.removeProperty(this._css.placeholderColor);
            }
            if (tag.isEditableContent)
            {
                tag.style.removeProperty(this._css.originalColor);
                tag.style.removeProperty(this._css.editableContentColor);
                tag.style.removeProperty(this._css.originalBackgroundColor);
                tag.style.removeProperty(this._css.editableContentBackgroundColor);
            }
            if (hasLinkColors)
            {
                tag.style.removeProperty(this._css.linkColor);
                tag.style.removeProperty(this._css.visitedColor);
                tag.style.removeProperty(this._css.linkColorActive);
                tag.style.removeProperty(this._css.visitedColorActive);
                tag.style.removeProperty(this._css.linkColorHover);
                tag.style.removeProperty(this._css.visitedColorHover);
            }
            if (tag.originalTextShadow !== undefined && tag.style.textShadow !== tag.originalTextShadow)
            {
                tag.style.textShadow = tag.originalTextShadow!;
            }
            if (tag.originalBorderColor !== undefined && tag.originalBorderColor !== tag.style.getPropertyValue(ns.css.brdColor))
            {
                tag.style.setProperty(ns.css.brdColor, tag.originalBorderColor);
            }
            if (tag.originalBorderTopColor !== undefined && tag.style.borderTopColor !== tag.originalBorderTopColor)
            {
                tag.style.borderTopColor = tag.originalBorderTopColor!;
            }
            if (tag.originalBorderRightColor !== undefined && tag.style.borderRightColor !== tag.originalBorderRightColor)
            {
                tag.style.borderRightColor = tag.originalBorderRightColor!;
            }
            if (tag.originalBorderBottomColor !== undefined && tag.style.borderBottomColor !== tag.originalBorderBottomColor)
            {
                tag.style.borderBottomColor = tag.originalBorderBottomColor!;
            }
            if (tag.originalBorderLeftColor !== undefined && tag.style.borderLeftColor !== tag.originalBorderLeftColor)
            {
                tag.style.borderLeftColor = tag.originalBorderLeftColor!;
            }
            if (tag.originalBackgroundImage !== undefined && tag.style.backgroundImage !== tag.originalBackgroundImage)
            {
                tag.style.backgroundImage = tag.originalBackgroundImage!;
            }
            if (tag.originalFilter !== undefined && tag.style.filter !== tag.originalFilter)
            {
                tag.style.filter = tag.originalFilter!;
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
            if (tag.hasAttribute("ml-bg-image"))
            {
                tag.removeAttribute("ml-bg-image");
            }
            if (tag.hasAttribute(this._css.mlInvertAttr))
            {
                tag.removeAttribute(this._css.mlInvertAttr);
            }
        }
    }

    protected checkElement(tag: any)
    {
        return tag.isChecked =
            (tag instanceof Element || tag!.ownerDocument && tag!.ownerDocument.defaultView && tag instanceof Element) &&
            !tag.mlBgColor && !!tag.tagName && !tag.mlIgnore && !!(tag as HTMLElement).style;
    }

    protected calculateFilterRoomRules(tag: HTMLElement)
    {
        if (tag && tag.ownerDocument!.defaultView && !tag.classList.contains("ml-ignore") &&
            this._filterForFilterProcessing(tag) &&
            (!tag.mlComputedStyle || tag.mlComputedStyle.getPropertyValue(this._css.mlIgnoreVar) !== true.toString()))
        {
            let hasRoomRules = false;
            const doc = tag.ownerDocument!, roomRules: RoomRules = {};

            tag.mlComputedStyle = tag.mlComputedStyle || doc.defaultView!.getComputedStyle(tag as HTMLElement, "");

            if (tag.mlInvert)
            {
                hasRoomRules = true;
                roomRules.attributes = roomRules.attributes || new Map<string, string>();
                roomRules.attributes.set(this._css.mlInvertAttr, "");
            }

            if (hasRoomRules)
            {
                return { roomRules, before: undefined, after: undefined };
            }
        }
        return undefined;
    }

    protected calculateSimplifiedRoomRules(tag: HTMLElement)
    {
        if (tag && tag.ownerDocument!.defaultView && !tag.classList.contains("ml-ignore") &&
            (!tag.mlComputedStyle || tag.mlComputedStyle.getPropertyValue(this._css.mlIgnoreVar) !== true.toString()))
        {
            let hasRoomRules = false;
            const doc = tag.ownerDocument!, roomRules: RoomRules = {},
                bgInverted = this.shift.Background.lightnessLimit < 0.3,
                isButton = tag instanceof HTMLButtonElement ||
                    tag instanceof HTMLInputElement &&
                    (tag.type === "button" || tag.type === "submit" || tag.type === "reset") ||
                    tag instanceof Element && tag.getAttribute("role") === "button",
                isTable =
                    tag instanceof HTMLTableElement || tag instanceof HTMLTableCellElement ||
                    tag instanceof HTMLTableRowElement || tag instanceof HTMLTableSectionElement;;

            tag.mlComputedStyle = tag.mlComputedStyle || doc.defaultView!.getComputedStyle(tag as HTMLElement, "");

            if (!(tag instanceof HTMLImageElement) && tag.mlComputedStyle!.backgroundImage &&
                tag.mlComputedStyle!.backgroundImage !== this._css.none &&
                tag.mlComputedStyle!.backgroundImage !== this._rootImageUrl)
            {
                hasRoomRules = true;
                this.processBackgroundImagesAndGradients(tag, doc, roomRules, isButton, bgInverted);
            }

            if (tag instanceof HTMLCanvasElement ||
                tag instanceof HTMLEmbedElement && tag.getAttribute("type") === "application/pdf")
            {
                hasRoomRules = true;
                this.processInaccessibleTextContent({ tag, roomRules });
            }

            if (hasRoomRules)
            {
                return { roomRules, before: undefined, after: undefined };
            }
        }
        return undefined;
    }

    protected calculateRoomRules(tag: HTMLElement | PseudoElement):
        {
            roomRules: RoomRules, before?: PseudoElement, after?: PseudoElement
        } | undefined
    {
        if (tag && tag.ownerDocument!.defaultView && !(tag as HTMLElement).mlBgColor &&
            (!(tag instanceof Element) || !tag.mlComputedStyle ||
                !(tag.mlIgnore = tag.mlComputedStyle!.getPropertyValue(this._css.mlIgnoreVar) === true.toString())))
        {
            let doc = tag.ownerDocument!;
            let bgLight: number, roomRules: RoomRules | undefined;//, room: string | null = null;
            let isSvg = tag instanceof SVGElement,
                isSvgText = tag instanceof SVGTextContentElement,
                isLink = tag instanceof HTMLAnchorElement,
                isButton = tag instanceof HTMLButtonElement ||
                    tag instanceof HTMLInputElement &&
                    (tag.type === "button" || tag.type === "submit" || tag.type === "reset") ||
                    tag instanceof Element && tag.getAttribute("role") === "button" ||
                    !!tag.className && typeof tag.className === "string" && /button(\s|$)/gi.test(tag.className),
                isTable =
                    tag instanceof HTMLTableElement || tag instanceof HTMLTableCellElement ||
                    tag instanceof HTMLTableRowElement || tag instanceof HTMLTableSectionElement;
            let ns = isSvg ? USP.svg : USP.htm;
            let beforePseudoElement: PseudoElement | undefined, afterPseudoElement: PseudoElement | undefined;

            tag instanceof HTMLElement && tag.isEditableContent === undefined &&
                this.isEditableContent(tag);

            if (!isButton && tag instanceof HTMLLabelElement && tag.htmlFor)
            {
                const labeledElement = doc.getElementById(tag.htmlFor);
                isButton = labeledElement instanceof HTMLInputElement &&
                    labeledElement.type === "file";
            }

            if (isLink && !isButton && !isSvg && tag.className &&
                (tag.className.includes("button") || tag.className.includes("btn")))
            {
                isButton = true;
            }

            tag.mlComputedStyle = tag.mlComputedStyle || doc.defaultView!.getComputedStyle(tag as HTMLElement, "");
            roomRules = {};
            if (tag.mlComputedStyle)
            {
                this._app.isDebug && (roomRules.owner = tag);
                if (tag instanceof HTMLElement)
                {
                    let beforeStyle = doc.defaultView!.getComputedStyle(tag, ":before");
                    let afterStyle = doc.defaultView!.getComputedStyle(tag, ":after");
                    if (beforeStyle && beforeStyle.content &&
                        beforeStyle.content !== this._css.none &&
                        beforeStyle.getPropertyValue(this._css.mlIgnoreVar) !== true.toString())
                    {
                        beforePseudoElement = new PseudoElement(PseudoType.Before, tag, beforeStyle);
                    }
                    if (afterStyle && afterStyle.content &&
                        afterStyle.content !== this._css.none &&
                        afterStyle.getPropertyValue(this._css.mlIgnoreVar) !== true.toString())
                    {
                        afterPseudoElement = new PseudoElement(PseudoType.After, tag, afterStyle);
                    }
                }
                if (tag.mlComputedStyle &&
                    tag.mlComputedStyle.transitionProperty &&
                    tag.mlComputedStyle.transitionProperty &&
                    tag.mlComputedStyle.transitionDuration &&
                    tag.mlComputedStyle.transitionDuration !== this._css._0s &&
                    tag.mlComputedStyle.transitionProperty !== this._css.none)
                {
                    let { hasForbiddenTransition, newTransProps } = this.calculateTransition(
                        tag.mlComputedStyle.transitionProperty);
                    if (hasForbiddenTransition)
                    {
                        roomRules.transitionProperty = { value: newTransProps.join(", ") };
                    }
                }
                const bgrColor = tag instanceof HTMLElement && tag.isEditableContent
                    ? tag.style.getPropertyValue(this._css.backgroundColor)
                    : tag.mlComputedStyle!.getPropertyValue(ns.css.bgrColor);

                if (!isSvgText)
                {
                    if (tag instanceof SVGElement)
                    {
                        if (this.tagIsSmall(tag instanceof SVGSVGElement ? tag : tag.ownerSVGElement || tag) &&
                            tag.mlComputedStyle!.getPropertyValue("--ml-small-svg-is-text") === true.toString())
                        {
                            isSvgText = true;
                            roomRules.backgroundColor = Object.assign({}, this.getParentBackground(
                                tag.ownerSVGElement || tag));
                            roomRules.backgroundColor!.reason = ColorReason.SvgText;
                            roomRules.backgroundColor!.color = null;
                        }
                        else
                        {
                            roomRules.backgroundColor = this.changeColor({ role: cc.SvgBackground, property: ns.css.bgrColor, tag: tag, propVal: bgrColor });
                        }
                    }
                    else
                    {
                        roomRules.backgroundColor = this.changeColor(
                            { role: isButton ? cc.ButtonBackground : cc.Background, property: ns.css.bgrColor, tag: tag, propVal: bgrColor });
                    }

                    if (this._app.preserveDisplay && roomRules.backgroundColor && roomRules.backgroundColor.color && tag.id && tag.className)
                    {
                        roomRules.display = tag.mlComputedStyle!.display;
                    }
                }

                if (!roomRules.backgroundColor)
                {
                    roomRules.backgroundColor = Object.assign({}, this.getParentBackground(tag));
                    roomRules.backgroundColor!.color = null;
                }

                if (tag.tagName == ns.img &&
                    (this.shift.Image.lightnessLimit < 1 || this.shift.Image.saturationLimit < 1 ||
                        this._settingsManager.currentSettings.blueFilter !== 0))
                {
                    const customImageRole = tag.mlComputedStyle!.getPropertyValue(`--ml-${cc[cc.Image].toLowerCase()}`) as keyof ComponentShift;
                    let imgSet = this.shift[customImageRole] || this.shift.Image;
                    roomRules.filter =
                        {
                            value: [
                                tag.mlComputedStyle!.filter != this._css.none ? tag.mlComputedStyle!.filter : "",
                                imgSet.saturationLimit < 1 ? `saturate(${imgSet.saturationLimit})` : "",
                                this._settingsManager.currentSettings.blueFilter !== 0 ? `var(--${FilterType.BlueFilter})` : "",
                                imgSet.lightnessLimit < 1 ? `brightness(${imgSet.lightnessLimit})` : ""
                            ].filter(f => f).join(" ").trim()
                        };
                    roomRules.attributes = roomRules.attributes || new Map<string, string>();
                    if (this._settingsManager.currentSettings.useImageHoverAnimation)
                    {
                        roomRules.attributes.set(this._css.transition, this._css.filter);
                    }
                }
                const bgInverted = roomRules.backgroundColor!.originalLight - roomRules.backgroundColor!.light > 0.4;

                if (tag.mlComputedStyle!.content!.startsWith("url") && !(
                    tag instanceof PseudoElement &&
                    tag.parentElement.mlComputedStyle!.content === tag.mlComputedStyle!.content))
                {
                    let doInvert = (!isTable) && bgInverted &&
                        !doNotInvertRegExp.test(tag.mlComputedStyle!.content!) &&
                        tag.mlComputedStyle!.getPropertyValue("--ml-no-invert") !== true.toString() &&
                        (
                            this.tagIsSmall(tag)

                            || tag.isPseudo && tag.parentElement!.parentElement &&
                            this.tagIsSmall(tag.parentElement!.parentElement!) &&
                            tag.parentElement!.parentElement!.mlComputedStyle!.overflow === this._css.hidden

                            || !tag.isPseudo && this.tagIsSmall(tag.parentElement!) &&
                            tag.parentElement!.mlComputedStyle!.overflow === this._css.hidden
                        );
                    if (this.shift.Image.lightnessLimit < 1 || this.shift.Image.saturationLimit < 1 || doInvert || this._settingsManager.currentSettings.blueFilter !== 0)
                    {
                        let imgSet = this.shift.Image;
                        roomRules.filter =
                            {
                                value: [
                                    tag.mlComputedStyle!.filter != this._css.none ? tag.mlComputedStyle!.filter : "",
                                    imgSet.saturationLimit < 1 ? `saturate(${imgSet.saturationLimit})` : "",
                                    imgSet.lightnessLimit < 1 && !doInvert ? `brightness(${imgSet.lightnessLimit})` : "",
                                    doInvert ? `brightness(${float.format(1 - this.shift.Background.lightnessLimit)})` : "",
                                    doInvert ? "hue-rotate(180deg) invert(1)" : "",
                                    this._settingsManager.currentSettings.blueFilter !== 0 ? `var(--${FilterType.BlueFilter})` : ""
                                ].filter(f => f).join(" ").trim()
                            };
                    }
                }

                if (!(tag instanceof HTMLImageElement) && tag.mlComputedStyle!.backgroundImage &&
                    tag.mlComputedStyle!.backgroundImage !== this._css.none &&
                    tag.mlComputedStyle!.backgroundImage !== this._rootImageUrl)
                {
                    this.processBackgroundImagesAndGradients(tag, doc, roomRules, isButton, bgInverted);
                }

                bgLight = roomRules.backgroundColor!.light;
                if (roomRules.backgroundColor!.color && roomRules.backgroundColor!.alpha < 0.2)
                {
                    bgLight = this.getParentBackground(tag).light;
                }

                if (tag instanceof HTMLInputElement || tag instanceof HTMLTextAreaElement)
                {
                    roomRules.placeholderColor = this.changeColor({
                        role: cc.Text, property: ns.css.fntColor, tag: tag, bgLight: bgLight,
                        propVal: "grba(0,0,0,0.6)"
                    });
                }

                if (!isSvg || isSvgText)
                {
                    if (isLink || !isSvg && ( //tag.isPseudo &&
                        tag.parentElement instanceof HTMLAnchorElement ||
                        tag.parentElement && tag.parentElement.mlColor && tag.parentElement.mlColor.role === cc.Link))
                    {
                        const linkColor = this.changeColor({ role: cc.Link, property: ns.css.fntColor, tag: tag, bgLight: bgLight });
                        if (tag instanceof HTMLFontElement || linkColor && linkColor.role !== cc.Link)
                        {
                            roomRules.color = linkColor;
                        }
                        else if (linkColor)
                        {
                            roomRules.linkColor = linkColor;
                            roomRules.linkColor$Avtive = this.changeColor({ role: cc.Link$Active, propVal: linkColor.originalColor, property: ns.css.fntColor, tag: tag, bgLight: bgLight });
                            roomRules.linkColor$Hover = this.changeColor({ role: cc.Link$Hover, propVal: linkColor.originalColor, property: ns.css.fntColor, tag: tag, bgLight: bgLight });

                            roomRules.visitedColor = this.changeColor({ role: cc.VisitedLink, propVal: linkColor.originalColor, property: ns.css.fntColor, tag: tag, bgLight: bgLight });
                            roomRules.visitedColor$Active = this.changeColor({ role: cc.VisitedLink$Active, propVal: linkColor.originalColor, property: ns.css.fntColor, tag: tag, bgLight: bgLight });
                            roomRules.visitedColor$Hover = this.changeColor({ role: cc.VisitedLink$Hover, propVal: linkColor.originalColor, property: ns.css.fntColor, tag: tag, bgLight: bgLight });
                        }
                    }
                    else
                    {
                        const txtColor = tag instanceof HTMLElement && tag.isEditableContent
                            ? tag instanceof HTMLFontElement && tag.color
                                ? this._colorConverter.convert(tag.color) || cx.Black
                                : tag.style.getPropertyValue(this._css.color)
                                || tag.mlComputedStyle!.getPropertyValue(this._css.color)
                            : tag.mlComputedStyle!.getPropertyValue(ns.css.fntColor);

                        if (roomRules.backgroundColor && roomRules.backgroundColor.color &&
                            txtColor === bgrColor)
                        {
                            roomRules.color = Object.assign(Object.assign({},
                                roomRules.backgroundColor), {
                                    reason: ColorReason.SameAsBackground,
                                    owner: this._app.isDebug ? tag : null
                                });
                        }
                        else
                        {
                            roomRules.color = this.changeColor({
                                role: roomRules.backgroundColor!.role === cc.HighlightedBackground
                                    ? cc.HighlightedText : cc.Text,
                                property: ns.css.fntColor, tag: tag, bgLight: bgLight, propVal: txtColor
                            });
                        }
                    }
                    if (roomRules.color || roomRules.linkColor)
                    {
                        const textColor = roomRules.color! || roomRules.linkColor!;
                        let originalTextContrast = Math.abs(roomRules.backgroundColor!.originalLight - textColor.originalLight);
                        let currentTextContrast = Math.abs(roomRules.backgroundColor!.light - textColor.light);
                        if (currentTextContrast != originalTextContrast && textColor.originalLight != textColor.light &&
                            tag.mlComputedStyle!.textShadow && tag.mlComputedStyle!.textShadow !== this._css.none)
                        {
                            let newTextShadow = tag.mlComputedStyle!.textShadow!,
                                newColor: ColorEntry | undefined = undefined, currentTextShadowColor: string | null,
                                prevHslColor: HslaColor, shadowContrast: number, inheritedShadowColor;
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
                                            bgLight: textColor.light,
                                            propVal: currentTextShadowColor, tag
                                        });
                                        if (newColor && newColor.color)
                                        {
                                            newTextShadow = newTextShadow.replace(new RegExp(escapeRegex(c), "gi"), newColor.color);
                                        }
                                    }
                                });
                                if (newTextShadow !== tag.mlComputedStyle!.textShadow)
                                {
                                    roomRules.textShadow = { value: newTextShadow, color: newColor || null };
                                }
                            }
                        }
                    }
                }

                if (tag instanceof HTMLCanvasElement ||
                    tag instanceof HTMLEmbedElement && tag.getAttribute("type") === "application/pdf")
                {
                    this.processInaccessibleTextContent({ tag, roomRules });
                }

                if (isSvg && tag.mlComputedStyle!.stroke !== this._css.none || !isSvg && (
                    tag.mlComputedStyle!.borderStyle && tag.mlComputedStyle!.borderStyle !== this._css.none ||
                    !tag.mlComputedStyle!.borderStyle && (
                        tag.mlComputedStyle!.borderTopStyle !== this._css.none ||
                        tag.mlComputedStyle!.borderRightStyle !== this._css.none ||
                        tag.mlComputedStyle!.borderBottomStyle !== this._css.none ||
                        tag.mlComputedStyle!.borderLeftStyle !== this._css.none)))
                {
                    let brdColor = tag.mlComputedStyle!.getPropertyValue(ns.css.brdColor);
                    const brdColorIsSingle = brdColor && brdColor.indexOf(" r") === -1 || !brdColor &&
                        tag.mlComputedStyle!.borderTopColor === tag.mlComputedStyle!.borderRightColor &&
                        tag.mlComputedStyle!.borderRightColor === tag.mlComputedStyle!.borderBottomColor &&
                        tag.mlComputedStyle!.borderBottomColor === tag.mlComputedStyle!.borderLeftColor;

                    if (brdColorIsSingle)
                    {
                        brdColor = brdColor || tag.mlComputedStyle!.borderTopColor!;
                        if (brdColor === bgrColor)
                        {
                            roomRules.borderColor = Object.assign(Object.assign({},
                                roomRules.backgroundColor), {
                                    reason: ColorReason.SameAsBackground,
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
                        if (tag.isPseudo && tag.mlComputedStyle!.width === this._css._0px && tag.mlComputedStyle!.height === this._css._0px &&
                            ((transBordersCount = [
                                tag.mlComputedStyle!.borderTopColor,
                                tag.mlComputedStyle!.borderRightColor,
                                tag.mlComputedStyle!.borderBottomColor,
                                tag.mlComputedStyle!.borderLeftColor
                            ].filter(c => c === RgbaColor.Transparent).length) === 3 ||
                                transBordersCount === 2 && [
                                    tag.mlComputedStyle!.borderTopWidth,
                                    tag.mlComputedStyle!.borderRightWidth,
                                    tag.mlComputedStyle!.borderBottomWidth,
                                    tag.mlComputedStyle!.borderLeftWidth
                                ].filter(c => c === this._css._0px).length === 1))
                        {
                            borderRole = cc.Background;
                        }
                        if (tag.mlComputedStyle!.borderTopColor === bgrColor)
                        {
                            roomRules.borderTopColor = Object.assign(Object.assign({},
                                roomRules.backgroundColor), {
                                    reason: ColorReason.SameAsBackground,
                                    owner: this._app.isDebug ? tag : null
                                });
                        }
                        else
                        {
                            roomRules.borderTopColor = this.changeColor(
                                { role: borderRole, property: this._css.borderTopColor, tag: tag, bgLight: bgLight });
                        }

                        if (tag.mlComputedStyle!.borderRightColor === bgrColor)
                        {
                            roomRules.borderRightColor = Object.assign(Object.assign({},
                                roomRules.backgroundColor), {
                                    reason: ColorReason.SameAsBackground,
                                    owner: this._app.isDebug ? tag : null
                                });
                        }
                        else
                        {
                            roomRules.borderRightColor = this.changeColor(
                                { role: borderRole, property: this._css.borderRightColor, tag: tag, bgLight: bgLight });
                        }

                        if (tag.mlComputedStyle!.borderBottomColor === bgrColor)
                        {
                            roomRules.borderBottomColor = Object.assign(Object.assign({},
                                roomRules.backgroundColor), {
                                    reason: ColorReason.SameAsBackground,
                                    owner: this._app.isDebug ? tag : null
                                });
                        }
                        else
                        {
                            roomRules.borderBottomColor = this.changeColor(
                                { role: borderRole, property: this._css.borderBottomColor, tag: tag, bgLight: bgLight });
                        }

                        if (tag.mlComputedStyle!.borderLeftColor === bgrColor)
                        {
                            roomRules.borderLeftColor = Object.assign(Object.assign({},
                                roomRules.backgroundColor), {
                                    reason: ColorReason.SameAsBackground,
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

            if (tag instanceof Element)
            {
                tag.mlBgColor = roomRules.backgroundColor;
                tag.mlColor = roomRules.color || roomRules.linkColor;
                if (roomRules.textShadow)
                {
                    tag.mlTextShadow = roomRules.textShadow.color;
                }
            }

            return { roomRules: roomRules, before: beforePseudoElement, after: afterPseudoElement };
        }
        return undefined;
    }

    private processInaccessibleTextContent(
        { tag, roomRules, strictBgLight = false, customTextLight, ignoreContentInvertRule = false }: {
            tag: HTMLCanvasElement | HTMLEmbedElement, ignoreContentInvertRule?: boolean
            roomRules: RoomRules, strictBgLight?: boolean, customTextLight?: number
        })
    {
        const applyContentFilter =
            this._settingsManager.currentSettings.blueFilter !== 0 ||
            this.shift.Background.graySaturation > colorOverlayLimit ||
            this.shift.Text.graySaturation > colorOverlayLimit;

        let filterValue: Array<string>;
        if (this.shift.Background.lightnessLimit < 0.3 &&
            (ignoreContentInvertRule || this._settingsManager.currentSettings.doNotInvertContent === false) &&
            tag.mlComputedStyle &&
            tag.mlComputedStyle.getPropertyValue("--ml-no-invert") !== true.toString())
        {
            const darkSet = this.shift.Background, txtSet = this.shift.Text;
            roomRules.backgroundColor && (roomRules.backgroundColor.color = null);
            filterValue = [
                tag instanceof HTMLEmbedElement ? (`var(--${FilterType.PdfFilter})`) : "",
                darkSet.saturationLimit < 1 ? `saturate(${darkSet.saturationLimit})` : "",
                `brightness(${float.format(Math.max(1 - darkSet.lightnessLimit, strictBgLight ? 0 : 0.9))})`,
                `hue-rotate(180deg) invert(1)`,
                applyContentFilter ? `var(--${FilterType.ContentFilter})` : "",
                `brightness(${float.format(Math.max(customTextLight || txtSet.lightnessLimit, 0.9))})`
            ];
        }
        else
        {
            const lightSet = this.shift.Image;
            filterValue = [
                lightSet.saturationLimit < 1 ? `saturate(${lightSet.saturationLimit})` : "",
                applyContentFilter ? `var(--${FilterType.ContentFilter})` : "",
                lightSet.lightnessLimit < 1 ? `brightness(${lightSet.lightnessLimit})` : ""
            ];
        }
        roomRules.filter = { value: filterValue.filter(f => f).join(" ").trim() };
    }

    private calculateTransition(transitionProperty: string)
    {
        let hasForbiddenTransition = false;
        const newTransProps = transitionProperty.split(", ");
        transitionProperty.split(", ").forEach((prop, index) =>
        {
            if (this._transitionForbiddenProperties.has(prop))
            {
                newTransProps[index] = `-${prop}`;
                hasForbiddenTransition = true;
            }
        });
        return { hasForbiddenTransition, newTransProps };
    }

    protected changeColor(
        {
            role: component, property: property, tag: tag, bgLight: bgLight, propVal: propVal
        }:
            {
                role: Component, property: string, tag: HTMLElement | PseudoElement, bgLight?: number, propVal?: string
            }): ColorEntry | undefined
    {
        if (tag.mlComputedStyle)
        {
            let propRole = (cc as any as { [p: string]: Component })
            [tag.mlComputedStyle.getPropertyValue(`--ml-${cc[component].replace("$", "-").toLowerCase()}-${property}`)];
            propRole = propRole !== undefined ? propRole : component;
            propVal = propVal || tag.mlComputedStyle!.getPropertyValue(property);
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

                case cc.HighlightedBackground:
                    bgLightVal = bgLight !== undefined ? bgLight : this.getParentBackground(tag).light;
                    return this._highlightedBackgroundColorProcessor.changeColor(propVal, bgLightVal, tag);

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
                    return this._textSelectionColorProcessor.changeColor(propVal, false, tag, this._boundParentBackgroundGetter);

                case cc.None:
                    return this._noneColorProcessor.changeColor(propVal);
            }
        }
        return undefined;
    }

    protected processBackgroundImagesAndGradients(
        tag: HTMLElement | PseudoElement, doc: Document, roomRules: RoomRules,
        isButton: boolean, bgInverted: boolean)
    {
        let backgroundImage = tag.mlComputedStyle!.backgroundImage!;
        let bgImgLight = 1, doInvert = false, isPseudoContent = false, bgFilter = "", haveToProcBgImg = false,
            haveToProcBgGrad = /gradient/gi.test(backgroundImage);
        if (/\burl\(/gi.test(backgroundImage))
        {
            const customBgImageRole = tag.mlComputedStyle!.getPropertyValue(`--ml-${cc[cc.BackgroundImage].toLowerCase()}`) as keyof ComponentShift;
            const bgImgSet = this.shift[customBgImageRole] || this.shift.BackgroundImage;
            const hasRepeats = !/^(?:,?\s?no-repeat)+$/i.test(tag.mlComputedStyle!.backgroundRepeat!) &&
                !/cover|contain|%|^(?:,?\s?\d+\dpx)+$/i.test(tag.mlComputedStyle!.backgroundSize!) &&
                !/-|\d+\dpx/i.test(tag.mlComputedStyle!.backgroundPosition!) &&
                !notTextureRegExp.test(backgroundImage + tag.className);

            doInvert = !hasRepeats && bgInverted && !tag.style.backgroundImage &&
                !doNotInvertRegExp.test(backgroundImage + tag.className) &&
                tag.mlComputedStyle!.getPropertyValue("--ml-no-invert") !== true.toString() &&
                this.tagIsSmall(tag);

            if (bgImgSet.lightnessLimit < 1 || bgImgSet.saturationLimit < 1 ||
                doInvert || this._settingsManager.currentSettings.blueFilter !== 0 ||
                hasRepeats && this.shift.Background.lightnessLimit < 1)
            {
                isPseudoContent = tag.isPseudo && tag.mlComputedStyle.content !== "''" && tag.mlComputedStyle!.content !== '""';

                if (bgImgSet.lightnessLimit < 1 && !doInvert && !hasRepeats)
                {
                    this.calcTagArea(tag);
                    const area = 1 - Math.min(Math.max(tag.mlArea!, 1) / doc.viewArea!, 1),
                        lim = bgImgSet.lightnessLimit,
                        txtLim = this.shift.Text.lightnessLimit;
                    bgImgLight = Math.min(((lim ** (1 / 2) - lim) ** (1 / 3) * area) ** 3 + lim, Math.max(lim, txtLim));
                }
                else if (hasRepeats)
                {
                    bgImgLight = this.shift.Background.lightnessLimit;
                }

                bgFilter = [
                    bgImgSet.saturationLimit < 1 ? `saturate(${bgImgSet.saturationLimit})` : "",
                    bgImgLight < 1 && !doInvert ? `brightness(${float.format(bgImgLight)})` : "",
                    doInvert ? `brightness(${float.format(1 - this.shift.Background.lightnessLimit)})` : "",
                    doInvert ? "hue-rotate(180deg) invert(1)" : "",
                    this._settingsManager.currentSettings.blueFilter !== 0 ? `var(--${FilterType.BlueFilter})` : ""
                ].filter(f => f).join(" ").trim();

                haveToProcBgImg = tag instanceof Element && !!tag.firstChild || isPseudoContent ||
                    haveToProcBgGrad || roomRules.backgroundColor && !!roomRules.backgroundColor.color ||
                    tag instanceof HTMLInputElement || tag instanceof HTMLTextAreaElement ||
                    tag instanceof HTMLBodyElement || tag instanceof HTMLHtmlElement;

                if (haveToProcBgImg)
                {
                    roomRules.attributes = roomRules.attributes || new Map<string, string>();
                    roomRules.attributes.set("ml-bg-image", "");
                }
                else
                {
                    roomRules.filter = { value: bgFilter };
                }
            }
        }
        if (haveToProcBgImg || haveToProcBgGrad)
        {
            // -webkit-gradient(linear, 0% 0%, 0% 100%, from(rgb(246, 246, 245)), to(rgb(234, 234, 234)))
            // -webkit-image-set(url(https://ssl.gstatic.com/1x/history_grey600_48dp.png) 1x,url(https://ssl.gstatic.com/2x/history_grey600_48dp.png) 2x)

            if (roomRules.hasBackgroundImageSet = /image-set\(/gi.test(backgroundImage))
            {
                backgroundImage = backgroundImage.replace(/[\w-]*image-set\(/, "");
            }

            const gradientColorMatches = backgroundImage
                .match(/rgba?\([^)]+\)|(color-stop|from|to)\((rgba?\([^)]+\)|[^)]+)\)|calc\([^)]+\)/gi);
            const gradientColors = new Map<string, string>();
            if (gradientColorMatches)
            {
                gradientColorMatches.forEach(color => gradientColors.set(color, Math.random().toString()));
                gradientColors.forEach((id, color) => backgroundImage =
                    backgroundImage.replace(new RegExp(escapeRegex(color), "g"), id));
            }

            const backgroundImages = backgroundImage.match(/\burl\(\"[^"]+\"\)|[\w-]+\([^)]+\)/gi)!;

            roomRules.backgroundImages = backgroundImages.map((bgImg, index) =>
            {
                gradientColors.forEach((id, color) => bgImg = bgImg.replace(new RegExp(id, "g"), color));
                if (haveToProcBgImg && bgImg.startsWith("url"))
                {
                    return this._backgroundImageProcessor.process(
                        bgImg, bgFilter, this._settingsManager.currentSettings.blueFilter / 100, roomRules);
                }
                else if (/gradient/gi.test(bgImg))
                {
                    return this.processBackgroundGradient(tag, isButton, index, bgImg, roomRules);
                }
                else
                {
                    return new BackgroundImage(bgImg, BackgroundImageType.Image);
                }
            });
            if (!roomRules.hasBackgroundImagePromises)
            {
                delete roomRules.filter;
            }
        }
    }

    protected processBackgroundGradient(tag: HTMLElement | PseudoElement, isButton: boolean, index: number, gradient: string, roomRules: RoomRules)
    {
        // -webkit-gradient(linear, 0% 0%, 0% 100%, from(rgb(246, 246, 245)), to(rgb(234, 234, 234)))
        // linear-gradient(to right, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0.5) calc(71.1704% - 16px), transparent calc(71.1704% - 15px), transparent 100%)
        // linear-gradient(0.25turn, rgb(63, 135, 166), rgb(235, 248, 225), rgb(246, 157, 60))
        let mainColor: ColorEntry | null = null, lightSum = 0;
        let uniqColors = new Set<string>(gradient
            .replace(/webkit|moz|ms|repeating|linear|radial|from|\bto\b|gradient|circle|ellipse|top|left|bottom|right|farthest|closest|side|corner|current|color|transparent|stop|calc|[\.\d]+%|[\.\d]+[a-z]{2,4}/gi, '')
            .match(/(rgba?\([^\)]+\)|#[a-z\d]{6}|[a-z]+)/gi) || []);
        const bgLight = isButton
            ? this._settingsManager.isComplex
                ? this.getParentBackground(tag).light
                : this.shift.Background.lightnessLimit
            : roomRules.backgroundColor
                ? roomRules.backgroundColor.light
                : this.shift.Background.lightnessLimit;
        if (uniqColors.size > 0)
        {
            uniqColors.forEach(c =>
            {
                let prevColor = /rgb/gi.test(c) ? c : this._colorConverter.convert(c);
                let newColor: ColorEntry;
                if (isButton)
                {
                    newColor = this.changeColor({
                        role: cc.ButtonBackground, property: this._css.backgroundColor,
                        tag: tag, propVal: prevColor!, bgLight: bgLight
                    })!;
                }
                else
                {
                    newColor = this.changeColor({
                        role: cc.BackgroundNoContrast, property: this._css.backgroundColor,
                        tag: tag, propVal: prevColor!, bgLight: bgLight
                    })!;
                }
                lightSum += newColor.light;
                if (newColor.color ||
                    newColor.reason === ColorReason.Inherited && newColor.intendedColor)
                {
                    gradient = gradient.replace(new RegExp(escapeRegex(c), "gi"),
                        newColor.color || newColor.intendedColor!);
                }
                if (!mainColor && newColor.alpha > 0.5 && roomRules.backgroundColor &&
                    newColor.role === (isButton ? cc.ButtonBackground : cc.BackgroundNoContrast))
                {
                    mainColor = roomRules.backgroundColor = Object.assign({}, roomRules.backgroundColor);
                    mainColor.light = newColor.light;
                }
            });
            mainColor && (mainColor!.light = lightSum / uniqColors.size);
        }
        return new BackgroundImage(gradient, BackgroundImageType.Gradient);
    }

    protected applyBackgroundImages(tag: HTMLElement | PseudoElement, hasBackgroundImageSet: boolean | undefined, backgroundImages: BackgroundImage[])
    {
        let originalState = this._documentObserver.stopDocumentObservation(tag.ownerDocument!);
        let bgImages = backgroundImages.map((bgImg, ix) => bgImg.data + (hasBackgroundImageSet ? ` ${ix + 1}x` : ""))
            .join(",");
        if (hasBackgroundImageSet)
        {
            bgImages = `-webkit-image-set(${bgImages})`
        }
        tag.style.setProperty(this._css.backgroundImage, bgImages, this._css.important);
        this._documentObserver.startDocumentObservation(tag.ownerDocument!, originalState);
        return tag;
    }

    protected removeDynamicValuesStyle(doc: Document)
    {
        const dynamicStyle = doc.getElementById("midnight-lizard-dynamic-values");
        dynamicStyle && dynamicStyle.remove();
        this._svgFilters.removeSvgFilters(doc);
    }

    protected createPseudoStyles(doc: Document)
    {
        if (!doc.mlPseudoStyles)
        {
            doc.mlPseudoStyles = doc.createElement('style');
            doc.mlPseudoStyles.id = "midnight-lizard-pseudo-styles";
            doc.mlPseudoStyles.mlIgnore = true;
            doc.mlPseudoStyles.textContent = this.getStandardPseudoStyles();
            (doc.head || doc.documentElement!).appendChild(doc.mlPseudoStyles);
        }
    }

    protected getStandardPseudoStyles()
    {
        const css = new Array<string>();
        for (let pseudoType of getEnumNames(PseudoType))
        {
            for (let pseudoStandard of getEnumValues<PseudoStyleStandard>(PseudoStyleStandard))
            {
                const cssText = this._standardPseudoCssTexts.get(pseudoStandard)!;
                const pseudo = pseudoType.toLowerCase();
                const standard = PseudoStyleStandard[pseudoStandard].replace(/(\B[A-Z])/g, "-$1").toLowerCase();
                this._pseudoStyles.set(pseudo + cssText, standard);
                css.push(`[${pseudo}-style="${standard}"]:not(imp)::${pseudo}{${cssText}}`)
            }
        }
        return css.join("\n");
    }

    protected clearPseudoStyles(doc: Document)
    {
        this._pseudoStyles.clear();
        if (doc.mlPseudoStyles)
        {
            doc.mlPseudoStyles.textContent = this.getStandardPseudoStyles();
        }
    }

    protected calculateMainColors(doc: Document)
    {
        this.calculateDefaultColors(doc, cx.Link, cx.Black);
        doc.documentElement!.mlArea = 1;
        const ignoreBlueFilter = this._settingsManager.isFilter;
        const bgLight = this.shift.Background.lightnessLimit,
            textColorEntry = this._textColorProcessor.changeColor(cx.Black, bgLight, doc.documentElement, ignoreBlueFilter),
            scrollbarSizeNum = this._settingsManager.currentSettings.scrollbarSize;
        let
            backgroundColor = this._backgroundColorProcessor.changeColor(cx.White, true, doc.documentElement, undefined, ignoreBlueFilter).color!,
            altBackgroundColor = this._backgroundColorProcessor.changeColor("rgb(250,250,250)", true, doc.documentElement, undefined, ignoreBlueFilter).color!,
            transBackgroundColor = this._backgroundColorProcessor.changeColor("rgba(255,255,255,0.5)", true, doc.documentElement, undefined, ignoreBlueFilter).color!,
            transAltBackgroundColor = this._backgroundColorProcessor.changeColor("rgba(250,250,250,0.3)", true, doc.documentElement, undefined, ignoreBlueFilter).color!,
            textColor = textColorEntry.color!,
            transTextColor = this._textColorProcessor.changeColor("rgba(0,0,0,0.6)", bgLight, doc.documentElement, ignoreBlueFilter).color!,
            textColorFiltered = this._textColorProcessor.changeColor(cx.Black, bgLight, doc.documentElement).color!,
            borderColor = this._borderColorProcessor.changeColor(cx.Gray, bgLight, doc.documentElement, ignoreBlueFilter).color!,
            transBorderColor = this._borderColorProcessor.changeColor("rgba(127,127,127,0.3)", bgLight, doc.documentElement, ignoreBlueFilter).color!,
            selectionColor = this._textSelectionColorProcessor.changeColor(cx.White, false, doc.documentElement, undefined, ignoreBlueFilter).color!,
            selectionTextColor = cx.White,
            selectionShadowColor = new cx(0, 0, 0, 0.8).toString(),
            rangeFillColor = this._rangeFillColorProcessor.changeColor(this.shift, textColorEntry.light, bgLight, ignoreBlueFilter).color!,

            buttonBackgroundColor = this._buttonBackgroundColorProcessor.changeColor(cx.White, bgLight, doc.documentElement, ignoreBlueFilter).color!,
            redButtonBackgroundColor = this._buttonBackgroundColorProcessor.changeColor("rgb(255,0,0)", bgLight, doc.documentElement, ignoreBlueFilter).color!,
            buttonBorderColor = this._buttonBorderColorProcessor.changeColor(cx.White, bgLight, doc.documentElement, ignoreBlueFilter).color!,

            scrollbarThumbHoverColor = this._scrollbarHoverColorProcessor.changeColor(cx.White, bgLight, doc.documentElement, ignoreBlueFilter).color!,
            scrollbarThumbNormalColor = this._scrollbarNormalColorProcessor.changeColor(cx.White, bgLight, doc.documentElement, ignoreBlueFilter).color!,
            scrollbarThumbActiveColor = this._scrollbarActiveColorProcessor.changeColor(cx.White, bgLight, doc.documentElement, ignoreBlueFilter).color!,
            scrollbarTrackColor = backgroundColor,
            scrollbarShadowColor = new cx(0, 0, 0, 0.3).toString(),
            scrollbarSize = `${scrollbarSizeNum}px`,
            scrollbarMarksColor = textColor,

            scrollbarMarksColorFiltered = textColorFiltered,
            scrollbarThumbHoverColorFiltered = this._scrollbarHoverColorProcessor.changeColor(cx.White, bgLight, doc.documentElement).color!,
            scrollbarThumbNormalColorFiltered = this._scrollbarNormalColorProcessor.changeColor(cx.White, bgLight, doc.documentElement).color!,
            scrollbarThumbActiveColorFiltered = this._scrollbarActiveColorProcessor.changeColor(cx.White, bgLight, doc.documentElement).color!,
            scrollbarTrackColorFiltered = this._backgroundColorProcessor.changeColor(cx.White, false, doc.documentElement).color!,

            linkColor = this._linkColorProcessor.changeColor(cx.Link, bgLight, doc.documentElement, ignoreBlueFilter).color!,
            linkColorHover = this._hoverLinkColorProcessor.changeColor(cx.Link, bgLight, doc.documentElement, ignoreBlueFilter).color!,
            linkColorActive = this._activeLinkColorProcessor.changeColor(cx.Link, bgLight, doc.documentElement, ignoreBlueFilter).color!,
            visitedColor = this._visitedLinkColorProcessor.changeColor(cx.Link, bgLight, doc.documentElement, ignoreBlueFilter).color!,
            visitedColorHover = this._hoverVisitedLinkColorProcessor.changeColor(cx.Link, bgLight, doc.documentElement, ignoreBlueFilter).color!,
            visitedColorActive = this._activeVisitedLinkColorProcessor.changeColor(cx.Link, bgLight, doc.documentElement, ignoreBlueFilter).color!;

        // Firefox scrollbar size
        let mozScrollbarWidth = 'auto';
        if (scrollbarSizeNum === 0)
        {
            mozScrollbarWidth = 'none';
        }
        else if (scrollbarSizeNum < 10)
        {
            mozScrollbarWidth = 'thin';
        }

        delete doc.documentElement!.mlArea;
        this._backgroundColorProcessor.clear();

        const
            backgroundColorFiltered = this._backgroundColorProcessor.changeColor(cx.White, true, doc.documentElement).color!,
            altBackgroundColorFiltered = this._backgroundColorProcessor.changeColor("rgb(250,250,250)", true, doc.documentElement).color!;

        delete doc.documentElement!.mlArea;
        this._backgroundColorProcessor.clear();

        const mainColors = {
            backgroundColor, backgroundColorFiltered,
            altBackgroundColor, altBackgroundColorFiltered,
            transBackgroundColor, transAltBackgroundColor,
            textColor, transTextColor, textColorFiltered,
            borderColor, transBorderColor, rangeFillColor,
            selectionColor, selectionTextColor, selectionShadowColor,
            buttonBackgroundColor, buttonBorderColor, redButtonBackgroundColor,
            scrollbarThumbHoverColor, scrollbarThumbNormalColor, scrollbarThumbActiveColor,
            scrollbarTrackColor, scrollbarMarksColor, scrollbarShadowColor,
            scrollbarSize, mozScrollbarWidth, mozScrollbarTrackColor: altBackgroundColor,
            linkColor, linkColorHover, linkColorActive,
            visitedColor, visitedColorHover, visitedColorActive,

            scrollbarMarksColorOriginal: textColor,
            scrollbarThumbHoverColorOriginal: scrollbarThumbHoverColor,
            scrollbarThumbNormalColorOriginal: scrollbarThumbNormalColor,
            scrollbarThumbActiveColorOriginal: scrollbarThumbActiveColor,
            scrollbarTrackColorOriginal: scrollbarTrackColor,
            mozScrollbarTrackColorOriginal: altBackgroundColor,
            scrollbarShadowColorOriginal: scrollbarShadowColor,

            scrollbarMarksColorFiltered,
            scrollbarThumbHoverColorFiltered,
            scrollbarThumbNormalColorFiltered,
            scrollbarThumbActiveColorFiltered,
            scrollbarTrackColorFiltered,
            mozScrollbarTrackColorFiltered: altBackgroundColorFiltered,
            scrollbarShadowColorFiltered: scrollbarShadowColor
        };
        this._onMainColorsCalculated.raise(mainColors);
        return mainColors
    }

    protected injectDynamicValues(doc: Document)
    {
        this._settingsManager.computeProcessingMode(doc, false);
        const mainColors = this.calculateMainColors(doc),
            invertColors = this._settingsManager.isFilter &&
                this.shift.Background.lightnessLimit < 0.5;
        this._svgFilters.createSvgFilters(doc, mainColors.backgroundColor, mainColors.textColor);
        let cssText = "";
        for (const color in mainColors)
        {
            let colorValue = mainColors[color as keyof typeof mainColors];
            if (invertColors && !/Size|Width|Filtered/.test(color))
            {
                colorValue = BaseColorProcessor.invertColor(colorValue);
            }
            const colorVarName = color.replace(/([A-Z])/g, "-$1").toLowerCase();
            cssText += `\n--ml-main-${colorVarName}:${colorValue};`;
        }
        let component: keyof ComponentShift,
            property: keyof ColorShift;
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
        cssText += `\n--ml-app-id:${this._app.id};`;
        cssText += `\n--ml-version:${this._app.version};`;
        if (this._settingsManager.currentSettings.blueFilter > 0 ||
            this.shift.Text.graySaturation > colorOverlayLimit ||
            this.shift.Background.graySaturation > colorOverlayLimit)
        {
            cssText += `\n--${FilterType.ContentFilter}:url("#${FilterType.ContentFilter}");`;
        }
        else
        {
            cssText += `\n--${FilterType.ContentFilter}:'';`;
        }
        if (this._settingsManager.currentSettings.blueFilter > 0)
        {
            cssText += `\n--${FilterType.BlueFilter}:url("#${FilterType.BlueFilter}");`;
        }
        else
        {
            cssText += `\n--${FilterType.BlueFilter}:'';`;
        }
        cssText += `\n--${FilterType.PdfFilter}:url("#${FilterType.PdfFilter}");`;
        cssText += `\n--ml-invert:${this.shift.Background.lightnessLimit < 0.3 ? 1 : 0}!important;`;
        cssText += `\n--ml-is-active:${this._settingsManager.isActive ? 1 : 0}!important;`;

        const fakeCanvas = doc.createElement("canvas"), fakeCanvasRules: RoomRules = {};
        fakeCanvas.mlComputedStyle = fakeCanvas.style;
        for (const [contentType, ignoreContentInvertRule] of
            [["", true], ["-dynamic-content", false]] as Array<[string, boolean]>)
        {
            // using real bgLight and limited real txtLight
            this.processInaccessibleTextContent({
                tag: fakeCanvas, roomRules: fakeCanvasRules,
                strictBgLight: true, ignoreContentInvertRule
            });
            cssText += `\n--ml${contentType}-text-filter:${fakeCanvasRules.filter!.value};`;

            // using limited bgLight and limited real txtLight
            // bg is always dark
            this.processInaccessibleTextContent({
                tag: fakeCanvas, roomRules: fakeCanvasRules,
                ignoreContentInvertRule
            });
            cssText += `\n--ml${contentType}-contrast-text-filter:${fakeCanvasRules.filter!.value};`;

            // using real bgLight and custom txtLight
            // no final text light filter
            this.processInaccessibleTextContent({
                tag: fakeCanvas, roomRules: fakeCanvasRules,
                strictBgLight: true, customTextLight: 1, ignoreContentInvertRule
            });
            cssText += `\n--ml${contentType}-highlighted-text-filter:${fakeCanvasRules.filter!.value};`;
        }

        let imgSet = this.shift.Image;
        const imgFilter = [
            imgSet.saturationLimit < 1 ? `saturate(${imgSet.saturationLimit})` : "",
            this._settingsManager.currentSettings.blueFilter !== 0 ? `var(--${FilterType.BlueFilter})` : "",
            imgSet.lightnessLimit < 1 ? `brightness(${imgSet.lightnessLimit})` : ""
        ].filter(f => f).join(" ").trim();
        cssText += `\n--ml-image-filter:${imgFilter || 'none'};`;

        let imgLight = imgSet.lightnessLimit, imgSat = imgSet.saturationLimit;
        if (this.shift.Text.lightnessLimit < 1)
        {
            imgLight += 1 - Math.max(this.shift.Text.lightnessLimit, 0.9);
        }
        if (this.shift.Background.saturationLimit < 1)
        {
            imgSat += 1 - this.shift.Background.saturationLimit;
        }
        const imgRevertFilter = [
            imgLight !== 1 ? `brightness(${imgLight})` : "",
            invertColors ? `hue-rotate(180deg) invert(1)` : "",
            imgSat !== 1 ? `saturate(${imgSat})` : "",
        ].filter(f => f).join(" ").trim();
        cssText += `\n--ml-image-revert-filter:${imgRevertFilter || 'none'};`;

        let videoLight = 1, videoSat = 1;
        if (this.shift.Text.lightnessLimit < 1)
        {
            videoLight += 1 - Math.max(this.shift.Text.lightnessLimit, 0.9);
        }
        if (this.shift.Background.saturationLimit < 1)
        {
            videoSat += 1 - this.shift.Background.saturationLimit;
        }
        const videoRevertFilter = [
            videoLight !== 1 ? `brightness(${videoLight})` : "",
            invertColors ? `hue-rotate(180deg) invert(1)` : "",
            videoSat !== 1 ? `saturate(${videoSat})` : "",
        ].filter(f => f).join(" ").trim();
        cssText += `\n--ml-video-revert-filter:${videoRevertFilter || 'none'};`;

        const mainColorsStyle = doc.createElement('style');
        mainColorsStyle.id = "midnight-lizard-dynamic-values";
        mainColorsStyle.mlIgnore = true;
        mainColorsStyle.textContent = `:root { ${cssText} }`;
        (doc.head || doc.documentElement!).appendChild(mainColorsStyle);
    }

    protected processMetaTheme(doc: Document)
    {
        if (doc.head && this._settingsManager.currentSettings.changeBrowserTheme)
        {
            let metaTheme = doc.querySelector('meta[name="theme-color"]') as HTMLMetaElement;
            let originalColor = "rgb(240,240,240)";
            if (!metaTheme)
            {
                metaTheme = doc.createElement("meta");
                metaTheme.name = "theme-color";
                doc.head.appendChild(metaTheme);
            }
            else
            {
                originalColor = this._colorConverter.convert(metaTheme.content) || originalColor;
                metaTheme.originalColor = metaTheme.content;
            }
            const rgbColorString = this._buttonBackgroundColorProcessor.changeColor(
                originalColor, this.shift.Background.lightnessLimit, metaTheme).color!;
            metaTheme.content = RgbaColor.toHexColorString(rgbColorString);
        }
    }

    protected restoreMetaTheme(doc: Document)
    {
        let metaTheme = doc.querySelector('meta[name="theme-color"]') as HTMLMetaElement;
        if (metaTheme)
        {
            if (metaTheme.originalColor)
            {
                metaTheme.content = metaTheme.originalColor;
            }
            else
            {
                metaTheme.remove();
            }
        }
    }

    protected createPageScript(doc: Document)
    {
        try
        {
            if (!doc.getElementById("midnight-lizard-page-script"))
            {
                const pageScript = doc.createElement("script");
                pageScript.id = "midnight-lizard-page-script";
                pageScript.type = "text/javascript";
                pageScript.src = this._app.getFullPath("/js/page-script.js");
                (doc.head || doc.documentElement!).appendChild(pageScript);
            }
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
        let isSvg = tag instanceof SVGElement;
        let applyBgPromise;
        let ns = USP.htm;
        ns = _ns || (isSvg ? USP.svg : USP.htm);
        if (tag instanceof Element)
        {
            if (roomRules.attributes && roomRules.attributes.size > 0)
            {
                roomRules.attributes.forEach((attrValue, attrName) => tag.setAttribute(attrName, attrValue));
            }
        }

        if (roomRules.transitionProperty && roomRules.transitionProperty.value)
        {
            tag.originalTransitionProperty = tag.style.transitionProperty;
            tag.style.setProperty(this._css.transitionProperty, roomRules.transitionProperty.value, this._css.important)
        }

        if (roomRules.filter && roomRules.filter.value)
        {
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

        if (roomRules.backgroundImages)
        {
            tag.originalBackgroundImage = tag.style.backgroundImage;
            if (roomRules.hasBackgroundImagePromises)
            {
                applyBgPromise = Promise.all
                    ([tag, tag.mlTimestamp, roomRules.hasBackgroundImageSet, ...roomRules.backgroundImages] as
                        [HTMLElement | PseudoElement, number, boolean, BackgroundImage])
                    .then(([t, timestamp, hasBackgroundImageSet, ...bgImgs]) =>
                    {
                        if (t.mlTimestamp === timestamp)
                        {
                            return this.applyBackgroundImages(t, hasBackgroundImageSet, bgImgs);
                        }
                        return t;
                    });
                applyBgPromise.catch(ex =>
                {
                    if (this._app.isDebug)
                    {
                        console.error(`Faild to fetch background image\n${ex}`);
                    }
                });
            }
            else
            {
                this.applyBackgroundImages(tag, roomRules.hasBackgroundImageSet, roomRules.backgroundImages as BackgroundImage[]);
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
            if (tag instanceof HTMLElement && (tag.isEditableContent ||
                tag.isEditableContent === undefined && this.isEditableContent(tag)))
            {
                tag.style.setProperty(this._css.editableContentBackgroundColor, roomRules.backgroundColor.color);
            }
            else
            {
                tag.originalBackgroundColor = tag.style.getPropertyValue(ns.css.bgrColor);
                tag.style.setProperty(ns.css.bgrColor, roomRules.backgroundColor.color, this._css.important);
            }
        }

        if (roomRules.placeholderColor && roomRules.placeholderColor.color)
        {
            tag.style.setProperty(this._css.placeholderColor, roomRules.placeholderColor.color, this._css.important);
        }

        if (roomRules.color && (roomRules.color.color ||
            tag instanceof HTMLElement && tag.contentEditable === true.toString()))
        {
            if (tag instanceof HTMLElement && (tag.isEditableContent ||
                tag.isEditableContent === undefined && this.isEditableContent(tag)))
            {
                tag.style.setProperty(this._css.editableContentColor, roomRules.color.color ||
                    roomRules.color.intendedColor || roomRules.color.inheritedColor || cx.Black);
            }
            else
            {
                tag.originalColor = tag.style.getPropertyValue(ns.css.fntColor);
                tag.style.setProperty(ns.css.fntColor, roomRules.color.color, this._css.important);
            }
        }
        else if (roomRules.color && (roomRules.color.reason === ColorReason.Inherited) && tag.style.getPropertyValue(ns.css.fntColor))
        {
            tag.originalColor = "";
        }

        if (roomRules.linkColor && roomRules.linkColor.color)
        {
            tag.style.setProperty(this._css.linkColor, roomRules.linkColor.color, this._css.important);
            tag.style.setProperty(this._css.linkColorHover, roomRules.linkColor$Hover!.color, this._css.important);
            tag.style.setProperty(this._css.linkColorActive, roomRules.linkColor$Avtive!.color, this._css.important);
        }

        if (roomRules.visitedColor && roomRules.visitedColor.color)
        {
            tag.style.setProperty(this._css.visitedColor, roomRules.visitedColor.color, this._css.important);
            tag.style.setProperty(this._css.visitedColorHover, roomRules.visitedColor$Hover!.color, this._css.important);
            tag.style.setProperty(this._css.visitedColorActive, roomRules.visitedColor$Active!.color, this._css.important);
        }

        if (tag instanceof HTMLElement && (tag.isEditableContent ||
            tag.isEditableContent === undefined && this.isEditableContent(tag)))
        {
            // tag.mlEditableContentColor = roomRules.color && (
            //     roomRules.color.color || roomRules.color.intendedColor || roomRules.color.inheritedColor);
            // tag.originalEditableContentColor = tag.originalColor ||
            //     roomRules.color && roomRules.color.originalColor || cx.Black;
            tag.style.setProperty(this._css.originalColor, tag.originalColor ||
                roomRules.color && roomRules.color.originalColor || cx.Black);

            // tag.mlEditableContentBackgroundColor =
            //     roomRules.backgroundColor && roomRules.backgroundColor.color !== cx.Transparent && roomRules.backgroundColor.color ||
            //     tag.parentElement && tag.parentElement.mlEditableContentBackgroundColor;
            // tag.originalEditableContentBackgroundColor = tag.originalBackgroundColor ||
            //     roomRules.backgroundColor && roomRules.backgroundColor.originalColor !== cx.Transparent &&
            //     roomRules.backgroundColor.originalColor ||
            //     this.getParentBackground(tag).originalColor || cx.White;
            tag.style.setProperty(this._css.originalBackgroundColor,
                tag.originalBackgroundColor ||
                roomRules.backgroundColor && roomRules.backgroundColor.originalColor !== cx.Transparent &&
                roomRules.backgroundColor.originalColor ||
                this.getParentBackground(tag).originalColor || cx.White);
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

        if (tag instanceof PseudoElement)
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
                    const pseudoKey = tag.tagName + cssText;
                    const pseudoId = this._pseudoStyles.get(pseudoKey);
                    if (pseudoId)
                    {
                        cssText = "";
                    }
                    else
                    {
                        this._pseudoStyles.set(pseudoKey, tag.id);
                    }
                    tag.parentElement.setAttribute(`${tag.tagName}-style`, pseudoId || tag.id);
                }
                tag.applyStyleChanges(cssText);
            }
        }

        if (tag instanceof Element && tag.onRoomRulesApplied)
        {
            tag.onRoomRulesApplied.raise(roomRules);
        }
    }
}