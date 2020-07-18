import { StorageType, StorageLimits } from "./IStorageManager";

export enum BrowserName
{
    Chrome = "Chrome",
    Firefox = "Firefox"
}

export enum BrowserVendor
{
    Google = "Google",
    Mozilla = "Mozilla",
    Microsoft = "Microsoft",
    Vivaldi = "Vivaldi",
    Yandex = "Yandex",
    Opera = "Opera",
    UC = "UC"
}

export abstract class IApplicationSettings
{
    /** Returns current extension locale or "en" */
    abstract get currentLocale(): string;

    /** Returns current browser name */
    abstract get browserName(): BrowserName;

    /** Returns current browser vendor name */
    abstract get browserVendor(): BrowserVendor;

    /** Determines whether extension is in debug mode */
    abstract get isDebug(): boolean;

    /** Determines whether extension is running on a mobile device */
    abstract get isMobile(): boolean;

    /** Determines whether extension is running on a desktop */
    abstract get isDesktop(): boolean;

    /** True if extension is running inside an incognito window */
    abstract get isInIncognitoMode(): boolean;

    /** Determines whether element.style.display should be preserved after processing */
    abstract get preserveDisplay(): boolean;

    /** Returns current extension version */
    abstract get version(): string;

    /** Returns current extension id */
    abstract get id(): string;

    /**
     * Converts a relative path within an extension install directory to a fully-qualified URL.
     * @param relativePath - A path to a resource within an extension expressed relative to its install directory.
     */
    abstract getFullPath(relativePath: string): string;

    abstract getStorageLimits(
        storage: StorageType,
        limit: StorageLimits): number;
}