import { ComponentShift, Component } from "./ComponentShift";
import { ColorEntry, ColorReason } from "./ColorEntry";
import { injectable } from "../Utils/DI";
import { BaseColorProcessor } from "./BaseColorProcessor";
import { IApplicationSettings } from "../Settings/IApplicationSettings";
import { IBaseSettingsManager } from "../Settings/BaseSettingsManager";
import { HslaColor } from "./HslaColor";
import { RgbaColor } from "./RgbaColor";

export abstract class IRangeFillColorProcessor
{
    abstract changeColor(shift: ComponentShift, textLight: number, bgLight: number,
        ignoreBlueFilter?: boolean): ColorEntry;
}

@injectable(IRangeFillColorProcessor)
class RangeFillColorProcessor extends BaseColorProcessor implements IRangeFillColorProcessor
{
    constructor(
        app: IApplicationSettings,
        settingsManager: IBaseSettingsManager)
    {
        super(app, settingsManager)
    }

    changeColor(shift: ComponentShift, textLight: number, bgLight: number,
        ignoreBlueFilter?: boolean): ColorEntry
    {
        const lightness = (textLight + 3 * bgLight) / 4;
        const resultColor = HslaColor.toRgbaColor(new HslaColor(
            shift.Border.grayHue,
            Math.min(shift.Border.graySaturation * 1.15, 1), lightness, 1));
        const resultColorString = ignoreBlueFilter ? resultColor.toString()
            : this.applyBlueFilter(resultColor).toString()
        return {
            color: resultColorString,
            role: Component.TextShadow,
            light: lightness,
            originalLight: 0.5,
            originalColor: RgbaColor.Gray,
            alpha: 1,
            reason: ColorReason.Ok,
            isUpToDate: true,
            owner: null
        };
    }
}