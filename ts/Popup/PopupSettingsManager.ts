/// <reference path="../DI/-DI.ts" />
/// <reference path="../Colors/-Colors.ts" />
/// <reference path="../Settings/-Settings.ts" />

namespace MidnightLizard.Popup
{
    type AnyResponse = (args: any) => void;
    type ColorSchemeResponse = (settings: Settings.ColorScheme) => void;
    type Storage = { isEnabled?: boolean, settingsVersion?: string, defaultSettingsVersion?: string };
    type ArgEvent<TRequestArgs> = MidnightLizard.Events.ArgumentedEvent<TRequestArgs>;
    type RespEvent<TResponseMethod extends Function, TRequestArgs> = MidnightLizard.Events.ResponsiveEvent<TResponseMethod, TRequestArgs>;
    let ArgEventDispatcher = MidnightLizard.Events.ArgumentedEventDispatcher;

    export abstract class IPopupSettingsManager
    {
        /** MidnightLizard should be running on this page */
        abstract get isActive(): boolean;
        /** Current settings for calculations */
        abstract get shift(): Colors.ComponentShift;
        /** Current settings for communication */
        abstract get currentSettings(): Settings.ColorScheme;
        abstract get onSettingsInitialized(): ArgEvent<Colors.ComponentShift>;
        abstract get onSettingsInitializationFailed(): ArgEvent<any>;
        abstract get onSettingsChanged(): RespEvent<(scheme: Settings.ColorScheme) => void, Colors.ComponentShift>;
        abstract getDefaultSettings(): Promise<Settings.ColorScheme>;
        abstract getDefaultSettingsCache(): Settings.ColorScheme;
        abstract setAsDefaultSettings(): Promise<null>;
        abstract toggleIsEnabled(isEnabled: boolean): Promise<null>;
        abstract changeSettings(newSettings: Settings.ColorScheme): void;
        abstract applySettings(): Promise<Settings.ColorScheme>;
        abstract deleteAllSettings(): Promise<null>;
        abstract deleteCurrentSiteSettings(): Promise<null>;
        abstract saveUserColorScheme(userColorScheme: Settings.ColorScheme): Promise<null>;
        abstract deleteUserColorScheme(colorSchemeId: Settings.ColorSchemeName): Promise<null>;
        abstract settingsAreEqual(first: Settings.ColorScheme, second: Settings.ColorScheme): boolean;
    }

    @DI.injectable(IPopupSettingsManager)
    @DI.injectable(MidnightLizard.Settings.IBaseSettingsManager, DI.Scope.ExistingInstance)
    class PopupSettingsManager extends MidnightLizard.Settings.BaseSettingsManager implements IPopupSettingsManager
    {
        isActive: boolean;
        shift: Colors.ComponentShift;
        currentSettings: Settings.ColorScheme;
        onSettingsInitialized: Events.ArgumentedEvent<Colors.ComponentShift>;
        onSettingsChanged: Events.ResponsiveEvent<(scheme: Settings.ColorScheme) => void, Colors.ComponentShift>;

        constructor(
            app: MidnightLizard.Settings.IApplicationSettings,
            storageManager: MidnightLizard.Settings.IStorageManager,
            settingsBus: MidnightLizard.Settings.ISettingsBus)
        {
            super(app, storageManager, settingsBus);
        }

        protected initCurrentSettings()
        {
            Promise.all([this.getDefaultSettings(), this._settingsBus.getCurrentSettings()])
                .then(([defaultSettings, currentSettings]) =>
                {
                    this._defaultSettings = defaultSettings;
                    this.applyUserColorSchemes(defaultSettings);
                    this._currentSettings = currentSettings;
                    this.updateSchedule();
                    this.initCurSet();
                    this._onSettingsInitialized.raise(this._shift);
                })
                .catch(ex =>
                {
                    this._app.isDebug && console.error(ex);
                    this._onSettingsInitializationFailed.raise(ex);
                });
        }

        public getDefaultSettings()
        {
            return this._storageManager.get<Settings.ColorScheme>(null);
        }

        public getDefaultSettingsCache(): Settings.ColorScheme
        {
            return this._defaultSettings;
        }

        protected _onSettingsInitializationFailed = new ArgEventDispatcher<any>();
        public get onSettingsInitializationFailed()
        {
            return this._onSettingsInitializationFailed.event;
        }

        public toggleIsEnabled(isEnabled: boolean): Promise<null>
        {
            this._currentSettings.isEnabled = isEnabled;
            this._settingsBus.toggleIsEnabled(isEnabled)
                .then(tabRequests => tabRequests
                    .forEach(req => req
                        .catch(ex => this._app.isDebug && console.error("Toggle request to the tab faild with: " + ex.message || ex))));
            this._onSettingsChanged.raise(x => { }, this._shift);
            return this._storageManager.set({ isEnabled: isEnabled });
        }

        public setAsDefaultSettings()
        {
            this._defaultSettings = Object.assign({}, this._currentSettings);
            Object.assign(this._defaultSettings, { isDefault: true, colorSchemeId: "default" });
            return this._storageManager.set(this._defaultSettings);
        }

        public saveUserColorScheme(userColorScheme: Settings.ColorScheme): Promise<null>
        {
            return Promise.all([this.getDefaultSettings(), userColorScheme])
                .then(([defaultSettings, userScheme]) =>
                {
                    const storage = new Settings.ColorScheme();
                    storage.userColorSchemes = defaultSettings.userColorSchemes || new Array<Settings.ColorScheme>();
                    let existingScheme = storage.userColorSchemes.find(sch => sch.colorSchemeId === userScheme.colorSchemeId);
                    if (!existingScheme)
                    {
                        storage.userColorSchemes.push(Object.assign({}, userScheme));
                    }
                    else
                    {
                        Object.assign(existingScheme, userScheme)
                    }
                    return this._storageManager.set(storage);
                });
        }

        public deleteUserColorScheme(colorSchemeId: Settings.ColorSchemeName): Promise<null>
        {
            return Promise.all([this.getDefaultSettings(), colorSchemeId])
                .then(([defaultSettings, id]) =>
                {
                    if (defaultSettings.userColorSchemes && defaultSettings.userColorSchemes.length > 0)
                    {
                        const storage = {} as Settings.ColorScheme;
                        storage.userColorSchemes = defaultSettings.userColorSchemes;
                        let existingSchemeIndex = storage.userColorSchemes.findIndex(sch => sch.colorSchemeId === id);
                        if (existingSchemeIndex > -1)
                        {
                            storage.userColorSchemes.splice(existingSchemeIndex, 1);
                            return this._storageManager.set(storage);
                        }
                    }
                    return null;
                });
        }

        public deleteAllSettings()
        {
            return this._storageManager.clear();
        }

        public deleteCurrentSiteSettings()
        {
            return this._settingsBus.deleteSettings();
        }

        public applySettings()
        {
            const settings = Object.assign({}, this._currentSettings);
            if (settings.colorSchemeId === undefined ||
                settings.colorSchemeId !== "custom" as Settings.ColorSchemeName &&
                Settings.ColorSchemes[settings.colorSchemeId] &&
                !this.settingsAreEqual(Settings.ColorSchemes[settings.colorSchemeId], settings))
            {
                settings.colorSchemeId = "custom" as Settings.ColorSchemeName;
            }
            return this._settingsBus.applySettings(settings);
        }

        public changeSettings(newSettings: Settings.ColorScheme)
        {
            this._currentSettings = newSettings;
            this.updateSchedule();
            this.initCurSet();
            this._onSettingsChanged.raise(x => { }, this._shift);
        }
    }
}