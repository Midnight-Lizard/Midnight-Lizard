/// <reference path="../DI/-DI.ts" />
/// <reference path="../Colors/-Colors.ts" />
/// <reference path="../Settings/-Settings.ts" />

namespace MidnightLizard.Popup
{
    type AnyResponse = (args: any) => void;
    type ColorSchemeResponse = (settings: Settings.ColorScheme) => void;
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
        abstract initDefaultColorSchemes(): void;
        abstract applyUserColorSchemes(defaultSettings: Settings.ColorScheme): void;
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
        abstract toggleSync(value: boolean): Promise<null>;
        abstract getCurrentSorage(): Promise<boolean>;
    }

    @DI.injectable(IPopupSettingsManager)
    @DI.injectable(MidnightLizard.Settings.IBaseSettingsManager, DI.Scope.ExistingInstance)
    class PopupSettingsManager extends MidnightLizard.Settings.BaseSettingsManager implements IPopupSettingsManager
    {
        // isActive: boolean;
        // shift: Colors.ComponentShift;
        // currentSettings: Settings.ColorScheme;
        // onSettingsInitialized: Events.ArgumentedEvent<Colors.ComponentShift>;
        // onSettingsChanged: Events.ResponsiveEvent<(scheme: Settings.ColorScheme) => void, Colors.ComponentShift>;

        constructor(rootDocument: Document,
            app: MidnightLizard.Settings.IApplicationSettings,
            storageManager: MidnightLizard.Settings.IStorageManager,
            settingsBus: MidnightLizard.Settings.ISettingsBus)
        {
            super(rootDocument, app, storageManager, settingsBus);
        }

        protected initCurrentSettings()
        {
            Promise.all([this.getDefaultSettings(), this._settingsBus.getCurrentSettings()])
                .then(([defaultSettings, currentSettings]) =>
                {
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

        public getCurrentSorage()
        {
            return this._storageManager.getCurrentStorage().then(storType => storType === "sync");
        }

        public async getDefaultSettings()
        {
            const defaultSettings = await this._storageManager.get({
                ...Settings.ColorSchemes.default,
                ...Settings.ColorSchemes.dimmedDust
            });
            this.applyUserColorSchemes(defaultSettings);
            this.assignSettings(this._defaultSettings, defaultSettings);
            this._defaultSettings.colorSchemeId = "default";
            this._defaultSettings.colorSchemeName = "Default";
            return this._defaultSettings;
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
            this._defaultSettings.colorSchemeId = "default";
            this._defaultSettings.colorSchemeName = "Default";
            return this._storageManager.set(this._currentSettings);
        }

        public async saveUserColorScheme(userColorScheme: Settings.ColorScheme): Promise<null>
        {
            const storage = await this._storageManager.get<Settings.ColorScheme>({ userColorSchemes: [] } as any);
            let existingScheme = storage.userColorSchemes!.find(sch => sch.colorSchemeId === userColorScheme.colorSchemeId);
            if (existingScheme)
            {
                Object.assign(existingScheme, userColorScheme)
            }
            else
            {
                storage.userColorSchemes!.push(userColorScheme);
            }
            return this._storageManager.set(storage);
        }

        public async deleteUserColorScheme(colorSchemeId: Settings.ColorSchemeName): Promise<null>
        {
            const storage = await this._storageManager.get<Settings.ColorScheme>({ userColorSchemes: [] } as any);
            if (storage.userColorSchemes && storage.userColorSchemes.length > 0)
            {
                let existingSchemeIndex = storage.userColorSchemes.findIndex(sch => sch.colorSchemeId === colorSchemeId);
                if (existingSchemeIndex > -1)
                {
                    storage.userColorSchemes.splice(existingSchemeIndex, 1);
                    return this._storageManager.set(storage);
                }
            }
            return null;
        }

        public deleteAllSettings()
        {
            return this._storageManager.clear();
        }

        public deleteCurrentSiteSettings()
        {
            return this._settingsBus.deleteSettings();
        }

        public toggleSync(value: boolean): Promise<null>
        {
            return this._storageManager.toggleSync(value);
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