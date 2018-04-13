namespace MidnightLizard.Colors
{
    /**
     * RgbaColor
     */
    export class RgbaColor
    {
        constructor(readonly red: number, readonly green: number, readonly blue: number, readonly alpha: number) { }
        toString(): string
        {
            if (this.alpha === 1)
            {
                return `rgb(${Math.round(this.red)}, ${Math.round(this.green)}, ${Math.round(this.blue)})`;
            }
            return `rgba(${Math.round(this.red)}, ${Math.round(this.green)}, ${Math.round(this.blue)}, ${this.alpha})`;
        }
        /** White color rgb string */
        public static readonly White = new RgbaColor(255, 255, 255, 1).toString();
        /** Black color rgb string */
        public static readonly Black = new RgbaColor(0, 0, 0, 1).toString();
        /** Gray color rgb string */
        public static readonly Gray = new RgbaColor(127, 127, 127, 1).toString();
        /** Transparent color rgba string */
        public static readonly Transparent = new RgbaColor(0, 0, 0, 0).toString();
        static parse(str: string): RgbaColor
        {
            let hasAlfa = str[3] == "a";
            str = str.substr(hasAlfa ? 5 : 4, str.length - 1);
            let colorArr = str.split(",");
            return new RgbaColor(
                parseInt(colorArr[0]),
                parseInt(colorArr[1]),
                parseInt(colorArr[2]),
                hasAlfa ? parseFloat(colorArr[3]) : 1);
        }
        static toHslaColor(rgba: RgbaColor): HslaColor
        {
            let min: number, max: number, h: number = 0, s: number = 1, l: number = 1, maxcolor: number,
                rgb = [rgba.red / 255, rgba.green / 255, rgba.blue / 255];
            min = rgb[0];
            max = rgb[0];
            maxcolor = 0;
            for (let i = 0; i < rgb.length - 1; i++)
            {
                if (rgb[i + 1] <= min)
                {
                    min = rgb[i + 1];
                }
                if (rgb[i + 1] >= max)
                {
                    max = rgb[i + 1]; maxcolor = i + 1;
                }
            }
            if (maxcolor === 0)
            {
                h = (rgb[1] - rgb[2]) / (max - min);
            }
            if (maxcolor == 1)
            {
                h = 2 + (rgb[2] - rgb[0]) / (max - min);
            }
            if (maxcolor == 2)
            {
                h = 4 + (rgb[0] - rgb[1]) / (max - min);
            }
            if (isNaN(h)) 
            {
                h = 0;
            }
            h = h * 60;
            if (h < 0)
            {
                h = h + 360;
            }
            l = (min + max) / 2;
            if (min == max)
            {
                s = 0;
            }
            else
            {
                if (l < 0.5)
                {
                    s = (max - min) / (max + min);
                }
                else
                {
                    s = (max - min) / (2 - max - min);
                }
            }
            return new HslaColor(Math.round(h), s, l, rgba.alpha);
        }
    }
}