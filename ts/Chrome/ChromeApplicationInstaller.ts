/// <reference path="../DI/-DI.ts" />
/// <reference path="../BackgroundPage/IApplicationInstaller.ts" />
/// <reference path="../Settings/IApplicationSettings.ts" />
/// <reference path="../Chrome/ChromePromise.ts" />

namespace Chrome
{
    @MidnightLizard.DI.injectable(MidnightLizard.BackgroundPage.IApplicationInstaller)
    class ChromeApplicationInstaller implements MidnightLizard.BackgroundPage.IApplicationInstaller
    {
        private readonly printError = (er: any) => this._app.isDebug && console.error(er.message || er);

        constructor(
            protected readonly _chromePromise: Chrome.ChromePromise,
            protected readonly _app: MidnightLizard.Settings.IApplicationSettings)
        {
            if (_app.browserName !== MidnightLizard.Settings.BrowserName.Firefox)
            {
                chrome.runtime.onInstalled.addListener(this.onInstalled.bind(this));
            }
        }

        protected onInstalled(e: chrome.runtime.InstalledDetails)
        {
            setTimeout(() =>
            {
                const mainInjection = chrome.runtime.getManifest().content_scripts![0];
                this._chromePromise.tabs
                    .query({})
                    .then(tabs => tabs.map(tab =>
                    {
                        for (const css of mainInjection.css!)
                        {
                            this._chromePromise.tabs
                                .insertCSS(tab.id!, {
                                    allFrames: true,
                                    matchAboutBlank: true,
                                    runAt: mainInjection.run_at,
                                    file: css
                                })
                                .catch(this.printError);
                        }
                        this._chromePromise.tabs
                            .executeScript(tab.id!, {
                                allFrames: true,
                                matchAboutBlank: true,
                                runAt: "document_idle",
                                file: mainInjection.js![0]
                            })
                            .catch(this.printError);
                    }))
                    .catch(this.printError);
            }, this._app.isDebug ? 3000 : 100);
        }
    }
}