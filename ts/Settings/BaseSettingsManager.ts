import
{
    ColorScheme, ProcessingMode, ColorSchemePropertyName,
    ColorSchemeNamePrefix, excludeSettingsForCompare, PartialColorScheme
} from "./ColorScheme";
import { ArgumentedEvent, ResponsiveEvent } from "../Events/Event";
import { ArgumentedEventDispatcher, ResponsiveEventDispatcher } from "../Events/EventDispatcher";
import { ColorSchemeId, ColorSchemes, DefaultColorSchemes } from "./ColorSchemes";
import { ComponentShift } from "../Colors/ComponentShift";
import { IApplicationSettings } from "./IApplicationSettings";
import { IStorageManager, StorageLimits } from "./IStorageManager";
import { ISettingsBus } from "./ISettingsBus";
import { IMatchPatternProcessor } from "./MatchPatternProcessor";
import { ITranslationAccessor } from "../i18n/ITranslationAccessor";
import { IRecommendations } from "./Recommendations";
import { isNum } from "../Utils/TypeGuards";

type ArgEvent<TRequestArgs> = ArgumentedEvent<TRequestArgs>;
type RespEvent<TResponseMethod extends Function, TRequestArgs> = ResponsiveEvent<TResponseMethod, TRequestArgs>;
const ArgEventDispatcher = ArgumentedEventDispatcher;

export abstract class IBaseSettingsManager
{
    /** MidnightLizard should be running on this page */
    abstract get isActive(): boolean;
    /** Complex processing mode is in use now */
    abstract get isComplex(): boolean;
    /** Simplified processing mode is in use now */
    abstract get isSimple(): boolean;
    /** Filter processing mode is in use now */
    abstract get isFilter(): boolean;
    /** Current computed processing mode */
    abstract get computedMode(): ProcessingMode;
    /** Current settings for calculations */
    abstract get shift(): ComponentShift;
    /** Current settings for communication */
    abstract get currentSettings(): ColorScheme;
    abstract get onSettingsInitialized(): ArgEvent<ComponentShift>;
    abstract get onSettingsChanged(): RespEvent<(scheme: ColorScheme) => void, ComponentShift>;
    abstract getDefaultSettings(renameToDefault?: boolean): Promise<ColorScheme>;
    abstract computeProcessingMode(doc: Document, countElements?: boolean): void;
    /** Deactivates old version of extension - this one */
    abstract deactivateOldVersion(): void;
}
/**
 * Base Settings Manager
 */
export abstract class BaseSettingsManager implements IBaseSettingsManager
{
    protected _scheduleStartTime = 0;
    protected _scheduleFinishTime = 24;
    protected _rootUrl: string;
    protected _settingsKey: string;
    protected _curTime = this.GetCurrentTime();
    private _isNotRecommended = false;
    protected get isScheduled(): boolean
    {
        return this._scheduleStartTime <= this._scheduleFinishTime
            ? this._scheduleStartTime <= this._curTime && this._curTime < this._scheduleFinishTime
            : this._scheduleStartTime <= this._curTime || this._curTime < this._scheduleFinishTime;
    }
    protected _lastIncludeMatchPatternsTestResults?: boolean;
    protected get matchesInclude(): boolean
    {
        if (this._lastIncludeMatchPatternsTestResults === undefined)
        {
            this._lastIncludeMatchPatternsTestResults =
                this.testMatchPatterns(this._currentSettings.includeMatches, true);
        }
        return this._lastIncludeMatchPatternsTestResults;
    }
    protected _lastExcludeMatchPatternsTestResults?: boolean;
    protected get matchesExclude(): boolean
    {
        if (this._lastExcludeMatchPatternsTestResults === undefined)
        {
            this._lastExcludeMatchPatternsTestResults =
                this.testMatchPatterns(this._currentSettings.excludeMatches, false);
        }
        return this._lastExcludeMatchPatternsTestResults
    }

    protected _defaultSettings: ColorScheme;
    /** Current settings for communication */
    protected _currentSettings: ColorScheme;
    /** Current settings for communication */
    public get currentSettings() { return this._currentSettings }

    /** Current settings for calculations */
    protected _shift!: ComponentShift;
    /** Current settings for calculations */
    public get shift() { return this._shift }

    /** MidnightLizard should be running on this page */
    public get isActive()
    {
        return !this._isNotRecommended && this.isInit &&
            this._currentSettings.isEnabled! &&
            this.isScheduled && (
                this._currentSettings.runOnThisSite && !this.matchesExclude
                ||
                !this._currentSettings.runOnThisSite && this.matchesInclude && !this.matchesExclude
            )
    }
    public get isComplex() { return this._computedMode === ProcessingMode.Complex }
    public get isSimple() { return this._computedMode === ProcessingMode.Simplified }
    public get isFilter() { return this._computedMode === ProcessingMode.Filter }
    public get computedMode() { return this._computedMode }
    protected _computedMode: ProcessingMode = ProcessingMode.Complex;
    protected isInit = false;

    private _defaultColorSchemeId!: ColorSchemeId;
    public get defaultColorSchemeId() { return this._defaultColorSchemeId };

    /** SettingsManager constructor
     * @param _cookiesManager - abstract cookies manager
     * @param _settingsBus - abstract settings communication bus
     * @param _storageManager - abstract browser storage manager
     **/
    constructor(
        protected readonly _rootDocument: Document,
        protected readonly _app: IApplicationSettings,
        protected readonly _storageManager: IStorageManager,
        protected readonly _settingsBus: ISettingsBus,
        protected readonly _matchPatternProcessor: IMatchPatternProcessor,
        protected readonly _i18n: ITranslationAccessor,
        private readonly _recommendations: IRecommendations)
    {
        let hostName: string;
        try
        {
            hostName = window.top.location.hostname;
            this._rootUrl = window.top.location.href;
        }
        catch
        {
            hostName = _rootDocument.location!.hostname;
            this._rootUrl = _rootDocument.location!.href;
        }
        this._settingsKey = `ws:${hostName}`; //`
        this.onSettingsInitialized.addListener(shift => this.isInit = true, this);
        this.initDefaultColorSchemes();
        this._defaultSettings = { ...ColorSchemes.default, ...ColorSchemes.dimmedDust };
        this.renameSettingsToDefault(this._defaultSettings);
        this._currentSettings = { ...this._defaultSettings };
        this.initCurrentSettings();
    }

    protected abstract initCurrentSettings(): void;

    computeProcessingMode(doc: Document, countElements = true): void
    {
        this._isNotRecommended = false;
        if (this._currentSettings.mode === ProcessingMode.Filter)
        {
            this._computedMode = ProcessingMode.Filter;
        }
        else if (this._currentSettings.mode === ProcessingMode.Automatic)
        {
            let recommendedMode = this._recommendations
                .getRecommendedProcessingMode(this._rootDocument.location!.href, this._rootUrl);
            if (recommendedMode !== undefined)
            {
                if (recommendedMode)
                {
                    this._computedMode = recommendedMode;
                }
                else
                {
                    this._isNotRecommended = true;
                }
            }
            else if (this._app.isMobile || countElements && doc.body &&
                doc.body.getElementsByTagName("*").length > this._currentSettings.modeAutoSwitchLimit)
            {
                this._computedMode = ProcessingMode.Simplified;
            }
        }
        this._app.isDebug && console.log(`
            ${this._computedMode}: ${doc.body && doc.body.getElementsByTagName("*").length}
            mode: ${this.currentSettings.mode}
            self: ${this._rootDocument.location!.href}
            top: ${this._rootUrl}`);
    }

    public deactivateOldVersion()
    {
        this.isInit = false;
    }

    protected initCurSet()
    {
        this._lastIncludeMatchPatternsTestResults =
            this._lastExcludeMatchPatternsTestResults = undefined;

        this.applyBackwardCompatibility(this._currentSettings);
        this._computedMode =
            this._currentSettings.mode === ProcessingMode.Automatic
                ? ProcessingMode.Complex
                : this._currentSettings.mode;
        const set = Object.assign({}, this._currentSettings);
        for (const setting in set)
        {
            if (setting in ColorSchemes.dimmedDust)
            {
                const prop = setting as ColorSchemePropertyName;
                const val = set[prop];
                if (!/Hue$/g.test(prop) && isNum(val))
                {
                    (set as any)[prop] = val / 100;
                }
            }
            else
            {
                delete (set as any)[setting];
            }
        }
        this._shift = {
            Background: {
                saturationLimit: set.backgroundSaturationLimit,
                contrast: set.backgroundContrast,
                lightnessLimit: set.backgroundLightnessLimit,
                graySaturation: set.backgroundGraySaturation,
                grayHue: set.backgroundGrayHue,
                replaceAllHues: set.backgroundReplaceAllHues || false,
                hueGravity: set.backgroundHueGravity || 0
            },
            HighlightedBackground: {
                saturationLimit: Math.min(Number((set.backgroundSaturationLimit * 1.3).toFixed(2)), 1),
                contrast: Math.min(Number((set.buttonContrast * 1.5).toFixed(2)), 1),
                lightnessLimit: Number((set.borderLightnessLimit * 0.8).toFixed(2)),
                graySaturation: set.backgroundGraySaturation,
                grayHue: set.backgroundGrayHue,
                replaceAllHues: set.backgroundReplaceAllHues || false,
                hueGravity: set.backgroundHueGravity || 0
            },
            ButtonBackground: {
                saturationLimit: set.buttonSaturationLimit,
                contrast: set.buttonContrast,
                lightnessLimit: set.buttonLightnessLimit,
                graySaturation: set.buttonGraySaturation,
                grayHue: set.buttonGrayHue,
                replaceAllHues: set.buttonReplaceAllHues || false,
                hueGravity: set.buttonHueGravity || 0
            },
            TextSelection: {
                saturationLimit: Math.max(set.textSaturationLimit, 0.3),
                contrast: 0,
                lightnessLimit: 0.46,
                graySaturation: Math.max(set.textSaturationLimit, 0.3),
                grayHue: set.textSelectionHue,
                replaceAllHues: true,
                hueGravity: 0
            },
            Text: {
                saturationLimit: set.textSaturationLimit,
                contrast: set.textContrast,
                lightnessLimit: set.textLightnessLimit,
                graySaturation: set.textGraySaturation,
                grayHue: set.textGrayHue,
                replaceAllHues: set.textReplaceAllHues || false,
                hueGravity: set.textHueGravity || 0
            },
            HighlightedText: {
                saturationLimit: Math.min(Number((set.textSaturationLimit * 1.2).toFixed(2)), 1),
                contrast: Math.min(Number((set.textContrast * 1.2).toFixed(2)), 1),
                lightnessLimit: Math.min(Number((set.textLightnessLimit * 1.25).toFixed(2)), 1),
                graySaturation: set.textGraySaturation,
                grayHue: set.textGrayHue,
                replaceAllHues: set.textReplaceAllHues || false,
                hueGravity: set.textHueGravity || 0
            },
            Link: {
                saturationLimit: set.linkSaturationLimit,
                contrast: set.linkContrast,
                lightnessLimit: set.linkLightnessLimit,
                graySaturation: set.linkDefaultSaturation,
                grayHue: set.linkDefaultHue,
                replaceAllHues: set.linkReplaceAllHues || false,
                hueGravity: set.linkHueGravity || 0
            },
            Link$Active: {
                saturationLimit: set.linkSaturationLimit,
                contrast: set.linkContrast,
                lightnessLimit: Number((set.linkLightnessLimit * 0.9).toFixed(2)),
                graySaturation: set.linkDefaultSaturation,
                grayHue: set.linkDefaultHue,
                replaceAllHues: set.linkReplaceAllHues || false,
                hueGravity: set.linkHueGravity || 0
            },
            Link$Hover: {
                saturationLimit: set.linkSaturationLimit,
                contrast: Math.min(Number((set.linkContrast * 1.1).toFixed(2)), 1),
                lightnessLimit: Math.min(Number((set.linkLightnessLimit * 1.1).toFixed(2)), 1),
                graySaturation: set.linkDefaultSaturation,
                grayHue: set.linkDefaultHue,
                replaceAllHues: set.linkReplaceAllHues || false,
                hueGravity: set.linkHueGravity || 0
            },
            VisitedLink: {
                saturationLimit: set.linkSaturationLimit,
                contrast: set.linkContrast,
                lightnessLimit: set.linkLightnessLimit,
                graySaturation: set.linkDefaultSaturation,
                grayHue: set.linkVisitedHue,
                replaceAllHues: true,
                hueGravity: 0
            },
            VisitedLink$Hover: {
                saturationLimit: set.linkSaturationLimit,
                contrast: Math.min(Number((set.linkContrast * 1.1).toFixed(2)), 1),
                lightnessLimit: Math.min(Number((set.linkLightnessLimit * 1.1).toFixed(2)), 1),
                graySaturation: set.linkDefaultSaturation,
                grayHue: set.linkVisitedHue,
                replaceAllHues: true,
                hueGravity: 0
            },
            VisitedLink$Active: {
                saturationLimit: set.linkSaturationLimit,
                contrast: set.linkContrast,
                lightnessLimit: Number((set.linkLightnessLimit * 0.9).toFixed(2)),
                graySaturation: set.linkDefaultSaturation,
                grayHue: set.linkVisitedHue,
                replaceAllHues: true,
                hueGravity: 0
            },
            TextShadow: {
                saturationLimit: set.borderSaturationLimit,
                contrast: 0.8,
                lightnessLimit: 1,
                graySaturation: set.borderGraySaturation,
                grayHue: set.borderGrayHue,
                replaceAllHues: set.borderReplaceAllHues || false,
                hueGravity: set.borderHueGravity || 0
            },
            Border: {
                saturationLimit: set.borderSaturationLimit,
                contrast: set.borderContrast,
                lightnessLimit: set.borderLightnessLimit,
                graySaturation: set.borderGraySaturation,
                grayHue: set.borderGrayHue,
                replaceAllHues: set.borderReplaceAllHues || false,
                hueGravity: set.borderHueGravity || 0
            },
            ButtonBorder: {
                saturationLimit: Number((set.borderSaturationLimit * 0.8).toFixed(2)),
                contrast: Number((set.borderContrast * 0.5).toFixed(2)),
                lightnessLimit: Number((set.borderLightnessLimit * 0.8).toFixed(2)),
                graySaturation: set.borderGraySaturation,
                grayHue: set.borderGrayHue,
                replaceAllHues: set.borderReplaceAllHues || false,
                hueGravity: set.borderHueGravity || 0
            },
            Scrollbar$Hover: {
                saturationLimit: set.scrollbarSaturationLimit,
                contrast: set.scrollbarContrast,
                lightnessLimit: set.scrollbarLightnessLimit,
                graySaturation: set.scrollbarSaturationLimit,
                grayHue: set.scrollbarGrayHue,
                replaceAllHues: false,
                hueGravity: 0
            },
            Scrollbar$Normal: {
                saturationLimit: set.scrollbarSaturationLimit,
                contrast: set.scrollbarContrast,
                lightnessLimit: Number((set.scrollbarLightnessLimit * 0.8).toFixed(2)),
                graySaturation: set.scrollbarSaturationLimit,
                grayHue: set.scrollbarGrayHue,
                replaceAllHues: false,
                hueGravity: 0
            },
            Scrollbar$Active: {
                saturationLimit: set.scrollbarSaturationLimit,
                contrast: set.scrollbarContrast,
                lightnessLimit: Number((set.scrollbarLightnessLimit * 0.7).toFixed(2)),
                graySaturation: set.scrollbarSaturationLimit,
                grayHue: set.scrollbarGrayHue,
                replaceAllHues: false,
                hueGravity: 0
            },
            Image: {
                saturationLimit: set.imageSaturationLimit,
                contrast: set.textContrast,
                lightnessLimit: set.imageLightnessLimit,
                graySaturation: set.textGraySaturation,
                grayHue: set.textGrayHue,
                replaceAllHues: false,
                hueGravity: 0
            },
            SvgBackground: {
                saturationLimit: set.buttonSaturationLimit,
                contrast: set.backgroundContrast,
                lightnessLimit: set.borderLightnessLimit,
                graySaturation: set.buttonGraySaturation,
                grayHue: set.buttonGrayHue,
                replaceAllHues: false,
                hueGravity: set.buttonHueGravity || 0
            },
            BackgroundImage: {
                saturationLimit: set.backgroundImageSaturationLimit,
                contrast: set.backgroundContrast,
                lightnessLimit: set.backgroundImageLightnessLimit,
                graySaturation: set.backgroundGraySaturation,
                grayHue: set.backgroundGrayHue,
                replaceAllHues: false,
                hueGravity: 0
            },
            Video: {
                saturationLimit: 1,
                contrast: 0.5,
                lightnessLimit: 1,
                graySaturation: 0,
                grayHue: 0,
                replaceAllHues: false,
                hueGravity: 0
            }
        };
    }

    protected applyBackwardCompatibility(settings: ColorScheme)
    {
        if (settings.hideBigBackgroundImages === undefined)
        {
            settings.hideBigBackgroundImages = true;
        }

        if (settings.maxBackgroundImageSize === undefined ||
            isNaN(settings.maxBackgroundImageSize))
        {
            settings.maxBackgroundImageSize = 500;
        }

        if (!settings.mode)
        {
            settings.mode = ProcessingMode.Complex;
        }

        if (settings.scrollbarStyle === undefined)
        {
            settings.scrollbarStyle = true;
        }

        if (settings.modeAutoSwitchLimit === undefined ||
            isNaN(settings.modeAutoSwitchLimit))
        {
            settings.modeAutoSwitchLimit = 5000;
        }

        if (settings.doNotInvertContent === undefined)
        {
            settings.doNotInvertContent = false;
        }

        if (settings.includeMatches === undefined)
        {
            settings.includeMatches = "";
        }

        if (settings.excludeMatches === undefined)
        {
            settings.excludeMatches = "";
        }

        if (settings.buttonSaturationLimit === undefined ||
            isNaN(settings.buttonSaturationLimit))
        {
            settings.buttonSaturationLimit = Math.min(Math.round(
                settings.backgroundSaturationLimit * 1.1), 100);
        }

        if (settings.buttonContrast === undefined ||
            isNaN(settings.buttonContrast))
        {
            settings.buttonContrast = Math.round(
                settings.borderContrast / 3);
        }

        if (settings.buttonLightnessLimit === undefined ||
            isNaN(settings.buttonLightnessLimit))
        {
            settings.buttonLightnessLimit = Math.round(
                settings.backgroundLightnessLimit * 0.8);
        }

        if (settings.buttonGraySaturation === undefined ||
            isNaN(settings.buttonGraySaturation))
        {
            settings.buttonGraySaturation = Math.min(Math.round(
                settings.backgroundGraySaturation * 1.1), 100)
        }

        if (settings.buttonGrayHue === undefined)
        {
            settings.buttonGrayHue =
                settings.backgroundGrayHue
        }

        settings.buttonReplaceAllHues =
            settings.buttonReplaceAllHues || false;

        settings.backgroundHueGravity = settings.backgroundHueGravity || 0;
        settings.buttonHueGravity = settings.buttonHueGravity || 0;
        settings.borderHueGravity = settings.borderHueGravity || 0;
        settings.textHueGravity = settings.textHueGravity || 0;
        settings.linkHueGravity = settings.linkHueGravity || 0;
    }

    protected updateSchedule()
    {
        this._curTime = this.GetCurrentTime();
        if (this._currentSettings.useDefaultSchedule)
        {
            this._scheduleStartTime = this._defaultSettings.scheduleStartHour !== undefined ? this._defaultSettings.scheduleStartHour : 0;
            this._scheduleFinishTime = this._defaultSettings.scheduleFinishHour !== undefined ? this._defaultSettings.scheduleFinishHour : 24;
        }
        else
        {
            this._scheduleStartTime = this._currentSettings.scheduleStartHour !== undefined ? this._currentSettings.scheduleStartHour : 0;
            this._scheduleFinishTime = this._currentSettings.scheduleFinishHour !== undefined ? this._currentSettings.scheduleFinishHour : 24;
        }
    }

    private GetCurrentTime(): number
    {
        let now = new Date();
        return now.getHours() + now.getMinutes() / 60;
    }

    protected notifySettingsApplied()
    {
        this._settingsBus.notifySettingsApplied(this._currentSettings)
            .catch(ex => this._app.isDebug &&
                console.error((`Error in ${window.top === window.self ? "top" : "child"} frame:\n${ex.message || ex}`)));
    }

    protected _onSettingsInitialized = new ArgEventDispatcher<ComponentShift>();
    public get onSettingsInitialized()
    {
        return this._onSettingsInitialized.event;
    }

    protected _onSettingsChanged = new ResponsiveEventDispatcher<(scheme: ColorScheme) => void, ComponentShift>();
    public get onSettingsChanged()
    {
        return this._onSettingsChanged.event;
    }

    public initDefaultColorSchemes()
    {
        let setting: ColorSchemeId;
        for (setting in ColorSchemes)
        {
            delete ColorSchemes[setting];
        }
        this.applyUserColorSchemesFromMemory(DefaultColorSchemes);
    }

    public async getDefaultSettings(renameToDefault: boolean = true)
    {
        const defaultSettings = await this._storageManager.get({
            ...ColorSchemes.default,
            ...ColorSchemes.dimmedDust
        });
        await this.processDefaultSettings(defaultSettings, renameToDefault);
        return this._defaultSettings;
    }

    protected async processDefaultSettings(defaultSettings: ColorScheme, renameToDefault: boolean)
    {
        await this.applyUserColorSchemesFromStorage(defaultSettings);
        this.assignSettings(this._defaultSettings, defaultSettings);
        Object.assign(this._defaultSettings, {
            scheduleStartHour: defaultSettings.scheduleStartHour,
            scheduleFinishHour: defaultSettings.scheduleFinishHour,
            changeBrowserTheme: defaultSettings.changeBrowserTheme,
            userColorSchemeIds: defaultSettings.userColorSchemeIds,
            restoreColorsOnCopy: defaultSettings.restoreColorsOnCopy,
            restoreColorsOnPrint: defaultSettings.restoreColorsOnPrint,
        });
        this._defaultColorSchemeId = this._defaultSettings.colorSchemeId;
        if (renameToDefault)
        {
            this.renameSettingsToDefault(this._defaultSettings);
        }
    }

    protected renameSettingsToDefault(settings: ColorScheme)
    {
        settings.colorSchemeId = "default";
        this.localizeColorScheme(settings);
    }

    protected localizeColorScheme(settings: ColorScheme)
    {
        if (settings.colorSchemeName.startsWith(ColorSchemeNamePrefix.FromFile) ||
            settings.colorSchemeName.startsWith(ColorSchemeNamePrefix.Public))
        {
            return;
        }
        settings.colorSchemeName =
            this._i18n.getMessage(`colorSchemeName_${settings.colorSchemeId}`) ||
            settings.colorSchemeName;
    }

    public applyUserColorSchemesFromMemory(defaultSettings: ColorScheme)
    {
        if (defaultSettings.userColorSchemes && defaultSettings.userColorSchemes.length > 0)
        {
            for (const userColorScheme of defaultSettings.userColorSchemes)
            {
                this.localizeColorScheme(userColorScheme);
                this.applyBackwardCompatibility(userColorScheme);
                ColorSchemes[userColorScheme.colorSchemeId] =
                    Object.assign(ColorSchemes[userColorScheme.colorSchemeId] || {}, userColorScheme);
            }
        }

        Object.assign(ColorSchemes.default, defaultSettings.colorSchemeId ? defaultSettings : ColorSchemes.dimmedDust);
        this.renameSettingsToDefault(ColorSchemes.default);
    }

    private async applyUserColorSchemesFromStorage(defaultSettings: ColorScheme)
    {
        if (defaultSettings.userColorSchemeIds && defaultSettings.userColorSchemeIds.length > 0)
        {
            const userColorSchemeIds = defaultSettings.userColorSchemeIds.reduce((all, id) =>
            {
                all[`cs:${id}`] = { colorSchemeId: "none" };
                return all;
            }, {} as any);

            const userColorSchemesStore = Object.values<ColorScheme>(await this._storageManager.get(userColorSchemeIds))
                .sort((a, b) => a.colorSchemeName ? a.colorSchemeName.localeCompare(b.colorSchemeName) : 0);

            for (const key in userColorSchemesStore)
            {
                const userColorScheme: ColorScheme = userColorSchemesStore[key];
                if (userColorScheme && userColorScheme.colorSchemeId !== "none" as any)
                {
                    this.applyBackwardCompatibility(userColorScheme);
                    ColorSchemes[userColorScheme.colorSchemeId] =
                        Object.assign(ColorSchemes[userColorScheme.colorSchemeId] || {}, userColorScheme);
                }
            }
        }

        Object.assign(ColorSchemes.default, defaultSettings.colorSchemeId ? defaultSettings : ColorSchemes.dimmedDust);
        this.renameSettingsToDefault(ColorSchemes.default);
    }

    public async saveUserColorScheme(userColorScheme: ColorScheme): Promise<null>
    {
        const storage = await this._storageManager
            .get<PartialColorScheme>({
                userColorSchemes: [],
                userColorSchemeIds: []
            });

        if (storage.userColorSchemes && storage.userColorSchemes.length > 0)
        {
            for (const oldUserColorScheme of storage.userColorSchemes)
            {
                this.putUserColorSchemeIntoStorage(storage, oldUserColorScheme);
            }
            delete storage.userColorSchemes;
            await this._storageManager.remove('userColorSchemes' as keyof typeof storage);
        }

        this.putUserColorSchemeIntoStorage(storage, userColorScheme);
        return this._storageManager.set(storage);
    }

    protected putUserColorSchemeIntoStorage(storage: PartialColorScheme, userColorScheme: ColorScheme)
    {
        if (!storage.userColorSchemeIds!
            .find(id => id === userColorScheme.colorSchemeId))
        {
            storage.userColorSchemeIds!.push(userColorScheme.colorSchemeId);
        }
        (storage as any)[`cs:${userColorScheme.colorSchemeId}`] = userColorScheme;
    }

    public async deleteUserColorScheme(colorSchemeId: ColorSchemeId): Promise<null>
    {
        const storage = await this._storageManager
            .get<PartialColorScheme>({
                userColorSchemes: [],
                userColorSchemeIds: []
            });
        if (storage.userColorSchemes && storage.userColorSchemes.length > 0)
        {
            let existingSchemeIndex = storage.userColorSchemes
                .findIndex(sch => sch.colorSchemeId === colorSchemeId);
            if (existingSchemeIndex > -1)
            {
                storage.userColorSchemes.splice(existingSchemeIndex, 1);
            }
        }
        else
        {
            delete storage.userColorSchemes;
        }
        if (storage.userColorSchemeIds && storage.userColorSchemeIds.length > 0)
        {
            let existingSchemeIdIndex = storage.userColorSchemeIds
                .findIndex(id => id === colorSchemeId);
            if (existingSchemeIdIndex > -1)
            {
                storage.userColorSchemeIds.splice(existingSchemeIdIndex, 1);
            }
        }
        await this._storageManager.remove(`cs:${colorSchemeId}`);
        return await this._storageManager.set(storage);
    }

    protected assignSettings(to: ColorScheme, settings: ColorScheme)
    {
        if (settings.colorSchemeId && settings.colorSchemeId !== "custom" as ColorSchemeId &&
            ColorSchemes[settings.colorSchemeId])
        {
            Object.assign(to, ColorSchemes[settings.colorSchemeId]);
            if (settings.runOnThisSite !== undefined)
            {
                to.runOnThisSite = settings.runOnThisSite;
            }
            if (settings.isEnabled !== undefined)
            {
                to.isEnabled = settings.isEnabled;
            }
        }
        else
        {
            Object.assign(to, settings);
        }
    }

    public settingsAreEqual(first: ColorScheme, second: ColorScheme): boolean
    {
        for (let setting in first)
        {
            let prop = setting as ColorSchemePropertyName;
            if (excludeSettingsForCompare.indexOf(prop) == -1)
            {
                if (first[prop] !== second[prop])
                {
                    return false;
                }
            }
        }
        return true;
    }

    protected testMatchPatterns(matchPatterns: string, invalidResult: boolean)
    {
        if (matchPatterns)
        {
            for (const pattern of matchPatterns.split("\n"))
            {
                if (pattern && this._matchPatternProcessor.testUrl(pattern, this._rootUrl, invalidResult))
                {
                    return true;
                }
            }
        }
        return false;
    }

    public async getErrorReason(error: any): Promise<string>
    {
        var result = (typeof error === 'string' ? error : error.message as string) || '';
        const storage = await this._storageManager.getCurrentStorage();

        let limit: keyof typeof StorageLimits;
        for (limit in StorageLimits)
        {
            if (new RegExp(`\\b${limit}\\b`, 'gi').test(result))
            {
                result = this._i18n.getMessage(`${storage}Storage_${limit}_ErrorMessage`,
                    this._app.getStorageLimits(storage, limit as StorageLimits).toString())
                    || result;
                break;
            }
        }

        return result;
    }
}
