import { injectable } from "../Utils/DI";
import { IApplicationSettings, BrowserName, BrowserVendor } from "../Settings/IApplicationSettings";
import { StorageType, StorageLimits } from "../Settings/IStorageManager";
import { ChromePromise } from "./ChromePromise";

@injectable(IApplicationSettings)
export class ChromeApplicationSettings implements IApplicationSettings
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
            ? BrowserName.Firefox
            : BrowserName.Chrome
    }

    get browserVendor(): BrowserVendor
    {
        if (/Edg\//.test(navigator.userAgent))
        {
            return BrowserVendor.Microsoft;
        }
        else if (/OPR/.test(navigator.userAgent))
        {
            return BrowserVendor.Opera;
        }
        else if (/UBrowser/.test(navigator.userAgent))
        {
            return BrowserVendor.UC;
        }
        else if (this.browserName === BrowserName.Firefox)
        {
            return BrowserVendor.Mozilla;
        }
        else
        {
            return BrowserVendor.Google;
        }
    }

    get isMobile()
    {
        return /mobile/gi.test(navigator.userAgent);
    }

    get isDesktop()
    {
        return !/mobile/gi.test(navigator.userAgent);
    }

    protected readonly _preserveDisplay: boolean = false;
    get preserveDisplay() { return this._preserveDisplay }

    get version() { return chrome.runtime.getManifest().version }
    get id() { return chrome.runtime.id }

    constructor(
        protected readonly _rootDocument: Document,
        protected readonly _chrome: ChromePromise)
    {
        if (chrome.runtime.id === "pbnndmlekkboofhnbonilimejonapojg" || // chrome
            chrome.runtime.id === "{8fbc7259-8015-4172-9af1-20e1edfbbd3a}" || // firefox
            chrome.runtime.getManifest().update_url)
        {   // production environment
            this._isDebug = false;
        }
        else
        {   // development environment
            this._isDebug = true;
        }

        // console.log(`Midnight Lizard ${this._isDebug ? "Development" : "Production"}-${chrome.runtime.id}`);

        // Manifest V3: Service workers don't have document.location
        // _preserveDisplay is only relevant in content script context, not background
        this._preserveDisplay = _rootDocument?.location?.hostname
            ? /facebook|baidu/gi.test(_rootDocument.location.hostname)
            : false;
    }

    public getFullPath(relativePath: string)
    {
        return chrome.runtime.getURL(relativePath);
    }

    public getStorageLimits(
        storage: StorageType,
        limit: StorageLimits)
    {
        return chrome.storage[storage as 'sync'][limit];
    }
}