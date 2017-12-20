/// <reference path="../DI/-DI.ts" />

namespace MidnightLizard.ContentScript
{
    export abstract class IDocumentZoomObserver
    {
        /** adds document to the document zoom observation process */
        abstract addDocument(doc: Document): void;
    }

    @DI.injectable(IDocumentZoomObserver)
    class DocumentZoomObserver implements IDocumentZoomObserver
    {
        protected lastZoom = 1;
        protected readonly documents = new Set<Document>();

        constructor(protected readonly _settingsBus: MidnightLizard.Settings.ISettingsBus)
        {
            _settingsBus.onZoomChanged.addListener((done, zoom) =>
            {
                this.lastZoom = zoom || 1;
                this.documents.forEach(doc => this.setDocumentZoom(doc, this.lastZoom));
                done(null);
            }, null);
        }

        public addDocument(doc: Document): void
        {
            this.documents.add(doc);
            this.setDocumentZoom(doc, this.lastZoom);
        }

        protected setDocumentZoom(doc: Document, zoom: number)
        {
            doc.documentElement.style.setProperty("--zoom", zoom.toString(), "important");
        }

    }
}