/// <reference path="../DI/-DI.ts" />
/// <reference path="./-Colors.ts" />
/// <reference path="BaseColorProcessor.ts" />
/// <reference path="../Settings/IApplicationSettings.ts" />
/// <reference path="../Settings/BaseSettingsManager.ts" />
/// <reference path="../ContentScript/CssStyle.ts" />
/// <reference path="../Settings/DynamicSettingsManager.ts" />

namespace MidnightLizard.Colors
{
    export abstract class ITextColorProcessor
    {
        abstract calculateDefaultColor(doc: Document): string;
        abstract getDefaultColor(doc: Document): string | undefined;
        abstract changeColor(rgbaString: string | null, backgroundLightness: number, tag: any): ColorEntry;
    }

    export abstract class ILinkColorProcessor extends ITextColorProcessor
    {
    }

    export abstract class IHighlightedTextColorProcessor extends ITextColorProcessor
    {
    }

    export abstract class IDynamicTextColorProcessor extends ITextColorProcessor
    {
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

        protected getInheritedColor(tag: Element, rgbStr: string): ColorEntry | null | undefined
        {
            return null;
        }

        protected changeHslaColor(hsla: HslaColor, backgroundLightness: number, isGray: boolean, grayShift: Colors.ColorShift, customContrast?: number)
        {
            let shift = this._colorShift, shiftContrast = (customContrast !== undefined ? customContrast : shift.contrast) / hsla.alpha;
            if (isGray)
            {
                shift = grayShift;
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
            if (inheritedColor && inheritedColor.backgroundLight === backgroundLightness && inheritedColor.role === this._component)
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
            else if (inheritedColor && (inheritedColor.backgroundLight !== backgroundLightness || inheritedColor.role !== this._component))
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
                        role: this._component,
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
                    const hsla = RgbaColor.toHslaColor(rgba);
                    const originalLight = hsla.lightness, isGray = this.isGray(tag, rgbaString, hsla);
                    this.changeHslaColor(hsla, backgroundLightness, isGray, isGray ? this.getGrayShift(tag, rgbaString, hsla) : this._colorShift, customContrast);
                    let newRgbColor = this.applyBlueFilter(HslaColor.toRgbaColor(hsla));
                    result = {
                        role: this._component,
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
            return hsla.saturation < 0.1 && this._colorShift.grayHue !== 0;
        }

        protected getGrayShift(tag: Element, rgbaString: string, hsla: HslaColor): Colors.ColorShift
        {
            return this._colorShift;
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
            return (hsla.saturation < 0.1 || rgbaString === this.getDefaultColor(tag.ownerDocument)) && this._colorShift.grayHue !== 0;
        }

        public getDefaultColor(doc: Document): string | undefined
        {
            return this._defaultColors.get(doc);
        }

        public calculateDefaultColor(doc: Document)
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

        protected getInheritedColor(tag: Element, rgbStr: string): ColorEntry | null | undefined
        {
            if (tag.parentElement)
            {
                const ns = tag instanceof SVGElement || tag instanceof tag.ownerDocument.defaultView.SVGElement ? ContentScript.USP.svg : ContentScript.USP.htm;
                if ((tag.parentElement as HTMLElement).style.getPropertyValue(ns.css.fntColor) !== "")
                {
                    if (tag.parentElement!.mlColor && tag.parentElement!.mlColor!.color === rgbStr)
                    {
                        return tag.parentElement!.mlColor;
                    }
                }
                else
                {
                    return this.getInheritedColor(tag.parentElement!, rgbStr)
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

    @DI.injectable(IHighlightedTextColorProcessor)
    class HighlightedTextColorProcessor extends TextColorProcessor implements IHighlightedTextColorProcessor
    {
        constructor(
            app: MidnightLizard.Settings.IApplicationSettings,
            settingsManager: MidnightLizard.Settings.IBaseSettingsManager)
        {
            super(app, settingsManager);
            this._component = Component.HighlightedText;
        }
    }

    @DI.injectable(ILinkColorProcessor)
    class LinkColorProcessor extends TextColorProcessor implements ILinkColorProcessor
    {
        protected readonly _tagName = "a";

        protected isGray(tag: Element, rgbaString: string, hsla: HslaColor): boolean
        {
            // если серый или равен дефолтному цвету текста то считать текстом
            return (hsla.saturation < 0.1 || rgbaString === this.getDefaultColor(tag.ownerDocument)) && this._colorShift.grayHue !== 0 ||
                (hsla.saturation < 0.1 || rgbaString === this._textColorProcessor.getDefaultColor(tag.ownerDocument)) &&
                this._settingsManager.shift.Text.grayHue !== 0;
        }

        protected getGrayShift(tag: Element, rgbaString: string, hsla: HslaColor): Colors.ColorShift
        {
            if ((hsla.saturation < 0.1 || rgbaString === this._textColorProcessor.getDefaultColor(tag.ownerDocument)))
            {
                return this._settingsManager.shift.Text;
            }
            else
            {
                return this._colorShift;
            }
        }

        constructor(
            app: MidnightLizard.Settings.IApplicationSettings,
            settingsManager: MidnightLizard.Settings.IBaseSettingsManager,
            protected readonly _textColorProcessor: MidnightLizard.Colors.ITextColorProcessor)
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

    @DI.injectable(IDynamicTextColorProcessor)
    class DynamicTextColorProcessor extends TextColorProcessor implements IDynamicTextColorProcessor
    {
        constructor(
            app: MidnightLizard.Settings.IApplicationSettings,
            settingsManager: MidnightLizard.Settings.IDynamicSettingsManager)
        {
            super(app, settingsManager);
            this._component = Component.Text;
        }
    }
}