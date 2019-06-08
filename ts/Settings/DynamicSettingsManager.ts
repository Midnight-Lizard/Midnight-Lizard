import { injectable } from "../Utils/DI";
import { IBaseSettingsManager, BaseSettingsManager } from "./BaseSettingsManager";
import { ColorScheme } from "./ColorScheme";
import { IApplicationSettings } from "./IApplicationSettings";
import { IStorageManager } from "./IStorageManager";
import { ISettingsBus } from "./ISettingsBus";
import { IMatchPatternProcessor } from "./MatchPatternProcessor";
import { IRecommendations } from "./Recommendations";
import { ITranslationAccessor } from "../i18n/ITranslationAccessor";

export abstract class IDynamicSettingsManager extends IBaseSettingsManager
{
    abstract changeSettings(newSettings: ColorScheme, updateSchedule?: boolean): void;
}

@injectable(IDynamicSettingsManager)
class DynamicSettingsManager extends BaseSettingsManager implements IDynamicSettingsManager
{
    constructor(rootDocument: Document,
        app: IApplicationSettings,
        storageManager: IStorageManager,
        settingsBus: ISettingsBus,
        matchPatternProcessor: IMatchPatternProcessor,
        i18n: ITranslationAccessor,
        rec: IRecommendations)
    {
        super(rootDocument, app, storageManager, settingsBus, matchPatternProcessor, i18n, rec);
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