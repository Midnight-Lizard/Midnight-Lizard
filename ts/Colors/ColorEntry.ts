/// <reference path="RgbaColor.ts" />

namespace MidnightLizard.Colors
{
    export enum ColorReason
    {
        Ok,
        Parent,
        Previous,
        Inherited,
        Transparent,
        NotFound,
        SameAsBackground
    }
    /**
     * ColorEntry
     */
    export class ColorEntry
    {
        public static readonly NotFound: ColorEntry = {
            color: RgbaColor.White,
            light: 1,
            originalLight: 1,
            originalColor: RgbaColor.White,
            alpha: 1,
            reason: ColorReason.NotFound,
            isUpToDate: true,
            owner: null
        }

        color: string | null;
        light: number;
        backgroundLight?: number;
        originalLight: number;
        originalColor: string;
        alpha: number;
        reason: ColorReason;
        owner: any;
        base?: ColorEntry;
        isUpToDate: boolean;
        constructor() { }
    }
}