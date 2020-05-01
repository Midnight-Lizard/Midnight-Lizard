import { ColorScheme } from "../Settings/ColorScheme";
import { ArgumentedEvent, ResponsiveEvent } from "../Events/Event";
import { ArgumentedEventDispatcher } from "../Events/EventDispatcher";
import { ComponentShift } from "../Colors/ComponentShift";
import { ColorSchemeId, ColorSchemes } from "../Settings/ColorSchemes";
import { injectable, Scope } from "../Utils/DI";
import { IBaseSettingsManager, BaseSettingsManager } from "../Settings/BaseSettingsManager";
import { IApplicationSettings } from "../Settings/IApplicationSettings";
import { IStorageManager } from "../Settings/IStorageManager";
import { ISettingsBus } from "../Settings/ISettingsBus";
import { IMatchPatternProcessor } from "../Settings/MatchPatternProcessor";
import { IRecommendations } from "../Settings/Recommendations";
import { ITranslationAccessor } from "../i18n/ITranslationAccessor";

type ArgEvent<TRequestArgs> = ArgumentedEvent<TRequestArgs>;
type RespEvent<TResponseMethod extends Function, TRequestArgs> = ResponsiveEvent<TResponseMethod, TRequestArgs>;
let ArgEventDispatcher = ArgumentedEventDispatcher;

export abstract class IPopupSettingsManager
{
    /** MidnightLizard should be running on this page */
    abstract get isActive(): boolean;
    /** Current settings for calculations */
    abstract get shift(): ComponentShift;
    /** Current settings for communication */
    abstract get currentSettings(): ColorScheme;
    abstract get onSettingsInitialized(): ArgEvent<ComponentShift>;
    abstract get onSettingsInitializationFailed(): ArgEvent<any>;
    abstract get onSettingsChanged(): RespEvent<(scheme: ColorScheme) => void, ComponentShift>;
    abstract initDefaultColorSchemes(): void;
    abstract applyUserColorSchemesFromMemory(defaultSettings: ColorScheme): void;
    abstract getDefaultSettings(): Promise<ColorScheme>;
    abstract getDefaultSettingsCache(): ColorScheme;
    abstract setAsDefaultSettings(): Promise<ColorScheme>;
    abstract changeDefaultSettings(settings: ColorScheme): Promise<ColorScheme>;
    abstract toggleIsEnabled(isEnabled: boolean): Promise<null>;
    abstract changeSettings(newSettings: ColorScheme): void;
    abstract applySettings(): Promise<ColorScheme>;
    abstract deleteAllSettings(): Promise<null>;
    abstract deleteCurrentSiteSettings(): Promise<null>;
    abstract deleteAllWebsitesSettings(): Promise<null>;
    abstract saveUserColorScheme(userColorScheme: ColorScheme): Promise<null>;
    abstract deleteUserColorScheme(colorSchemeId: ColorSchemeId): Promise<null>;
    abstract settingsAreEqual(first: ColorScheme, second: ColorScheme): boolean;
    abstract toggleSync(value: boolean): Promise<null>;
    abstract getCurrentSorage(): Promise<boolean>;
    abstract get currentTabIsAccessible(): boolean;
    abstract get currentSiteSettings(): ColorScheme;
    abstract set currentSiteSettings(settings: ColorScheme);
    abstract async getErrorReason(error: any): Promise<string>;
    abstract get defaultColorSchemeId(): ColorSchemeId | undefined;
}

@injectable(IPopupSettingsManager)
@injectable(IBaseSettingsManager, Scope.ExistingInstance)
class PopupSettingsManager extends BaseSettingsManager implements IPopupSettingsManager
{
    private _currentTabIsAccessible = true;
    public get currentTabIsAccessible() { return this._currentTabIsAccessible; }
    protected _currentSiteSettings!: ColorScheme;
    public get currentSiteSettings() { return this._currentSiteSettings }
    public set currentSiteSettings(settings: ColorScheme) { this._currentSiteSettings = settings }

    constructor(rootDocument: Document,
        app: IApplicationSettings,
        storageManager: IStorageManager,
        settingsBus: ISettingsBus,
        matchPatternProcessor: IMatchPatternProcessor,
        i18n: ITranslationAccessor,
        rec: IRecommendations)
    {
        super(rootDocument, app, storageManager, settingsBus, matchPatternProcessor, i18n, rec);
    }

    protected async initCurrentSettings()
    {
        try
        {
            let [currentSettings, defaultSettings] = await Promise.all([
                this._settingsBus.getCurrentSettings().catch(ex => (this._app.isDebug && console.error(ex)) as never),
                this.getDefaultSettings()]);
            if (!currentSettings)
            {
                currentSettings = {
                    ...defaultSettings,
                    location: "http://" + ColorSchemes.default.colorSchemeName.toLowerCase()
                };
                this._currentTabIsAccessible = false;
            }
            this._currentSettings = currentSettings;
            this.updateSchedule();
            this.initCurSet();
            this._currentSiteSettings = { ...currentSettings };
            if (currentSettings.location)
            {
                this._rootUrl = currentSettings.location;
            }
            this._onSettingsInitialized.raise(this._shift);
        }
        catch (ex)
        {
            this._app.isDebug && console.error(ex);
            this._onSettingsInitializationFailed.raise(ex);
        }
    }

    public getCurrentSorage()
    {
        return this._storageManager.getCurrentStorage().then(storType => storType === "sync");
    }

    public getDefaultSettingsCache(): ColorScheme
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

    public async setAsDefaultSettings()
    {
        return await this.changeDefaultSettings(this._currentSettings);
    }

    public async changeDefaultSettings(settings: ColorScheme)
    {
        await this.getDefaultSettings(false);
        this._defaultSettings = Object.assign(this._defaultSettings, settings);
        await this._storageManager.set(this._defaultSettings);
        this.renameSettingsToDefault(this._defaultSettings);
        Object.assign(ColorSchemes.default, this._defaultSettings);
        if (this.currentSettings.colorSchemeId === ColorSchemes.default.colorSchemeId)
        {
            Object.assign(this._currentSettings, this._defaultSettings);
        }
        this.changeSettings(this.currentSettings);
        this.notifySettingsApplied();
        return this._defaultSettings;
    }

    public deleteAllSettings()
    {
        return this._storageManager.clear();
    }

    public deleteCurrentSiteSettings()
    {
        return this._settingsBus.deleteSettings();
    }

    public async deleteAllWebsitesSettings()
    {
        const storage: any = await this._storageManager.get(null);
        return this._storageManager.remove(
            Object.keys(storage).filter(x => x.startsWith("ws:")));
    }

    public toggleSync(value: boolean): Promise<null>
    {
        return this._storageManager.toggleSync(value);
    }

    public applySettings()
    {
        const settings = Object.assign({}, this._currentSettings);
        if (settings.colorSchemeId === undefined ||
            settings.colorSchemeId !== "custom" as ColorSchemeId &&
            ColorSchemes[settings.colorSchemeId] &&
            !this.settingsAreEqual(ColorSchemes[settings.colorSchemeId], settings))
        {
            settings.colorSchemeId = "custom" as ColorSchemeId;
        }
        return this._settingsBus.applySettings(settings);
    }

    public changeSettings(newSettings: ColorScheme)
    {
        this._currentSettings = newSettings;
        this.updateSchedule();
        this.initCurSet();
        this._onSettingsChanged.raise(x => { }, this._shift);
    }
}