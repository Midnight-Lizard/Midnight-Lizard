namespace MidnightLizard.PageScript
{
    const externalAttribute = "ml-external";
    export class ExternalCssLoader
    {
        private rootDoc!: Document;
        protected readonly _externalCssUrls = new Set<string>();
        protected readonly _externalObserver: MutationObserver;
        protected readonly _externalObserverConfig: MutationObserverInit = {
            attributes: true, subtree: true, attributeFilter: [externalAttribute]
        };
        constructor()
        {
            this._externalObserver = new MutationObserver(this.onCssMarkedAsExternal.bind(this));
        }

        public beginExternalCssObservation(doc: Document)
        {
            this.rootDoc = doc;
            const cs = doc.defaultView.getComputedStyle(doc.documentElement, undefined);
            if (cs && cs.getPropertyValue("--ml-browser") === "Firefox")
            {
                this._externalObserver.observe(doc.head, this._externalObserverConfig);
                for (const link of Array.from(doc.head.querySelectorAll(`[${externalAttribute}]`)))
                {
                    this.processExternalCss(link);
                }
            }
        }

        protected onCssMarkedAsExternal(mutations: MutationRecord[], observer: MutationObserver)
        {
            mutations.forEach(mutation =>
            {
                if (mutation.type === "attributes" && mutation.attributeName === externalAttribute &&
                    mutation.target instanceof Element)
                {
                    this.processExternalCss(mutation.target);
                }
            });
        }

        private processExternalCss(link: Element)
        {
            const externalCssUrl = link.getAttribute(externalAttribute);
            if (externalCssUrl && !this._externalCssUrls.has(externalCssUrl))
            {
                this._externalCssUrls.add(externalCssUrl);
                fetch(externalCssUrl, { cache: "force-cache" })
                    .then(response => response.text())
                    .then(css =>
                    {
                        let style = this.rootDoc.createElement('style');
                        style.title = `MidnightLizard Cross Domain CSS Import From ${externalCssUrl}`;
                        style.innerText = css;
                        style.disabled = true;
                        this.rootDoc.head.appendChild(style);
                        style.sheet!.disabled = true;
                    })
                    .catch(ex =>
                    {
                        // console.error(`Error during css file download: ${externalCssUrl}\nDetails: ${ex.message || ex}`)
                    });
            }
        }
    }
}