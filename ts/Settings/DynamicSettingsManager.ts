/// <reference path="../DI/-DI.ts" />
/// <reference path="../Colors/-Colors.ts" />
/// <reference path="../Settings/-Settings.ts" />
/// <reference path="../Settings/MatchPatternProcessor.ts" />
/// <reference path="../i18n/ITranslationAccessor.ts" />

namespace MidnightLizard.Settings
{
    export abstract class IDynamicSettingsManager extends IBaseSettingsManager
    {
        abstract changeSettings(newSettings: Settings.ColorScheme, updateSchedule?: boolean): void;
    }

    @DI.injectable(IDynamicSettingsManager)
    class DynamicSettingsManager extends MidnightLizard.Settings.BaseSettingsManager implements IDynamicSettingsManager
    {
        constructor(rootDocument: Document,
            app: MidnightLizard.Settings.IApplicationSettings,
            storageManager: MidnightLizard.Settings.IStorageManager,
            settingsBus: MidnightLizard.Settings.ISettingsBus,
            matchPatternProcessor: MidnightLizard.Settings.IMatchPatternProcessor,
            i18n: MidnightLizard.i18n.ITranslationAccessor)
        {
            super(rootDocument, app, storageManager, settingsBus, matchPatternProcessor, i18n);
            this.isInit = true
        }

        protected initCurrentSettings() { }

        changeSettings(newSettings: ColorScheme, updateSchedule?: boolean): void
        {
            Object.assign(this._currentSettings, newSettings);
            if (updateSchedule)
            {
                this.updateSchedule();
            }
            this.initCurSet();
            this._onSettingsChanged.raise(x => { }, this._shift);
        }
    }
}