/// <reference path="../DI/-DI.ts" />
/// <reference path="./-Colors.ts" />
/// <reference path="BaseColorProcessor.ts" />
/// <reference path="../Settings/IApplicationSettings.ts" />
/// <reference path="../Settings/BaseSettingsManager.ts" />


namespace MidnightLizard.Colors
{
    export abstract class ITextColorProcessor
    {
        /** Sets UI component type for this __ColorProcessor__ */
        abstract changeColor(rgbaString: string | null, backgroundLightness: number, tag: any): ColorEntry;
    }
    export abstract class ITextShadowColorProcessor
    {
        /** Sets UI component type for this __ColorProcessor__ */
        abstract changeColor(rgbaString: string | null, backgroundLightness: number, tag: any, customContrast?: number): ColorEntry;
        abstract getInheritedColor(tag: Element, rgbStr: string): ColorEntry | null;
    }

    export abstract class IBorderColorProcessor
    {
        /** Sets UI component type for this __ColorProcessor__ */
        abstract changeColor(rgbaString: string | null, backgroundLightness: number, tag: any): ColorEntry;
    }

    export abstract class IScrollbarHoverColorProcessor
    {
        /** Sets UI component type for this __ColorProcessor__ */
        abstract changeColor(rgbaString: string | null, backgroundLightness: number, tag?: any): ColorEntry;
    }

    export abstract class IScrollbarNormalColorProcessor
    {
        /** Sets UI component type for this __ColorProcessor__ */
        abstract changeColor(rgbaString: string | null, backgroundLightness: number, tag?: any): ColorEntry;
    }

    export abstract class IScrollbarActiveColorProcessor
    {
        /** Sets UI component type for this __ColorProcessor__ */
        abstract changeColor(rgbaString: string | null, backgroundLightness: number, tag?: any): ColorEntry;
    }

    /** BackgroundColorProcessor */
    abstract class ForegroundColorProcessor extends BaseColorProcessor
    {
        /** BackgroundColorProcessor constructor */
        constructor(
            app: MidnightLizard.Settings.IApplicationSettings,
            settingsManager: MidnightLizard.Settings.IBaseSettingsManager)
        {
            super(app, settingsManager);
        }

        abstract getInheritedColor(tag: Element, rgbStr: string): Colors.ColorEntry | null;

        protected changeHslaColor(hsla: HslaColor, backgroundLightness: number, customContrast?: number)
        {
            let shift = this._colorShift, shiftContrast = (customContrast !== undefined ? customContrast : shift.contrast) / hsla.alpha;
            if (hsla.saturation === 0 && shift.grayHue !== 0)
            {
                hsla.hue = shift.grayHue;
                hsla.saturation = shift.graySaturation;
            }
            else
            {
                hsla.saturation = this.scaleValue(hsla.saturation, shift.saturationLimit);
            }
            hsla.lightness = this.scaleValue(hsla.lightness, shift.lightnessLimit);
            let currentContrast = hsla.lightness - backgroundLightness,
                down = Math.max(backgroundLightness - Math.min(Math.max(backgroundLightness - shiftContrast, 0), shift.lightnessLimit), 0),
                up = Math.max(Math.min(backgroundLightness + shiftContrast, shift.lightnessLimit) - backgroundLightness, 0);
            if (currentContrast < 0) // background is lighter
            {
                if (down >= up)
                {
                    hsla.lightness = Math.max(backgroundLightness + Math.min(currentContrast, -shiftContrast), 0);
                }
                else // invert
                {
                    hsla.lightness = Math.min(backgroundLightness + shiftContrast, shift.lightnessLimit);
                }
            }
            else // background is darker
            {
                if (up >= down)
                {
                    hsla.lightness = Math.min(backgroundLightness + Math.max(currentContrast, shiftContrast), shift.lightnessLimit);
                }
                else // invert
                {
                    hsla.lightness = Math.max(backgroundLightness - shiftContrast, 0);
                }
            }
        }

        public changeColor(rgbaString: string | null, backgroundLightness: number, tag: any, customContrast?: number): ColorEntry
        {
            rgbaString = rgbaString || "rgb(4, 4, 4)";
            let key = `${rgbaString}-${backgroundLightness}`, prevColor = this._colors.get(key);
            const inheritedColor = this.getInheritedColor(tag, rgbaString);
            if (inheritedColor && inheritedColor.backgroundLight == backgroundLightness)
            {
                let newColor = Object.assign({}, inheritedColor);
                return Object.assign(newColor, {
                    color: null,
                    reason: ColorReason.Inherited,
                    originalColor: rgbaString,
                    owner: this._app.isDebug ? tag : null,
                    base: this._app.isDebug ? inheritedColor : null
                });
            }
            else if (inheritedColor && inheritedColor.backgroundLight != backgroundLightness)
            {
                rgbaString = inheritedColor.originalColor;
            }

            if (prevColor && prevColor !== undefined)
            {
                let newColor = Object.assign({}, prevColor);
                return Object.assign(newColor, {
                    reason: ColorReason.Previous,
                    originalColor: rgbaString,
                    owner: this._app.isDebug ? tag : null,
                    base: this._app.isDebug ? prevColor : null
                });
            }
            else
            {
                let rgba = RgbaColor.parse(rgbaString!), result: ColorEntry;
                if (rgba.alpha === 0)
                {
                    result = {
                        color: null,
                        light: 0,
                        backgroundLight: backgroundLightness,
                        originalLight: 0,
                        originalColor: rgbaString,
                        alpha: 0,
                        reason: ColorReason.Transparent,
                        owner: this._app.isDebug ? tag : null,
                    };
                    this._colors.set(key, result);
                    return result;
                }
                else
                {
                    let hsla = RgbaColor.toHslaColor(rgba);
                    let originalLight = hsla.lightness;
                    this.changeHslaColor(hsla, backgroundLightness, customContrast);
                    let newRgbColor = HslaColor.toRgbaColor(hsla);
                    result = {
                        color: newRgbColor.toString(),
                        light: hsla.lightness,
                        backgroundLight: backgroundLightness,
                        originalLight: originalLight,
                        originalColor: rgbaString,
                        alpha: rgba.alpha,
                        reason: ColorReason.Ok,
                        owner: this._app.isDebug ? tag : null,
                    };
                    this._colors.set(key, result);
                    return result;
                }
            }
        }
    }

    @DI.injectable(ITextShadowColorProcessor)
    class TextShadowColorProcessor extends ForegroundColorProcessor implements ITextShadowColorProcessor
    {
        getInheritedColor(tag: Element, rgbStr: string): ColorEntry | null
        {
            if (tag.parentElement)
            {
                if ((tag.parentElement as HTMLElement).style.textShadow !== "none")
                {
                    if (tag.parentElement.mlTextShadow && tag.parentElement.mlTextShadow.color == rgbStr)
                    {
                        return tag.parentElement.mlTextShadow;
                    }
                }
                else
                {
                    return this.getInheritedColor(tag.parentElement, rgbStr)
                }
            }
            return null;
        }

        constructor(
            app: MidnightLizard.Settings.IApplicationSettings,
            settingsManager: MidnightLizard.Settings.IBaseSettingsManager)
        {
            super(app, settingsManager);
            this._component = Component.TextShadow;
        }
    }

    @DI.injectable(ITextColorProcessor)
    class TextColorProcessor extends ForegroundColorProcessor implements ITextColorProcessor
    {
        getInheritedColor(tag: Element, rgbStr: string): ColorEntry | null
        {
            if (tag.parentElement)
            {
                if ((tag.parentElement as HTMLElement).style.color !== "")
                {
                    if (tag.parentElement.mlColor && tag.parentElement.mlColor.color === rgbStr)
                    {
                        return tag.parentElement.mlColor;
                    }
                }
                else
                {
                    return this.getInheritedColor(tag.parentElement, rgbStr)
                }
            }
            return null;
        }

        constructor(
            app: MidnightLizard.Settings.IApplicationSettings,
            settingsManager: MidnightLizard.Settings.IBaseSettingsManager)
        {
            super(app, settingsManager);
            this._component = Component.Text;
        }
    }

    @DI.injectable(IBorderColorProcessor)
    class BorderColorProcessor extends ForegroundColorProcessor implements IBorderColorProcessor
    {
        getInheritedColor(tag: Element, rgbStr: string): ColorEntry | null
        {
            return null;
        }

        constructor(
            app: MidnightLizard.Settings.IApplicationSettings,
            settingsManager: MidnightLizard.Settings.IBaseSettingsManager)
        {
            super(app, settingsManager);
            this._component = Component.Border;
        }
    }

    @DI.injectable(IScrollbarHoverColorProcessor)
    class ScrollbarHoverColorProcessor extends ForegroundColorProcessor implements IScrollbarHoverColorProcessor
    {
        getInheritedColor(tag: Element, rgbStr: string): ColorEntry | null
        {
            return null;
        }

        constructor(
            app: MidnightLizard.Settings.IApplicationSettings,
            settingsManager: MidnightLizard.Settings.IBaseSettingsManager)
        {
            super(app, settingsManager);
            this._component = Component.Scrollbar$Hover;
        }
    }

    @DI.injectable(IScrollbarNormalColorProcessor)
    class ScrollbarNormalColorProcessor extends ForegroundColorProcessor implements IScrollbarNormalColorProcessor
    {
        getInheritedColor(tag: Element, rgbStr: string): ColorEntry | null
        {
            return null;
        }

        constructor(
            app: MidnightLizard.Settings.IApplicationSettings,
            settingsManager: MidnightLizard.Settings.IBaseSettingsManager)
        {
            super(app, settingsManager);
            this._component = Component.Scrollbar$Normal;
        }
    }

    @DI.injectable(IScrollbarActiveColorProcessor)
    class ScrollbarActiveColorProcessor extends ForegroundColorProcessor implements IScrollbarActiveColorProcessor
    {
        getInheritedColor(tag: Element, rgbStr: string): ColorEntry | null
        {
            return null;
        }

        constructor(
            app: MidnightLizard.Settings.IApplicationSettings,
            settingsManager: MidnightLizard.Settings.IBaseSettingsManager)
        {
            super(app, settingsManager);
            this._component = Component.Scrollbar$Active;
        }
    }
}