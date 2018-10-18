namespace MidnightLizard.ContentScript
{
    export enum PseudoStyleStandard
    {
        BackgroundImage,
        InvertedBackgroundImage
    }

    export enum PseudoClass
    {
        Hover,
        Focus,
        Active,
        Checked
    }

    export enum PseudoType
    {
        Before,
        After
    }

    type CSSStyleDeclarationKeys = { [K in keyof CSSStyleDeclaration]: CSSStyleDeclaration[K] | undefined }

    export class PseudoElementStyle
    {
        protected readonly _props = new Map<string, [string, string]>();
        constructor() { }
        public get cssText()
        {
            return Array.from(this._props)
                .map(([key, [value, priority]]) => `${key}:${value}${priority}`)
                .join(";");
        }
        setProperty(propertyName: string, value: string | null, priority?: string)
        {
            value
                ? this._props.set(propertyName, [value, (priority ? "!important" : "")])
                : this._props.delete(propertyName);
        }
        getPropertyValue(propertyName: string)
        {
            let [value] = this._props.get(propertyName) || [undefined];
            return value;
        }
    }

    export class PseudoElement
    {
        isPseudo = true;
        id: string;
        className: string;
        classList: string[];
        tagName: string;
        parentElement: Element;
        mlFixed?: string | null;
        mlComputedStyle: CSSStyleDeclaration;
        mlRect: ClientRect | null | undefined;
        mlArea?: number;
        mlPath: string | null | undefined;
        bgColor = "";
        style: PseudoElementStyle & CSSStyleDeclarationKeys;
        ownerDocument: Document;
        selectors = "";
        selectorText: string;
        stylePromise: Promise<string>;
        protected resolveCss!: (css: string) => void;
        getBoundingClientRect()
        {
            this.mlRect = this.parentElement.mlRect = this.parentElement.mlRect || this.parentElement.getBoundingClientRect();
            this.mlArea = this.mlRect.width * this.mlRect.height;
            return this.mlRect;
        }
        applyStyleChanges(standardCssText?: string)
        {
            const cssText = standardCssText === undefined ? this.style.cssText : standardCssText;
            let css = cssText === "" ? "" : `${this.selectorText}{${cssText}}`;
            this.resolveCss(css);
        }

        constructor(type: PseudoType, parent: Element, id: string, computedStyle: CSSStyleDeclaration, readonly parentRoomRules: RoomRules)
        {
            let typeName = PseudoType[type].toLowerCase();
            this.id = id;
            this.classList = [this.className = "::" + typeName];
            this.tagName = typeName;
            this.selectorText = `[${this.tagName}-style="${this.id}"]:not(impt)${this.className}`;
            this.parentElement = parent;
            this.mlComputedStyle = computedStyle;
            this.mlRect = parent.mlRect;
            this.style = new PseudoElementStyle() as PseudoElementStyle & CSSStyleDeclarationKeys;
            this.ownerDocument = parent.ownerDocument;
            this.stylePromise = new Promise((resolve, reject) => this.resolveCss = resolve);
        }
        currentFilter: string | null | undefined;
        originalFilter = null;
        originalTransitionDuration: string | null | undefined;
        originalBackgroundColor: string | null | undefined;
        originalDisplay: string | null | undefined;
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
    }
}