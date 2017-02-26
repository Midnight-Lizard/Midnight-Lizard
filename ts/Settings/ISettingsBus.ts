/// <reference path="./ColorScheme.ts" />
/// <reference path="../Events/Event.ts" />

namespace MidnightLizard.Settings
{
    type ResponsiveEvent<TResponseMethod extends Function, TRequestArgs> = MidnightLizard.Events.ResponsiveEvent<TResponseMethod, TRequestArgs>;
    type ColorSchemeResponse = (settings: ColorScheme) => void;
    type AnyResponse = (args: any) => void;
    /** Abstract settings communication bus */
    export abstract class ISettingsBus
    {
        /** Occurs when current settings are requested from content script by popup */
        abstract get onCurrentSettingsRequested(): ResponsiveEvent<ColorSchemeResponse, null>;
        /** Occurs when new settings application is requestedfromto content script by popup */
        abstract get onNewSettingsApplicationRequested(): ResponsiveEvent<AnyResponse, ColorScheme>;
        /** Occurs when settings deletion is requested from content script by popup */
        abstract get onSettingsDeletionRequested(): ResponsiveEvent<AnyResponse, null>;
        /** Occurs when IsEnabled toggle requested from content script by popup */
        abstract get onIsEnabledToggleRequested(): ResponsiveEvent<AnyResponse, boolean>;
        /** Deletes all current website settings from the cookies */
        abstract deleteSettings(): Promise<null>;
        /** Applies new settings on the website and saves them in the cookies */
        abstract applySettings(settings: ColorScheme): Promise<ColorScheme>;
        /** Applies global enable state of the extension */
        abstract toggleIsEnabled(isEnabled: boolean): Promise<Promise<null>[]>;
        /** Returns Promise of the current settings */
        abstract getCurrentSettings(): Promise<ColorScheme>;
    }
}