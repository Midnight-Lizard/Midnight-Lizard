namespace MidnightLizard.PageScript
{
    const externalAttribute = "ml-external";
    export class ExternalCssLoader
    {
        private readonly _externalCssUrls = new Set<string>();
        constructor() { }

        public beginExternalCssObservation(doc: Document)
        {
            doc.defaultView.addEventListener("message", (e) =>
            {
                if (e.data && e.data.type === "FetchExternalCss")
                {
                    this.processExternalCss(e.data.externalCssUrl, doc);
                }
            });
        }

        private processExternalCss(externalCssUrl: string, doc: Document)
        {
            if (externalCssUrl && !this._externalCssUrls.has(externalCssUrl))
            {
                this._externalCssUrls.add(externalCssUrl);
                fetch(externalCssUrl, { cache: "force-cache", mode: "no-cors" })
                    .then(response => response.text())
                    .then(css =>
                    {
                        let style = doc.createElement('style');
                        style.setAttribute("ml-external", externalCssUrl);
                        style.innerText = css;
                        style.disabled = true;
                        doc.head.appendChild(style);
                        if (style.sheet)
                        {
                            style.sheet.disabled = true;
                        }
                    })
                    .catch(ex =>
                    {
                        // console.error(`Error during css file download: ${externalCssUrl}\nDetails: ${ex.message || ex}`)
                    });
            }
        }
    }
}