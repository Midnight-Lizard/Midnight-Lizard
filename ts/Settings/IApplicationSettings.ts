namespace MidnightLizard.Settings
{
    export abstract class IApplicationSettings
    {
        /** Determines whether extension is in debug mode */
        abstract get isDebug(): boolean;

        /** Determines whether element.style.display should be preserved after processing */
        abstract get preserveDisplay(): boolean;

        /** Returns current extension version */
        abstract get version(): string;
    }
}