/// <reference path="../DI/-DI.ts" />
/// <reference path="../Settings/IApplicationSettings.ts" />
/// <reference path="../Settings/BaseSettingsManager.ts" />
/// <reference path="-Colors.ts" />
/// <reference path="../Events/Event.ts" />


namespace MidnightLizard.Colors
{
    export type SchemeResponse = (scheme: Settings.ColorScheme) => void;
    export abstract class BaseColorProcessor
    {
        protected _colorShift!: ColorShift;
        protected _component!: Component;

        constructor(
            protected readonly _app: MidnightLizard.Settings.IApplicationSettings,
            protected readonly _settingsManager: MidnightLizard.Settings.IBaseSettingsManager)
        {
            _settingsManager.onSettingsChanged.addListener(this.onSettingsChanged, this);
            _settingsManager.onSettingsInitialized.addListener(this.onSettingsInitialized, this, Events.EventHandlerPriority.High);
        }

        protected onSettingsInitialized(shift?: Colors.ComponentShift): void
        {
            this._colorShift = this._settingsManager.shift[Component[this._component] as keyof Colors.ComponentShift];
        }

        protected onSettingsChanged(response: SchemeResponse, newSettings?: ComponentShift): void
        {
            this._colorShift = this._settingsManager.shift[Component[this._component] as keyof Colors.ComponentShift];
        }

        protected scaleValue(currentValue: number, scaleLimit: number)
        {
            return Math.min(Math.min(currentValue, scaleLimit * Math.atan(currentValue * Math.PI / 2)), scaleLimit);
        }

        protected shiftHue(originalHue: number, targetHue: number, gravity: number)
        {
            let delta = (targetHue - originalHue + 180) % 360 - 180;
            delta = delta < -180 ? delta + 360 : delta;
            // const compression = Math.PI / 2 - Math.atan(Math.abs(180 / delta * Math.PI / 2));
            return originalHue + Math.round(delta * gravity);// * compression);
        }

        protected applyBlueFilter(rgba: Colors.RgbaColor)
        {
            if (this._settingsManager.currentSettings.blueFilter !== 0)
            {
                const blueFilter = this._settingsManager.currentSettings.blueFilter / 100;
                const newBlue = rgba.blue * (1 - blueFilter);
                const newRed = rgba.red + rgba.blue * blueFilter;
                const newGreen = newRed > 255 && rgba.green > 0
                    ? Math.max(0, rgba.green - (newRed - 255) * blueFilter / Math.PI)
                    : rgba.green;
                return new RgbaColor(Math.min(newRed, 255), newGreen, newBlue, rgba.alpha);
            }
            else
            {
                return rgba;
            }
        }

        public static invertColor(rgbaString: string): string
        {
            const hslaColor = RgbaColor.toHslaColor(RgbaColor.parse(rgbaString));
            hslaColor.lightness = 1 - hslaColor.lightness;
            return hslaColor.toString();
        }
    }
}