/// <reference path="./Page.d.ts" />

namespace MidnightLizard.PageScript
{
    export class CssStyleManager
    {
        public overrideCssStyleDeclaration()
        {
            Object.defineProperty(CSSStyleDeclaration.prototype,
                "color", {
                    get: this.getColor,
                    set: this.setColor
                });
            // CSSStyleDeclaration.prototype.__defineGetter__('color', this.getColor);
            // CSSStyleDeclaration.prototype.__defineSetter__('color', this.setColor);
        }

        protected setColor(this: CSSStyleDeclaration, value: string)
        {
            this.setProperty("color", value);
        }

        protected getColor(this: CSSStyleDeclaration)
        {
            let originalColor = this.getPropertyValue("--original-color");
            return originalColor || this.getPropertyValue("color");
        }
    }
}
