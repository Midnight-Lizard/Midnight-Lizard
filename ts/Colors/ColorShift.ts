/**
 * ColorShift
 */
export interface ColorShift
{
    readonly saturationLimit: number;
    readonly contrast: number;
    readonly lightnessLimit: number;
    readonly graySaturation: number;
    readonly grayHue: number;
    readonly hueGravity: number;
    readonly replaceAllHues: boolean;
}