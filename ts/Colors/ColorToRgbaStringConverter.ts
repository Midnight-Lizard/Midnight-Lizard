/// <reference path="../DI/-DI.ts" />

namespace MidnightLizard.Colors
{
    export abstract class IColorToRgbaStringConverter
    {
        abstract convert(colorName: string): string | null;
    }
    @DI.injectable(IColorToRgbaStringConverter)
    class ColorToRgbaStringConverter implements IColorToRgbaStringConverter
    {
        constructor(protected readonly _document: Document)
        { }
        /** Converts HslaColor to RgbaColor */
        public convert(colorName: string): string | null
        {
            let div = this._document.createElement("div");
            div.style.setProperty("display", "none", "important");
            div.style.setProperty("color", colorName, "important");
            div.mlIgnore = true;
            this._document.body.appendChild(div);
            let rgbStr = this._document.defaultView!.getComputedStyle(div).color;
            this._document.body.removeChild(div)
            return rgbStr;
        }
    }
}