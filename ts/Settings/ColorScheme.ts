namespace MidnightLizard.Settings
{
    export type ColorSchemePropertyName = keyof ColorScheme;
    /**
     * ColorScheme - MidnightLizard Settings
     */
    export class ColorScheme
    {
        exist?: boolean;
        hostName?: string;
        isEnabled?: boolean;
        isDefault?: boolean;
        settingsVersion?: string;

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

        borderSaturationLimit: number;
        borderContrast: number;
        borderLightnessLimit: number;
        borderGraySaturation: number;
        borderGrayHue: number;

        imageLightnessLimit: number;
        imageSaturationLimit: number;

        backgroundImageLightnessLimit: number;
        backgroundImageSaturationLimit: number;

        scrollbarSaturationLimit: number;
        scrollbarContrast: number;
        scrollbarLightnessLimit: number;
        scrollbarGrayHue: number;

        constructor() { }
    }
}