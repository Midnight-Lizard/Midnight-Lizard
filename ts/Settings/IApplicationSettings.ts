namespace MidnightLizard.Settings
{
    export enum BrowserName
    {
        Chrome = "Chrome",
        Firefox = "Firefox"
    }

    export abstract class IApplicationSettings
    {
        /** Returns current extension locale or "en" */
        abstract get currentLocale(): string;

        /** Returns current browser name */
        abstract get browserName(): BrowserName;

        /** Determines whether extension is in debug mode */
        abstract get isDebug(): boolean;

        /** True if extension is running inside an incognito window */
        abstract get isInIncognitoMode():boolean;

        /** Determines whether element.style.display should be preserved after processing */
        abstract get preserveDisplay(): boolean;

        /** Returns current extension version */
        abstract get version(): string;

        /**
         * Converts a relative path within an extension install directory to a fully-qualified URL.
         * @param relativePath - A path to a resource within an extension expressed relative to its install directory.
         */
        abstract getFullPath(relativePath: string): string;
    }
}