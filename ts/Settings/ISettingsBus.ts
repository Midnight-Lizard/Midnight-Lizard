import { ResponsiveEvent } from "../Events/Event";
import { ColorScheme } from "./ColorScheme";

type ColorSchemeResponse = (settings: ColorScheme) => void;
type AnyResponse = (args: any) => void;
/** Abstract settings communication bus */
export abstract class ISettingsBus
{
    /** Occurs when current settings are requested from content script by popup */
    abstract get onCurrentSettingsRequested(): ResponsiveEvent<ColorSchemeResponse, null>;
    /** Occurs when new settings application is requestedfromto content script by popup */
    abstract get onNewSettingsApplicationRequested(): ResponsiveEvent<AnyResponse, ColorScheme>;
    /** Occurs when settings applied on the page */
    abstract get onSettingsApplied(): ResponsiveEvent<AnyResponse, ColorScheme>;
    /** Occurs when settings deletion is requested from content script by popup */
    abstract get onSettingsDeletionRequested(): ResponsiveEvent<AnyResponse, null>;
    /** Occurs when IsEnabled toggle requested from content script by popup */
    abstract get onIsEnabledToggleRequested(): ResponsiveEvent<AnyResponse, boolean>;
    /** Occurs when tab zoom factor changes */
    abstract get onZoomChanged(): ResponsiveEvent<AnyResponse, number>;
    /** Deletes all current website settings from the cookies */
    abstract deleteSettings(): Promise<null>;
    /** Applies new settings on the website and saves them */
    abstract applySettings(settings: ColorScheme): Promise<ColorScheme>;
    /** Notify that settings has been applied on the page */
    abstract notifySettingsApplied(settings: ColorScheme): Promise<ColorScheme>;
    /** Applies global enable state of the extension */
    abstract toggleIsEnabled(isEnabled: boolean): Promise<Promise<null>[]>;
    /** Sets specified tab zoom factor */
    abstract setTabZoom(tabId: number, zoom: number): Promise<null>;
    /** Returns Promise of the current settings */
    abstract getCurrentSettings(): Promise<ColorScheme>;
}