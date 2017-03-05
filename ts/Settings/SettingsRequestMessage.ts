/// <reference path="../Settings/ColorScheme.ts" />

namespace MidnightLizard.Settings
{

    export enum SettingsMessageAction
    {
        GetCurrentSettings,
        ApplyNewSettings,
        DeleteSettings,
        ToggleIsEnabled
    }

    export abstract class SettingsRequestMessage
    {
        action: SettingsMessageAction;
        constructor() { }
    }

    export class CurrentSettingsRequestMessage extends SettingsRequestMessage
    {
        action: SettingsMessageAction.GetCurrentSettings = SettingsMessageAction.GetCurrentSettings;
        constructor() { super() }
    }

    export class SettingsDeletionRequestMessage extends SettingsRequestMessage
    {
        action: SettingsMessageAction.DeleteSettings = SettingsMessageAction.DeleteSettings;
        constructor() { super() }
    }

    export class IsEnabledToggleRequestMessage extends SettingsRequestMessage
    {
        action: SettingsMessageAction.ToggleIsEnabled = SettingsMessageAction.ToggleIsEnabled;
        constructor(readonly isEnabled: boolean) { super() }
    }

    export class NewSettingsApplicationRequestMessage extends SettingsRequestMessage
    {
        action: SettingsMessageAction.ApplyNewSettings = SettingsMessageAction.ApplyNewSettings;
        constructor(readonly settings: MidnightLizard.Settings.ColorScheme) { super() }
    }
}