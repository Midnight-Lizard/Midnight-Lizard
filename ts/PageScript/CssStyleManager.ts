namespace MidnightLizard.PageScript
{
    export class CssStyleManager
    {
        public overrideCssStyleDeclaration(doc: Document)
        {
            let style = (doc.defaultView as any).CSSStyleDeclaration.prototype as CSSStyleDeclaration;
            Object.defineProperty(style, "color",
                {
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
            let originalColor = this.getPropertyValue("--original-color");
            return originalColor || this.getPropertyValue("color");
        }
    }
}