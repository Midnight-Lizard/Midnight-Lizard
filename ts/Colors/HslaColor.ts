import { RgbaColor } from "./RgbaColor";

const float = new Intl.NumberFormat('en-US', {
    useGrouping: false,
    maximumFractionDigits: 2
});

/**
 * HslaColor
 */
export class HslaColor
{
    constructor(public hue: number, public saturation: number, public lightness: number, public alpha: number) { }
    private hueToRgb(t1: number, t2: number, hue: number): number
    {
        if (hue < 0) hue += 6;
        if (hue >= 6) hue -= 6;
        if (hue < 1) return (t2 - t1) * hue + t1;
        else if (hue < 3) return t2;
        else if (hue < 4) return (t2 - t1) * (4 - hue) + t1;
        else return t1;
    }
    static toRgbaColor(hsla: HslaColor): RgbaColor
    {
        let t1: number, t2: number, r: number, g: number, b: number;
        let hue = hsla.hue / 60;
        if (hsla.lightness <= 0.5)
        {
            t2 = hsla.lightness * (hsla.saturation + 1);
        }
        else
        {
            t2 = hsla.lightness + hsla.saturation - (hsla.lightness * hsla.saturation);
        }
        t1 = hsla.lightness * 2 - t2;
        r = hsla.hueToRgb(t1, t2, hue + 2) * 255;
        g = hsla.hueToRgb(t1, t2, hue) * 255;
        b = hsla.hueToRgb(t1, t2, hue - 2) * 255;
        return new RgbaColor(r, g, b, hsla.alpha);
    }
    toString(): string
    {
        if (this.alpha === 1)
        {
            return `hsl(${Math.round(this.hue)}, ${float.format(this.saturation * 100)}%, ${float.format(this.lightness * 100)}%)`;
        }
        return `hsla(${Math.round(this.hue)}, ${float.format(this.saturation * 100)}%, ${float.format(this.lightness * 100)}%, ${float.format(this.alpha)})`;
    }
}