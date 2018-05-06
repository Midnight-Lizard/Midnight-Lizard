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
        abstract calculateDefaultColor(doc: Document, defaultColor?: string): string;
        abstract getDefaultColor(doc: Document): string | undefined;
        abstract changeColor(rgbaString: string | null, backgroundLightness: number, tag: any): ColorEntry;
    }
    export abstract class ILinkColorProcessor extends ITextColorProcessor { }
    export abstract class IVisitedLinkColorProcessor extends ILinkColorProcessor { }
    export abstract class IHoverVisitedLinkColorProcessor extends IVisitedLinkColorProcessor { }
    export abstract class IActiveVisitedLinkColorProcessor extends IVisitedLinkColorProcessor { }
    export abstract class IHoverLinkColorProcessor extends ILinkColorProcessor { }
    export abstract class IActiveLinkColorProcessor extends ILinkColorProcessor { }
    export abstract class IHighlightedTextColorProcessor extends ITextColorProcessor { }

    export abstract class ITextShadowColorProcessor
    {
        abstract changeColor(rgbaString: string | null, backgroundLightness: number, tag: any): ColorEntry;
    }

    export abstract class IBorderColorProcessor
    {
        abstract changeColor(rgbaString: string | null, backgroundLightness: number, tag: any): ColorEntry;
    }
    export abstract class IButtonBorderColorProcessor extends IBorderColorProcessor { }
    export abstract class IButtonBackgroundColorProcessor
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

    export abstract class IDynamicTextColorProcessor extends ITextColorProcessor { }
    export abstract class IDynamicLinkColorProcessor extends ILinkColorProcessor { }
    export abstract class IDynamicVisitedLinkColorProcessor extends IVisitedLinkColorProcessor { }
    export abstract class IDynamicBorderColorProcessor extends IBorderColorProcessor { }
    export abstract class IDynamicButtonBackgroundColorProcessor extends IButtonBackgroundColorProcessor { }

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

        protected changeHslaColor(hsla: HslaColor, backgroundLightness: number, isGray: boolean, grayShift: Colors.ColorShift)
        {
            let shift = this._colorShift;
            if (isGray)
            {
                shift = grayShift;
                hsla.hue = shift.grayHue;
                hsla.saturation = shift.graySaturation;
            }
            else
            {
                if (shift.hueGravity)
                {
                    hsla.hue = this.shiftHue(hsla.hue, shift.grayHue, shift.hueGravity);
                }
                hsla.saturation = this.scaleValue(hsla.saturation, shift.saturationLimit);
            }
            hsla.lightness = this.scaleValue(hsla.lightness, shift.lightnessLimit);
            const shiftContrast = shift.contrast / hsla.alpha;
            const currentContrast = hsla.lightness - backgroundLightness,
                down = Number(Math.max(backgroundLightness - Math.min(Math.max(backgroundLightness - shiftContrast, 0), shift.lightnessLimit), 0).toFixed(2)),
                up = Number(Math.max(Math.min(backgroundLightness + shiftContrast, shift.lightnessLimit) - backgroundLightness, 0).toFixed(2));
            if (currentContrast < 0) // background is lighter than foreground
            {
                if (down >= up) // make foreground even darker
                {
                    hsla.lightness = Math.max(backgroundLightness + Math.min(currentContrast, -shiftContrast), 0);
                }
                else // invert and make foreground lighter than background
                {
                    hsla.lightness = Math.min(backgroundLightness + shiftContrast, shift.lightnessLimit);
                }
            }
            else // background is darker than foreground
            {
                if (up >= down) // make foreground even more lighter
                {
                    hsla.lightness = Math.min(backgroundLightness + Math.max(currentContrast, shiftContrast), shift.lightnessLimit);
                }
                else // invert and make foreground darker than background
                {
                    hsla.lightness = Math.max(backgroundLightness - shiftContrast, 0);
                }
            }
        }

        public changeColor(rgbaString: string | null, backgroundLightness: number, tag: any): ColorEntry
        {
            rgbaString = rgbaString || RgbaColor.Black;
            rgbaString = rgbaString === "none" ? RgbaColor.Transparent : rgbaString;
            const inheritedColor = this.getInheritedColor(tag, rgbaString);
            let inheritedColorValue: string | undefined = undefined;
            if (inheritedColor)
            {
                if (//inheritedColor.inheritance === ColorInheritance.Original &&
                    inheritedColor.backgroundLight === backgroundLightness &&
                    inheritedColor.role === this._component)
                {
                    inheritedColor.owner = this._app.isDebug ? tag : null;
                    return inheritedColor;
                }
                else
                {
                    inheritedColorValue = rgbaString;
                    rgbaString = inheritedColor.originalColor;
                }
            }
            let rgba = RgbaColor.parse(rgbaString!), result: ColorEntry;
            if (rgba.alpha === 0)
            {
                result = this.processTransparentColor(rgbaString, backgroundLightness, inheritedColorValue, tag);
                return result;
            }
            else
            {
                const hsla = RgbaColor.toHslaColor(rgba);
                const originalLight = hsla.lightness, isGray = this.isGray(tag, rgbaString, hsla);
                this.changeHslaColor(hsla, backgroundLightness, isGray, isGray ? this.getGrayShift(tag, rgbaString, hsla) : this._colorShift);
                let newRgbColor = this.applyBlueFilter(HslaColor.toRgbaColor(hsla));
                result = {
                    role: this._component,
                    color: newRgbColor.toString(),
                    light: hsla.lightness,
                    backgroundLight: backgroundLightness,
                    originalLight: originalLight,
                    originalColor: rgbaString,
                    inheritedColor: inheritedColorValue,
                    alpha: rgba.alpha,
                    isUpToDate: true,
                    reason: ColorReason.Ok,
                    owner: this._app.isDebug ? tag : null,
                };
                return result;
            }
        }

        protected processTransparentColor(rgbaString: string, backgroundLightness: number, inheritedColorValue: string | undefined, tag: any)
        {
            return {
                role: this._component,
                color: null,
                light: 0,
                backgroundLight: backgroundLightness,
                originalLight: 0,
                originalColor: rgbaString,
                inheritedColor: inheritedColorValue,
                alpha: 0,
                isUpToDate: true,
                reason: ColorReason.Transparent,
                owner: this._app.isDebug ? tag : null,
            } as ColorEntry;
        }

        protected isGray(tag: Element, rgbaString: string, hsla: HslaColor): boolean
        {
            return this._colorShift.replaceAllHues || hsla.saturation < 0.1 && this._colorShift.grayHue !== 0;
        }

        protected getGrayShift(tag: Element, rgbaString: string, hsla: HslaColor): Colors.ColorShift
        {
            return this._colorShift;
        }
    }

    @DI.injectable(ITextShadowColorProcessor)
    class TextShadowColorProcessor extends ForegroundColorProcessor implements ITextShadowColorProcessor
    {
        protected getInheritedColor(tag: HTMLElement, rgbStr: string): ColorEntry | null
        {
            if (tag.parentElement && tag.parentElement instanceof HTMLElement === tag instanceof HTMLElement)
            {
                if (tag.parentElement.mlTextShadow)
                {
                    let inheritedColor: ColorEntry | undefined
                    if (tag.parentElement.mlTextShadow.color === rgbStr)
                    {
                        inheritedColor = Object.assign({}, tag.parentElement!.mlTextShadow!);
                        inheritedColor.inheritance = ColorInheritance.Afterwards;
                    }
                    else if (tag.parentElement.mlTextShadow.originalColor === rgbStr ||
                        tag.parentElement.mlTextShadow.inheritedColor === rgbStr)
                    {
                        if (!tag.style.textShadow)
                        {
                            inheritedColor = Object.assign({}, tag.parentElement!.mlTextShadow!);
                            inheritedColor.inheritance = ColorInheritance.Original;
                        }
                    }
                    if (inheritedColor)
                    {
                        inheritedColor.color = null;
                        inheritedColor.reason = ColorReason.Inherited;
                        inheritedColor.base = this._app.isDebug ? tag.parentElement!.mlTextShadow : null
                        return inheritedColor;
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
            return this._colorShift.replaceAllHues || (hsla.saturation < 0.1 || rgbaString === this.getDefaultColor(tag.ownerDocument)) && this._colorShift.grayHue !== 0;
        }

        public getDefaultColor(doc: Document): string | undefined
        {
            return this._defaultColors.get(doc);
        }

        public calculateDefaultColor(doc: Document, defaultColor?: string)
        {
            let elementColor = defaultColor || "";
            if (!elementColor)
            {
                const element = doc.createElement(this._tagName);
                element.mlIgnore = true;
                (element as any).href = "#";
                element.style.display = "none";
                doc.body.appendChild(element);
                const style = doc.defaultView.getComputedStyle(element, "");
                if (style)
                {
                    elementColor = style.color!;
                }
                else
                {
                    elementColor = Colors.RgbaColor.Black;
                }
                element.remove();
            }
            this._defaultColors.set(doc, elementColor);
            return elementColor;
        }

        protected getInheritedColor(tag: HTMLElement, rgbStr: string): ColorEntry | null 
        {
            if (tag.parentElement && (tag.isPseudo ||
                tag.parentElement instanceof HTMLElement === tag instanceof HTMLElement) &&
                !(tag instanceof HTMLTableElement ||
                    tag instanceof HTMLTableCellElement ||
                    tag instanceof HTMLTableRowElement ||
                    tag instanceof HTMLTableSectionElement))
            {
                if (tag.parentElement!.mlColor)
                {
                    let inheritedColor: ColorEntry | undefined
                    if (tag.parentElement!.mlColor!.color === rgbStr)
                    {
                        inheritedColor = Object.assign({}, tag.parentElement!.mlColor!);
                        inheritedColor.inheritance = ColorInheritance.Afterwards;
                    }
                    else if (tag.parentElement!.mlColor!.originalColor === rgbStr ||
                        tag.parentElement!.mlColor!.inheritedColor === rgbStr ||
                        tag.parentElement!.mlColor!.intendedColor === rgbStr)
                    {
                        const ns = tag instanceof SVGElement ? ContentScript.USP.svg : ContentScript.USP.htm;
                        if (!tag.style.getPropertyValue(ns.css.fntColor))
                        {
                            inheritedColor = Object.assign({}, tag.parentElement!.mlColor!);
                            inheritedColor.inheritance = ColorInheritance.Original;
                        }
                    }
                    if (inheritedColor)
                    {
                        inheritedColor.intendedColor = inheritedColor.intendedColor || inheritedColor.color;
                        inheritedColor.color = null;
                        inheritedColor.reason = ColorReason.Inherited;
                        inheritedColor.base = this._app.isDebug ? tag.parentElement!.mlColor! : null
                        return inheritedColor;
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

        protected getInheritedColor(tag: Element, rgbStr: string): ColorEntry | null
        {
            return null;
        }

        protected isGray(tag: Element, rgbaString: string, hsla: HslaColor): boolean
        {
            // если практически серый 
            // или равен нормальному цвету текста 
            // или близок к дефолтному оттенку текста (значит унаследован) то считать текстом
            return this._colorShift.replaceAllHues ||
                (Math.abs(hsla.hue - this._settingsManager.shift.Text.grayHue) < 2) ||
                (hsla.saturation < 0.1 || rgbaString === this.getDefaultColor(tag.ownerDocument)) && this._colorShift.grayHue !== 0 ||
                (hsla.saturation < 0.1 || rgbaString === this._textColorProcessor.getDefaultColor(tag.ownerDocument)) && this._settingsManager.shift.Text.grayHue !== 0;
        }

        protected getGrayShift(tag: Element, rgbaString: string, hsla: HslaColor): Colors.ColorShift
        {
            if ((hsla.saturation < 0.1 ||
                Math.abs(hsla.hue - this._settingsManager.shift.Text.grayHue) < 2 ||
                rgbaString === this._textColorProcessor.getDefaultColor(tag.ownerDocument)))
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

    @DI.injectable(IVisitedLinkColorProcessor)
    class VisitedLinkColorProcessor extends LinkColorProcessor implements IVisitedLinkColorProcessor
    {
        protected readonly _tagName = "a";

        constructor(
            app: MidnightLizard.Settings.IApplicationSettings,
            settingsManager: MidnightLizard.Settings.IBaseSettingsManager,
            textColorProcessor: MidnightLizard.Colors.ITextColorProcessor)
        {
            super(app, settingsManager, textColorProcessor);
            this._component = Component.VisitedLink;
        }
    }

    @DI.injectable(IActiveLinkColorProcessor)
    class ActiveLinkColorProcessor extends LinkColorProcessor implements IActiveLinkColorProcessor
    {
        protected readonly _tagName = "a";

        constructor(
            app: MidnightLizard.Settings.IApplicationSettings,
            settingsManager: MidnightLizard.Settings.IBaseSettingsManager,
            textColorProcessor: MidnightLizard.Colors.ITextColorProcessor)
        {
            super(app, settingsManager, textColorProcessor);
            this._component = Component.Link$Active;
        }
    }

    @DI.injectable(IHoverLinkColorProcessor)
    class HoverLinkColorProcessor extends LinkColorProcessor implements IHoverLinkColorProcessor
    {
        protected readonly _tagName = "a";

        constructor(
            app: MidnightLizard.Settings.IApplicationSettings,
            settingsManager: MidnightLizard.Settings.IBaseSettingsManager,
            textColorProcessor: MidnightLizard.Colors.ITextColorProcessor)
        {
            super(app, settingsManager, textColorProcessor);
            this._component = Component.Link$Hover;
        }
    }

    @DI.injectable(IActiveVisitedLinkColorProcessor)
    class ActiveVisitedLinkColorProcessor extends LinkColorProcessor implements IActiveVisitedLinkColorProcessor
    {
        protected readonly _tagName = "a";

        constructor(
            app: MidnightLizard.Settings.IApplicationSettings,
            settingsManager: MidnightLizard.Settings.IBaseSettingsManager,
            textColorProcessor: MidnightLizard.Colors.ITextColorProcessor)
        {
            super(app, settingsManager, textColorProcessor);
            this._component = Component.VisitedLink$Active;
        }
    }

    @DI.injectable(IHoverVisitedLinkColorProcessor)
    class HoverVisitedLinkColorProcessor extends LinkColorProcessor implements IHoverVisitedLinkColorProcessor
    {
        protected readonly _tagName = "a";

        constructor(
            app: MidnightLizard.Settings.IApplicationSettings,
            settingsManager: MidnightLizard.Settings.IBaseSettingsManager,
            textColorProcessor: MidnightLizard.Colors.ITextColorProcessor)
        {
            super(app, settingsManager, textColorProcessor);
            this._component = Component.VisitedLink$Hover;
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

    @DI.injectable(IButtonBackgroundColorProcessor)
    class ButtonBackgroundColorProcessor extends ForegroundColorProcessor implements IButtonBackgroundColorProcessor
    {
        constructor(
            app: MidnightLizard.Settings.IApplicationSettings,
            settingsManager: MidnightLizard.Settings.IBaseSettingsManager)
        {
            super(app, settingsManager);
            this._component = Component.ButtonBackground;
        }

        protected processTransparentColor(rgbaString: string, backgroundLightness: number, inheritedColorValue: string | undefined, tag: any)
        {
            return {
                role: this._component,
                color: null,
                reason: ColorReason.Parent,
                originalColor: rgbaString,
                owner: this._app.isDebug ? tag : null,
                light: backgroundLightness,
                backgroundLight: backgroundLightness,
                originalLight: 1, // since i don't know the real value
                inheritedColor: inheritedColorValue,
                alpha: 1, // since i don't know the real value
                isUpToDate: true
            } as ColorEntry;
        }
    }

    @DI.injectable(IButtonBorderColorProcessor)
    class ButtonBorderColorProcessor extends ForegroundColorProcessor implements IButtonBorderColorProcessor
    {
        constructor(
            app: MidnightLizard.Settings.IApplicationSettings,
            settingsManager: MidnightLizard.Settings.IBaseSettingsManager)
        {
            super(app, settingsManager);
            this._component = Component.ButtonBorder;
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

    @DI.injectable(IDynamicLinkColorProcessor)
    class DynamicLinkColorProcessor extends LinkColorProcessor implements IDynamicLinkColorProcessor
    {
        constructor(
            app: MidnightLizard.Settings.IApplicationSettings,
            settingsManager: MidnightLizard.Settings.IDynamicSettingsManager)
        {
            super(app, settingsManager, null as any);
            this._component = Component.Link;
        }

        protected isGray(tag: Element, rgbaString: string, hsla: HslaColor): boolean
        {
            return true;
        }

        protected getGrayShift(tag: Element, rgbaString: string, hsla: HslaColor): Colors.ColorShift
        {
            return this._colorShift;
        }
    }

    @DI.injectable(IDynamicVisitedLinkColorProcessor)
    class DynamicVisitedLinkColorProcessor extends VisitedLinkColorProcessor implements IDynamicVisitedLinkColorProcessor
    {
        constructor(
            app: MidnightLizard.Settings.IApplicationSettings,
            settingsManager: MidnightLizard.Settings.IDynamicSettingsManager)
        {
            super(app, settingsManager, null as any);
            this._component = Component.VisitedLink;
        }

        protected isGray(tag: Element, rgbaString: string, hsla: HslaColor): boolean
        {
            return true;
        }

        protected getGrayShift(tag: Element, rgbaString: string, hsla: HslaColor): Colors.ColorShift
        {
            return this._colorShift;
        }
    }

    @DI.injectable(IDynamicBorderColorProcessor)
    class DynamicBorderColorProcessor extends BorderColorProcessor implements IDynamicBorderColorProcessor
    {
        constructor(
            app: MidnightLizard.Settings.IApplicationSettings,
            settingsManager: MidnightLizard.Settings.IDynamicSettingsManager)
        {
            super(app, settingsManager);
            this._component = Component.Border;
        }
    }

    @DI.injectable(IDynamicButtonBackgroundColorProcessor)
    class DynamicButtonBackgroundColorProcessor extends ButtonBackgroundColorProcessor implements IDynamicButtonBackgroundColorProcessor
    {
        constructor(
            app: MidnightLizard.Settings.IApplicationSettings,
            settingsManager: MidnightLizard.Settings.IDynamicSettingsManager)
        {
            super(app, settingsManager);
            this._component = Component.ButtonBackground;
        }
    }
}