/// <reference path="../DI/-DI.ts" />
/// <reference path="./-Colors.ts" />
/// <reference path="BaseColorProcessor.ts" />
/// <reference path="../Settings/IApplicationSettings.ts" />
/// <reference path="../Settings/BaseSettingsManager.ts" />


namespace MidnightLizard.Colors
{
    export abstract class ITextColorProcessor
    {
        abstract getDefaultColor(doc: Document): string;
        abstract changeColor(rgbaString: string | null, backgroundLightness: number, tag: any): ColorEntry;
    }
    export abstract class ILinkColorProcessor extends ITextColorProcessor
    {
        abstract changeColor(rgbaString: string | null, backgroundLightness: number, tag: any): ColorEntry;
    }
    export abstract class ITextShadowColorProcessor
    {
        abstract changeColor(rgbaString: string | null, backgroundLightness: number, tag: any, customContrast?: number): ColorEntry;
        abstract getInheritedColor(tag: Element, rgbStr: string): ColorEntry | null;
    }

    export abstract class IBorderColorProcessor
    {
        abstract changeColor(rgbaString: string | null, backgroundLightness: number, tag: any): ColorEntry;
    }

    export abstract class IScrollbarHoverColorProcessor
    {
        abstract changeColor(rgbaString: string | null, backgroundLightness: number, tag?: any): ColorEntry;
    }

    export abstract class IScrollbarNormalColorProcessor
    {
        abstract changeColor(rgbaString: string | null, backgroundLightness: number, tag?: any): ColorEntry;
    }

    export abstract class IScrollbarActiveColorProcessor
    {
        abstract changeColor(rgbaString: string | null, backgroundLightness: number, tag?: any): ColorEntry;
    }

    abstract class ForegroundColorProcessor extends BaseColorProcessor
    {
        constructor(
            app: MidnightLizard.Settings.IApplicationSettings,
            settingsManager: MidnightLizard.Settings.IBaseSettingsManager)
        {
            super(app, settingsManager);
        }

        protected getInheritedColor(tag: Element, rgbStr: string): ColorEntry | null
        {
            return null;
        }

        protected changeHslaColor(hsla: HslaColor, backgroundLightness: number, isGray: boolean, customContrast?: number)
        {
            let shift = this._colorShift, shiftContrast = (customContrast !== undefined ? customContrast : shift.contrast) / hsla.alpha;
            if (isGray)
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
            rgbaString = rgbaString || RgbaColor.Black;
            rgbaString = rgbaString === "none" ? RgbaColor.Transparent : rgbaString;
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
                        isUpToDate: true,
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
                    this.changeHslaColor(hsla, backgroundLightness, this.isGray(tag, rgbaString, hsla), customContrast);
                    let newRgbColor = HslaColor.toRgbaColor(hsla);
                    result = {
                        color: newRgbColor.toString(),
                        light: hsla.lightness,
                        backgroundLight: backgroundLightness,
                        originalLight: originalLight,
                        originalColor: rgbaString,
                        alpha: rgba.alpha,
                        isUpToDate: true,
                        reason: ColorReason.Ok,
                        owner: this._app.isDebug ? tag : null,
                    };
                    this._colors.set(key, result);
                    return result;
                }
            }
        }

        protected isGray(tag: Element, rgbaString: string, hsla: HslaColor): boolean
        {
            return hsla.saturation === 0 && this._colorShift.grayHue !== 0;
        }
    }

    @DI.injectable(ITextShadowColorProcessor)
    class TextShadowColorProcessor extends ForegroundColorProcessor implements ITextShadowColorProcessor
    {
        public getInheritedColor(tag: Element, rgbStr: string): ColorEntry | null
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
        protected readonly _tagName: "p" | "a" = "p";
        protected readonly _defaultColors = new WeakMap<Document, string>();

        protected isGray(tag: Element, rgbaString: string, hsla: HslaColor): boolean
        {
            return (hsla.saturation === 0 || rgbaString === this._defaultColors.get(tag.ownerDocument)) && this._colorShift.grayHue !== 0;
        }

        public getDefaultColor(doc: Document)
        {
            const element = doc.createElement(this._tagName);
            element.mlIgnore = true;
            (element as any).href = "#";
            element.style.display = "none";
            doc.body.appendChild(element);
            const elementColor = doc.defaultView.getComputedStyle(element, "").color!;
            element.remove();
            this._defaultColors.set(doc, elementColor);
            return elementColor;
        }

        protected getInheritedColor(tag: Element, rgbStr: string): ColorEntry | null
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

    @DI.injectable(ILinkColorProcessor)
    class LinkColorProcessor extends TextColorProcessor implements ILinkColorProcessor
    {
        protected readonly _tagName = "a";

        constructor(
            app: MidnightLizard.Settings.IApplicationSettings,
            settingsManager: MidnightLizard.Settings.IBaseSettingsManager)
        {
            super(app, settingsManager);
            this._component = Component.Link;
        }
    }

    @DI.injectable(IBorderColorProcessor)
    class BorderColorProcessor extends ForegroundColorProcessor implements IBorderColorProcessor
    {
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
        constructor(
            app: MidnightLizard.Settings.IApplicationSettings,
            settingsManager: MidnightLizard.Settings.IBaseSettingsManager)
        {
            super(app, settingsManager);
            this._component = Component.Scrollbar$Active;
        }
    }
}