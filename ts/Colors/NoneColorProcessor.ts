/// <reference path="../DI/-DI.ts" />
/// <reference path="./ColorEntry.ts" />
/// <reference path="./ComponentShift.ts" />

namespace MidnightLizard.Colors
{
    export abstract class INoneColorProcessor
    {
        abstract changeColor(rgbaString: string | null): ColorEntry;
    }

    @DI.injectable(INoneColorProcessor)
    class NoneColorProcessor implements INoneColorProcessor
    {
        changeColor(rgbaString: string | null): ColorEntry
        {
            rgbaString = !rgbaString || rgbaString === "none" ? RgbaColor.Transparent : rgbaString;
            const rgba = RgbaColor.parse(rgbaString);
            const hsla = RgbaColor.toHslaColor(rgba);
            return {
                role: Component.None,
                color: rgbaString,
                light: hsla.lightness,
                originalLight: hsla.lightness,
                originalColor: rgbaString,
                alpha: rgba.alpha,
                reason: ColorReason.None,
                isUpToDate: true,
                owner: null
            };
        }
    }
}
