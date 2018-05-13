/// <reference path="../DI/-DI.ts" />
/// <reference path="./-Settings.ts" />
/// <reference path="./IStorageManager.ts" />
/// <reference path="../Events/-Events.ts" />
/// <reference path="./ISettingsBus.ts" />
/// <reference path="../Utils/-Utils.ts" />
/// <reference path="../Colors/-Colors.ts" />


namespace MidnightLizard.Settings
{
    type AnyResponse = (args: any) => void;
    type ColorSchemeResponse = (settings: ColorScheme) => void;
    type ArgEvent<TRequestArgs> = MidnightLizard.Events.ArgumentedEvent<TRequestArgs>;
    type RespEvent<TResponseMethod extends Function, TRequestArgs> = MidnightLizard.Events.ResponsiveEvent<TResponseMethod, TRequestArgs>;
    const ArgEventDispatcher = MidnightLizard.Events.ArgumentedEventDispatcher;
    const ResponsiveEventDispatcher = MidnightLizard.Events.ResponsiveEventDispatcher;
    export abstract class IBaseSettingsManager
    {
        /** MidnightLizard should be running on this page */
        abstract get isActive(): boolean;
        /** Complex processing mode is in use now */
        abstract get isComplex(): boolean;
        /** Simplified processing mode is in use now */
        abstract get isSimple(): boolean;
        /** Current computed processing mode */
        abstract get computedMode(): ProcessingMode;
        /** Current settings for calculations */
        abstract get shift(): Colors.ComponentShift;
        /** Current settings for communication */
        abstract get currentSettings(): Settings.ColorScheme;
        abstract get onSettingsInitialized(): ArgEvent<Colors.ComponentShift>;
        abstract get onSettingsChanged(): RespEvent<(scheme: ColorScheme) => void, Colors.ComponentShift>;
        abstract getDefaultSettings(renameToDefault?: boolean): Promise<Settings.ColorScheme>;
        abstract computeProcessingMode(doc: Document): void;
    }
    /**
     * Base Settings Manager
     */
    export abstract class BaseSettingsManager implements IBaseSettingsManager
    {
        protected _scheduleStartHour = 0;
        protected _scheduleFinishHour = 24;
        protected _settingsKey: string;
        protected get isScheduled(): boolean
        {
            let curHour = new Date().getHours();
            return this._scheduleStartHour <= this._scheduleFinishHour
                ? this._scheduleStartHour <= curHour && curHour < this._scheduleFinishHour
                : this._scheduleStartHour <= curHour || curHour < this._scheduleFinishHour;
        }

        protected _defaultSettings: Settings.ColorScheme;
        /** Current settings for communication */
        protected _currentSettings: ColorScheme;
        /** Current settings for communication */
        public get currentSettings() { return this._currentSettings }

        /** Current settings for calculations */
        protected _shift!: Colors.ComponentShift;
        /** Current settings for calculations */
        public get shift() { return this._shift }

        /** MidnightLizard should be running on this page */
        public get isActive() { return this.isInit && this._currentSettings.isEnabled! && this._currentSettings.runOnThisSite && this.isScheduled }
        public get isComplex() { return this._computedMode === ProcessingMode.Complex }
        public get isSimple() { return this._computedMode === ProcessingMode.Simplified }
        public get computedMode() { return this._computedMode }
        protected _computedMode: ProcessingMode = ProcessingMode.Complex;
        protected isInit = false;

        /** SettingsManager constructor
         * @param _cookiesManager - abstract cookies manager
         * @param _settingsBus - abstract settings communication bus
         * @param _storageManager - abstract browser storage manager
         **/
        constructor(rootDocument: Document,
            protected readonly _app: MidnightLizard.Settings.IApplicationSettings,
            protected readonly _storageManager: MidnightLizard.Settings.IStorageManager,
            protected readonly _settingsBus: MidnightLizard.Settings.ISettingsBus)
        {
            let hostName: string;
            try
            {
                hostName = window.top.location.hostname;
            }
            catch
            {
                hostName = rootDocument.location.hostname;
            }
            this._settingsKey = `ws:${hostName}`; //`
            this.initDefaultColorSchemes();
            this._defaultSettings = { ...ColorSchemes.default, ...ColorSchemes.dimmedDust };
            this._defaultSettings.colorSchemeId = "default";
            this._defaultSettings.colorSchemeName = "Default";
            this._currentSettings = { ...this._defaultSettings };
            this.initCurrentSettings();
            this.onSettingsInitialized.addListener(shift => this.isInit = true, this);
        }

        protected abstract initCurrentSettings(): void;

        computeProcessingMode(doc: Document): void
        {
            if (this._currentSettings.mode === ProcessingMode.Automatic &&
                doc.body &&
                doc.body.getElementsByTagName("*").length > this._currentSettings.modeAutoSwitchLimit)
            {
                this._computedMode = ProcessingMode.Simplified;
            }
            this._app.isDebug &&
                console.log(`${this._computedMode}: ${doc.body && doc.body.getElementsByTagName("*").length}`);
        }

        protected initCurSet()
        {
            this.applyBackwardCompatibility(this._currentSettings);
            this._computedMode =
                this._currentSettings.mode === ProcessingMode.Automatic
                    ? Settings.ProcessingMode.Complex
                    : this._currentSettings.mode;
            const set = Object.assign({}, this._currentSettings);
            for (const setting in set)
            {
                if (setting in ColorSchemes.dimmedDust)
                {
                    const prop = setting as ColorSchemePropertyName;
                    const val = set[prop];
                    if (!/Hue$|Width/g.test(prop) && Util.isNum(val))
                    {
                        set[prop] = val / 100;
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
                    saturationLimit: set.backgroundSaturationLimit,
                    contrast: set.backgroundContrast,
                    lightnessLimit: Math.min(Number((set.backgroundLightnessLimit * 1.2).toFixed(2)), 1),
                    graySaturation: set.backgroundGraySaturation,
                    grayHue: set.backgroundGrayHue,
                    replaceAllHues: false,
                    hueGravity: set.backgroundHueGravity || 0
                },
                BackgroundImage: {
                    saturationLimit: set.backgroundImageSaturationLimit,
                    contrast: set.backgroundContrast,
                    lightnessLimit: set.backgroundImageLightnessLimit,
                    graySaturation: set.backgroundGraySaturation,
                    grayHue: set.backgroundGrayHue,
                    replaceAllHues: false,
                    hueGravity: 0
                }
            };
        }

        protected applyBackwardCompatibility(settings: ColorScheme)
        {
            if (!settings.mode)
            {
                settings.mode = ProcessingMode.Complex;
            }

            if (settings.modeAutoSwitchLimit === undefined ||
                isNaN(settings.modeAutoSwitchLimit))
            {
                settings.modeAutoSwitchLimit = 5000;
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
            if (this._currentSettings.useDefaultSchedule)
            {
                this._scheduleStartHour = this._defaultSettings.scheduleStartHour !== undefined ? this._defaultSettings.scheduleStartHour : 0;
                this._scheduleFinishHour = this._defaultSettings.scheduleFinishHour !== undefined ? this._defaultSettings.scheduleFinishHour : 24;
            }
            else
            {
                this._scheduleStartHour = this._currentSettings.scheduleStartHour !== undefined ? this._currentSettings.scheduleStartHour : 0;
                this._scheduleFinishHour = this._currentSettings.scheduleFinishHour !== undefined ? this._currentSettings.scheduleFinishHour : 24;
            }
        }

        protected notifySettingsApplied()
        {
            this._settingsBus.notifySettingsApplied(this._currentSettings)
                .catch(ex => this._app.isDebug &&
                    console.error((`Error in ${window.top === window.self ? "top" : "child"} frame:\n${ex.message || ex}`)));
        }

        protected _onSettingsInitialized = new ArgEventDispatcher<Colors.ComponentShift>();
        public get onSettingsInitialized()
        {
            return this._onSettingsInitialized.event;
        }

        protected _onSettingsChanged = new ResponsiveEventDispatcher<(scheme: ColorScheme) => void, Colors.ComponentShift>();
        public get onSettingsChanged()
        {
            return this._onSettingsChanged.event;
        }

        public initDefaultColorSchemes()
        {
            let setting: Settings.ColorSchemeName;
            for (setting in Settings.ColorSchemes)
            {
                delete Settings.ColorSchemes[setting];
            }
            this.applyUserColorSchemes(DefaultColorSchemes);
        }

        public async getDefaultSettings(renameToDefault: boolean = true)
        {
            const defaultSettings = await this._storageManager.get({
                ...Settings.ColorSchemes.default,
                ...Settings.ColorSchemes.dimmedDust
            });
            await this.processDefaultSettings(defaultSettings, renameToDefault);
            return this._defaultSettings;
        }

        protected async processDefaultSettings(defaultSettings: ColorScheme, renameToDefault: boolean)
        {
            await this.applyUserColorSchemes(defaultSettings);
            this.assignSettings(this._defaultSettings, defaultSettings);
            Object.assign(this._defaultSettings, {
                scheduleStartHour: defaultSettings.scheduleStartHour,
                scheduleFinishHour: defaultSettings.scheduleFinishHour,
                changeBrowserTheme: defaultSettings.changeBrowserTheme
            });
            if (renameToDefault)
            {
                this.renameDefaultSettingsToDefault();
            }
        }

        protected renameDefaultSettingsToDefault()
        {
            this._defaultSettings.colorSchemeId = "default";
            this._defaultSettings.colorSchemeName = "Default";
        }

        public async applyUserColorSchemes(defaultSettings: Settings.ColorScheme)
        {
            if (defaultSettings.userColorSchemes && defaultSettings.userColorSchemes.length > 0)
            {
                for (const userColorScheme of defaultSettings.userColorSchemes)
                {
                    this.applyBackwardCompatibility(userColorScheme);
                    Settings.ColorSchemes[userColorScheme.colorSchemeId] =
                        Object.assign(Settings.ColorSchemes[userColorScheme.colorSchemeId] || {}, userColorScheme);
                }
            }

            if (defaultSettings.userColorSchemeIds && defaultSettings.userColorSchemeIds.length > 0)
            {
                const userColorSchemeIds = defaultSettings.userColorSchemeIds.reduce((all, id) =>
                {
                    all[`cs:${id}`] = { colorSchemeId: "none" };
                    return all;
                }, {} as any);

                const userColorSchemesStore = await this._storageManager.get(userColorSchemeIds);

                for (const key in userColorSchemesStore)
                {
                    const userColorScheme: ColorScheme = userColorSchemesStore[key];
                    if (userColorScheme && userColorScheme.colorSchemeId !== "none" as any)
                    {
                        this.applyBackwardCompatibility(userColorScheme);
                        Settings.ColorSchemes[userColorScheme.colorSchemeId] =
                            Object.assign(Settings.ColorSchemes[userColorScheme.colorSchemeId] || {}, userColorScheme);
                    }
                }
            }

            Object.assign(Settings.ColorSchemes.default, defaultSettings.colorSchemeId ? defaultSettings : Settings.ColorSchemes.dimmedDust);
            Settings.ColorSchemes.default.colorSchemeId = "default";
            Settings.ColorSchemes.default.colorSchemeName = "Default";
        }

        protected assignSettings(to: Settings.ColorScheme, settings: Settings.ColorScheme)
        {
            if (settings.colorSchemeId && settings.colorSchemeId !== "custom" as Settings.ColorSchemeName &&
                Settings.ColorSchemes[settings.colorSchemeId])
            {
                Object.assign(to, Settings.ColorSchemes[settings.colorSchemeId]);
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

        public settingsAreEqual(first: Settings.ColorScheme, second: Settings.ColorScheme): boolean
        {
            for (let setting in first)
            {
                let prop = setting as Settings.ColorSchemePropertyName;
                if (excludeSettingsForCompare.indexOf(prop) == -1)
                {
                    if (first[prop] !== second[prop])
                    {
                        //console.log(`${first.colorSchemeId}.${prop}=[${first[prop]}]`);
                        //console.log(`${second.colorSchemeId}.${prop}=[${second[prop]}]`);
                        return false;
                    }
                }
            }
            return true;
        }
    }
}