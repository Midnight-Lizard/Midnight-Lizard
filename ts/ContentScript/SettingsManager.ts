/// <reference path="../DI/-DI.ts" />
/// <reference path="../Colors/-Colors.ts" />
/// <reference path="../Settings/-Settings.ts" />

namespace MidnightLizard.ContentScript
{
    type AnyResponse = (args: any) => void;
    type ColorSchemeResponse = (settings: Settings.ColorScheme) => void;
    type Storage = { isEnabled?: boolean, settingsVersion?: string, defaultSettingsVersion?: string };
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
        /** period of settings storage in the cookies */
        protected static readonly _storagePeriod = 49;

        constructor(
            protected readonly _rootDocument: Document,
            protected readonly _cookiesManager: MidnightLizard.Cookies.ICookiesManager,
            app: MidnightLizard.Settings.IApplicationSettings,
            storageManager: MidnightLizard.Settings.IStorageManager,
            settingsBus: MidnightLizard.Settings.ISettingsBus)
        {
            super(app, storageManager, settingsBus);
            settingsBus.onCurrentSettingsRequested.addListener(this.onCurrentSettingsRequested, this);
            settingsBus.onIsEnabledToggleRequested.addListener(this.onIsEnabledToggleRequested, this);
            settingsBus.onNewSettingsApplicationRequested.addListener(this.onNewSettingsApplicationRequested, this);
            settingsBus.onSettingsDeletionRequested.addListener(this.onSettingsDeletionRequested, this);
        }

        protected initCurrentSettings()
        {
            this._storageManager.get<Settings.ColorScheme>(null)
                .then(defaultSettings =>
                {
                    this._defaultSettings = defaultSettings;
                    if (defaultSettings.settingsVersion !== undefined)
                    {
                        this.applyUserColorSchemes(defaultSettings);
                        let settings = this.getSettings(defaultSettings.settingsVersion);
                        defaultSettings.colorSchemeId = defaultSettings.colorSchemeId || "default";
                        Object.assign(this._currentSettings, defaultSettings);
                        if (settings.exist)
                        {
                            if (settings.colorSchemeId && settings.colorSchemeId !== "custom" as Settings.ColorSchemeName &&
                                Settings.ColorSchemes[settings.colorSchemeId])
                            {
                                Object.assign(this._currentSettings, Settings.ColorSchemes[settings.colorSchemeId]);
                            }
                            else
                            {
                                settings.colorSchemeId = settings.colorSchemeId || "custom" as Settings.ColorSchemeName;
                                Object.assign(this._currentSettings, settings);
                            }
                            this._currentSettings.settingsVersion = defaultSettings.settingsVersion;
                            this.saveCurrentSettings();
                        }
                    }
                    else
                    {
                        defaultSettings.colorSchemeId = defaultSettings.colorSchemeId || "default";
                        this._currentSettings.settingsVersion = Util.guid("");
                        this._storageManager.set(this._currentSettings);
                    }
                    this._currentSettings.isEnabled = defaultSettings.isEnabled === undefined || defaultSettings.isEnabled;
                    this.updateSchedule();
                    this.initCurSet();
                    this._onSettingsInitialized.raise(this._shift);
                })
                .catch(ex => this._app.isDebug && console.error(ex));
        }

        protected onSettingsDeletionRequested(response: AnyResponse): void
        {
            let setting: Settings.ColorSchemePropertyName;
            for (setting in this._currentSettings)
            {
                if (Settings.excludeSettingsForSave.indexOf(setting) == -1)
                {
                    this._cookiesManager.deleteCookieByName(this.getSettingNameForCookies(setting));
                }
            }
            response(null);
        }

        protected onNewSettingsApplicationRequested(response: AnyResponse, newSettings: Settings.ColorScheme): void
        {
            this._currentSettings = newSettings;
            this.updateSchedule();
            this.saveCurrentSettings();
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
            if (this._currentSettings.colorSchemeId && this._currentSettings.colorSchemeId !== "custom" as Settings.ColorSchemeName)
            {
                this._cookiesManager.setCookie(this.getSettingNameForCookies("colorSchemeId"), this._currentSettings.colorSchemeId, SettingsManager._storagePeriod);
                this._cookiesManager.setCookie(this.getSettingNameForCookies("settingsVersion"), this._currentSettings.settingsVersion, SettingsManager._storagePeriod);
            }
            else
            {
                let setting: Settings.ColorSchemePropertyName;
                for (setting in this._currentSettings)
                {
                    if (Settings.excludeSettingsForSave.indexOf(setting) == -1)
                    {
                        this._cookiesManager.setCookie(this.getSettingNameForCookies(setting), this._currentSettings[setting], SettingsManager._storagePeriod);
                    }
                }
            }
        }

        protected getSettingNameForCookies(propertyName: Settings.ColorSchemePropertyName)
        {
            return "ML" + propertyName.match(/^[^A-Z]{1,4}|[A-Z][^A-Z]{0,2}/g)!.join("").toUpperCase();
        }

        protected getSettings(version: string): Settings.ColorScheme
        {
            let val, settings = new Settings.ColorScheme(), setting: Settings.ColorSchemePropertyName;
            for (setting in Settings.ColorSchemes.default)
            {
                val = this._cookiesManager.getCookie(this.getSettingNameForCookies(setting));
                if (val)
                {
                    switch (typeof Settings.ColorSchemes.default[setting])
                    {
                        case Util.BOOL: settings[setting] = val == true.toString(); break;
                        case Util.NUM: settings[setting] = parseInt(val); break;
                        default: settings[setting] = val; break;
                    }
                }
                //else break;
            }

            settings.exist = settings.settingsVersion == version;
            settings.settingsVersion = version;
            return settings;
        }
    }
}