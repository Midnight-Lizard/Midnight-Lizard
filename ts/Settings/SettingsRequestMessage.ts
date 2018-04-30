/// <reference path="../Settings/ExtensionModule.ts" />
/// <reference path="../Settings/ColorScheme.ts" />

namespace MidnightLizard.Settings
{

    export type MessageTypes = CurrentSettingsRequestMessage | NewSettingsApplicationRequestMessage |
        SettingsDeletionRequestMessage | IsEnabledToggleRequestMessage | ZoomChangedMessage | SettingsAppliedMessage;

    export enum SettingsMessageAction
    {
        GetCurrentSettings = "GetCurrentSettings",
        ApplyNewSettings = "ApplyNewSettings",
        DeleteSettings = "DeleteSettings",
        ToggleIsEnabled = "ToggleIsEnabled",
        ZoomChanged = "ZoomChanged",
        SettingsApplied = "SettingsApplied"
    }

    export class CurrentSettingsRequestMessage 
    {
        receiver?: string;
        action: SettingsMessageAction.GetCurrentSettings = SettingsMessageAction.GetCurrentSettings;
        constructor(readonly sender: ExtensionModule) { }
    }

    export class SettingsDeletionRequestMessage 
    {
        receiver?: string;
        action: SettingsMessageAction.DeleteSettings = SettingsMessageAction.DeleteSettings;
        constructor(readonly sender: ExtensionModule) { }
    }

    export class IsEnabledToggleRequestMessage 
    {
        receiver?: string;
        action: SettingsMessageAction.ToggleIsEnabled = SettingsMessageAction.ToggleIsEnabled;
        constructor(readonly sender: ExtensionModule, readonly isEnabled: boolean) { }
    }

    export class ZoomChangedMessage 
    {
        receiver?: string;
        action: SettingsMessageAction.ZoomChanged = SettingsMessageAction.ZoomChanged;
        constructor(readonly sender: ExtensionModule, readonly zoom: number) { }
    }

    export class SettingsAppliedMessage 
    {
        receiver?: string;
        action: SettingsMessageAction.SettingsApplied = SettingsMessageAction.SettingsApplied;
        constructor(readonly sender: ExtensionModule, readonly settings: MidnightLizard.Settings.ColorScheme) { }
    }

    export class NewSettingsApplicationRequestMessage 
    {
        receiver?: string;
        action: SettingsMessageAction.ApplyNewSettings = SettingsMessageAction.ApplyNewSettings;
        constructor(readonly sender: ExtensionModule, readonly settings: MidnightLizard.Settings.ColorScheme) { }
    }
}