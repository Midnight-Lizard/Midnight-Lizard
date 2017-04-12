/// <reference path="../DI/-DI.ts" />
/// <reference path="../Settings/-Settings.ts" />
/// <reference path="./Pseudos.ts" />
/// <reference path="../Utils/-Utils.ts" />

namespace MidnightLizard.ContentScript
{

    type CssPromise = Promise<Util.HandledPromiseResult<void>>;
    const x = Util.RegExpBuilder;

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
        abstract getCssPromises(doc: Document): IterableIterator<CssPromise>;
    }

    @DI.injectable(IStyleSheetProcessor)
    class StyleSheetProcessor implements IStyleSheetProcessor
    {
        protected readonly _stylesLimit = 500;
        protected readonly _trimmedStylesLimit = 500;
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

        protected readonly _externalCssPromises = new WeakMap<Document, Map<string, CssPromise>>();
        getCssPromises(doc: Document): IterableIterator<Promise<Util.HandledPromiseResult<void>>>
        {
            let promises = this._externalCssPromises.get(doc);
            return promises ? promises.values() : [] as any;
        }

        protected readonly _selectors = new WeakMap<Document, string[]>();
        public getSelectorsCount(doc: Document) { return (this._selectors.get(doc) || []).length }

        protected readonly _selectorsQuality = new WeakMap<Document, number>();
        public getSelectorsQuality(doc: Document) { return this._selectorsQuality.get(doc) }

        protected readonly _preFilteredSelectors = new WeakMap<Document, Map<string, string[]>>();

        protected readonly _excludeStylesRegExp: string;
        protected readonly _includeStylesRegExp: string;

        /** StyleSheetProcessor constructor
         * @param _app - application settings
         */
        constructor(protected readonly _app: Settings.IApplicationSettings)
        {
            //  this._excludeStylesRegExp = this.compileExcludeStylesRegExp();
            this._includeStylesRegExp = this.compileIncludeStylesRegExp();
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
                x.neverOrOnce(x.forget( // tagName
                    x.$var(Var[Var.tagName])
                )),
                x.neverOrOnce(x.forget( // #id
                    x.Hash, x.$var(Var[Var.id]),
                )),
                x.anytime(x.forget( // .className1.className2
                    x.Dot, x.forget(x.$var(Var[Var.className])),
                )),
                x.WordBoundary, x.notFollowedBy( // end of literal
                    x.Minus
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
            let externalCssPromises = this._externalCssPromises.get(doc);
            if (externalCssPromises === undefined)
            {
                this._externalCssPromises.set(doc, externalCssPromises = new Map<string, CssPromise>());
            }
            this._preFilteredSelectors.delete(doc);
            let styleRules = new Array<CSSStyleRule>();
            let styleSheets = Array.from(doc.styleSheets) as CSSStyleSheet[];
            for (let sheet of styleSheets)
            {
                if (sheet)
                {
                    if (sheet.cssRules)
                    {
                        if (sheet.cssRules.length > 0 && (!sheet.ownerNode || !(sheet.ownerNode as Element).mlIgnore))
                        {
                            for (let rule of Array.from(sheet.cssRules) as CSSRule[])
                            {
                                if (rule instanceof doc.defaultView.CSSStyleRule)
                                {
                                    let style = rule.style;
                                    if (this._styleProps.some(p => this.checkPropertyIsValuable(style, p.prop)))
                                    {
                                        styleRules.push(rule);
                                    }
                                }
                                else if (rule instanceof doc.defaultView.CSSImportRule)
                                {
                                    styleSheets.push(rule.styleSheet);
                                }
                            }
                        }
                    }
                    else if (sheet.href) // external css
                    {
                        if (!externalCssPromises!.has(sheet.href))
                        {
                            let cssPromise = fetch(sheet.href, { cache: "force-cache" }).then(response => response.text());
                            cssPromise.catch(ex => this._app.isDebug && console.error(`Error during css file download: ${sheet.href}\nDetails: ${ex.message || ex}`));
                            externalCssPromises.set(
                                sheet.href,
                                Util.handlePromise(Promise.all([doc, cssPromise, externalCssPromises!, sheet.href])
                                    .then(([d, css, extCss, href]) => 
                                    {
                                        let style = d.createElement('style');
                                        style.title = `MidnightLizard Cross Domain CSS Import From ${href}`;
                                        style.innerText = css;
                                        style.disabled = true;
                                        (d.head || d.documentElement).appendChild(style);
                                        style.sheet.disabled = true;
                                    })));
                        }
                    }
                }
            }

            let maxPriority = 1;
            let filteredStyleRules = styleRules;
            this._styleProps.forEach(p => maxPriority = p.priority > maxPriority ? p.priority : maxPriority);
            let styleProps = this._styleProps;
            let selectorsQuality = maxPriority;
            while (maxPriority-- > 1 && filteredStyleRules.length > this._stylesLimit)
            {
                selectorsQuality--;
                styleProps = styleProps.filter(p => p.priority <= maxPriority);
                filteredStyleRules = filteredStyleRules.filter(r => styleProps.some(p => this.checkPropertyIsValuable(r.style, p.prop)));
            }

            if (filteredStyleRules.length > this._stylesLimit)
            {
                selectorsQuality = 0;
                let trimmer = (x: CSSStyleRule) =>
                    /active|hover|disable|check|visit|link|focus|select|enable/gi.test(x.selectorText) &&
                    !/::scrollbar/gi.test(x.selectorText);
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

            this._selectorsQuality.set(doc, selectorsQuality);
            this._selectors.set(doc, filteredStyleRules.map(sr => sr.selectorText));
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
            let map = this._preFilteredSelectors.get(tag.ownerDocument);
            if (map === undefined)
            {
                map = new Map<string, string[]>();
                this._preFilteredSelectors.set(tag.ownerDocument, map);
            }
            let preFilteredSelectors = map.get(key);
            if (preFilteredSelectors === undefined)
            {
                let notThisClassNames = "", className = "";
                if (tag.classList && tag.classList.length > 0)
                {
                    // let classNameRegExp = (Array.prototype.map.call(tag.classList, (c: string) => x.escape(c)) as string[]).join(
                    //     x.WordBoundary + x.notFollowedBy(x.Minus) + x.Or) +
                    //     x.WordBoundary + x.notFollowedBy(x.Minus);
                    // notThisClassNames = x.notFollowedBy(classNameRegExp);
                    className = (Array.prototype.map.call(tag.classList, (c: string) => x.escape(c)) as string[]).join(x.Or)
                }
                let vars = new Map<string, string>();
                vars.set(Var[Var.id], tag.id);
                vars.set(Var[Var.tagName], tag.tagName);
                vars.set(Var[Var.className], className);
                //vars.set(Var[Var.notThisTagId], tag.id ? x.notFollowedBy(tag.id + x.WordBoundary) : "");
                //vars.set(Var[Var.notThisClassNames], notThisClassNames);

                //let excludeRegExpText = x.applyVars(this._excludeStylesRegExp, vars);
                let includeRegExpText = x.applyVars(this._includeStylesRegExp, vars);

                //let excludeRegExp = new RegExp(excludeRegExpText, "i");
                let includeRegExp = new RegExp(includeRegExpText, "gi");
                //preFilteredSelectors = this._selectors.get(tag.ownerDocument)!.filter(selector => !excludeRegExp.test(selector));
                preFilteredSelectors = this._selectors.get(tag.ownerDocument)!.filter(selector => selector.search(includeRegExp) !== -1);
                map.set(key, preFilteredSelectors);
            }
            return preFilteredSelectors;
        }

        /**
         * Checks whether there are some rulles in the style sheets with the specified {pseudoClass}
         * which might be valid for the specified {tag} at some time.
         **/
        public canHavePseudoClass(tag: Element, preFilteredSelectors: string[], pseudoClass: PseudoClass): boolean
        {
            let pseudoClassName = PseudoClass[pseudoClass],
                pseudoRegExp = new RegExp(
                    x.remember(x.outOfSet(x.LeftParenthesis, x.WhiteSpace)) +
                    x.Colon + pseudoClassName + x.WordBoundary,
                    "gi");
            return preFilteredSelectors.some(s => s.search(pseudoRegExp) !== -1 && tag.matches(s.replace(pseudoRegExp, "$1")));
        }
    }
}