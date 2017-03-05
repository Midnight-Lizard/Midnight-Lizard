/// <reference path="../DI/-DI.ts" />
/// <reference path="BaseColorProcessor.ts" />
/// <reference path="../Settings/IApplicationSettings.ts" />
/// <reference path="../Settings/BaseSettingsManager.ts" />
/// <reference path="./-Colors.ts" />

namespace MidnightLizard.Colors
{
    export abstract class IBackgroundColorProcessor
    {
        /** Sets UI component type for this __ColorProcessor__ */
        abstract changeColor(rgbaString: string | null, increaseContrast: boolean, tag: any, getParentBackground?: (tag: any) => ColorEntry): ColorEntry;
    }

    export abstract class ISvgBackgroundColorProcessor
    {
        /** Sets UI component type for this __ColorProcessor__ */
        abstract changeColor(rgbaString: string | null, increaseContrast: boolean, tag: any, getParentBackground?: (tag: any) => ColorEntry): ColorEntry;
    }

    /** BackgroundColorProcessor */
    @DI.injectable(IBackgroundColorProcessor)
    class BackgroundColorProcessor extends BaseColorProcessor implements IBackgroundColorProcessor
    {
        protected readonly _lights = new Map<number, number>();
        protected readonly _lightAreas = new Map<number, number>();

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

        protected changeHslaColor(hsla: HslaColor, increaseContrast: boolean, tag: Element): void
        {
            const shift = this._colorShift;
            if (hsla.saturation === 0 && shift.grayHue !== 0)
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
                    let area = this.tryGetTagArea(tag);
                    if (area !== undefined)
                    {
                        let oldArea = this._lightAreas.get(hsla.lightness);
                        if (oldArea && oldArea < area || !oldArea)
                        {
                            this._lightAreas.set(hsla.lightness, area);
                        }
                    }
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
                }
            }
            hsla.lightness = this.scaleValue(light, shift.lightnessLimit);
        }

        public changeColor(rgbaString: string | null, increaseContrast: boolean, tag: Element, getParentBackground?: (tag: any) => ColorEntry): ColorEntry
        {
            rgbaString = rgbaString || "rgb(255, 255, 255)";
            let prevColor = increaseContrast ? this._colors.get(rgbaString) : null;
            if (prevColor)
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
                let rgba = RgbaColor.parse(rgbaString);

                if (tag.tagName == "BODY" && rgba.alpha === 0)
                {
                    rgbaString = "bodyTrans";
                    rgba = { red: 255, green: 255, blue: 255, alpha: 1 };
                }

                if (rgba.alpha === 0 && getParentBackground)
                {
                    let parentBgColor = getParentBackground(tag);
                    let newColor = Object.assign({}, parentBgColor);
                    return Object.assign(newColor, {
                        color: null,
                        reason: ColorReason.Parent,
                        originalColor: rgbaString,
                        owner: this._app.isDebug ? tag : null,
                        base: this._app.isDebug ? parentBgColor : null
                    });
                }
                else
                {
                    let hsla = RgbaColor.toHslaColor(rgba);
                    let originalLight = hsla.lightness;
                    this.changeHslaColor(hsla, increaseContrast, tag);
                    let newRgbColor = HslaColor.toRgbaColor(hsla);
                    let result = {
                        color: newRgbColor.toString(),
                        light: hsla.lightness,
                        originalLight: originalLight,
                        originalColor: rgbaString,
                        alpha: rgba.alpha,
                        reason: ColorReason.Ok,
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
            this._component = Component.SvgElement;
        }
    }
}