namespace MidnightLizard.Settings
{
    export type ColorSchemePropertyName = keyof ColorScheme;

    export const excludeSettingsForExport: Settings.ColorSchemePropertyName[] =
        ["isEnabled", "exist", "hostName", "userColorSchemes", "settingsVersion", "isDefault" as any];

    export const excludeSettingsForSave: Settings.ColorSchemePropertyName[] = 
        ["isEnabled", "exist", "hostName", "colorSchemeName", "userColorSchemes", "isDefault" as any];

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

        linkSaturationLimit: number;
        linkContrast: number;
        linkLightnessLimit: number;
        linkDefaultSaturation: number;
        linkDefaultHue: number;

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