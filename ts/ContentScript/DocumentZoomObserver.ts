/// <reference path="../DI/-DI.ts" />

namespace MidnightLizard.ContentScript
{
    export abstract class IDocumentZoomObserver
    {
    }

    @DI.injectable(IDocumentZoomObserver)
    class DocumentZoomObserver implements IDocumentZoomObserver
    {
        private lastZoom = 1;

        constructor(doc: Document,
            settingsBus: MidnightLizard.Settings.ISettingsBus,
            private readonly _settingsManager: MidnightLizard.Settings.IBaseSettingsManager)
        {
            settingsBus.onZoomChanged.addListener((done, zoom) =>
            {
                this.lastZoom = zoom || 1;
                this.setDocumentZoom(doc);
                if (window.top === window.self)
                {
                    done(true);
                }
            }, null);

            _settingsManager.onSettingsInitialized.addListener(_ => this.setDocumentZoom(doc), this);
            _settingsManager.onSettingsChanged.addListener(_ => this.setDocumentZoom(doc), this);
        }

        private setDocumentZoom(doc: Document)
        {
            if (this._settingsManager.isActive)
            {
                doc.documentElement.style.setProperty("--ml-zoom", this.lastZoom.toString(), "important");
            }
        }
    }
}