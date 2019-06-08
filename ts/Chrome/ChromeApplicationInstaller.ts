import { injectable } from "../Utils/DI";
import { IApplicationInstaller } from "../BackgroundPage/IApplicationInstaller";
import { IApplicationSettings, BrowserName } from "../Settings/IApplicationSettings";
import { ChromePromise } from "./ChromePromise";

@injectable(IApplicationInstaller)
export class ChromeApplicationInstaller implements IApplicationInstaller
{
    private readonly printError = (er: any) => this._app.isDebug && console.error(er.message || er);

    constructor(
        protected readonly _chromePromise: ChromePromise,
        protected readonly _app: IApplicationSettings)
    {
        if (_app.browserName !== BrowserName.Firefox)
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