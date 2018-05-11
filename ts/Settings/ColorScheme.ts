namespace MidnightLizard.Settings
{
    export enum ProcessingMode
    {
        Simplified = "simple",
        Complex = "complex"
    }

    export type ColorSchemePropertyName = keyof ColorScheme;

    export const excludeSettingsForExport: Settings.ColorSchemePropertyName[] =
        ["isEnabled", "hostName", "userColorSchemes", "userColorSchemeIds", "changeBrowserTheme"];

    export const excludeSettingsForSave: Settings.ColorSchemePropertyName[] =
        ["isEnabled", "hostName", "colorSchemeName", "userColorSchemes", "userColorSchemeIds", "changeBrowserTheme"];

    export const excludeSettingsForCompare: Settings.ColorSchemePropertyName[] =
        ["isEnabled", "hostName", "colorSchemeId", "colorSchemeName",
            "userColorSchemes", "userColorSchemeIds", "runOnThisSite", "changeBrowserTheme"];


    export type PartialColorScheme = {[k in keyof Settings.ColorScheme]?: Settings.ColorScheme[k]};
    /**
     * ColorScheme - MidnightLizard Settings
     */
    export interface ColorScheme
    {
        userColorSchemes?: Array<ColorScheme>;
        userColorSchemeIds?: Array<ColorSchemeName>;
        colorSchemeId: ColorSchemeName;
        colorSchemeName: string;
        hostName?: string;
        isEnabled?: boolean;
        blueFilter: number;
        mode: ProcessingMode;

        useDefaultSchedule: boolean;
        scheduleStartHour: number;
        scheduleFinishHour: number

        runOnThisSite: boolean;
        restoreColorsOnCopy: boolean;
        restoreColorsOnPrint: boolean;
        changeBrowserTheme: boolean;

        backgroundSaturationLimit: number;
        backgroundContrast: number;
        backgroundLightnessLimit: number;
        backgroundGraySaturation: number;
        backgroundGrayHue: number;
        backgroundReplaceAllHues: boolean;
        backgroundHueGravity: number;

        buttonSaturationLimit: number;
        buttonContrast: number;
        buttonLightnessLimit: number;
        buttonGraySaturation: number;
        buttonGrayHue: number;
        buttonReplaceAllHues: boolean;
        buttonHueGravity: number;

        textSaturationLimit: number;
        textContrast: number;
        textLightnessLimit: number;
        textGraySaturation: number;
        textGrayHue: number;
        textSelectionHue: number;
        textReplaceAllHues: boolean;
        textHueGravity: number;

        linkSaturationLimit: number;
        linkContrast: number;
        linkLightnessLimit: number;
        linkDefaultSaturation: number;
        linkDefaultHue: number;
        linkVisitedHue: number;
        linkReplaceAllHues: boolean;
        linkHueGravity: number;

        borderSaturationLimit: number;
        borderContrast: number;
        borderLightnessLimit: number;
        borderGraySaturation: number;
        borderGrayHue: number;
        borderReplaceAllHues: boolean;
        borderHueGravity: number;

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
    }
}