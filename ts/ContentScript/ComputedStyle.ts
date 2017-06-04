namespace MidnightLizard.ContentScript
{
    const cc = Colors.Component;
    const maxSize = 50, maxAxis = 25;

    export class ComputedStyle
    {
        isSmall: boolean;
        height: number;
        width: number;
        area: number;
        rect: ClientRect;
        zIndex: string;
        position: string;
        backgroundColor: string;
        borderColor: string;
        borderStyle: string;
        stroke: string;
        mlBackgroundColorRole: keyof Colors.ComponentShift;
        textShadow: string;
        mlNoInvert: boolean;
        mlBackgroundImageRole: keyof Colors.ComponentShift;
        backgroundSize: string;
        backgroundImage: string;
        overflow: string;
        content: string;
        filter: string;
        mlImageRole: keyof Colors.ComponentShift;
        webkitAppearance: string;
        display: string;
        transitionProperty: string;
        public readonly transitionDuration: string;
        mlSmallSvgIsText: boolean;
        public readonly mlIgnore: boolean;
        public readonly beforeComputedStyle: ComputedStyle | undefined;
        public readonly afterComputedStyle: ComputedStyle | undefined;

        public readonly componentRoles = new Map<Colors.Component, Map<string, Colors.Component>>();
        public readonly propertyValues = new Map<string, string>();
        public readonly pseudoClasses = new Set<PseudoClass>();

        protected static readonly _css: MidnightLizard.ContentScript.CssStyleKeys = new CssStyle(document) as any;
        protected static readonly _components = Util.getEnumValues<Colors.Component>(Colors.Component);
        protected static readonly _pseudoClasses = Util.getEnumValues<PseudoClass>(PseudoClass);

        constructor(tag: Element | null, style?: CSSStyleDeclaration, parentElement?: Element)
        {
            const isSvg = tag && (tag instanceof SVGElement || tag instanceof tag.ownerDocument.defaultView.SVGElement);
            const ns = isSvg ? USP.svg : USP.htm;

            if (!style && tag)
            {
                style = tag.ownerDocument.defaultView.getComputedStyle(tag, "");
            }

            if (style)
            {
                this.mlIgnore = style.getPropertyValue("--ml-ignore") === true.toString();
                this.mlNoInvert = style.getPropertyValue("--ml-no-invert") === true.toString();
                this.mlSmallSvgIsText = style.getPropertyValue("--ml-small-svg-is-text") === true.toString();
                this.mlImageRole = style.getPropertyValue(`--ml-${cc[cc.Image].toLowerCase()}`) as keyof Colors.ComponentShift;
                this.mlBackgroundImageRole = style.getPropertyValue(`--ml-${cc[cc.BackgroundImage].toLowerCase()}`) as keyof Colors.ComponentShift;
                this.mlBackgroundColorRole = style.getPropertyValue(`--ml-${cc[cc.Background].toLowerCase()}-${$this._css.backgroundColor}`) as keyof Colors.ComponentShift

                this.transitionDuration = style.transitionDuration!;
                this.transitionProperty = style.transitionProperty!;
                this.display = style.display!;
                this.webkitAppearance = style.webkitAppearance!;
                this.filter = style.filter!;
                this.overflow = style.overflow!;
                this.backgroundImage = style.backgroundImage!;
                this.backgroundSize = style.backgroundSize!;
                this.backgroundColor = style.getPropertyValue(ns.css.bgrColor)!;
                this.textShadow = style.textShadow!;
                this.stroke = style.stroke!;
                this.borderStyle = style.borderStyle!
                this.borderColor = style.getPropertyValue(ns.css.brdColor)!;
                this.position = style.position!;
                this.zIndex = style.zIndex!;

                this.rect = (tag || parentElement)!.getBoundingClientRect();
                this.width = this.rect.width;
                this.height = this.rect.height;

                const props = [
                    ns.css.bgrColor, ns.css.fntColor, ns.css.brdColor, $this._css.borderTopColor,
                    $this._css.borderRightColor, $this._css.borderBottomColor, $this._css.borderLeftColor
                ];

                for (let prop of props)
                {
                    this.propertyValues.set(prop, style.getPropertyValue(prop));
                }

                for (let role of $this._components)
                {
                    const propRoles = new Map<string, Colors.Component>();
                    for (let prop of props)
                    {
                        const val = (cc as any as { [p: string]: Colors.Component })[style.getPropertyValue(`--ml-${cc[role].toLowerCase()}-${prop}`)];
                        val !== undefined && propRoles.set(prop, val);
                    }
                    this.componentRoles.set(role, propRoles);
                }

                for (let pseudoClass of $this._pseudoClasses)
                {
                    if (style.getPropertyValue(`--ml-pseudo-${PseudoClass[pseudoClass].toLowerCase()}`) === true.toString())
                    {
                        this.pseudoClasses.add(pseudoClass);
                    }
                }

                if (!tag)
                {
                    this.content = style.content!;
                    let width = parseInt(style.width!), height = parseInt(style.height!);
                    if (!isNaN(width) && width > 0)
                    {
                        this.width = width;
                    }
                    if (!isNaN(height) && height > 0)
                    {
                        this.height = height;
                    }
                }
                this.area = this.width * this.height;
                this.isSmall = this.width > 0 && this.height > 0 && (this.width < maxSize && this.height < maxSize || this.width < maxAxis || this.height < maxAxis);
            }

            if (tag)
            {
                const doc = tag.ownerDocument;
                const beforeStyle = doc.defaultView.getComputedStyle(tag, ":before");
                if (beforeStyle && beforeStyle.content)
                {
                    this.beforeComputedStyle = new ComputedStyle(null, beforeStyle, tag);
                }
                const afterStyle = doc.defaultView.getComputedStyle(tag, ":after");
                if (afterStyle && afterStyle.content)
                {
                    this.afterComputedStyle = new ComputedStyle(null, afterStyle, tag);
                }

                //tag.computedStyle = this;
            }
        }
    }
    const $this = ComputedStyle;
}