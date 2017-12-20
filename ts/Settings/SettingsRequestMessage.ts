/// <reference path="../Settings/ColorScheme.ts" />

namespace MidnightLizard.Settings
{

    export type MessageTypes = CurrentSettingsRequestMessage | NewSettingsApplicationRequestMessage |
        SettingsDeletionRequestMessage | IsEnabledToggleRequestMessage | ZoomChangedMessage;

    export enum SettingsMessageAction
    {
        GetCurrentSettings,
        ApplyNewSettings,
        DeleteSettings,
        ToggleIsEnabled,
        ZoomChanged
    }

    export class CurrentSettingsRequestMessage 
    {
        action: SettingsMessageAction.GetCurrentSettings = SettingsMessageAction.GetCurrentSettings;
        constructor() { }
    }

    export class SettingsDeletionRequestMessage 
    {
        action: SettingsMessageAction.DeleteSettings = SettingsMessageAction.DeleteSettings;
        constructor() { }
    }

    export class IsEnabledToggleRequestMessage 
    {
        action: SettingsMessageAction.ToggleIsEnabled = SettingsMessageAction.ToggleIsEnabled;
        constructor(readonly isEnabled: boolean) { }
    }

    export class ZoomChangedMessage 
    {
        action: SettingsMessageAction.ZoomChanged = SettingsMessageAction.ZoomChanged;
        constructor(readonly zoom: number) { }
    }

    export class NewSettingsApplicationRequestMessage 
    {
        action: SettingsMessageAction.ApplyNewSettings = SettingsMessageAction.ApplyNewSettings;
        constructor(readonly settings: MidnightLizard.Settings.ColorScheme) { }
    }
}