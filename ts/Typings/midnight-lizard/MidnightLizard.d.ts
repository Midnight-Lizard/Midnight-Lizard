/// <reference path="../../Colors/ColorEntry.ts" />
/// <reference path="../../Events/-Events.ts" />
/// <reference path="../../ContentScript/-ContentScript.ts" />

interface Document
{
    mlPseudoStyles: HTMLStyleElement | undefined;
    viewArea: number | undefined;
}

interface Node
{
    /** If true - Midnight Lizard would not process this element */
    mlIgnore: boolean | null | undefined;
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
    /** Occurs when IDocumentProcessor applies RoomRules on this element */
    onRoomRulesApplied: MidnightLizard.Events.ArgumentedEventDispatcher<MidnightLizard.ContentScript.RoomRules>;
    /** cache of getBoundingClientRect call results */
    rect: ClientRect | null | undefined;
    /** Computed z-index */
    zIndex: number | undefined;
    /** Concatinated into the string list of matched css selectors */
    selectors: string | null | undefined;
    /** cache of getComputedStyle call results */
    computedStyle: CSSStyleDeclaration | undefined | null;
    /** area of the element */
    area: number | undefined | null;
    /** Element path in the DOM tree */
    path: string | undefined | null;
    /** Legacy background attribute */
    // bgColor: string | null | undefined;
    /** is true if this element has been verified as suitable for the processing */
    isChecked: boolean | null | undefined;
    ////////////////////////////////////////////////////////////////
    //////////////////// original values ///////////////////////////
    ////////////////////////////////////////////////////////////////
    originalFilter: string | null | undefined;
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
    originalOpacity: string | null | undefined;
    originalBackgroundImage: string | null | undefined;
    originalBackgroundSize: string | null | undefined;
    ////////////////////////////////////////////////////////////////
    __lookupGetter__<T>(propertyName: string): () => T;
    __lookupSetter__<T>(propertyName: string): (value: T) => void;
    innerHtmlGetter: () => string;
    innerHtmlCache: { value: string, timestamp: number };
}

interface Window
{
    Element: typeof Element;
    HTMLElement: typeof HTMLElement;
    HTMLInputElement: typeof HTMLInputElement;
    HTMLIFrameElement: typeof HTMLIFrameElement;
    HTMLCanvasElement: typeof HTMLCanvasElement;

    SVGElement: typeof SVGElement;
    SVGTextContentElement: typeof SVGTextContentElement;

    HTMLStyleElement: typeof HTMLStyleElement;
    CSSStyleRule: typeof CSSStyleRule;
    CSSImportRule: typeof CSSImportRule;

    HTMLTableElement: typeof HTMLTableElement;
    HTMLTableCellElement: typeof HTMLTableCellElement;
    HTMLTableRowElement: typeof HTMLTableRowElement;
    HTMLTableSectionElement: typeof HTMLTableSectionElement;
}

interface MutationObserver
{
    state: MidnightLizard.ContentScript.ObservationState;
}