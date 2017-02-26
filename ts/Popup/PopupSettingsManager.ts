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
        abstract setAsDefaultSettings(): Promise<null>;
        abstract toggleIsEnabled(isEnabled: boolean): Promise<null>;
        abstract changeSettings(newSettings: Settings.ColorScheme): void;
        abstract applySettings(): Promise<Settings.ColorScheme>;
        abstract deleteAllSettings(): Promise<null>;
        abstract deleteCurrentSiteSettings(): Promise<null>;
    }

    @DI.injectable(IPopupSettingsManager)
    @DI.injectable(MidnightLizard.Settings.IBaseSettingsManager, DI.Scope.ExistingInstance)
    class PopupSettingsManager extends MidnightLizard.Settings.BaseSettingsManager implements IPopupSettingsManager
    {

        constructor(
            app: MidnightLizard.Settings.IApplicationSettings,
            storageManager: MidnightLizard.Settings.IStorageManager,
            settingsBus: MidnightLizard.Settings.ISettingsBus)
        {
            super(app, storageManager, settingsBus);
        }

        protected initCurrentSettings()
        {
            this._settingsBus.getCurrentSettings()
                .then((currentSettings: Settings.ColorScheme) =>
                {
                    this._currentSettings = currentSettings;
                    this.initCurSet();
                    this._onSettingsInitialized.raise(this._shift);
                })
                .catch(ex =>
                {
                    this._app.isDebug && console.error(ex);
                    // setTimeout(() => 
                    this._onSettingsInitializationFailed.raise(ex);
                    //, 1);
                });
        }

        public getDefaultSettings()
        {
            return this._storageManager.get<Settings.ColorScheme>(null);
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
            return this._storageManager.set(this._currentSettings);
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
            return this._settingsBus.applySettings(this._currentSettings);
        }

        public changeSettings(newSettings: Settings.ColorScheme)
        {
            this._currentSettings = newSettings;
            this.initCurSet();
            this._onSettingsChanged.raise(x => { }, this._shift);
        }
    }
}