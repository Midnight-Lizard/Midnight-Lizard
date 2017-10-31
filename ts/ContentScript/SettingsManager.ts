/// <reference path="../DI/-DI.ts" />
/// <reference path="../Colors/-Colors.ts" />
/// <reference path="../Settings/-Settings.ts" />

namespace MidnightLizard.ContentScript
{
    type AnyResponse = (args: any) => void;
    type ColorSchemeResponse = (settings: Settings.ColorScheme) => void;
    type ArgEvent<TRequestArgs> = MidnightLizard.Events.ArgumentedEvent<TRequestArgs>;
    type RespEvent<TResponseMethod extends Function, TRequestArgs> = MidnightLizard.Events.ResponsiveEvent<TResponseMethod, TRequestArgs>;

    export abstract class ISettingsManager
    {
        /** MidnightLizard should be running on this page */
        abstract get isActive(): boolean;
        /** Current settings for calculations */
        abstract get shift(): Colors.ComponentShift;
        /** Current settings for communication */
        abstract get currentSettings(): Settings.ColorScheme;
        abstract get onSettingsInitialized(): ArgEvent<Colors.ComponentShift>;
        abstract get onSettingsChanged(): RespEvent<(scheme: Settings.ColorScheme) => void, Colors.ComponentShift>;
    }

    @DI.injectable(ISettingsManager)
    @DI.injectable(MidnightLizard.Settings.IBaseSettingsManager, DI.Scope.ExistingInstance)
    class SettingsManager extends MidnightLizard.Settings.BaseSettingsManager implements ISettingsManager
    {
        constructor(
            protected readonly _rootDocument: Document,
            // protected readonly _cookiesManager: MidnightLizard.Cookies.ICookiesManager,
            app: MidnightLizard.Settings.IApplicationSettings,
            storageManager: MidnightLizard.Settings.IStorageManager,
            settingsBus: MidnightLizard.Settings.ISettingsBus)
        {
            super(_rootDocument, app, storageManager, settingsBus);
            settingsBus.onCurrentSettingsRequested.addListener(this.onCurrentSettingsRequested, this);
            settingsBus.onIsEnabledToggleRequested.addListener(this.onIsEnabledToggleRequested, this);
            settingsBus.onNewSettingsApplicationRequested.addListener(this.onNewSettingsApplicationRequested, this);
            settingsBus.onSettingsDeletionRequested.addListener(this.onSettingsDeletionRequested, this);
        }

        protected initCurrentSettings()
        {
            const storage = {
                ...Settings.ColorSchemes.default,
                ...Settings.ColorSchemes.dimmedDust,
                ...{ [this._settingsKey]: {} }
            };
            this._storageManager.get(storage).then(defaultSettings =>
            {
                const settings = (defaultSettings as any)[this._settingsKey] as Settings.ColorScheme;
                delete (defaultSettings as any)[this._settingsKey];
                this.applyUserColorSchemes(defaultSettings);
                this.assignSettings(this._defaultSettings, defaultSettings);
                this._defaultSettings.colorSchemeId = "default";
                this._defaultSettings.colorSchemeName = "Default";
                Object.assign(this._currentSettings, this._defaultSettings);
                if (settings)
                {
                    this.assignSettings(this._currentSettings, settings);
                }
                this.updateSchedule();
                this.initCurSet();
                this._onSettingsInitialized.raise(this._shift);
            }).catch(ex => this._app.isDebug && console.error(ex));
        }

        protected async onSettingsDeletionRequested(response: AnyResponse)
        {
            response(null);
            await this._storageManager.remove(this._settingsKey);
        }

        protected onNewSettingsApplicationRequested(response: AnyResponse, newSettings: Settings.ColorScheme): void
        {
            this._currentSettings = newSettings;
            this.saveCurrentSettings();
            this.updateSchedule();
            this.initCurSet();
            this._onSettingsChanged.raise(response, this._shift);
        }

        protected onIsEnabledToggleRequested(response: AnyResponse, isEnabled: boolean): void
        {
            this._currentSettings.isEnabled = isEnabled;
            this._onSettingsChanged.raise(response, this._shift);
        }

        protected onCurrentSettingsRequested(response: ColorSchemeResponse): void
        {
            this._currentSettings.hostName = this._rootDocument.location.hostname;
            response(this._currentSettings);
        }

        protected saveCurrentSettings()
        {
            if (this._currentSettings.colorSchemeId === "default")
            {
                this._storageManager.remove(this._settingsKey);
                this._storageManager.set({
                    [this._settingsKey]: {
                        runOnThisSite: this._currentSettings.runOnThisSite
                    }
                });
            }
            else if (this._currentSettings.colorSchemeId && this._currentSettings.colorSchemeId !== "custom" as Settings.ColorSchemeName)
            {
                this._storageManager.set({
                    [this._settingsKey]: {
                        colorSchemeId: this._currentSettings.colorSchemeId,
                        runOnThisSite: this._currentSettings.runOnThisSite
                    }
                });
            }
            else
            {
                let setting: Settings.ColorSchemePropertyName;
                const forSave = new Settings.ColorScheme();
                for (setting in this._currentSettings)
                {
                    if (Settings.excludeSettingsForSave.indexOf(setting) == -1)
                    {
                        forSave[setting] = this._currentSettings[setting];
                    }
                }
                this._storageManager.set({ [this._settingsKey]: forSave });
            }
        }

        protected getSettingNameForCookies(propertyName: Settings.ColorSchemePropertyName)
        {
            return "ML" + propertyName.match(/^[^A-Z]{1,4}|[A-Z][^A-Z]{0,2}/g)!.join("").toUpperCase();
        }
    }
}