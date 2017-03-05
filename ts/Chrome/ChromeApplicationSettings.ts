/// <reference path="../DI/-DI.ts" />
/// <reference path="../Settings/IApplicationSettings.ts" />

namespace Chrome
{
    @MidnightLizard.DI.injectable(MidnightLizard.Settings.IApplicationSettings)
    class ChromeApplicationSettings implements MidnightLizard.Settings.IApplicationSettings
    {
        protected readonly _isDebug: boolean;
        get isDebug() { return this._isDebug }

        protected readonly _preserveDisplay: boolean;
        get preserveDisplay() { return this._preserveDisplay }

        get version() { return chrome.runtime.getManifest().version }

        constructor(protected readonly _rootDocument: Document)
        {
            if (chrome.runtime.id === "pbnndmlekkboofhnbonilimejonapojg")
            {   // production environment
                this._isDebug = false;
            }
            else
            {   // development environment
                this._isDebug = true;
            }

            this._preserveDisplay = /facebook/gi.test(_rootDocument.defaultView.location.hostname);
        }
    }
}