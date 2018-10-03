/// <reference path="../Colors/ColorEntry.ts" />
/// <reference path="../Events/-Events.ts" />
/// <reference path="../ContentScript/-ContentScript.ts" />

interface Document
{
    mlPseudoStyles?: HTMLStyleElement;
    viewArea?: number;
}

interface Node
{
    /** timestamp ot the last element reCalculation */
    mlTimestamp: number | undefined;
    /** number of times when element has been mutated faster than mutation trottle timeout */
    mlMutationThrottledCount: number | undefined;
    /** Processing order */
    mlOrder: MidnightLizard.ContentScript.ProcessingOrder | undefined;
    mlRowNumber: number | undefined;
    /** If true - Midnight Lizard would not process this element */
    mlIgnore: boolean | null | undefined;
    mlFixed?: string | null;
    /** Calculated background color */
    mlBgColor: MidnightLizard.Colors.ColorEntry | null | undefined;
    /** Calculated font color */
    mlColor: MidnightLizard.Colors.ColorEntry | null | undefined;
    /** Calculated parent background color */
    mlParentBgColor: MidnightLizard.Colors.ColorEntry | null | undefined;
    /** Calculated text shadow color */
    mlTextShadow: MidnightLizard.Colors.ColorEntry | null | undefined;
    ////////////////////////////////////////////////////////////////
    /** Real Node is not a pseudo element */
    isPseudo: false;
    /** Determinse whether element is observed or not*/
    isObserved: boolean | undefined;
    alwaysRecalculateStyles?: boolean;
    /** Occurs when IDocumentProcessor applies RoomRules on this element */
    onRoomRulesApplied: MidnightLizard.Events.ArgumentedEventDispatcher<MidnightLizard.ContentScript.RoomRules>;
    /** cache of getBoundingClientRect call results */
    mlRect: ClientRect | null | undefined;
    /** Computed z-index */
    zIndex: number | undefined;
    /** Concatinated into the string list of matched css selectors */
    selectors: string | null | undefined;
    /** cache of getComputedStyle call results */
    mlComputedStyle: CSSStyleDeclaration | undefined | null;
    /** area of the element */
    mlArea: number | undefined;
    /** Element path in the DOM tree */
    mlPath: string | undefined | null;
    /** is true if this element has been verified as suitable for the processing */
    isChecked: boolean | null | undefined;
    ////////////////////////////////////////////////////////////////
    //////////////////// original values ///////////////////////////
    ////////////////////////////////////////////////////////////////
    currentFilter: string | null | undefined;
    originalFilter: string | null | undefined;
    keepFilter: boolean | undefined;
    originalTransitionDuration: string | null | undefined;
    originalBackgroundColor: string | null | undefined;
    originalDisplay: string | null | undefined;
    originalZIndex: string | null | undefined;
    originalColor: string | null | undefined;
    originalTextShadow: string | null | undefined;
    originalBorderColor: string | null | undefined;
    originalBorderTopColor: string | null | undefined;
    originalBorderRightColor: string | null | undefined;
    originalBorderBottomColor: string | null | undefined;
    originalBorderLeftColor: string | null | undefined;
    originalVisibility: string | null | undefined;
    originalBackgroundImage: string | null | undefined;
    originalBackgroundSize: string | null | undefined;
    ////////////////////////////////////////////////////////////////
    __lookupGetter__<T>(propertyName: string): () => T;
    __lookupSetter__<T>(propertyName: string): (value: T) => void;
    innerHtmlGetter: () => string;
    innerHtmlCache: { value: string, timestamp: number };
}

interface HTMLInputElement
{
    labelElement: HTMLLabelElement | undefined;
}

interface Window
{
    Element: typeof Element;
    HTMLElement: typeof HTMLElement;
    HTMLAnchorElement: typeof HTMLAnchorElement;
    HTMLFontElement: typeof HTMLFontElement;
    HTMLLabelElement: typeof HTMLLabelElement;
    HTMLButtonElement: typeof HTMLButtonElement;
    HTMLInputElement: typeof HTMLInputElement;
    HTMLIFrameElement: typeof HTMLIFrameElement;
    HTMLCanvasElement: typeof HTMLCanvasElement;
    HTMLEmbedElement: typeof HTMLEmbedElement;

    SVGElement: typeof SVGElement;
    SVGTextContentElement: typeof SVGTextContentElement;

    HTMLStyleElement: typeof HTMLStyleElement;
    CSSStyleSheet: typeof CSSStyleSheet;
    CSSStyleRule: typeof CSSStyleRule;
    CSSStyleDeclaration: typeof CSSStyleDeclaration;
    CSSImportRule: typeof CSSImportRule;
    CSSMediaRule: typeof CSSMediaRule;

    HTMLTableElement: typeof HTMLTableElement;
    HTMLTableCellElement: typeof HTMLTableCellElement;
    HTMLTableRowElement: typeof HTMLTableRowElement;
    HTMLTableSectionElement: typeof HTMLTableSectionElement;
}

interface MutationObserver
{
    state: MidnightLizard.ContentScript.ObservationState;
}