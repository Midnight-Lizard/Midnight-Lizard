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
        /** Current settings for calculations */
        abstract get shift(): Colors.ComponentShift;
        /** Current settings for communication */
        abstract get currentSettings(): Settings.ColorScheme;
        abstract get onSettingsInitialized(): ArgEvent<Colors.ComponentShift>;
        abstract get onSettingsChanged(): RespEvent<(scheme: ColorScheme) => void, Colors.ComponentShift>;
    }
    /**
     * Base Settings Manager
     */
    export abstract class BaseSettingsManager implements IBaseSettingsManager
    {
        protected _scheduleStartHour = 0;
        protected _scheduleFinishHour = 24;
        protected readonly _settingsKey: string;
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
            this._settingsKey = `ws:${rootDocument.location.hostname}`;
            this.initDefaultColorSchemes();
            this._defaultSettings = { ...ColorSchemes.default, ...ColorSchemes.dimmedDust };
            this._defaultSettings.colorSchemeId = "default";
            this._defaultSettings.colorSchemeName = "Default";
            this._currentSettings = { ...this._defaultSettings };
            this.initCurrentSettings();
            this.onSettingsInitialized.addListener(shift => this.isInit = true, this);
        }

        protected abstract initCurrentSettings(): void;

        protected initCurSet()
        {
            let set = Object.assign({}, this._currentSettings);
            for (let setting in set)
            {
                let prop = setting as ColorSchemePropertyName;
                let val = set[prop];
                if (!/Hue$|Width/g.test(prop) && Util.isNum(val))
                {
                    set[prop] = val / 100;
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
                    saturationLimit: isNaN(set.buttonSaturationLimit)
                        ? Math.min(set.backgroundSaturationLimit * 1.1, 1)
                        : set.buttonSaturationLimit,
                    contrast: isNaN(set.buttonContrast)
                        ? set.backgroundContrast
                        : set.buttonContrast,
                    lightnessLimit: isNaN(set.buttonLightnessLimit)
                        ? set.backgroundLightnessLimit * 0.8
                        : set.buttonLightnessLimit,
                    graySaturation: isNaN(set.buttonGraySaturation)
                        ? Math.min(set.backgroundGraySaturation * 1.1, 1)
                        : set.buttonGraySaturation,
                    grayHue: set.buttonGrayHue === undefined
                        ? set.backgroundGrayHue
                        : set.buttonGrayHue,
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
                    saturationLimit: Math.min(set.textSaturationLimit * 1.2, 1),
                    contrast: Math.min(set.textContrast * 1.2, 1),
                    lightnessLimit: Math.min(set.textLightnessLimit * 1.25, 1),
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
                    lightnessLimit: set.linkLightnessLimit * 0.9,
                    graySaturation: set.linkDefaultSaturation,
                    grayHue: set.linkDefaultHue,
                    replaceAllHues: set.linkReplaceAllHues || false,
                    hueGravity: set.linkHueGravity || 0
                },
                Link$Hover: {
                    saturationLimit: set.linkSaturationLimit,
                    contrast: Math.min(set.linkContrast * 1.1, 1),
                    lightnessLimit: Math.min(set.linkLightnessLimit * 1.1, 1),
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
                    contrast: Math.min(set.linkContrast * 1.1, 1),
                    lightnessLimit: Math.min(set.linkLightnessLimit * 1.1, 1),
                    graySaturation: set.linkDefaultSaturation,
                    grayHue: set.linkVisitedHue,
                    replaceAllHues: true,
                    hueGravity: 0
                },
                VisitedLink$Active: {
                    saturationLimit: set.linkSaturationLimit,
                    contrast: set.linkContrast,
                    lightnessLimit: set.linkLightnessLimit * 0.9,
                    graySaturation: set.linkDefaultSaturation,
                    grayHue: set.linkVisitedHue,
                    replaceAllHues: true,
                    hueGravity: 0
                },
                TextShadow: {
                    saturationLimit: set.borderSaturationLimit,
                    contrast: set.textContrast,
                    lightnessLimit: set.textLightnessLimit,
                    graySaturation: Math.min(set.borderGraySaturation * 1.25, 1),
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
                    saturationLimit: set.borderSaturationLimit * 0.8,
                    contrast: set.borderContrast * 0.5,
                    lightnessLimit: set.borderLightnessLimit * 0.8,
                    graySaturation: set.borderGraySaturation,
                    grayHue: set.borderGrayHue,
                    replaceAllHues: set.borderReplaceAllHues || false,
                    hueGravity: set.borderHueGravity || 0
                },
                Scrollbar$Hover: {
                    saturationLimit: set.scrollbarSaturationLimit,
                    contrast: set.scrollbarContrast,
                    lightnessLimit: set.scrollbarLightnessLimit * 1,
                    graySaturation: set.scrollbarSaturationLimit,
                    grayHue: set.scrollbarGrayHue,
                    replaceAllHues: false,
                    hueGravity: 0
                },
                Scrollbar$Normal: {
                    saturationLimit: set.scrollbarSaturationLimit,
                    contrast: set.scrollbarContrast,
                    lightnessLimit: set.scrollbarLightnessLimit * 0.8,
                    graySaturation: set.scrollbarSaturationLimit,
                    grayHue: set.scrollbarGrayHue,
                    replaceAllHues: false,
                    hueGravity: 0
                },
                Scrollbar$Active: {
                    saturationLimit: set.scrollbarSaturationLimit,
                    contrast: set.scrollbarContrast,
                    lightnessLimit: set.scrollbarLightnessLimit * 0.7,
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
                    lightnessLimit: Math.min(set.backgroundLightnessLimit * 1.2, 1),
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

        public applyUserColorSchemes(defaultSettings: Settings.ColorScheme)
        {
            if (defaultSettings.userColorSchemes && defaultSettings.userColorSchemes.length > 0)
            {
                for (let userColorScheme of defaultSettings.userColorSchemes)
                {
                    Settings.ColorSchemes[userColorScheme.colorSchemeId] = Object.assign(Settings.ColorSchemes[userColorScheme.colorSchemeId] || {}, userColorScheme);
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
            const excludeSettingsForCompare: Settings.ColorSchemePropertyName[] =
                ["isEnabled", "exist", "hostName", "colorSchemeId", "colorSchemeName",
                    "userColorSchemes", "runOnThisSite"];
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