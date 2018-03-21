/// <reference path="../DI/-DI.ts" />
/// <reference path="BaseColorProcessor.ts" />
/// <reference path="../Settings/IApplicationSettings.ts" />
/// <reference path="../Settings/BaseSettingsManager.ts" />
/// <reference path="./-Colors.ts" />
/// <reference path="../Settings/DynamicSettingsManager.ts" />

namespace MidnightLizard.Colors
{
    export abstract class IBackgroundColorProcessor
    {
        abstract changeColor(rgbaString: string | null, increaseContrast: boolean, tag: any, getParentBackground?: (tag: any) => ColorEntry): ColorEntry;
    }
    export abstract class ISvgBackgroundColorProcessor extends IBackgroundColorProcessor { }
    export abstract class IDynamicBackgroundColorProcessor extends IBackgroundColorProcessor { }
    export abstract class ITextSelectionColorProcessor extends IBackgroundColorProcessor { }
    export abstract class IButtonBackgroundColorProcessor extends IBackgroundColorProcessor { }

    /** BackgroundColorProcessor */
    @DI.injectable(IBackgroundColorProcessor)
    class BackgroundColorProcessor extends BaseColorProcessor implements IBackgroundColorProcessor
    {
        protected readonly _lights = new Map<number, number>();
        protected readonly _lightAreas = new Map<number, number>();
        protected readonly _lightCounts = new Map<number, number>();

        /** BackgroundColorProcessor constructor */
        constructor(
            app: MidnightLizard.Settings.IApplicationSettings,
            settingsManager: MidnightLizard.Settings.IBaseSettingsManager)
        {
            super(app, settingsManager);
            this._component = Component.Background;
        }

        protected onSettingsChanged(response: SchemeResponse, newSettings: ComponentShift): void
        {
            super.onSettingsChanged(response, newSettings);
            this._lights.clear();
            this._lightAreas.clear();
        }

        protected tryGetTagArea(tag: Element)
        {
            if (tag.area === undefined)
            {
                tag.computedStyle = tag.computedStyle || tag.ownerDocument.defaultView.getComputedStyle(tag as Element, "");
                let width = parseInt(tag.computedStyle.width!), height = parseInt(tag.computedStyle.height!);
                if (!isNaN(width) && !isNaN(height))
                {
                    tag.area = width * height;
                }
            }
            return tag.area;
        }

        protected getTagArea(tag: Element)
        {
            if (tag.area === undefined)
            {
                if (this.tryGetTagArea(tag) === undefined)
                {
                    tag.rect = tag.rect || tag.getBoundingClientRect();
                    tag.area = tag.rect.width * tag.rect.height;
                }
            }
            return tag.area!;
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
            if (hsla.saturation < 0.1 && shift.grayHue !== 0)
            {
                hsla.hue = shift.grayHue;
                hsla.saturation = shift.graySaturation;
            }
            else
            {
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
                        this._lights.forEach((otherLight, originalLight) =>
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
                        });
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

        public changeColor(rgbaString: string | null, increaseContrast: boolean, tag: Element, getParentBackground?: (tag: any) => ColorEntry): ColorEntry
        {
            rgbaString = !rgbaString || rgbaString === "none" ? RgbaColor.Transparent : rgbaString;

            let prevColor = increaseContrast ? this._colors.get(rgbaString) : null;
            if (prevColor)
            {
                this.tryUpdateLightArea(tag, prevColor.originalLight);
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

                if (tag.tagName == "BODY" && rgba.alpha === 0)
                {
                    rgbaString = "bodyTrans";
                    rgba = { red: 255, green: 255, blue: 255, alpha: 1 };
                }

                if (rgba.alpha === 0 && getParentBackground)
                {
                    let parentBgColor = getParentBackground(tag);
                    this.tryUpdateLightArea(tag, parentBgColor.originalLight);
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
                    let originalLight = hsla.lightness;
                    this.changeHslaColor(hsla, increaseContrast, tag);
                    let newRgbColor = this.applyBlueFilter(HslaColor.toRgbaColor(hsla));
                    let result = {
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

    @DI.injectable(ISvgBackgroundColorProcessor)
    class SvgBackgroundColorProcessor extends BackgroundColorProcessor implements ISvgBackgroundColorProcessor
    {
        constructor(
            app: MidnightLizard.Settings.IApplicationSettings,
            settingsManager: MidnightLizard.Settings.IBaseSettingsManager)
        {
            super(app, settingsManager);
            this._component = Component.SvgBackground;
        }
    }

    @DI.injectable(ITextSelectionColorProcessor)
    class TextSelectionColorProcessor extends BackgroundColorProcessor implements ITextSelectionColorProcessor
    {
        constructor(
            app: MidnightLizard.Settings.IApplicationSettings,
            settingsManager: MidnightLizard.Settings.IBaseSettingsManager)
        {
            super(app, settingsManager);
            this._component = Component.TextSelection;
        }
    }

    @DI.injectable(IButtonBackgroundColorProcessor)
    class ButtonBackgroundColorProcessor extends BackgroundColorProcessor implements IButtonBackgroundColorProcessor
    {
        constructor(
            app: MidnightLizard.Settings.IApplicationSettings,
            settingsManager: MidnightLizard.Settings.IBaseSettingsManager)
        {
            super(app, settingsManager);
            this._component = Component.ButtonBackground;
        }
    }

    @DI.injectable(IDynamicBackgroundColorProcessor)
    class DynamicBackgroundColorProcessor extends BackgroundColorProcessor implements IDynamicBackgroundColorProcessor
    {
        constructor(
            app: MidnightLizard.Settings.IApplicationSettings,
            settingsManager: MidnightLizard.Settings.IDynamicSettingsManager)
        {
            super(app, settingsManager);
            this._component = Component.Background;
        }
    }
}