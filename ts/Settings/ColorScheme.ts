namespace MidnightLizard.Settings
{
    export type ColorSchemePropertyName = keyof ColorScheme;

    export const excludeSettingsForExport: Settings.ColorSchemePropertyName[] =
        ["isEnabled", "exist", "hostName", "userColorSchemes"];

    export const excludeSettingsForSave: Settings.ColorSchemePropertyName[] =
        ["isEnabled", "exist", "hostName", "colorSchemeName", "userColorSchemes"];

    /**
     * ColorScheme - MidnightLizard Settings
     */
    export class ColorScheme
    {
        userColorSchemes?: Array<ColorScheme>;
        colorSchemeId: ColorSchemeName;
        colorSchemeName: string;
        exist?: boolean;
        hostName?: string;
        isEnabled?: boolean;
        blueFilter: number;

        useDefaultSchedule: boolean;
        scheduleStartHour: number;
        scheduleFinishHour: number

        runOnThisSite: boolean;
        restoreColorsOnCopy: boolean;

        backgroundSaturationLimit: number;
        backgroundContrast: number;
        backgroundLightnessLimit: number;
        backgroundGraySaturation: number;
        backgroundGrayHue: number;

        textSaturationLimit: number;
        textContrast: number;
        textLightnessLimit: number;
        textGraySaturation: number;
        textGrayHue: number;
        textSelectionHue: number;

        linkSaturationLimit: number;
        linkContrast: number;
        linkLightnessLimit: number;
        linkDefaultSaturation: number;
        linkDefaultHue: number;
        linkVisitedHue: number;

        borderSaturationLimit: number;
        borderContrast: number;
        borderLightnessLimit: number;
        borderGraySaturation: number;
        borderGrayHue: number;

        imageLightnessLimit: number;
        imageSaturationLimit: number;
        useImageHoverAnimation: boolean;

        backgroundImageLightnessLimit: number;
        backgroundImageSaturationLimit: number;

        scrollbarSaturationLimit: number;
        scrollbarContrast: number;
        scrollbarLightnessLimit: number;
        scrollbarGrayHue: number;
        scrollbarSize: number;

        constructor() { }
    }
}