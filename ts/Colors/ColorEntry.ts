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
        SameAsBackground,
        SvgText,
        FixedInheritance
    }

    export enum ColorInheritance
    {
        Original,
        Afterwards
    }

    export class ColorEntry
    {
        public static readonly NotFound: ColorEntry = {
            role: Component.Background,
            color: RgbaColor.White,
            light: 1,
            originalLight: 1,
            originalColor: RgbaColor.White,
            alpha: 1,
            reason: ColorReason.NotFound,
            isUpToDate: true,
            owner: null
        }
        role: Component;
        color: string | null;
        light: number;
        backgroundLight?: number;
        originalLight: number;
        originalColor: string;
        inheritedColor?: string | null;
        intendedColor?: string | null;
        alpha: number;
        reason: ColorReason;
        inheritance?: ColorInheritance;
        owner: any;
        base?: ColorEntry | null;
        isUpToDate: boolean;
        constructor() { }
    }
}