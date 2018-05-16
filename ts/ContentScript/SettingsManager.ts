/// <reference path="../DI/-DI.ts" />
/// <reference path="../Colors/-Colors.ts" />
/// <reference path="../Settings/-Settings.ts" />
/// <reference path="../Settings/MatchPatternProcessor.ts" />
/// <reference path="../i18n/ITranslationAccessor.ts" />

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
        /** Complex processing mode is in use now */
        abstract get isComplex(): boolean;
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
            app: MidnightLizard.Settings.IApplicationSettings,
            storageManager: MidnightLizard.Settings.IStorageManager,
            settingsBus: MidnightLizard.Settings.ISettingsBus,
            matchPatternProcessor: MidnightLizard.Settings.IMatchPatternProcessor,
            i18n: MidnightLizard.i18n.ITranslationAccessor)
        {
            super(_rootDocument, app, storageManager, settingsBus, matchPatternProcessor, i18n);
            settingsBus.onCurrentSettingsRequested.addListener(this.onCurrentSettingsRequested, this);
            settingsBus.onIsEnabledToggleRequested.addListener(this.onIsEnabledToggleRequested, this);
            settingsBus.onNewSettingsApplicationRequested.addListener(this.onNewSettingsApplicationRequested, this);
            settingsBus.onSettingsDeletionRequested.addListener(this.onSettingsDeletionRequested, this);
        }

        protected initCurSet()
        {
            super.initCurSet();
            this.notifySettingsApplied();
        }

        protected async initCurrentSettings()
        {
            const storage = {
                ...Settings.ColorSchemes.default,
                ...Settings.ColorSchemes.dimmedDust,
                ...{ [this._settingsKey]: {} }
            };

            try
            {
                const defaultSettings = await this._storageManager.get(storage);
                const settings = (defaultSettings as any)[this._settingsKey] as Settings.ColorScheme;
                delete (defaultSettings as any)[this._settingsKey];
                await this.processDefaultSettings(defaultSettings, true);
                Object.assign(this._currentSettings, this._defaultSettings);
                if (settings)
                {
                    this.assignSettings(this._currentSettings, settings);
                }
                this.updateSchedule();
                this.initCurSet();
                this._onSettingsInitialized.raise(this._shift);
            }
            catch (ex)
            {
                this._app.isDebug && console.error(ex);
            }
        }

        protected async onSettingsDeletionRequested(response: AnyResponse)
        {
            if (window.top === window.self)
            {
                response(null);
            }
            if (this.isSelfMaintainable)
            {
                await this._storageManager.remove(this._settingsKey);
            }
        }

        protected onNewSettingsApplicationRequested(response: AnyResponse, newSettings?: Settings.ColorScheme): void
        {
            this._currentSettings = newSettings!;
            this.saveCurrentSettings();
            this.updateSchedule();
            this.initCurSet();
            this._onSettingsChanged.raise(response, this._shift);
        }

        protected onIsEnabledToggleRequested(response: AnyResponse, isEnabled?: boolean): void
        {
            this._currentSettings.isEnabled = isEnabled;
            this._onSettingsChanged.raise(response, this._shift);
            this.notifySettingsApplied();
        }

        protected onCurrentSettingsRequested(response: ColorSchemeResponse): void
        {
            this._currentSettings.location = this._rootDocument.location.href;
            response(this._currentSettings);
        }

        /** it is main frame or child frame w/o access to the main frame */
        protected get isSelfMaintainable()
        {
            let hasAccessToMainFrame: boolean = true;
            try { const test = window.top.location.hostname }
            catch { hasAccessToMainFrame = false; }
            return window.top === window.self || !hasAccessToMainFrame;
        }

        protected saveCurrentSettings()
        {
            if (this.isSelfMaintainable)
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
                    const forSave: Settings.ColorScheme = {} as any;
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
        }

        protected getSettingNameForCookies(propertyName: Settings.ColorSchemePropertyName)
        {
            return "ML" + propertyName.match(/^[^A-Z]{1,4}|[A-Z][^A-Z]{0,2}/g)!.join("").toUpperCase();
        }
    }
}