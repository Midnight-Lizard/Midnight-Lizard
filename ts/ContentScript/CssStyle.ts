/// <reference path="../DI/-DI.ts" />

namespace MidnightLizard.ContentScript
{
    /** Unified Style Properties */
    export const USP =
        {
            htm:
            {
                dom:
                {
                    bgrColor: "backgroundColor",
                    brdColor: "borderColor",
                    fntColor: "color",
                    shdColor: "textShadow"
                },
                css:
                {
                    bgrColor: "background-color",
                    brdColor: "border-color",
                    fntColor: "color",
                    shdColor: "text-shadow"
                },
                img: "IMG"
            },
            svg:
            {
                dom:
                {
                    bgrColor: "fill",
                    brdColor: "stroke",
                    fntColor: "fill",
                    shdColor: "textShadow"
                },
                css:
                {
                    bgrColor: "fill",
                    brdColor: "stroke",
                    fntColor: "fill",
                    shdColor: "text-shadow"
                },
                img: "image"
            }
        };

    export type CssStyleKeys =
        {
            /** Returns CSS-valid style property name */
            [K in keyof (CSSStyleDeclaration & CssConstants)]: string
        }

    class CssConstants
    {
        _0px = "0px";
        _0s = "0s";
        _200ms = "200ms";
        all = "all";
        none = "none";
        important = "important";
        px = "px";
        fixed = "fixed";
        absolute = "absolute";
        relative = "relative";
        hidden = "hidden";
        originalColor = "--original-color";
        linkColor = "--link-color";
        visitedColor = "--visited-color";
        linkColorHover = "--link-color-hover";
        visitedColorHover = "--visited-color-hover";
        linkColorActive = "--link-color-active";
        visitedColorActive = "--visited-color-active";
    }

    @DI.injectable()
    export class CssStyle extends CssConstants
    {
        [prop: string]: string;
        constructor(doc: Document)
        {
            super();
            for (let prop in doc.documentElement.style)
            {
                this[prop] = prop.replace(/([A-Z])/g, "-$1").toLowerCase();
            }
        }
    }
}