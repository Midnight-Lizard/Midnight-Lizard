/// <reference path="../Colors/ColorEntry.ts" />
/// <reference path="../Events/-ts" />
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
    mlOrder: ProcessingOrder | undefined;
    mlRowNumber: number | undefined;
    /** If true - Midnight Lizard would not process this element */
    mlIgnore: boolean | null | undefined;
    mlFixed?: string | null;
    /** Calculated background color */
    mlBgColor: ColorEntry | null | undefined;
    /** Calculated font color */
    mlColor: ColorEntry | null | undefined;
    // mlEditableContentColor: string | null | undefined;
    // mlEditableContentBackgroundColor: string | null | undefined;
    /** Calculated parent background color */
    mlParentBgColor: ColorEntry | null | undefined;
    /** Calculated text shadow color */
    mlTextShadow: ColorEntry | null | undefined;
    ////////////////////////////////////////////////////////////////
    /** Real Node is not a pseudo element */
    isPseudo: false;
    /** Determinse whether element is observed or not*/
    isObserved: boolean | undefined;
    isEditableContent?: boolean;
    alwaysRecalculateStyles?: boolean;
    /** Occurs when IDocumentProcessor applies RoomRules on this element */
    onRoomRulesApplied: ArgumentedEventDispatcher<RoomRules>;
    /** cache of getBoundingClientRect call results */
    mlRect: ClientRect | null | undefined;
    /** Computed z-index */
    zIndex: number | undefined;
    /** Concatinated into the string list of matched css selectors */
    mlSelectors: string | null | undefined;
    /** cache of getComputedStyle call results */
    mlComputedStyle: CSSStyleDeclaration | undefined | null;
    /** area of the element */
    mlArea: number | undefined;
    /** Element path in the DOM tree */
    mlPath: string | undefined | null;
    /** is true if this element has been verified as suitable for the processing */
    isChecked: boolean | null | undefined;
    /** true when mutation observer detected `fill` or `stroke` attributes changes */
    mlSvgAttributeChanged?: boolean | null;
    ////////////////////////////////////////////////////////////////
    //////////////////// original values ///////////////////////////
    ////////////////////////////////////////////////////////////////
    currentFilter: string | null | undefined;
    originalFilter: string | null | undefined;
    keepFilter: boolean | undefined;
    originalTransitionProperty: string | null | undefined;
    hasTransition?: boolean;
    originalBackgroundColor: string | null | undefined;
    // originalEditableContentBackgroundColor: string | null | undefined;
    originalDisplay: string | null | undefined;
    // originalEditableContentColor: string | null | undefined;
    originalColor: string | null | undefined;
    originalTextShadow: string | null | undefined;
    originalBorderColor: string | null | undefined;
    originalBorderTopColor: string | null | undefined;
    originalBorderRightColor: string | null | undefined;
    originalBorderBottomColor: string | null | undefined;
    originalBorderLeftColor: string | null | undefined;
    originalBackgroundImage: string | null | undefined;
}

interface HTMLInputElement
{
    labelElement: HTMLLabelElement | undefined;
}

interface StyleSheet
{
    mlExternal?: string | null;
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
    state: ObservationState;
}