/// <reference path="../DI/-DI.ts" />
/// <reference path="./-Settings.ts" />
/// <reference path="./IStorageManager.ts" />
/// <reference path="../Events/-Events.ts" />
/// <reference path="./ISettingsBus.ts" />
/// <reference path="../Utils/-Utils.ts" />
/// <reference path="../Colors/-Colors.ts" />
/// <reference path="./MatchPatternProcessor.ts" />
/// <reference path="../i18n/ITranslationAccessor.ts" />

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
        /** Deactivates old version of extension - this one */
        abstract deactivateOldVersion(): void;
    }
    /**
     * Base Settings Manager
     */
    export abstract class BaseSettingsManager implements IBaseSettingsManager
    {
        protected _scheduleStartHour = 0;
        protected _scheduleFinishHour = 24;
        protected _rootUrl: string;
        protected _settingsKey: string;
        protected _curHour = new Date().getHours();
        protected get isScheduled(): boolean
        {
            return this._scheduleStartHour <= this._scheduleFinishHour
                ? this._scheduleStartHour <= this._curHour && this._curHour < this._scheduleFinishHour
                : this._scheduleStartHour <= this._curHour || this._curHour < this._scheduleFinishHour;
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
        public get isActive()
        {
            return this.isInit &&
                this._currentSettings.isEnabled! &&
                this.isScheduled && (
                    this._currentSettings.runOnThisSite && !this.matchesExclude
                    ||
                    !this._currentSettings.runOnThisSite && this.matchesInclude && !this.matchesExclude
                )
        }
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
            protected readonly _settingsBus: MidnightLizard.Settings.ISettingsBus,
            protected readonly _matchPatternProcessor: MidnightLizard.Settings.IMatchPatternProcessor,
            protected readonly _i18n: MidnightLizard.i18n.ITranslationAccessor)
        {
            let hostName: string;
            try
            {
                hostName = window.top.location.hostname;
                this._rootUrl = window.top.location.href;
            }
            catch
            {
                hostName = rootDocument.location!.hostname;
                this._rootUrl = rootDocument.location!.href;
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

        computeProcessingMode(doc: Document): void
        {
            if (this._currentSettings.mode === ProcessingMode.Automatic && (
                this._app.isMobile || doc.body &&
                doc.body.getElementsByTagName("*").length > this._currentSettings.modeAutoSwitchLimit))
            {
                this._computedMode = ProcessingMode.Simplified;
            }
            this._app.isDebug &&
                console.log(`${this._computedMode}: ${doc.body && doc.body.getElementsByTagName("*").length}`);
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
                    ? Settings.ProcessingMode.Complex
                    : this._currentSettings.mode;
            const set = Object.assign({}, this._currentSettings);
            for (const setting in set)
            {
                if (setting in ColorSchemes.dimmedDust)
                {
                    const prop = setting as ColorSchemePropertyName;
                    const val = set[prop];
                    if (!/Hue$/g.test(prop) && Util.isNum(val))
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
                settings.maxBackgroundImageSize = 1000;
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
            this._curHour = new Date().getHours();
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
            let setting: Settings.ColorSchemeId;
            for (setting in Settings.ColorSchemes)
            {
                delete Settings.ColorSchemes[setting];
            }
            this.applyUserColorSchemesFromMemory(DefaultColorSchemes);
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

        public applyUserColorSchemesFromMemory(defaultSettings: Settings.ColorScheme)
        {
            if (defaultSettings.userColorSchemes && defaultSettings.userColorSchemes.length > 0)
            {
                for (const userColorScheme of defaultSettings.userColorSchemes)
                {
                    this.localizeColorScheme(userColorScheme);
                    this.applyBackwardCompatibility(userColorScheme);
                    Settings.ColorSchemes[userColorScheme.colorSchemeId] =
                        Object.assign(Settings.ColorSchemes[userColorScheme.colorSchemeId] || {}, userColorScheme);
                }
            }

            Object.assign(Settings.ColorSchemes.default, defaultSettings.colorSchemeId ? defaultSettings : Settings.ColorSchemes.dimmedDust);
            this.renameSettingsToDefault(Settings.ColorSchemes.default);
        }

        private async applyUserColorSchemesFromStorage(defaultSettings: Settings.ColorScheme)
        {
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
            this.renameSettingsToDefault(Settings.ColorSchemes.default);
        }

        public async saveUserColorScheme(userColorScheme: Settings.ColorScheme): Promise<null>
        {
            const storage = await this._storageManager
                .get<Settings.PartialColorScheme>({
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

        protected putUserColorSchemeIntoStorage(storage: Settings.PartialColorScheme, userColorScheme: Settings.ColorScheme)
        {
            if (!storage.userColorSchemeIds!
                .find(id => id === userColorScheme.colorSchemeId))
            {
                storage.userColorSchemeIds!.push(userColorScheme.colorSchemeId);
            }
            (storage as any)[`cs:${userColorScheme.colorSchemeId}`] = userColorScheme;
        }

        public async deleteUserColorScheme(colorSchemeId: Settings.ColorSchemeId): Promise<null>
        {
            const storage = await this._storageManager
                .get<Settings.PartialColorScheme>({
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

        protected assignSettings(to: Settings.ColorScheme, settings: Settings.ColorScheme)
        {
            if (settings.colorSchemeId && settings.colorSchemeId !== "custom" as Settings.ColorSchemeId &&
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

            let limit: keyof typeof MidnightLizard.Settings.StorageLimits;
            for (limit in MidnightLizard.Settings.StorageLimits)
            {
                if (new RegExp(`\\b${limit}\\b`, 'gi').test(result))
                {
                    result = this._i18n.getMessage(`${storage}Storage_${limit}_ErrorMessage`,
                        this._app.getStorageLimits(storage, limit as MidnightLizard.Settings.StorageLimits).toString())
                        || result;
                    break;
                }
            }

            return result;
        }
    }
}