const externalAttribute = "ml-external";
export class ExternalCssLoader
{
    private readonly _externalCssUrls = new Set<string>();
    constructor() { }

    public beginExternalCssObservation(doc: Document)
    {
        doc.documentElement.addEventListener("FetchExternalCss", (e) =>
        {
            if (e instanceof CustomEvent && e.detail)
            {
                const msg = JSON.parse(e.detail)
                this.processExternalCss(msg.externalCssUrl, doc);
            }
        });
    }

    private processExternalCss(externalCssUrl: string, doc: Document)
    {
        if (externalCssUrl && !this._externalCssUrls.has(externalCssUrl))
        {
            this._externalCssUrls.add(externalCssUrl);
            fetch(externalCssUrl, { cache: "force-cache" })
                .then(response => response.text())
                .then(css =>
                {
                    debugger;
                    let style = doc.createElement('style');
                    style.setAttribute("ml-external", externalCssUrl);
                    style.innerText = css;
                    // style.disabled = true;
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