/// <reference path="../DI/-DI.ts" />

namespace MidnightLizard.ContentScript
{
    export abstract class IDocumentZoomObserver
    {
    }

    @DI.injectable(IDocumentZoomObserver)
    class DocumentZoomObserver implements IDocumentZoomObserver
    {
        constructor(doc: Document,
            protected readonly _settingsBus: MidnightLizard.Settings.ISettingsBus)
        {
            _settingsBus.onZoomChanged.addListener((done, zoom) =>
            {
                this.setDocumentZoom(doc, zoom || 1);
                if (window.top === window.self)
                {
                    done(true);
                }
            }, null);
        }

        protected setDocumentZoom(doc: Document, zoom: number)
        {
            doc.documentElement.style.setProperty("--ml-zoom", zoom.toString(), "important");
        }

    }
}