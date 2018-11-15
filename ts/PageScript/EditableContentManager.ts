/// <reference path="./Page.d.ts" />

namespace MidnightLizard.PageScript
{
    export class EditableContentManager
    {
        constructor() { }

        private readonly _newElementsObserverConfig: MutationObserverInit = {
            subtree: true, childList: true
        };

        public beginEditableContentHandling(doc: Document)
        {
            this.overrideCssStyleDeclaration(doc);

            doc.addEventListener("DOMContentLoaded", () =>
            {
                doc.querySelectorAll('[contenteditable="true"]').forEach(tag =>
                {
                    this.overrideInnerHtml(tag as HTMLElement);
                });
            });
            new MutationObserver(this.newElementsObserverCallback.bind(this))
                .observe(doc.documentElement!, this._newElementsObserverConfig);
        }

        private newElementsObserverCallback(mutations: MutationRecord[], observer: MutationObserver)
        {
            for (const mutation of mutations)
            {
                if (mutation.target instanceof HTMLElement &&
                    mutation.target.contentEditable === "true")
                {
                    this.overrideInnerHtml(mutation.target);
                }
            }
        }

        private overrideInnerHtml(tag: HTMLElement)
        {
            if (!tag.innerHtmlGetter)
            {
                tag.innerHtmlGetter = tag.__lookupGetter__<string>('innerHTML');
                Object.defineProperty(tag, "innerHTML", {
                    get: this.getInnerHtml.bind(this, tag),
                    set: tag.__lookupSetter__('innerHTML').bind(tag)
                });
            }
        }

        private getInnerHtml(tag: HTMLElement)
        {
            tag.dispatchEvent(new CustomEvent("before-get-inner-html", { bubbles: true }));
            const innerHtml = tag.innerHtmlGetter();
            tag.dispatchEvent(new CustomEvent("after-get-inner-html", { bubbles: false }));
            return innerHtml;
        }

        private overrideCssStyleDeclaration(doc: Document)
        {
            Object.defineProperty(doc.body.style.__proto__,
                "color", {
                    configurable: true,
                    get: this.getColor,
                    set: this.setColor
                });
        }

        private setColor(this: CSSStyleDeclaration, value: string)
        {
            this.setProperty("color", value);
        }

        private getColor(this: CSSStyleDeclaration)
        {
            return this.getPropertyValue("--original-color") ||
                this.getPropertyValue("color");
        }
    }
}