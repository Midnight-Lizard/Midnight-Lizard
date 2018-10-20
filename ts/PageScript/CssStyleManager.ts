/// <reference path="./Page.d.ts" />

namespace MidnightLizard.PageScript
{
    export class CssStyleManager
    {
        public overrideCssStyleDeclaration(doc: Document)
        {
            Object.defineProperty(doc.body.style.__proto__,
                "color", {
                    configurable: true,
                    get: this.getColor,
                    set: this.setColor
                });
        }

        protected setColor(this: CSSStyleDeclaration, value: string)
        {
            this.setProperty("color", value);
        }

        protected getColor(this: CSSStyleDeclaration)
        {
            return this.getPropertyValue("--original-color") ||
                this.getPropertyValue("color");
        }
    }
}
