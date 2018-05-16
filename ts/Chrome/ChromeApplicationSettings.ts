/// <reference path="../DI/-DI.ts" />
/// <reference path="../Settings/IApplicationSettings.ts" />
/// <reference path="./ChromePromise.ts" />

namespace Chrome
{
    @MidnightLizard.DI.injectable(MidnightLizard.Settings.IApplicationSettings)
    class ChromeApplicationSettings implements MidnightLizard.Settings.IApplicationSettings
    {
        protected readonly _isDebug: boolean;
        get isDebug() { return this._isDebug }

        get isInIncognitoMode() { return chrome.extension.inIncognitoContext }

        get currentLocale()
        {
            return chrome.runtime.getManifest().current_locale || "en";
        }

        get browserName()
        {
            return typeof browser === "object"
                ? MidnightLizard.Settings.BrowserName.Firefox
                : MidnightLizard.Settings.BrowserName.Chrome
        }

        get isMobile()
        {
            return /mobile/gi.test(navigator.userAgent);
        }

        protected readonly _preserveDisplay: boolean = false;
        get preserveDisplay() { return this._preserveDisplay }

        get version() { return chrome.runtime.getManifest().version }

        constructor(
            protected readonly _rootDocument: Document,
            protected readonly _chrome: Chrome.ChromePromise)
        {
            if (chrome.runtime.id === "pbnndmlekkboofhnbonilimejonapojg" || // chrome
                chrome.runtime.id === "{8fbc7259-8015-4172-9af1-20e1edfbbd3a}") // firefox
            {   // production environment
                this._isDebug = false;
            }
            else
            {   // development environment
                this._isDebug = true;
            }

            // console.log(`Midnight Lizard ${this._isDebug ? "Development" : "Production"}-${chrome.runtime.id}`);

            this._preserveDisplay = /facebook/gi.test(_rootDocument.location.hostname);
        }

        public getFullPath(relativePath: string)
        {
            return chrome.runtime.getURL(relativePath);
        }
    }
}