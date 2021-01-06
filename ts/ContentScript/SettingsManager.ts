import { ColorScheme, ColorSchemePropertyName, excludeSettingsForSave } from "../Settings/ColorScheme";
import { ArgumentedEvent, ResponsiveEvent } from "../Events/Event";
import { injectable, Scope } from "../Utils/DI";
import { IBaseSettingsManager, BaseSettingsManager } from "../Settings/BaseSettingsManager";
import { IApplicationSettings } from "../Settings/IApplicationSettings";
import { IStorageManager } from "../Settings/IStorageManager";
import { ISettingsBus } from "../Settings/ISettingsBus";
import { IMatchPatternProcessor } from "../Settings/MatchPatternProcessor";
import { IRecommendations } from "../Settings/Recommendations";
import { ColorSchemes, ColorSchemeId } from "../Settings/ColorSchemes";
import { ComponentShift } from "../Colors/ComponentShift";
import { ITranslationAccessor } from "../i18n/ITranslationAccessor";

type AnyResponse = (args: any) => void;
type ColorSchemeResponse = (settings: ColorScheme) => void;
type ArgEvent<TRequestArgs> = ArgumentedEvent<TRequestArgs>;
type RespEvent<TResponseMethod extends Function, TRequestArgs> = ResponsiveEvent<TResponseMethod, TRequestArgs>;

export abstract class ISettingsManager
{
    /** MidnightLizard should be running on this page */
    abstract get isActive(): boolean;
    /** Complex processing mode is in use now */
    abstract get isComplex(): boolean;
    /** Current settings for calculations */
    abstract get shift(): ComponentShift;
    /** Current settings for communication */
    abstract get currentSettings(): ColorScheme;
    abstract get onSettingsInitialized(): ArgEvent<ComponentShift>;
    abstract get onSettingsChanged(): RespEvent<(scheme: ColorScheme) => void, ComponentShift>;
}

@injectable(ISettingsManager)
@injectable(IBaseSettingsManager, Scope.ExistingInstance)
class SettingsManager extends BaseSettingsManager implements ISettingsManager
{
    private skipOneSettingsUpdate: boolean = false;
    protected _scheduleUpdateTimeout?: number;

    constructor(
        _rootDocument: Document,
        app: IApplicationSettings,
        storageManager: IStorageManager,
        settingsBus: ISettingsBus,
        matchPatternProcessor: IMatchPatternProcessor,
        i18n: ITranslationAccessor,
        rec: IRecommendations)
    {
        super(_rootDocument, app, storageManager, settingsBus, matchPatternProcessor, i18n, rec);
        settingsBus.onCurrentSettingsRequested.addListener(this.onCurrentSettingsRequested, this);
        settingsBus.onIsEnabledToggleRequested.addListener(this.onIsEnabledToggleRequested, this);
        settingsBus.onNewSettingsApplicationRequested.addListener(this.onNewSettingsApplicationRequested, this);
        settingsBus.onSettingsDeletionRequested.addListener(this.onSettingsDeletionRequested, this);
        storageManager.onStorageChanged.addListener(this.onStorageChanged, this);
    }

    protected initCurSet()
    {
        super.initCurSet();
        this.notifySettingsApplied();
    }

    protected updateSchedule()
    {
        super.updateSchedule();
        if (this._scheduleUpdateTimeout)
        {
            clearTimeout(this._scheduleUpdateTimeout);
        }
        if (this._scheduleStartTime !== 0 || this._scheduleFinishTime !== 24)
        {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const millisecondsUntilNextSwitch = [
                this._scheduleStartTime, this._scheduleFinishTime,
                this._scheduleStartTime + 24, this._scheduleFinishTime + 24
            ]
                .filter(h => h > this._curTime)
                .reduce((next, h) => h < next ? h : next, 99) * 60 * 60 * 1000 +
                today.getTime() - Date.now();
            this._scheduleUpdateTimeout = window.setTimeout(() =>
            {
                this.initCurrentSettings();
            }, millisecondsUntilNextSwitch);
        }
    }

    protected async initCurrentSettings()
    {
        const storage = {
            ...ColorSchemes.default,
            ...ColorSchemes.dimmedDust,
            ...{ [this._settingsKey]: {} }
        };

        try
        {
            const defaultSettings = await this._storageManager.get(storage);
            const settings = (defaultSettings as any)[this._settingsKey] as ColorScheme;
            delete (defaultSettings as any)[this._settingsKey];
            await this.processDefaultSettings(defaultSettings, true);
            Object.assign(this._currentSettings, this._defaultSettings);
            if (settings)
            {
                this.assignSettings(this._currentSettings, settings);
            }
            this.updateSchedule();
            this.initCurSet();
            if (!this.isInit)
            {
                this._onSettingsInitialized.raise(this._shift);
            }
            else
            {
                this._onSettingsChanged.raise(() => null, this._shift);
            }
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

    protected onNewSettingsApplicationRequested(response: AnyResponse, newSettings?: ColorScheme)
    {
        this._currentSettings = newSettings!;
        this.saveCurrentSettings();
        this.updateSchedule();
        this.initCurSet();
        this._onSettingsChanged.raise(response, this._shift);
    }

    protected onIsEnabledToggleRequested(response: AnyResponse, isEnabled?: boolean): void
    {
        if (isEnabled !== this._currentSettings.isEnabled)
        {
            this._currentSettings.isEnabled = isEnabled;
            this._onSettingsChanged.raise(response, this._shift);
            this.notifySettingsApplied();
        }
    }

    protected onCurrentSettingsRequested(response: ColorSchemeResponse): void
    {
        this._currentSettings.location = this._rootDocument.location!.href;
        response(this._currentSettings);
    }

    protected async onStorageChanged(changes?: Partial<ColorScheme>)
    {
        if (changes && this.skipOneSettingsUpdate && this._settingsKey in changes)
        {
            this.skipOneSettingsUpdate = false;
        }
        else if (changes && (
            //+ current website settings changed
            this._settingsKey in changes
            ||
            //+ current website has default settings and they changed
            this._currentSettings.colorSchemeId === ColorSchemes.default.colorSchemeId &&
            Object.keys(changes).find(key => !!key && !key.startsWith("cs:") && key !== "userColorSchemeIds")
            ||
            //+ current website settings use default schedule and it changed
            this._currentSettings.useDefaultSchedule &&
            ("scheduleStartHour" in changes || "scheduleFinishHour" in changes)
            ||
            //+ color restoration options changed
            ("restoreColorsOnCopy" in changes || "restoreColorsOnPrint" in changes)
            ||
            //+ current website color scheme changed
            `cs:${this._currentSettings.colorSchemeId}` in changes
            ||
            // current website uses default settings and corresponding color scheme has changed
            this._currentSettings.colorSchemeId === ColorSchemes.default.colorSchemeId &&
            `cs:${this.defaultColorSchemeId}` in changes
            ||
            //+ storage type changed
            'sync' in changes))
        {
            this.initDefaultColorSchemes();
            await this.initCurrentSettings();
        }
    }

    /** it is main frame or child frame w/o access to the main frame */
    protected get isSelfMaintainable()
    {
        let hasAccessToMainFrame: boolean = true;
        try { const test = window.top.location.hostname }
        catch { hasAccessToMainFrame = false; }
        return window.top === window.self || !hasAccessToMainFrame;
    }

    protected async saveCurrentSettings()
    {
        if (this.isSelfMaintainable)
        {
            try
            {
                this.skipOneSettingsUpdate = true;
                if (this._currentSettings.colorSchemeId === "default")
                {
                    await this._storageManager.set({
                        [this._settingsKey]: {
                            runOnThisSite: this._currentSettings.runOnThisSite
                        }
                    });
                }
                else if (this._currentSettings.colorSchemeId && this._currentSettings.colorSchemeId !== "custom" as ColorSchemeId)
                {
                    await this._storageManager.set({
                        [this._settingsKey]: {
                            colorSchemeId: this._currentSettings.colorSchemeId,
                            runOnThisSite: this._currentSettings.runOnThisSite
                        }
                    });
                }
                else
                {
                    let setting: ColorSchemePropertyName;
                    const forSave = {} as any;
                    for (setting in this._currentSettings)
                    {
                        if (excludeSettingsForSave.indexOf(setting) == -1)
                        {
                            forSave[setting] = this._currentSettings[setting];
                        }
                    }
                    await this._storageManager.set({ [this._settingsKey]: forSave });
                }
            }
            catch (error)
            {
                const reason = await this.getErrorReason(error);
                alert("Midnight Lizard\n" + this._i18n.getMessage("applyOnPageFailureMessage") + reason);
            }
        }
    }

    protected getSettingNameForCookies(propertyName: ColorSchemePropertyName)
    {
        return "ML" + propertyName.match(/^[^A-Z]{1,4}|[A-Z][^A-Z]{0,2}/g)!.join("").toUpperCase();
    }
}