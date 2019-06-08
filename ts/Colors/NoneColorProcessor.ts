import { ColorEntry, ColorReason } from "./ColorEntry";
import { injectable } from "../Utils/DI";
import { RgbaColor } from "./RgbaColor";
import { Component } from "./ComponentShift";

export abstract class INoneColorProcessor
{
    abstract changeColor(rgbaString: string | null): ColorEntry;
}

@injectable(INoneColorProcessor)
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
