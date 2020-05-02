import { ColorEntry, ColorReason } from "./ColorEntry";
import { injectable } from "../Utils/DI";
import { BaseColorProcessor, SchemeResponse } from "./BaseColorProcessor";
import { IApplicationSettings } from "../Settings/IApplicationSettings";
import { IBaseSettingsManager } from "../Settings/BaseSettingsManager";
import { IHighlightedBackgroundColorProcessor } from "./ForegroundColorProcessor";
import { Component, ComponentShift } from "./ComponentShift";
import { HslaColor } from "./HslaColor";
import { RgbaColor } from "./RgbaColor";
import { IDynamicSettingsManager } from "../Settings/DynamicSettingsManager";

export abstract class IBackgroundColorProcessor
{
    abstract clear(): void;
    abstract changeColor(rgbaString: string | null, increaseContrast: boolean, tag: any,
        getParentBackground?: (tag: any) => ColorEntry, ignoreBlueFilter?: boolean): ColorEntry;
    abstract isDark(rgbaString: string | null): boolean;
}
export abstract class ISvgBackgroundColorProcessor extends IBackgroundColorProcessor { }
export abstract class IDynamicBackgroundColorProcessor extends IBackgroundColorProcessor { }
export abstract class ITextSelectionColorProcessor extends IBackgroundColorProcessor { }

export abstract class IDynamicTextSelectionColorProcessor extends ITextSelectionColorProcessor { }

/** BackgroundColorProcessor */
@injectable(IBackgroundColorProcessor)
class BackgroundColorProcessor extends BaseColorProcessor implements IBackgroundColorProcessor
{
    protected readonly _colors = new Map<string, ColorEntry>();
    protected readonly _lights = new Map<number, number>();
    protected readonly _lightAreas = new Map<number, number>();
    protected readonly _lightCounts = new Map<number, number>();

    /** BackgroundColorProcessor constructor */
    constructor(
        app: IApplicationSettings,
        settingsManager: IBaseSettingsManager,
        protected readonly highlightedBackgroundColorProcessor: IHighlightedBackgroundColorProcessor)
    {
        super(app, settingsManager);
        this._component = Component.Background;
    }

    protected onSettingsChanged(response: SchemeResponse, newSettings: ComponentShift): void
    {
        super.onSettingsChanged(response, newSettings);
        this.clear();
    }
    public clear(): void
    {
        this._colors.clear();
        this._lights.clear();
        this._lightAreas.clear();
        this._lightCounts.clear();
    }

    public isDark(rgbaString: string | null): boolean
    {
        if (!rgbaString || rgbaString === RgbaColor.Transparent || rgbaString === RgbaColor.White ||
            rgbaString.startsWith("rgb(") && rgbaString.length === 18)
        {
            return false;
        }
        if (rgbaString === RgbaColor.Black)
        {
            return true;
        }
        const hsla = RgbaColor.toHslaColor(RgbaColor.parse(rgbaString));
        return hsla.lightness <= 0.4;
    }

    protected tryGetTagArea(tag: Element)
    {
        if (tag.mlArea === undefined)
        {
            tag.mlComputedStyle = tag.mlComputedStyle || tag.ownerDocument!.defaultView!.getComputedStyle(tag as Element, "");
            if (tag.mlComputedStyle && tag.mlComputedStyle.width && tag.mlComputedStyle.width.endsWith("px") &&
                tag.mlComputedStyle.height && tag.mlComputedStyle.height.endsWith("px"))
            {
                let width = parseInt(tag.mlComputedStyle.width), height = parseInt(tag.mlComputedStyle.height);
                if (!isNaN(width) && !isNaN(height))
                {
                    tag.mlArea = width * height;
                }
            }
        }
        return tag.mlArea;
    }

    protected getTagArea(tag: Element)
    {
        if (tag.mlArea === undefined)
        {
            if (this.tryGetTagArea(tag) === undefined)
            {
                tag.mlRect = tag.mlRect || tag.getBoundingClientRect();
                tag.mlArea = tag.mlRect.width * tag.mlRect.height;
            }
        }
        return tag.mlArea!;
    }

    protected tryUpdateLightArea(tag: Element, lightness: number)
    {
        let lightCount = this._lightCounts.get(lightness) || 0;
        this._lightCounts.set(lightness, ++lightCount);
        if (lightCount < 10)
        {
            let area = this.tryGetTagArea(tag);
            if (area !== undefined)
            {
                let oldArea = this._lightAreas.get(lightness);
                if (oldArea && oldArea < area || !oldArea)
                {
                    this._lightAreas.set(lightness, area);
                }
            }
        }
    }

    protected changeHslaColor(hsla: HslaColor, increaseContrast: boolean, tag: Element): void
    {
        const shift = this._colorShift;
        if (shift.replaceAllHues || hsla.saturation < 0.1 && shift.graySaturation !== 0)
        {
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

        let light = hsla.lightness;
        if (increaseContrast)
        {
            let oldLight = this._lights.get(hsla.lightness);
            if (oldLight !== undefined)
            {
                light = oldLight;
                this.tryUpdateLightArea(tag, hsla.lightness);
            }
            else
            {
                const minLightDiff = shift.contrast * Math.atan(-shift.lightnessLimit * Math.PI / 2) + shift.contrast / 0.9;
                let thisTagArea = this.getTagArea(tag);
                if (this._lights.size > 0 && minLightDiff > 0)
                {
                    let prevLight = -1, nextLight = +2, prevOrigin = 0, nextOrigin = 1;
                    for (let [originalLight, otherLight] of this._lights)
                    {
                        if (otherLight < light && otherLight > prevLight)
                        {
                            prevLight = otherLight;
                            prevOrigin = originalLight;
                        }
                        if (otherLight > light && otherLight < nextLight)
                        {
                            nextLight = otherLight;
                            nextOrigin = originalLight;
                        }
                    }
                    let prevArea = this._lightAreas.get(prevOrigin),
                        nextArea = this._lightAreas.get(nextOrigin);
                    let deflect = 0;
                    if (prevArea !== undefined && nextArea !== undefined && prevArea !== nextArea)
                    {
                        deflect = (nextLight - prevLight) *
                            (
                                prevArea > nextArea
                                    ? 0.5 - nextArea / prevArea
                                    : prevArea / nextArea - 0.5
                            );
                    }
                    if (nextLight - prevLight < minLightDiff * 2) light = (prevLight + nextLight) / 2 + deflect;
                    else if (light - prevLight < minLightDiff) light = prevLight + minLightDiff;
                    else if (nextLight - light < minLightDiff) light = nextLight - minLightDiff;
                    light = Math.max(Math.min(light, 1), 0);
                }
                this._lights.set(hsla.lightness, light);
                this._lightAreas.set(hsla.lightness, thisTagArea);
                this._lightCounts.set(hsla.lightness, 1);
            }
        }
        hsla.lightness = this.scaleValue(light, shift.lightnessLimit);
    }

    public changeColor(rgbaString: string | null, increaseContrast: boolean,
        tag: Element, getParentBackground?: (tag: any) => ColorEntry, ignoreBlueFilter?: boolean): ColorEntry
    {
        rgbaString = !rgbaString || rgbaString === "none" ? RgbaColor.Transparent : rgbaString;

        let prevColor = increaseContrast ? this._colors.get(rgbaString) : null;
        if (prevColor)
        {
            if (prevColor.role === this._component)
            {
                this.tryUpdateLightArea(tag, prevColor.originalLight);
            }
            let newColor = Object.assign({}, prevColor);
            newColor.reason = ColorReason.Previous;
            newColor.originalColor = rgbaString;
            newColor.owner = this._app.isDebug ? tag : null;
            newColor.base = this._app.isDebug ? prevColor : null;
            return newColor;
        }
        else
        {
            let rgba = RgbaColor.parse(rgbaString);

            if (tag instanceof HTMLBodyElement && rgba.alpha === 0)
            {
                rgbaString = "body-trans";
                if (window.top === window.self)
                {
                    rgba = { red: 255, green: 255, blue: 255, alpha: 1 };
                }
                else
                {
                    return {
                        role: this._component,
                        color: null,
                        light: this._colorShift.lightnessLimit,
                        originalLight: 1,
                        originalColor: rgbaString,
                        alpha: 0,
                        isUpToDate: true,
                        reason: ColorReason.Transparent,
                        owner: this._app.isDebug ? tag : null,
                    } as ColorEntry;
                }
            }

            if (tag instanceof HTMLOptionElement || tag instanceof HTMLOptGroupElement)
            {
                // if parent element is transparent - options will be white by default
                if (tag.parentElement && tag.parentElement.mlBgColor && !tag.parentElement.mlBgColor.color)
                {
                    rgbaString = "option-trans";
                    rgba = { red: 255, green: 255, blue: 255, alpha: 1 };
                }
            }

            if (rgba.alpha === 0 && getParentBackground)
            {
                let parentBgColor = getParentBackground(tag);
                increaseContrast && this.tryUpdateLightArea(tag, parentBgColor.originalLight);
                let newColor = Object.assign({}, parentBgColor);
                newColor.color = null;
                newColor.reason = ColorReason.Parent;
                newColor.originalColor = rgbaString;
                newColor.owner = this._app.isDebug ? tag : null;
                newColor.base = this._app.isDebug ? parentBgColor : null;
                return newColor;
            }
            else
            {
                let hsla = RgbaColor.toHslaColor(rgba);
                if (this._component === Component.Background && increaseContrast &&
                    hsla.saturation > 0.39 && hsla.lightness < 0.86 &&
                    (this.getTagArea(tag) ? tag.mlArea! < 16000 : false))
                {
                    const result = this.highlightedBackgroundColorProcessor.changeColor(
                        rgbaString,
                        getParentBackground ? getParentBackground(tag).light : this._colorShift.lightnessLimit,
                        tag);
                    increaseContrast && this._colors.set(rgbaString!, result);
                    return result;
                }
                else
                {
                    const originalLight = hsla.lightness;
                    this.changeHslaColor(hsla, increaseContrast, tag);
                    const newRgbColor = ignoreBlueFilter ? HslaColor.toRgbaColor(hsla)
                        : this.applyBlueFilter(HslaColor.toRgbaColor(hsla));
                    const result = {
                        role: this._component,
                        color: newRgbColor.toString(),
                        light: hsla.lightness,
                        originalLight: originalLight,
                        originalColor: rgbaString,
                        alpha: rgba.alpha,
                        reason: ColorReason.Ok,
                        isUpToDate: true,
                        owner: this._app.isDebug ? tag : null
                    };
                    increaseContrast && this._colors.set(rgbaString!, result);
                    return result;
                }
            }
        }
    }
}

@injectable(ISvgBackgroundColorProcessor)
class SvgBackgroundColorProcessor extends BackgroundColorProcessor implements ISvgBackgroundColorProcessor
{
    constructor(
        app: IApplicationSettings,
        settingsManager: IBaseSettingsManager)
    {
        super(app, settingsManager, null as any);
        this._component = Component.SvgBackground;
    }
}

@injectable(ITextSelectionColorProcessor)
class TextSelectionColorProcessor extends BackgroundColorProcessor implements ITextSelectionColorProcessor
{
    constructor(
        app: IApplicationSettings,
        settingsManager: IBaseSettingsManager)
    {
        super(app, settingsManager, null as any);
        this._component = Component.TextSelection;
    }
}

@injectable(IDynamicBackgroundColorProcessor)
class DynamicBackgroundColorProcessor extends BackgroundColorProcessor implements IDynamicBackgroundColorProcessor
{
    constructor(
        app: IApplicationSettings,
        settingsManager: IDynamicSettingsManager)
    {
        super(app, settingsManager, null as any);
        this._component = Component.Background;
    }
}

@injectable(IDynamicTextSelectionColorProcessor)
class DynamicTextSelectionColorProcessor extends TextSelectionColorProcessor implements IDynamicTextSelectionColorProcessor
{
    constructor(
        app: IApplicationSettings,
        settingsManager: IDynamicSettingsManager)
    {
        super(app, settingsManager);
        this._component = Component.TextSelection;
    }
}