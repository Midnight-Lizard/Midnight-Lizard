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
        protected _colorShift: ColorShift;
        protected readonly _colors = new Map<string, ColorEntry>();
        protected _component: Component;

        constructor(
            protected readonly _app: MidnightLizard.Settings.IApplicationSettings,
            protected readonly _settingsManager: MidnightLizard.Settings.IBaseSettingsManager)
        {
            _settingsManager.onSettingsChanged.addListener(this.onSettingsChanged, this);
            _settingsManager.onSettingsInitialized.addListener(this.onSettingsInitialized, this, Events.EventHandlerPriority.High);
        }

        protected onSettingsInitialized(shift: Colors.ComponentShift): void
        {
            this._colorShift = this._settingsManager.shift[Component[this._component] as keyof Colors.ComponentShift];
        }

        protected onSettingsChanged(response: SchemeResponse, newSettings: ComponentShift): void
        {
            this._colorShift = this._settingsManager.shift[Component[this._component] as keyof Colors.ComponentShift];
            this._colors.clear();
        }

        protected scaleValue(currentValue: number, scaleLimit: number)
        {
            return Math.min(Math.min(currentValue, scaleLimit * Math.atan(currentValue * Math.PI / 2)), scaleLimit);
        }
    }
}