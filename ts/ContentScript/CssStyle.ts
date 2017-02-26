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
                img: "IMAGE"
            }
        };

    export type CssStyleKeys =
        {
            /** Returns CSS-valid style property name */
            [K in keyof (CSSStyleDeclaration & CssConstants)]: string
        }

    class CssConstants
    {
        all = "all";
        none = "none";
        important = "important";
        zeroSec = "0s";
        "px" = "px";
        "fixed" = "fixed";
        "absolute" = "absolute";
        "relative" = "relative";
        "hidden" = "hidden";
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