/// <reference path="../DI/-DI.ts" />
/// <reference path="./-Settings.ts" />
/// <reference path="../Cookies/CookiesManager.ts" />
/// <reference path="./IStorageManager.ts" />
/// <reference path="../Events/-Events.ts" />
/// <reference path="./ISettingsBus.ts" />
/// <reference path="../Utils/-Utils.ts" />
/// <reference path="../Colors/-Colors.ts" />


namespace MidnightLizard.Settings
{
    type AnyResponse = (args: any) => void;
    type ColorSchemeResponse = (settings: ColorScheme) => void;
    type Storage = { isEnabled?: boolean, settingsVersion?: string, defaultSettingsVersion?: string };
    type ArgEvent<TRequestArgs> = MidnightLizard.Events.ArgumentedEvent<TRequestArgs>;
    type RespEvent<TResponseMethod extends Function, TRequestArgs> = MidnightLizard.Events.ResponsiveEvent<TResponseMethod, TRequestArgs>;
    let ArgEventDispatcher = MidnightLizard.Events.ArgumentedEventDispatcher;
    let ResponsiveEventDispatcher = MidnightLizard.Events.ResponsiveEventDispatcher;
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
        protected get isScheduled(): boolean
        {
            let curHour = new Date().getHours();
            return this._scheduleStartHour <= this._scheduleFinishHour
                ? this._scheduleStartHour <= curHour && curHour < this._scheduleFinishHour
                : this._scheduleStartHour <= curHour || curHour < this._scheduleFinishHour;
        }

        /** Current settings for communication */
        protected _currentSettings: ColorScheme;
        /** Current settings for communication */
        public get currentSettings() { return this._currentSettings }

        /** Current settings for calculations */
        protected _shift: Colors.ComponentShift;
        /** Current settings for calculations */
        public get shift() { return this._shift }

        /** MidnightLizard should be running on this page */
        public get isActive() { return this._currentSettings.isEnabled! && this._currentSettings.runOnThisSite && this.isScheduled }

        /** SettingsManager constructor
         * @param _cookiesManager - abstract cookies manager
         * @param _settingsBus - abstract settings communication bus
         * @param _storageManager - abstract browser storage manager
         **/
        constructor(
            protected readonly _app: MidnightLizard.Settings.IApplicationSettings,
            protected readonly _storageManager: MidnightLizard.Settings.IStorageManager,
            protected readonly _settingsBus: MidnightLizard.Settings.ISettingsBus)
        {
            this._currentSettings = Object.assign(new ColorScheme(), ColorSchemes.dimmedDust);
            this.initCurrentSettings();
        }

        protected abstract initCurrentSettings(): void;

        protected initCurSet()
        {
            let set = Object.assign(new ColorScheme(), this._currentSettings);
            for (let setting in set)
            {
                let prop = setting as ColorSchemePropertyName;
                let val = set[prop];
                if (!/Hue/g.test(prop) && Util.isNum(val))
                {
                    set[prop] = val / 100;
                }
            }
            this._shift =
                {
                    Background:
                    {
                        saturationLimit: set.backgroundSaturationLimit,
                        contrast: set.backgroundContrast,
                        lightnessLimit: set.backgroundLightnessLimit,
                        graySaturation: set.backgroundGraySaturation,
                        grayHue: set.backgroundGrayHue
                    },
                    Text:
                    {
                        saturationLimit: set.textSaturationLimit,
                        contrast: set.textContrast,
                        lightnessLimit: set.textLightnessLimit,
                        graySaturation: set.textGraySaturation,
                        grayHue: set.textGrayHue
                    },
                    TextShadow:
                    {
                        saturationLimit: set.borderSaturationLimit,
                        contrast: set.textContrast,
                        lightnessLimit: set.textLightnessLimit,
                        graySaturation: set.borderGraySaturation * 1.25,
                        grayHue: set.borderGrayHue
                    },
                    Border:
                    {
                        saturationLimit: set.borderSaturationLimit,
                        contrast: set.borderContrast,
                        lightnessLimit: set.borderLightnessLimit,
                        graySaturation: set.borderGraySaturation,
                        grayHue: set.borderGrayHue
                    },
                    Scrollbar$Hover:
                    {
                        saturationLimit: set.scrollbarSaturationLimit,
                        contrast: set.scrollbarContrast,
                        lightnessLimit: set.scrollbarLightnessLimit * 1,
                        graySaturation: set.scrollbarSaturationLimit,
                        grayHue: set.scrollbarGrayHue
                    },
                    Scrollbar$Normal:
                    {
                        saturationLimit: set.scrollbarSaturationLimit,
                        contrast: set.scrollbarContrast,
                        lightnessLimit: set.scrollbarLightnessLimit * 0.8,
                        graySaturation: set.scrollbarSaturationLimit,
                        grayHue: set.scrollbarGrayHue
                    },
                    Scrollbar$Active:
                    {
                        saturationLimit: set.scrollbarSaturationLimit,
                        contrast: set.scrollbarContrast,
                        lightnessLimit: set.scrollbarLightnessLimit * 0.7,
                        graySaturation: set.scrollbarSaturationLimit,
                        grayHue: set.scrollbarGrayHue
                    },
                    Image:
                    {
                        saturationLimit: set.imageSaturationLimit,
                        contrast: 1,
                        lightnessLimit: set.imageLightnessLimit,
                        graySaturation: 0,
                        grayHue: 0
                    },
                    SvgElement:
                    {
                        saturationLimit: set.backgroundSaturationLimit,
                        contrast: set.backgroundContrast,
                        lightnessLimit: set.imageLightnessLimit,
                        graySaturation: set.borderGraySaturation,
                        grayHue: set.borderGrayHue
                    },
                    BackgroundImage:
                    {
                        saturationLimit: set.backgroundImageSaturationLimit,
                        contrast: 1,
                        lightnessLimit: set.backgroundImageLightnessLimit,
                        graySaturation: 0,
                        grayHue: 0
                    }
                };
        }

        protected updateSchedule(defaultSettings: ColorScheme)
        {
            if (this._currentSettings.useDefaultSchedule && defaultSettings.settingsVersion !== undefined)
            {
                this._scheduleStartHour = defaultSettings.scheduleStartHour !== undefined ? defaultSettings.scheduleStartHour : 0;
                this._scheduleFinishHour = defaultSettings.scheduleFinishHour !== undefined ? defaultSettings.scheduleFinishHour : 24;
            }
            else
            {
                this._scheduleStartHour = this._currentSettings.scheduleStartHour;
                this._scheduleFinishHour = this._currentSettings.scheduleFinishHour;
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
    }
}