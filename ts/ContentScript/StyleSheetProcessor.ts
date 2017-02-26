/// <reference path="../DI/-DI.ts" />
/// <reference path="../Settings/-Settings.ts" />
/// <reference path="./Pseudos.ts" />
/// <reference path="../Utils/-Utils.ts" />

namespace MidnightLizard.ContentScript
{

    let x = Util.RegExpBuilder;

    enum Var
    {
        tagName,
        notThisTagId,
        notThisClassNames
    }

    export abstract class IStyleSheetProcessor
    {
        abstract processDocumentStyleSheets(document: Document): void;
        abstract getElementMatchedSelectors(tag: Element | PseudoElement): string;
        abstract canHavePseudoClass(tag: Element, pseudoClass: PseudoClass): boolean;
        abstract getSelectorsCount(doc: Document): number;
        abstract getSelectorsQuality(doc: Document): number | undefined;
    }

    @DI.injectable(IStyleSheetProcessor)
    class StyleSheetProcessor
    {
        protected readonly _stylesLimit = 300;
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
        protected readonly _selectors = new WeakMap<Document, string[]>();
        public getSelectorsCount(doc: Document) { return (this._selectors.get(doc) || []).length }

        protected readonly _selectorsQuality = new WeakMap<Document, number>();
        public getSelectorsQuality(doc: Document) { return this._selectorsQuality.get(doc) }

        protected readonly _preFilteredSelectors = new WeakMap<Document, Map<string, string[]>>();

        protected readonly _excludeStylesRegExp: string;

        /** StyleSheetProcessor constructor
         * @param _app - application settings
         */
        constructor(protected readonly _app: Settings.IApplicationSettings)
        {
            this._excludeStylesRegExp = this.compileExcludeStylesRegExp();
        }

        protected compileExcludeStylesRegExp(): string
        {
            return x.completely(x.forget(
                // global pseudo elements
                x.exactly(2, x.Colon), x.some(x.Whatever),
                x.OR,
                x.sometime(x.forget(
                    x.sometime(x.forget(
                        // beginning of the current selector
                        x.forget(
                            x.any(x.outOfSet(x.Comma)), x.WhiteSpace,
                            x.OR, x.BeginningOfLine
                        ),
                        x.forget(
                            x.forget(
                                // another tagName followed by any id
                                x.notFollowedBy(x.$var(Var[Var.tagName]), x.WordBoundary),
                                x.some(x.Word),
                                x.neverOrOnce(x.forget(x.Hash, x.some(x.Literal))),
                                x.OR,
                                // any tagName followed by another id
                                x.any(x.Word), x.Hash, x.$var(Var[Var.notThisTagId]), x.some(x.Literal)
                            ),
                            // any classes
                            x.anytime(x.forget(x.Dot, x.some(x.Literal))),
                            x.OR,
                            // any tagName or id
                            x.noneOrOne(x.Hash), x.any(x.Literal),
                            // followed by another className
                            x.sometime(x.forget(
                                x.$var(Var[Var.notThisClassNames]),
                                x.forget(x.Dot, x.some(x.Literal)),
                                x.$var(Var[Var.notThisClassNames])
                            )),
                        ),
                        // pseudo classes or pseudo elements or attribute filters
                        x.anytime(x.forget(
                            x.SomethingInBrackets, x.Or,
                            x.strictly(1, 2, x.Colon), x.some(x.Literal),
                            x.neverOrOnce(x.forget(x.SomethingInParentheses))
                        ))
                    )),
                    x.forget(x.Comma, x.Or, x.EndOfLine)
                ))
            ));
        }

        protected checkPropertyIsValuable(style: CSSStyleDeclaration, propName: string)
        {
            let propVal = style.getPropertyValue(propName);
            return propVal !== "" && propVal != "initial" && propVal != "inherited";
        }

        public processDocumentStyleSheets(document: Document): void
        {
            this._preFilteredSelectors.delete(document);
            let styleRules = new Array<CSSStyleRule>();
            let styles = Array.prototype.slice.call(document.styleSheets) as CSSStyleSheet[];
            for (let sheet = 0; sheet < styles.length; sheet++)
            {
                if (styles[sheet].cssRules && styles[sheet].cssRules.length > 0 &&
                    (!styles[sheet].ownerNode || (styles[sheet].ownerNode as Element).id != "mlScrollbarStyle"))
                {
                    let rules = Array.prototype.slice.call(styles[sheet].cssRules) as CSSRule[];
                    rules.forEach(rule =>
                    {
                        if (rule instanceof document.defaultView.CSSStyleRule)
                        {
                            let style = rule.style;
                            if (this._styleProps.some(p => this.checkPropertyIsValuable(style, p.prop)))
                            {
                                styleRules.push(rule);
                            }
                        }
                        else if (rule instanceof document.defaultView.CSSImportRule)
                        {
                            styles.push(rule.styleSheet);
                        }
                    });
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
                if (trimmedStyleRules.length > this._stylesLimit)
                {
                    filteredStyleRules = filteredStyleRules.filter(trimmer);
                }
                else
                {
                    filteredStyleRules = trimmedStyleRules;
                }
            }

            this._selectorsQuality.set(document, selectorsQuality);
            this._selectors.set(document, filteredStyleRules.map(sr => sr.selectorText));
        }

        public getElementMatchedSelectors(tag: Element | PseudoElement): string
        {
            if (tag instanceof PseudoElement)
            {
                return tag.selectors;
            }
            else
            {
                let className: string = tag instanceof tag.ownerDocument.defaultView.SVGElement ? tag.className.baseVal : tag.className;
                let key = `${tag.tagName}#${tag.id}.${className}`;
                let map = this._preFilteredSelectors.get(tag.ownerDocument);
                if (map === undefined)
                {
                    map = new Map<string, string[]>();
                    this._preFilteredSelectors.set(tag.ownerDocument, map);
                }
                let preFilteredSelectors = map.get(key);
                if (preFilteredSelectors === undefined)
                {
                    let notThisClassNames = "";
                    if (className)
                    {
                        let classNameRegExp: string = "";
                        let spaces = className.match(/\s+/g);
                        if (spaces)
                        {
                            if (spaces.length > 3)
                            {
                                classNameRegExp = x.Dot + x.Literal; // skip real class name and assume any class
                            }
                            else
                            {
                                classNameRegExp = x.Dot + x.escape(className)
                                    .replace(/\s+/g, x.WordBoundary + x.outOfSet(x.Minus) + x.Or + x.Dot) + x.WordBoundary + x.outOfSet(x.Minus);
                            }
                        }
                        else
                        {
                            classNameRegExp = x.Dot + x.escape(className) + x.WordBoundary + x.outOfSet(x.Minus);
                        }
                        notThisClassNames = x.notFollowedBy(classNameRegExp);
                    }
                    let vars = new Map<string, string>();
                    vars.set(Var[Var.tagName], tag.tagName);
                    vars.set(Var[Var.notThisTagId], tag.id ? x.notFollowedBy(tag.id + x.WordBoundary) : "");
                    vars.set(Var[Var.notThisClassNames], notThisClassNames);

                    let excludeRegExpText = x.applyVars(this._excludeStylesRegExp, vars);

                    let excludeRegExp = new RegExp(excludeRegExpText, "i");
                    preFilteredSelectors = this._selectors.get(tag.ownerDocument) !.filter(selector => !excludeRegExp.test(selector));
                    map.set(key, preFilteredSelectors);
                }
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

        /**
         * Checks whether there are some rulles in the style sheets with the specified {pseudoClass}
         * which might be valid for the specified {tag} at some time.
         **/
        public canHavePseudoClass(tag: Element, pseudoClass: PseudoClass): boolean
        {
            let className = tag instanceof tag.ownerDocument.defaultView.SVGElement ? tag.className.baseVal : tag.className;
            let key = `${tag.tagName}#${tag.id}.${className}`;
            let preFilteredSelectors = this._preFilteredSelectors.get(tag.ownerDocument) !.get(key);
            if (preFilteredSelectors)
            {
                let pseudoClassName = PseudoClass[pseudoClass],
                    filter = new RegExp(x.NotWhiteSpace + x.Colon + pseudoClassName + x.WordBoundary, "gi"),
                    cutter = new RegExp(x.followedBy(x.NotWhiteSpace) + x.Colon + pseudoClassName + x.WordBoundary, "gi");
                return preFilteredSelectors.some(s => filter.test(s) && tag.matches(s.replace(cutter, "")));
            }
            else return false;
        }
    }
}