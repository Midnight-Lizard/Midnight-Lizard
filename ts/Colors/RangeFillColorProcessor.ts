/// <reference path="../DI/-DI.ts" />
/// <reference path="BaseColorProcessor.ts" />

namespace MidnightLizard.Colors
{
    export abstract class IRangeFillColorProcessor
    {
        abstract changeColor(shift: ComponentShift, textLight: number, bgLight: number,
            ignoreBlueFilter?: boolean): ColorEntry;
    }

    @DI.injectable(IRangeFillColorProcessor)
    class RangeFillColorProcessor extends BaseColorProcessor implements IRangeFillColorProcessor
    {
        constructor(
            app: MidnightLizard.Settings.IApplicationSettings,
            settingsManager: MidnightLizard.Settings.IBaseSettingsManager)
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
}