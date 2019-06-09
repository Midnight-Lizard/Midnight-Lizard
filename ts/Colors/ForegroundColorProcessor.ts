import { injectable } from "../Utils/DI";
import { ColorEntry, ColorReason, ColorInheritance } from "./ColorEntry";
import { BaseColorProcessor } from "./BaseColorProcessor";
import { IApplicationSettings } from "../Settings/IApplicationSettings";
import { IBaseSettingsManager } from "../Settings/BaseSettingsManager";
import { HslaColor } from "./HslaColor";
import { ColorShift } from "./ColorShift";
import { RgbaColor } from "./RgbaColor";
import { Component } from "./ComponentShift";
import { IDynamicSettingsManager } from "../Settings/DynamicSettingsManager";
import { USP } from "../ContentScript/CssStyle";

export abstract class ITextColorProcessor
{
    abstract calculateDefaultColor(doc: Document, defaultColor?: string): string;
    abstract getDefaultColor(doc: Document): string | undefined;
    abstract changeColor(rgbaString: string | null, backgroundLightness: number, tag: any,
        ignoreBlueFilter?: boolean): ColorEntry;
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
    abstract changeColor(rgbaString: string | null, backgroundLightness: number, tag: any,
        ignoreBlueFilter?: boolean): ColorEntry;
}
export abstract class IButtonBorderColorProcessor extends IBorderColorProcessor { }
export abstract class IButtonBackgroundColorProcessor
{
    abstract changeColor(rgbaString: string | null, backgroundLightness: number, tag: any,
        ignoreBlueFilter?: boolean): ColorEntry;
}
export abstract class IHighlightedBackgroundColorProcessor
{
    abstract changeColor(rgbaString: string | null, backgroundLightness: number, tag: any): ColorEntry;
}

export abstract class IScrollbarHoverColorProcessor
{
    abstract changeColor(rgbaString: string | null, backgroundLightness: number, tag?: any,
        ignoreBlueFilter?: boolean): ColorEntry;
}

export abstract class IScrollbarNormalColorProcessor
{
    abstract changeColor(rgbaString: string | null, backgroundLightness: number, tag?: any,
        ignoreBlueFilter?: boolean): ColorEntry;
}

export abstract class IScrollbarActiveColorProcessor
{
    abstract changeColor(rgbaString: string | null, backgroundLightness: number, tag?: any,
        ignoreBlueFilter?: boolean): ColorEntry;
}

export abstract class IDynamicTextColorProcessor extends ITextColorProcessor { }
export abstract class IDynamicLinkColorProcessor extends ILinkColorProcessor { }
export abstract class IDynamicVisitedLinkColorProcessor extends IVisitedLinkColorProcessor { }
export abstract class IDynamicBorderColorProcessor extends IBorderColorProcessor { }
export abstract class IDynamicButtonBackgroundColorProcessor extends IButtonBackgroundColorProcessor { }

abstract class ForegroundColorProcessor extends BaseColorProcessor
{
    constructor(
        app: IApplicationSettings,
        settingsManager: IBaseSettingsManager)
    {
        super(app, settingsManager);
    }

    protected getInheritedColor(tag: Element, rgbStr: string): ColorEntry | null | undefined
    {
        return null;
    }

    protected changeHslaColor(hsla: HslaColor, backgroundLightness: number, isGray: boolean, grayShift: ColorShift)
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
        const currentContrast = Number((hsla.lightness - backgroundLightness).toFixed(2)),
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

    public changeColor(rgbaString: string | null, backgroundLightness: number, tag: any, ignoreBlueFilter?: boolean): ColorEntry
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
            let newRgbColor = ignoreBlueFilter ? HslaColor.toRgbaColor(hsla)
                : this.applyBlueFilter(HslaColor.toRgbaColor(hsla));
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
        return this._colorShift.replaceAllHues || hsla.saturation < 0.1 && this._colorShift.graySaturation !== 0;
    }

    protected getGrayShift(tag: Element, rgbaString: string, hsla: HslaColor): ColorShift
    {
        return this._colorShift;
    }
}

@injectable(ITextShadowColorProcessor)
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
                    inheritedColor!.inheritance = ColorInheritance.Afterwards;
                }
                else if (tag.parentElement.mlTextShadow.originalColor === rgbStr ||
                    tag.parentElement.mlTextShadow.inheritedColor === rgbStr)
                {
                    if (!tag.style.textShadow)
                    {
                        inheritedColor = Object.assign({}, tag.parentElement!.mlTextShadow!);
                        inheritedColor!.inheritance = ColorInheritance.Original;
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
        app: IApplicationSettings,
        settingsManager: IBaseSettingsManager)
    {
        super(app, settingsManager);
        this._component = Component.TextShadow;
    }
}

@injectable(ITextColorProcessor)
class TextColorProcessor extends ForegroundColorProcessor implements ITextColorProcessor
{
    protected readonly _tagName: "p" | "a" = "p";
    protected readonly _defaultColors = new WeakMap<Document, string>();

    protected isGray(tag: Element, rgbaString: string, hsla: HslaColor): boolean
    {
        return this._colorShift.replaceAllHues ||
            (hsla.saturation < 0.1 || rgbaString === this.getDefaultColor(tag.ownerDocument!)) &&
            this._colorShift.graySaturation !== 0;
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
            const style = doc.defaultView!.getComputedStyle(element, "");
            if (style)
            {
                elementColor = style.color!;
            }
            else
            {
                elementColor = RgbaColor.Black;
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
                    inheritedColor!.inheritance = ColorInheritance.Afterwards;
                }
                else if (tag.parentElement!.mlColor!.originalColor === rgbStr ||
                    tag.parentElement!.mlColor!.inheritedColor === rgbStr ||
                    tag.parentElement!.mlColor!.intendedColor === rgbStr)
                {
                    const ns = tag instanceof SVGElement ? USP.svg : USP.htm;
                    if (!tag.style.getPropertyValue(ns.css.fntColor))
                    {
                        inheritedColor = Object.assign({}, tag.parentElement!.mlColor!);
                        inheritedColor!.inheritance = ColorInheritance.Original;
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
        app: IApplicationSettings,
        settingsManager: IBaseSettingsManager)
    {
        super(app, settingsManager);
        this._component = Component.Text;
    }
}

@injectable(IHighlightedTextColorProcessor)
class HighlightedTextColorProcessor extends TextColorProcessor implements IHighlightedTextColorProcessor
{
    constructor(
        app: IApplicationSettings,
        settingsManager: IBaseSettingsManager)
    {
        super(app, settingsManager);
        this._component = Component.HighlightedText;
    }
}

@injectable(ILinkColorProcessor)
class LinkColorProcessor extends TextColorProcessor implements ILinkColorProcessor
{
    protected readonly _tagName = "a";

    protected getInheritedColor(tag: HTMLElement, rgbStr: string): ColorEntry | null
    {
        if (!(tag instanceof HTMLAnchorElement))
        {
            return super.getInheritedColor(tag, rgbStr);
        }
        return null;
    }

    protected isGray(tag: Element, rgbaString: string, hsla: HslaColor): boolean
    {
        // если практически серый 
        // или равен нормальному цвету текста 
        // или близок к дефолтному оттенку текста (значит унаследован) то считать текстом
        return this._colorShift.replaceAllHues ||
            (Math.abs(hsla.hue - this._settingsManager.shift.Text.grayHue) < 2) ||
            (hsla.saturation < 0.1 || rgbaString === this.getDefaultColor(tag.ownerDocument!)) && this._colorShift.graySaturation !== 0 ||
            (hsla.saturation < 0.1 || rgbaString === this._textColorProcessor.getDefaultColor(tag.ownerDocument!)) && this._settingsManager.shift.Text.graySaturation !== 0;
    }

    protected getGrayShift(tag: Element, rgbaString: string, hsla: HslaColor): ColorShift
    {
        if ((hsla.saturation < 0.1 ||
            Math.abs(hsla.hue - this._settingsManager.shift.Text.grayHue) < 2 ||
            rgbaString === this._textColorProcessor.getDefaultColor(tag.ownerDocument!)))
        {
            return this._settingsManager.shift.Text;
        }
        else
        {
            return this._colorShift;
        }
    }

    constructor(
        app: IApplicationSettings,
        settingsManager: IBaseSettingsManager,
        protected readonly _textColorProcessor: ITextColorProcessor)
    {
        super(app, settingsManager);
        this._component = Component.Link;
    }
}

@injectable(IVisitedLinkColorProcessor)
class VisitedLinkColorProcessor extends LinkColorProcessor implements IVisitedLinkColorProcessor
{
    protected readonly _tagName = "a";

    constructor(
        app: IApplicationSettings,
        settingsManager: IBaseSettingsManager,
        textColorProcessor: ITextColorProcessor)
    {
        super(app, settingsManager, textColorProcessor);
        this._component = Component.VisitedLink;
    }
}

@injectable(IActiveLinkColorProcessor)
class ActiveLinkColorProcessor extends LinkColorProcessor implements IActiveLinkColorProcessor
{
    protected readonly _tagName = "a";

    constructor(
        app: IApplicationSettings,
        settingsManager: IBaseSettingsManager,
        textColorProcessor: ITextColorProcessor)
    {
        super(app, settingsManager, textColorProcessor);
        this._component = Component.Link$Active;
    }
}

@injectable(IHoverLinkColorProcessor)
class HoverLinkColorProcessor extends LinkColorProcessor implements IHoverLinkColorProcessor
{
    protected readonly _tagName = "a";

    constructor(
        app: IApplicationSettings,
        settingsManager: IBaseSettingsManager,
        textColorProcessor: ITextColorProcessor)
    {
        super(app, settingsManager, textColorProcessor);
        this._component = Component.Link$Hover;
    }
}

@injectable(IActiveVisitedLinkColorProcessor)
class ActiveVisitedLinkColorProcessor extends LinkColorProcessor implements IActiveVisitedLinkColorProcessor
{
    protected readonly _tagName = "a";

    constructor(
        app: IApplicationSettings,
        settingsManager: IBaseSettingsManager,
        textColorProcessor: ITextColorProcessor)
    {
        super(app, settingsManager, textColorProcessor);
        this._component = Component.VisitedLink$Active;
    }
}

@injectable(IHoverVisitedLinkColorProcessor)
class HoverVisitedLinkColorProcessor extends LinkColorProcessor implements IHoverVisitedLinkColorProcessor
{
    protected readonly _tagName = "a";

    constructor(
        app: IApplicationSettings,
        settingsManager: IBaseSettingsManager,
        textColorProcessor: ITextColorProcessor)
    {
        super(app, settingsManager, textColorProcessor);
        this._component = Component.VisitedLink$Hover;
    }
}

@injectable(IBorderColorProcessor)
class BorderColorProcessor extends ForegroundColorProcessor implements IBorderColorProcessor
{
    constructor(
        app: IApplicationSettings,
        settingsManager: IBaseSettingsManager)
    {
        super(app, settingsManager);
        this._component = Component.Border;
    }
}

@injectable(IButtonBackgroundColorProcessor)
class ButtonBackgroundColorProcessor extends ForegroundColorProcessor implements IButtonBackgroundColorProcessor
{
    constructor(
        app: IApplicationSettings,
        settingsManager: IBaseSettingsManager)
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

@injectable(IHighlightedBackgroundColorProcessor)
class HighlightedBackgroundColorProcessor extends ForegroundColorProcessor implements IHighlightedBackgroundColorProcessor
{
    constructor(
        app: IApplicationSettings,
        settingsManager: IBaseSettingsManager)
    {
        super(app, settingsManager);
        this._component = Component.HighlightedBackground;
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

@injectable(IButtonBorderColorProcessor)
class ButtonBorderColorProcessor extends ForegroundColorProcessor implements IButtonBorderColorProcessor
{
    constructor(
        app: IApplicationSettings,
        settingsManager: IBaseSettingsManager)
    {
        super(app, settingsManager);
        this._component = Component.ButtonBorder;
    }
}

@injectable(IScrollbarHoverColorProcessor)
class ScrollbarHoverColorProcessor extends ForegroundColorProcessor implements IScrollbarHoverColorProcessor
{
    constructor(
        app: IApplicationSettings,
        settingsManager: IBaseSettingsManager)
    {
        super(app, settingsManager);
        this._component = Component.Scrollbar$Hover;
    }
}

@injectable(IScrollbarNormalColorProcessor)
class ScrollbarNormalColorProcessor extends ForegroundColorProcessor implements IScrollbarNormalColorProcessor
{
    constructor(
        app: IApplicationSettings,
        settingsManager: IBaseSettingsManager)
    {
        super(app, settingsManager);
        this._component = Component.Scrollbar$Normal;
    }
}

@injectable(IScrollbarActiveColorProcessor)
class ScrollbarActiveColorProcessor extends ForegroundColorProcessor implements IScrollbarActiveColorProcessor
{
    constructor(
        app: IApplicationSettings,
        settingsManager: IBaseSettingsManager)
    {
        super(app, settingsManager);
        this._component = Component.Scrollbar$Active;
    }
}

@injectable(IDynamicTextColorProcessor)
class DynamicTextColorProcessor extends TextColorProcessor implements IDynamicTextColorProcessor
{
    constructor(
        app: IApplicationSettings,
        settingsManager: IDynamicSettingsManager)
    {
        super(app, settingsManager);
        this._component = Component.Text;
    }
}

@injectable(IDynamicLinkColorProcessor)
class DynamicLinkColorProcessor extends LinkColorProcessor implements IDynamicLinkColorProcessor
{
    constructor(
        app: IApplicationSettings,
        settingsManager: IDynamicSettingsManager)
    {
        super(app, settingsManager, null as any);
        this._component = Component.Link;
    }

    protected isGray(tag: Element, rgbaString: string, hsla: HslaColor): boolean
    {
        return true;
    }

    protected getGrayShift(tag: Element, rgbaString: string, hsla: HslaColor): ColorShift
    {
        return this._colorShift;
    }
}

@injectable(IDynamicVisitedLinkColorProcessor)
class DynamicVisitedLinkColorProcessor extends VisitedLinkColorProcessor implements IDynamicVisitedLinkColorProcessor
{
    constructor(
        app: IApplicationSettings,
        settingsManager: IDynamicSettingsManager)
    {
        super(app, settingsManager, null as any);
        this._component = Component.VisitedLink;
    }

    protected isGray(tag: Element, rgbaString: string, hsla: HslaColor): boolean
    {
        return true;
    }

    protected getGrayShift(tag: Element, rgbaString: string, hsla: HslaColor): ColorShift
    {
        return this._colorShift;
    }
}

@injectable(IDynamicBorderColorProcessor)
class DynamicBorderColorProcessor extends BorderColorProcessor implements IDynamicBorderColorProcessor
{
    constructor(
        app: IApplicationSettings,
        settingsManager: IDynamicSettingsManager)
    {
        super(app, settingsManager);
        this._component = Component.Border;
    }
}

@injectable(IDynamicButtonBackgroundColorProcessor)
class DynamicButtonBackgroundColorProcessor extends ButtonBackgroundColorProcessor implements IDynamicButtonBackgroundColorProcessor
{
    constructor(
        app: IApplicationSettings,
        settingsManager: IDynamicSettingsManager)
    {
        super(app, settingsManager);
        this._component = Component.ButtonBackground;
    }
}