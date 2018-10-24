/// <reference path="../DI/-DI.ts" />
/// <reference path="../Settings/-Settings.ts" />
/// <reference path="./Pseudos.ts" />
/// <reference path="../Utils/-Utils.ts" />
// /// <reference path="./WindowMessageBus.ts" />
/// <reference path="../Settings/Messages.ts" />

namespace MidnightLizard.ContentScript
{
    type CssPromise = Promise<Util.HandledPromiseResult<void>>;
    const x = Util.RegExpBuilder;
    type ArgEvent<TArgs> = MidnightLizard.Events.ArgumentedEvent<TArgs>;
    const ArgEventDispatcher = MidnightLizard.Events.ArgumentedEventDispatcher;
    const dom = Events.HtmlEvent;

    enum Var
    {
        id,
        tagName,
        className,
        notThisTagId,
        notThisClassNames
    }

    export abstract class IStyleSheetProcessor
    {
        abstract processDocumentStyleSheets(document: Document): void;
        abstract getElementMatchedSelectors(tag: Element | PseudoElement): string;
        abstract getPreFilteredSelectors(tag: Element): string[];
        abstract canHavePseudoClass(tag: Element, preFilteredSelectors: string[], pseudoClass: PseudoClass): boolean;
        abstract getSelectorsCount(doc: Document): number;
        abstract getSelectorsQuality(doc: Document): number | undefined;
        abstract getCssPromises(doc: Document): CssPromise[];
        abstract get onElementsForUserActionObservationFound(): ArgEvent<[PseudoClass, NodeListOf<Element>]>;
    }

    @DI.injectable(IStyleSheetProcessor)
    class StyleSheetProcessor implements IStyleSheetProcessor
    {
        private _storageIsAvailable = true;
        private readonly _selectorsStorageKey = "ml-selectors";
        private readonly _styleRefsStorageKey = "ml-style-refs";
        protected readonly _stylesLimit = 500;
        protected readonly _trimmedStylesLimit = 500;
        protected readonly _css: MidnightLizard.ContentScript.CssStyleKeys;
        private readonly _passedTransitionSelectors = new Set<string>();
        protected readonly _transitionForbiddenProperties: Set<string>;
        protected readonly _styleProps =
            [
                { prop: "background-color", priority: 1 },
                { prop: "color", priority: 1 },
                { prop: "fill", priority: 2 },
                { prop: "border-color", priority: 2 },
                { prop: "stroke", priority: 2 },
                { prop: "background-image", priority: 3 },
                { prop: "background-position", priority: 3 },
                { prop: "background-size", priority: 4 },
                { prop: "text-shadow", priority: 4 }
            ];
        private readonly _passedPseudoSelectors = new Set<string>();
        protected readonly _mediaQueries = new Map<string, boolean>();

        protected readonly _externalCssPromises = new Map<string, CssPromise>();
        getCssPromises(doc: Document)
        {
            return Array.from(this._externalCssPromises.values());
        }

        protected _selectors = new Array<string>();
        public getSelectorsCount(doc: Document) { return this._selectors.length; }

        protected _selectorsQuality?: number = undefined;
        public getSelectorsQuality(doc: Document) { return this._selectorsQuality; }

        protected _preFilteredSelectors = new Map<string, string[]>();
        protected readonly _preFilteredSelectorsCache = new Map<string, string[]>();
        protected _styleRefs = new Set<string>();
        protected readonly _styleRefsCache = new Set<string>();

        // protected readonly _excludeStylesRegExp: string;
        protected readonly _includeStylesRegExp: string;

        protected _onElementsForUserActionObservationFound = new ArgEventDispatcher<[PseudoClass, NodeListOf<Element>]>();
        public get onElementsForUserActionObservationFound()
        {
            return this._onElementsForUserActionObservationFound.event;
        }

        /** StyleSheetProcessor constructor
         * @param _app - application settings
         */
        constructor(rootDoc: Document, css: MidnightLizard.ContentScript.CssStyle,
            settingsManager: Settings.IBaseSettingsManager,
            private readonly _app: Settings.IApplicationSettings
            // , private readonly _windowMessageBus: MidnightLizard.ContentScript.IWindowMessageBus
        )
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

            //  this._excludeStylesRegExp = this.compileExcludeStylesRegExp();
            this._includeStylesRegExp = this.compileIncludeStylesRegExp();

            dom.addEventListener(rootDoc.defaultView, "unload", () =>
            {
                if (this._storageIsAvailable)
                {
                    try
                    {
                        if (this._preFilteredSelectors.size && this._styleRefs.size)
                        {
                            sessionStorage.setItem(this._selectorsStorageKey,
                                JSON.stringify(Array.from(this._preFilteredSelectors)));

                            sessionStorage.setItem(this._styleRefsStorageKey,
                                JSON.stringify(Array.from(this._styleRefs)));
                        }
                    }
                    catch (ex)
                    {
                        _app.isDebug && console.error(ex);
                    }
                }
            });

            try
            {
                const selectorsJsonData = sessionStorage.getItem(this._selectorsStorageKey);
                if (selectorsJsonData)
                {
                    const selArray = JSON.parse(selectorsJsonData) as [string, string[]][];
                    this._preFilteredSelectorsCache = new Map(selArray);
                }
                const styleRefsJsonData = sessionStorage.getItem(this._styleRefsStorageKey);
                if (styleRefsJsonData)
                {
                    const refsArray = JSON.parse(styleRefsJsonData) as string[];
                    this._styleRefsCache = new Set(refsArray);
                }
            }
            catch (ex)
            {
                this._storageIsAvailable = false;
                _app.isDebug && console.error(ex);
            }

            settingsManager.onSettingsChanged
                .addListener(() => this._passedPseudoSelectors.clear(), this);
        }

        protected compileExcludeStylesRegExp(): string
        {
            x.resetCapturingGroups();
            return x.completely(x.sometime(x.forget(
                x.sometime(x.forget(
                    // beginning of the current selector
                    x.succeededBy(x.Next(),
                        x.BeginningOfLine, x.any(x.outOfSet(x.Comma)), x.WhiteSpace,
                        x.OR,
                        x.Comma, x.any(x.outOfSet(x.Comma)), x.WhiteSpace,
                        x.OR,
                        x.BeginningOfLine
                    ),
                    x.succeededBy(x.Next(),
                        // anything before a dot
                        x.neverOrOnce(x.succeededBy(x.Next(), x.any(x.outOfSet(x.Dot, x.Comma, x.EndOfLine)))), x.Dot,
                        // followed by another className
                        x.$var(Var[Var.notThisClassNames]), x.some(x.Literal),
                        x.Or,
                        // another tagName
                        x.notFollowedBy(x.$var(Var[Var.tagName]), x.WordBoundary), x.some(x.Word),
                        x.Or,
                        // any tagName followed by another id
                        x.any(x.Word), x.Hash, x.$var(Var[Var.notThisTagId]), x.some(x.Literal), x.WordBoundary, x.notFollowedBy(x.Minus),
                        x.Or,
                        // any pseudo element
                        x.neverOrOnce(x.succeededBy(x.Next(), x.any(x.outOfSet(x.Colon, x.Comma, x.EndOfLine)))), x.exactly(2, x.Colon)
                    ),
                    // end of the current selector
                    x.any(x.outOfSet(x.Comma, x.WhiteSpace, x.EndOfLine)),
                    x.followedBy(x.Comma, x.Or, x.EndOfLine)
                ))
            )));
        }

        protected compileIncludeStylesRegExp()
        {
            return x.forget(
                x.forget(x.BeginningOfLine, x.Or, x.WhiteSpace),
                x.forget(
                    x.neverOrOnce(x.forget( // tagName
                        x.$var(Var[Var.tagName])
                    )),
                    x.neverOrOnce(x.forget( // #id
                        x.Hash, x.$var(Var[Var.id])
                    )),
                    x.anytime(x.forget( // .className1.className2
                        x.Dot, x.$var(Var[Var.className])
                    )),
                    x.WordBoundary, x.notFollowedBy( // end of literal
                        x.Minus
                    ),
                    x.Or,
                    x.neverOrOnce(x.forget( // "any tag name"
                        x.Asterisk
                    ))
                ),
                x.notFollowedBy( // exclude another tag names, ids and classes
                    x.some(x.Word)
                ),
                x.notFollowedBy( // exclude pseudo elements
                    x.exactly(2, x.Colon)
                ),
                x.any( // any attribute filters or pseudo classes
                    x.outOfSet(x.Comma, x.Dot, x.Hash, x.WhiteSpace, x.EndOfLine)
                ),
                // end of current selector or line
                x.followedBy(x.Comma, x.Or, x.EndOfLine)
            );
        }

        protected checkPropertyIsValuable(style: CSSStyleDeclaration, propName: string)
        {
            let propVal = style.getPropertyValue(propName);
            return propVal !== "" && propVal != "initial" && propVal != "inherited";
        }

        public processDocumentStyleSheets(doc: Document): void
        {
            const styleRefs = new Set<string>(), transitionSelectors = new Set<string>();
            let styleRefIsDone = false;
            let styleRefCssText = "";

            let styleRules = new Array<CSSStyleRule>();
            let styleSheets = Array.from(doc.styleSheets) as (CSSStyleSheet | CSSMediaRule)[];
            let cssRules: CSSRuleList | undefined;
            for (let sheet of styleSheets)
            {
                if (sheet)
                {
                    try { cssRules = sheet.cssRules; }
                    catch{ cssRules = undefined; }
                    if (cssRules)
                    {
                        if (cssRules.length > 0 && (sheet instanceof CSSMediaRule || !sheet.ownerNode || !(sheet.ownerNode as Element).mlIgnore))
                        {
                            if (sheet instanceof CSSStyleSheet && (
                                sheet.href || sheet.mlExternal ||
                                sheet.ownerNode instanceof HTMLElement && sheet.ownerNode.hasAttribute("ml-external")))
                            {
                                styleRefs.add(sheet.href || sheet.mlExternal ||
                                    (sheet.ownerNode as HTMLElement).getAttribute("ml-external")!);
                                styleRefIsDone = true;
                            }
                            else
                            {
                                styleRefIsDone = false;
                            }
                            styleRefCssText = "";
                            for (let rule of Array.from(cssRules))
                            {
                                if (rule instanceof CSSStyleRule)
                                {
                                    let style = rule.style;
                                    if (this._styleProps.some(p => !!style.getPropertyValue(p.prop)))
                                    {
                                        styleRules.push(rule);
                                        if (!styleRefIsDone)
                                        {
                                            styleRefCssText += rule.cssText;
                                        }
                                    }
                                    const transitionDuration = style.getPropertyValue(this._css.transitionDuration);
                                    if (transitionDuration && transitionDuration !== this._css._0s)
                                    {
                                        if (style.getPropertyValue(this._css.transitionProperty)
                                            .split(", ")
                                            .find(p => this._transitionForbiddenProperties.has(p)))
                                        {
                                            transitionSelectors.add(rule.selectorText);
                                        }
                                    }
                                }
                                else if (rule instanceof CSSImportRule)
                                {
                                    styleSheets.push(rule.styleSheet);
                                }
                                else if (rule instanceof CSSMediaRule)
                                {
                                    if (this.validateMediaQuery(doc, rule.conditionText))
                                    {
                                        styleSheets.push(rule);
                                    }
                                }
                            }
                            if (styleRefCssText)
                            {
                                styleRefs.add(Util.hashCode(styleRefCssText).toString());
                            }
                        }
                    }
                    else if (sheet instanceof CSSStyleSheet && sheet.href) // external css
                    {
                        // if (this._app.browserName === Settings.BrowserName.Firefox &&
                        //     sheet.ownerNode && sheet.ownerNode instanceof HTMLElement)
                        // {
                        //     this._windowMessageBus.postMessage(new Settings.FetchExternalCss(sheet.href));
                        // } else 
                        if (!this._externalCssPromises!.has(sheet.href))
                        {
                            let cssPromise = fetch(sheet.href, { cache: "force-cache" })
                                .then(response => response.text());
                            cssPromise.catch(ex => this._app.isDebug && console.error(`Error during css file download: ${(sheet as CSSStyleSheet).href}\nDetails: ${ex.message || ex}`));
                            this._externalCssPromises.set(
                                sheet.href,
                                Util.handlePromise(Promise.all([doc, cssPromise, sheet.href])
                                    .then(([d, css, href]) =>
                                    {
                                        let style = d.createElement('style');
                                        style.setAttribute("ml-external", href);
                                        style.innerText = css;
                                        style.disabled = true;
                                        (d.head || d.documentElement).appendChild(style);
                                        if (style.sheet)
                                        {
                                            style.sheet.mlExternal = href;
                                            style.sheet.disabled = true;
                                        }
                                    })));
                        }
                    }
                }
            }

            let maxPriority = 1;
            let filteredStyleRules = styleRules;
            if (transitionSelectors.size)
            {
                this.findElementsWithTransition(doc, transitionSelectors);
            }
            this.findElementsForUserActionObservation(doc, styleRules);
            this._styleProps.forEach(p => maxPriority = p.priority > maxPriority ? p.priority : maxPriority);
            let styleProps = this._styleProps;
            let selectorsQuality = maxPriority;
            while (maxPriority-- > 1 && filteredStyleRules.length > this._stylesLimit)
            {
                selectorsQuality--;
                styleProps = styleProps.filter(p => p.priority <= maxPriority);
                filteredStyleRules = filteredStyleRules.filter(r => styleProps.some(p => !!r.style.getPropertyValue(p.prop)));
            }

            if (filteredStyleRules.length > this._stylesLimit)
            {
                selectorsQuality = 0;
                let trimmer = (x: CSSStyleRule) =>
                    /active|hover|disable|check|visit|link|focus|select|enable/gi.test(x.selectorText);
                let trimmedStyleRules = styleRules.filter(trimmer);
                if (trimmedStyleRules.length > this._trimmedStylesLimit)
                {
                    filteredStyleRules = filteredStyleRules.filter(trimmer);
                }
                else
                {
                    filteredStyleRules = trimmedStyleRules;
                }
            }

            this._selectorsQuality = selectorsQuality;
            this._selectors = filteredStyleRules.map(sr => sr.selectorText);
            if (Util.firstSetIncludesAllElementsOfSecondSet(this._styleRefsCache, styleRefs))
            {
                this._styleRefs = this._styleRefsCache;
                this._preFilteredSelectors = this._preFilteredSelectorsCache;
            }
            else
            {
                this._styleRefs = styleRefs;
                this._preFilteredSelectors.clear();
            }
        }

        private findElementsWithTransition(doc: Document, transitionSelectors: Set<string>)
        {
            for (const selector of Util.sliceIntoChunks(Array
                .from(transitionSelectors), 50)
                .map(x => x.join(",")))
            {
                if (selector && !this._passedTransitionSelectors.has(selector))
                {
                    try
                    {
                        this._passedTransitionSelectors.add(selector);
                        doc.body.querySelectorAll(selector).forEach(tag =>
                            tag.hasTransitionDuration = true);
                    }
                    catch (ex)
                    {
                        this._app.isDebug && console.error(ex);
                    }
                }
            }
        }

        public findElementsForUserActionObservation(doc: Document, rules: Array<CSSStyleRule>)
        {
            for (const pseudoClass of Util.getEnumValues<PseudoClass>(PseudoClass))
            {
                const pseudoClassRegExp = this.getPseudoClassRegExp(pseudoClass);
                for (const selector of Util.sliceIntoChunks(Array.from(new Set(rules
                    .filter(rule => rule.selectorText.search(pseudoClassRegExp) !== -1)
                    .map(rule => rule.selectorText.replace(pseudoClassRegExp, "$1")))), 50)
                    .map(x => x.join(",")))
                {
                    if (selector && !this._passedPseudoSelectors.has(selector))
                    {
                        try
                        {
                            this._passedPseudoSelectors.add(selector);
                            const elements = doc.body.querySelectorAll(selector);
                            if (elements.length > 0)
                            {
                                this._onElementsForUserActionObservationFound.raise([pseudoClass, elements]);
                            }
                        }
                        catch (ex)
                        {
                            this._app.isDebug && console.error(ex);
                        }
                    }
                }
            }
        }

        public getElementMatchedSelectors(tag: Element | PseudoElement): string
        {
            if (tag instanceof PseudoElement)
            {
                return tag.selectors;
            }
            else
            {
                let preFilteredSelectors = this.getPreFilteredSelectors(tag);
                let wrongSelectors = new Array<string>();
                let result = preFilteredSelectors.filter((selector) =>
                {
                    try
                    {
                        return tag.matches(selector);
                    }
                    catch (ex)
                    {
                        wrongSelectors.push(selector);
                        this._app.isDebug && console.error(ex);
                        return false;
                    }
                });
                wrongSelectors.forEach(w => preFilteredSelectors!.splice(preFilteredSelectors!.indexOf(w), 1))
                return result.join("\n");
            }
        }

        public getPreFilteredSelectors(tag: Element): string[]
        {
            let key = `${tag.tagName}#${tag.id}.${tag.classList.toString()}`;
            let preFilteredSelectors = this._preFilteredSelectors.get(key);
            if (preFilteredSelectors === undefined)
            {
                let notThisClassNames = "", className = "";
                if (tag.classList && tag.classList.length > 0)
                {
                    // let classNameRegExp = (Array.prototype.map.call(tag.classList, (c: string) => x.escape(c)) as string[]).join(
                    //     x.WordBoundary + x.notFollowedBy(x.Minus) + x.Or) +
                    //     x.WordBoundary + x.notFollowedBy(x.Minus);
                    // notThisClassNames = x.notFollowedBy(classNameRegExp);
                    className = x.forget((Array.prototype.map.call(tag.classList, (c: string) => x.escape(c)) as string[]).join(x.Or));
                }
                let vars = new Map<string, string>();
                vars.set(Var[Var.id], x.escape(tag.id));
                vars.set(Var[Var.tagName], tag.tagName);
                vars.set(Var[Var.className], className);
                //vars.set(Var[Var.notThisTagId], tag.id ? x.notFollowedBy(tag.id + x.WordBoundary) : "");
                //vars.set(Var[Var.notThisClassNames], notThisClassNames);

                //let excludeRegExpText = x.applyVars(this._excludeStylesRegExp, vars);
                let includeRegExpText = x.applyVars(this._includeStylesRegExp, vars);

                //let excludeRegExp = new RegExp(excludeRegExpText, "i");
                let includeRegExp = new RegExp(includeRegExpText, "gi");
                //preFilteredSelectors = this._selectors.get(tag.ownerDocument)!.filter(selector => !excludeRegExp.test(selector));
                preFilteredSelectors = this._selectors.filter(selector => selector.search(includeRegExp) !== -1);
                this._preFilteredSelectors.set(key, preFilteredSelectors);
            }
            return preFilteredSelectors;
        }

        /**
         * Checks whether there are some rules in the style sheets with the specified {pseudoClass}
         * which might be valid for the specified {tag} at some time.
         **/
        public canHavePseudoClass(tag: Element, preFilteredSelectors: string[], pseudoClass: PseudoClass): boolean
        {
            let pseudoRegExp = this.getPseudoClassRegExp(pseudoClass);
            return preFilteredSelectors.some(s => s.search(pseudoRegExp) !== -1 && tag.matches(s.replace(pseudoRegExp, "$1")));
        }

        private getPseudoClassRegExp(pseudoClass: PseudoClass)
        {
            return new RegExp(x.remember(x.outOfSet(x.LeftParenthesis, x.WhiteSpace)) +
                x.Colon + PseudoClass[pseudoClass] + x.WordBoundary, "gi");
        }

        protected validateMediaQuery(doc: Document, mediaQuery: string)
        {
            let mediaResult = this._mediaQueries.get(mediaQuery);
            if (mediaResult === undefined)
            {
                mediaResult = doc.defaultView.matchMedia(mediaQuery).matches;
                this._mediaQueries.set(mediaQuery, mediaResult);
            }
            return mediaResult;
        }
    }
}