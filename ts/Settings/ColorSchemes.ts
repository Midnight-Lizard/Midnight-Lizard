/// <reference path="./ColorScheme.ts" />

namespace MidnightLizard.Settings
{

    export type ColorSchemeName = keyof typeof ColorSchemes;

    /**
     * ColorSchemes
     */
    export const ColorSchemes: {
        default: ColorScheme;
        original: ColorScheme;
        dimmedDust: ColorScheme;
        appleMint: ColorScheme;
        kappaDream: ColorScheme;
        almondRipe: ColorScheme;
        sunsetSails: ColorScheme;
        halloween: ColorScheme;
        morningMist: ColorScheme;
        antiqueCodex: ColorScheme;
        increasedContrast: ColorScheme;
        grayscale: ColorScheme;
        invertedLight: ColorScheme;
        invertedGrayscale: ColorScheme;
        yellowOnBlack: ColorScheme;
        greenOnBlack: ColorScheme;
    } = {} as any

    /**
     * DefaultColorSchemes
     */
    export const DefaultColorSchemes: ColorScheme =
        {
            userColorSchemes: [
                // Default
                {
                    userColorSchemes: [],
                    colorSchemeId: "default",
                    colorSchemeName: "Default",
                    runOnThisSite: true,
                    isEnabled: true,
                    restoreColorsOnCopy: false,
                    blueFilter: 0,

                    useDefaultSchedule: true,
                    scheduleStartHour: 0,
                    scheduleFinishHour: 24,

                    backgroundSaturationLimit: 100,
                    backgroundContrast: 0,
                    backgroundLightnessLimit: 100,
                    backgroundGraySaturation: 0,
                    backgroundGrayHue: 0,
                    backgroundReplaceAllHues: false,
                    backgroundHueGravity: 0,

                    buttonSaturationLimit: 100,
                    buttonContrast: 0,
                    buttonLightnessLimit: 100,
                    buttonGraySaturation: 0,
                    buttonGrayHue: 0,
                    buttonReplaceAllHues: false,
                    buttonHueGravity: 0,

                    textSaturationLimit: 100,
                    textContrast: 0,
                    textLightnessLimit: 100,
                    textGraySaturation: 0,
                    textGrayHue: 0,
                    textSelectionHue: 0,
                    textReplaceAllHues: false,
                    textHueGravity: 0,

                    linkSaturationLimit: 100,
                    linkContrast: 0,
                    linkLightnessLimit: 100,
                    linkDefaultSaturation: 0,
                    linkDefaultHue: 0,
                    linkVisitedHue: 0,
                    linkReplaceAllHues: false,
                    linkHueGravity: 0,

                    borderSaturationLimit: 100,
                    borderContrast: 0,
                    borderLightnessLimit: 100,
                    borderGraySaturation: 0,
                    borderGrayHue: 0,
                    borderReplaceAllHues: false,
                    borderHueGravity: 0,

                    imageLightnessLimit: 100,
                    imageSaturationLimit: 100,
                    useImageHoverAnimation: false,

                    backgroundImageLightnessLimit: 100,
                    backgroundImageSaturationLimit: 100,

                    scrollbarSaturationLimit: 0,
                    scrollbarContrast: 0,
                    scrollbarLightnessLimit: 100,
                    scrollbarGrayHue: 0,
                    scrollbarSize: 0
                } as ColorScheme,

                // Original
                {
                    colorSchemeId: "original",
                    colorSchemeName: "Original (none)",
                    runOnThisSite: false,
                    restoreColorsOnCopy: false,
                    blueFilter: 0,

                    useDefaultSchedule: true,
                    scheduleStartHour: 0,
                    scheduleFinishHour: 24,

                    backgroundSaturationLimit: 100,
                    backgroundContrast: 0,
                    backgroundLightnessLimit: 100,
                    backgroundGraySaturation: 0,
                    backgroundGrayHue: 0,
                    backgroundReplaceAllHues: false,
                    backgroundHueGravity: 0,

                    buttonSaturationLimit: 100,
                    buttonContrast: 0,
                    buttonLightnessLimit: 100,
                    buttonGraySaturation: 0,
                    buttonGrayHue: 0,
                    buttonReplaceAllHues: false,
                    buttonHueGravity: 0,

                    textSaturationLimit: 100,
                    textContrast: 0,
                    textLightnessLimit: 100,
                    textGraySaturation: 0,
                    textGrayHue: 0,
                    textSelectionHue: 0,
                    textReplaceAllHues: false,
                    textHueGravity: 0,

                    linkSaturationLimit: 100,
                    linkContrast: 0,
                    linkLightnessLimit: 100,
                    linkDefaultSaturation: 0,
                    linkDefaultHue: 0,
                    linkVisitedHue: 0,
                    linkReplaceAllHues: false,
                    linkHueGravity: 0,

                    borderSaturationLimit: 100,
                    borderContrast: 0,
                    borderLightnessLimit: 100,
                    borderGraySaturation: 0,
                    borderGrayHue: 0,
                    borderReplaceAllHues: false,
                    borderHueGravity: 0,

                    imageLightnessLimit: 100,
                    imageSaturationLimit: 100,
                    useImageHoverAnimation: false,

                    backgroundImageLightnessLimit: 100,
                    backgroundImageSaturationLimit: 100,

                    scrollbarSaturationLimit: 0,
                    scrollbarContrast: 0,
                    scrollbarLightnessLimit: 100,
                    scrollbarGrayHue: 0,
                    scrollbarSize: 0
                } as ColorScheme,

                // Dimmed Dust
                {
                    colorSchemeId: "dimmedDust",
                    colorSchemeName: "Dimmed Dust",
                    runOnThisSite: true,
                    restoreColorsOnCopy: false,
                    blueFilter: 0,

                    useDefaultSchedule: true,
                    scheduleStartHour: 0,
                    scheduleFinishHour: 24,

                    backgroundSaturationLimit: 65,
                    backgroundContrast: 50,
                    backgroundLightnessLimit: 14,
                    backgroundGraySaturation: 5,
                    backgroundGrayHue: 200,
                    backgroundReplaceAllHues: false,
                    backgroundHueGravity: 0,

                    buttonSaturationLimit: 80,
                    buttonContrast: 4,
                    buttonLightnessLimit: 17,
                    buttonGraySaturation: 10,
                    buttonGrayHue: 200,
                    buttonReplaceAllHues: false,
                    buttonHueGravity: 0,

                    textSaturationLimit: 90,
                    textContrast: 62,
                    textLightnessLimit: 85,
                    textGraySaturation: 20,
                    textGrayHue: 16,
                    textSelectionHue: 207,
                    textReplaceAllHues: false,
                    textHueGravity: 0,

                    linkSaturationLimit: 80,
                    linkContrast: 55,
                    linkLightnessLimit: 66,
                    linkDefaultSaturation: 74,
                    linkDefaultHue: 207,
                    linkVisitedHue: 231,
                    linkReplaceAllHues: false,
                    linkHueGravity: 80,

                    borderSaturationLimit: 80,
                    borderContrast: 30,
                    borderLightnessLimit: 50,
                    borderGraySaturation: 20,
                    borderGrayHue: 16,
                    borderReplaceAllHues: false,
                    borderHueGravity: 0,

                    imageLightnessLimit: 80,
                    imageSaturationLimit: 90,
                    useImageHoverAnimation: false,

                    backgroundImageLightnessLimit: 40,
                    backgroundImageSaturationLimit: 80,

                    scrollbarSaturationLimit: 5,
                    scrollbarContrast: 0,
                    scrollbarLightnessLimit: 40,
                    scrollbarGrayHue: 16,
                    scrollbarSize: 10
                } as ColorScheme,

                // Apple Mint
                {
                    colorSchemeId: "appleMint",
                    colorSchemeName: "Apple Mint",
                    runOnThisSite: true,
                    restoreColorsOnCopy: false,
                    blueFilter: 0,

                    useDefaultSchedule: true,
                    scheduleStartHour: 0,
                    scheduleFinishHour: 24,

                    backgroundSaturationLimit: 60,
                    backgroundContrast: 50,
                    backgroundLightnessLimit: 14,
                    backgroundGraySaturation: 60,
                    backgroundGrayHue: 174,
                    backgroundReplaceAllHues: false,
                    backgroundHueGravity: 80,

                    buttonSaturationLimit: 60,
                    buttonContrast: 3,
                    buttonLightnessLimit: 16,
                    buttonGraySaturation: 50,
                    buttonGrayHue: 174,
                    buttonReplaceAllHues: false,
                    buttonHueGravity: 80,

                    textSaturationLimit: 60,
                    textContrast: 60,
                    textLightnessLimit: 90,
                    textGraySaturation: 20,
                    textGrayHue: 88,
                    textSelectionHue: 88,
                    textReplaceAllHues: false,
                    textHueGravity: 80,

                    linkSaturationLimit: 60,
                    linkContrast: 60,
                    linkLightnessLimit: 80,
                    linkDefaultSaturation: 50,
                    linkDefaultHue: 88,
                    linkVisitedHue: 122,
                    linkReplaceAllHues: false,
                    linkHueGravity: 80,

                    borderSaturationLimit: 60,
                    borderContrast: 30,
                    borderLightnessLimit: 50,
                    borderGraySaturation: 10,
                    borderGrayHue: 122,
                    borderReplaceAllHues: false,
                    borderHueGravity: 80,

                    imageLightnessLimit: 80,
                    imageSaturationLimit: 100,
                    useImageHoverAnimation: false,

                    backgroundImageLightnessLimit: 40,
                    backgroundImageSaturationLimit: 100,

                    scrollbarSaturationLimit: 10,
                    scrollbarContrast: 0,
                    scrollbarLightnessLimit: 40,
                    scrollbarGrayHue: 122,
                    scrollbarSize: 10
                } as ColorScheme,

                // Kappa Dream
                {
                    colorSchemeId: "kappaDream",
                    colorSchemeName: "Kappa Dream",
                    runOnThisSite: true,
                    restoreColorsOnCopy: false,
                    blueFilter: 0,

                    useDefaultSchedule: true,
                    scheduleStartHour: 0,
                    scheduleFinishHour: 24,

                    backgroundSaturationLimit: 60,
                    backgroundContrast: 50,
                    backgroundLightnessLimit: 15,
                    backgroundGraySaturation: 30,
                    backgroundGrayHue: 122,
                    backgroundReplaceAllHues: false,
                    backgroundHueGravity: 80,

                    buttonSaturationLimit: 60,
                    buttonContrast: 4,
                    buttonLightnessLimit: 18,
                    buttonGraySaturation: 40,
                    buttonGrayHue: 122,
                    buttonReplaceAllHues: false,
                    buttonHueGravity: 80,

                    textSaturationLimit: 60,
                    textContrast: 60,
                    textLightnessLimit: 90,
                    textGraySaturation: 30,
                    textGrayHue: 66,
                    textSelectionHue: 88,
                    textReplaceAllHues: false,
                    textHueGravity: 80,

                    linkSaturationLimit: 60,
                    linkContrast: 55,
                    linkLightnessLimit: 80,
                    linkDefaultSaturation: 70,
                    linkDefaultHue: 66,
                    linkVisitedHue: 88,
                    linkReplaceAllHues: false,
                    linkHueGravity: 80,

                    borderSaturationLimit: 60,
                    borderContrast: 30,
                    borderLightnessLimit: 50,
                    borderGraySaturation: 20,
                    borderGrayHue: 88,
                    borderReplaceAllHues: false,
                    borderHueGravity: 80,

                    imageLightnessLimit: 80,
                    imageSaturationLimit: 100,
                    useImageHoverAnimation: false,

                    backgroundImageLightnessLimit: 40,
                    backgroundImageSaturationLimit: 100,

                    scrollbarSaturationLimit: 20,
                    scrollbarContrast: 0,
                    scrollbarLightnessLimit: 40,
                    scrollbarGrayHue: 122,
                    scrollbarSize: 10
                } as ColorScheme,

                // Almond Ripe
                {
                    colorSchemeId: "almondRipe",
                    colorSchemeName: "Almond Ripe",
                    runOnThisSite: true,
                    restoreColorsOnCopy: false,
                    blueFilter: 5,

                    useDefaultSchedule: true,
                    scheduleStartHour: 0,
                    scheduleFinishHour: 24,

                    backgroundSaturationLimit: 60,
                    backgroundContrast: 50,
                    backgroundLightnessLimit: 11,
                    backgroundGraySaturation: 30,
                    backgroundGrayHue: 36,
                    backgroundReplaceAllHues: false,
                    backgroundHueGravity: 80,

                    buttonSaturationLimit: 60,
                    buttonContrast: 3,
                    buttonLightnessLimit: 13,
                    buttonGraySaturation: 50,
                    buttonGrayHue: 14,
                    buttonReplaceAllHues: false,
                    buttonHueGravity: 80,

                    textSaturationLimit: 60,
                    textContrast: 62,
                    textLightnessLimit: 85,
                    textGraySaturation: 10,
                    textGrayHue: 88,
                    textSelectionHue: 36,
                    textReplaceAllHues: false,
                    textHueGravity: 80,

                    linkSaturationLimit: 60,
                    linkContrast: 50,
                    linkLightnessLimit: 70,
                    linkDefaultSaturation: 60,
                    linkDefaultHue: 88,
                    linkVisitedHue: 122,
                    linkReplaceAllHues: false,
                    linkHueGravity: 80,

                    borderSaturationLimit: 60,
                    borderContrast: 30,
                    borderLightnessLimit: 50,
                    borderGraySaturation: 20,
                    borderGrayHue: 54,
                    borderReplaceAllHues: false,
                    borderHueGravity: 80,

                    imageLightnessLimit: 80,
                    imageSaturationLimit: 90,
                    useImageHoverAnimation: false,

                    backgroundImageLightnessLimit: 40,
                    backgroundImageSaturationLimit: 80,

                    scrollbarSaturationLimit: 20,
                    scrollbarContrast: 0,
                    scrollbarLightnessLimit: 40,
                    scrollbarGrayHue: 45,
                    scrollbarSize: 10
                } as ColorScheme,

                // Sunset Sails
                {
                    colorSchemeId: "sunsetSails",
                    colorSchemeName: "Sunset Sails",
                    runOnThisSite: true,
                    restoreColorsOnCopy: false,
                    blueFilter: 30,

                    useDefaultSchedule: true,
                    scheduleStartHour: 0,
                    scheduleFinishHour: 24,

                    backgroundSaturationLimit: 80,
                    backgroundContrast: 50,
                    backgroundLightnessLimit: 15,
                    backgroundGraySaturation: 30,
                    backgroundGrayHue: 4,
                    backgroundReplaceAllHues: false,
                    backgroundHueGravity: 20,

                    buttonSaturationLimit: 80,
                    buttonContrast: 4,
                    buttonLightnessLimit: 18,
                    buttonGraySaturation: 40,
                    buttonGrayHue: 14,
                    buttonReplaceAllHues: false,
                    buttonHueGravity: 20,

                    textSaturationLimit: 90,
                    textContrast: 62,
                    textLightnessLimit: 90,
                    textGraySaturation: 20,
                    textGrayHue: 45,
                    textSelectionHue: 291,
                    textReplaceAllHues: false,
                    textHueGravity: 20,

                    linkSaturationLimit: 70,
                    linkContrast: 55,
                    linkLightnessLimit: 80,
                    linkDefaultSaturation: 70,
                    linkDefaultHue: 45,
                    linkVisitedHue: 14,
                    linkReplaceAllHues: false,
                    linkHueGravity: 80,

                    borderSaturationLimit: 80,
                    borderContrast: 30,
                    borderLightnessLimit: 50,
                    borderGraySaturation: 20,
                    borderGrayHue: 14,
                    borderReplaceAllHues: false,
                    borderHueGravity: 20,

                    imageLightnessLimit: 80,
                    imageSaturationLimit: 100,
                    useImageHoverAnimation: false,

                    backgroundImageLightnessLimit: 40,
                    backgroundImageSaturationLimit: 100,

                    scrollbarSaturationLimit: 20,
                    scrollbarContrast: 0,
                    scrollbarLightnessLimit: 40,
                    scrollbarGrayHue: 36,
                    scrollbarSize: 10
                } as ColorScheme,

                // Halloween
                {
                    colorSchemeId: "halloween",
                    colorSchemeName: "Halloween",
                    runOnThisSite: true,
                    restoreColorsOnCopy: false,
                    blueFilter: 80,

                    useDefaultSchedule: true,
                    scheduleStartHour: 0,
                    scheduleFinishHour: 24,

                    backgroundSaturationLimit: 80,
                    backgroundContrast: 60,
                    backgroundLightnessLimit: 7,
                    backgroundGraySaturation: 80,
                    backgroundGrayHue: 16,
                    backgroundReplaceAllHues: false,
                    backgroundHueGravity: 20,

                    buttonSaturationLimit: 80,
                    buttonContrast: 4,
                    buttonLightnessLimit: 12,
                    buttonGraySaturation: 80,
                    buttonGrayHue: 14,
                    buttonReplaceAllHues: false,
                    buttonHueGravity: 20,

                    textSaturationLimit: 90,
                    textContrast: 62,
                    textLightnessLimit: 90,
                    textGraySaturation: 80,
                    textGrayHue: 14,
                    textSelectionHue: 4,
                    textReplaceAllHues: false,
                    textHueGravity: 20,

                    linkSaturationLimit: 90,
                    linkContrast: 55,
                    linkLightnessLimit: 100,
                    linkDefaultSaturation: 100,
                    linkDefaultHue: 14,
                    linkVisitedHue: 4,
                    linkReplaceAllHues: false,
                    linkHueGravity: 80,

                    borderSaturationLimit: 80,
                    borderContrast: 30,
                    borderLightnessLimit: 60,
                    borderGraySaturation: 100,
                    borderGrayHue: 4,
                    borderReplaceAllHues: false,
                    borderHueGravity: 20,

                    imageLightnessLimit: 80,
                    imageSaturationLimit: 90,
                    useImageHoverAnimation: false,

                    backgroundImageLightnessLimit: 40,
                    backgroundImageSaturationLimit: 80,

                    scrollbarSaturationLimit: 30,
                    scrollbarContrast: 0,
                    scrollbarLightnessLimit: 20,
                    scrollbarGrayHue: 16,
                    scrollbarSize: 10
                } as ColorScheme,

                // Morning Mist
                {
                    colorSchemeId: "morningMist",
                    colorSchemeName: "Morning Mist",
                    runOnThisSite: true,
                    restoreColorsOnCopy: false,
                    blueFilter: 0,

                    useDefaultSchedule: true,
                    scheduleStartHour: 0,
                    scheduleFinishHour: 24,

                    backgroundSaturationLimit: 90,
                    backgroundContrast: 50,
                    backgroundLightnessLimit: 90,
                    backgroundGraySaturation: 10,
                    backgroundGrayHue: 200,
                    backgroundReplaceAllHues: false,
                    backgroundHueGravity: 0,

                    buttonSaturationLimit: 90,
                    buttonContrast: 10,
                    buttonLightnessLimit: 85,
                    buttonGraySaturation: 30,
                    buttonGrayHue: 200,
                    buttonReplaceAllHues: false,
                    buttonHueGravity: 0,

                    textSaturationLimit: 90,
                    textContrast: 60,
                    textLightnessLimit: 95,
                    textGraySaturation: 20,
                    textGrayHue: 199,
                    textSelectionHue: 231,
                    textReplaceAllHues: false,
                    textHueGravity: 0,

                    linkSaturationLimit: 90,
                    linkContrast: 60,
                    linkLightnessLimit: 100,
                    linkDefaultSaturation: 100,
                    linkDefaultHue: 231,
                    linkVisitedHue: 291,
                    linkReplaceAllHues: false,
                    linkHueGravity: 80,

                    borderSaturationLimit: 90,
                    borderContrast: 40,
                    borderLightnessLimit: 95,
                    borderGraySaturation: 20,
                    borderGrayHue: 200,
                    borderReplaceAllHues: false,
                    borderHueGravity: 0,

                    imageLightnessLimit: 90,
                    imageSaturationLimit: 90,
                    useImageHoverAnimation: false,

                    backgroundImageLightnessLimit: 90,
                    backgroundImageSaturationLimit: 90,

                    scrollbarSaturationLimit: 15,
                    scrollbarContrast: 5,
                    scrollbarLightnessLimit: 80,
                    scrollbarGrayHue: 187,
                    scrollbarSize: 10
                } as ColorScheme,

                // Antique Codex
                {
                    colorSchemeId: "antiqueCodex",
                    colorSchemeName: "Antique Codex",
                    runOnThisSite: true,
                    restoreColorsOnCopy: false,
                    blueFilter: 5,

                    useDefaultSchedule: true,
                    scheduleStartHour: 0,
                    scheduleFinishHour: 24,

                    backgroundSaturationLimit: 30,
                    backgroundContrast: 50,
                    backgroundLightnessLimit: 93,
                    backgroundGraySaturation: 50,
                    backgroundGrayHue: 45,
                    backgroundReplaceAllHues: false,
                    backgroundHueGravity: 0,

                    buttonSaturationLimit: 40,
                    buttonContrast: 10,
                    buttonLightnessLimit: 85,
                    buttonGraySaturation: 50,
                    buttonGrayHue: 36,
                    buttonReplaceAllHues: false,
                    buttonHueGravity: 0,

                    textSaturationLimit: 90,
                    textContrast: 80,
                    textLightnessLimit: 100,
                    textGraySaturation: 40,
                    textGrayHue: 16,
                    textSelectionHue: 14,
                    textReplaceAllHues: false,
                    textHueGravity: 0,

                    linkSaturationLimit: 90,
                    linkContrast: 65,
                    linkLightnessLimit: 100,
                    linkDefaultSaturation: 100,
                    linkDefaultHue: 36,
                    linkVisitedHue: 14,
                    linkReplaceAllHues: false,
                    linkHueGravity: 80,

                    borderSaturationLimit: 80,
                    borderContrast: 60,
                    borderLightnessLimit: 100,
                    borderGraySaturation: 40,
                    borderGrayHue: 36,
                    borderReplaceAllHues: false,
                    borderHueGravity: 0,

                    imageLightnessLimit: 93,
                    imageSaturationLimit: 50,
                    useImageHoverAnimation: false,

                    backgroundImageLightnessLimit: 93,
                    backgroundImageSaturationLimit: 30,

                    scrollbarSaturationLimit: 15,
                    scrollbarContrast: 5,
                    scrollbarLightnessLimit: 85,
                    scrollbarGrayHue: 16,
                    scrollbarSize: 10
                } as ColorScheme,

                // Increased Contrast
                {
                    colorSchemeId: "increasedContrast",
                    colorSchemeName: "Increased Contrast",
                    runOnThisSite: true,
                    restoreColorsOnCopy: false,
                    blueFilter: 0,

                    useDefaultSchedule: true,
                    scheduleStartHour: 0,
                    scheduleFinishHour: 24,

                    backgroundSaturationLimit: 100,
                    backgroundContrast: 50,
                    backgroundLightnessLimit: 100,
                    backgroundGraySaturation: 0,
                    backgroundGrayHue: 0,
                    backgroundReplaceAllHues: false,
                    backgroundHueGravity: 0,

                    buttonSaturationLimit: 100,
                    buttonContrast: 10,
                    buttonLightnessLimit: 90,
                    buttonGraySaturation: 0,
                    buttonGrayHue: 0,
                    buttonReplaceAllHues: false,
                    buttonHueGravity: 0,

                    textSaturationLimit: 100,
                    textContrast: 60,
                    textLightnessLimit: 100,
                    textGraySaturation: 40,
                    textGrayHue: 16,
                    textSelectionHue: 231,
                    textReplaceAllHues: false,
                    textHueGravity: 0,

                    linkSaturationLimit: 100,
                    linkContrast: 60,
                    linkLightnessLimit: 100,
                    linkDefaultSaturation: 100,
                    linkDefaultHue: 231,
                    linkVisitedHue: 291,
                    linkReplaceAllHues: false,
                    linkHueGravity: 80,

                    borderSaturationLimit: 100,
                    borderContrast: 55,
                    borderLightnessLimit: 100,
                    borderGraySaturation: 10,
                    borderGrayHue: 16,
                    borderReplaceAllHues: false,
                    borderHueGravity: 0,

                    imageLightnessLimit: 100,
                    imageSaturationLimit: 100,
                    useImageHoverAnimation: false,

                    backgroundImageLightnessLimit: 100,
                    backgroundImageSaturationLimit: 100,

                    scrollbarSaturationLimit: 0,
                    scrollbarContrast: 5,
                    scrollbarLightnessLimit: 80,
                    scrollbarGrayHue: 0,
                    scrollbarSize: 10
                } as ColorScheme,

                // Grayscale
                {
                    colorSchemeId: "grayscale",
                    colorSchemeName: "Grayscale",
                    runOnThisSite: true,
                    restoreColorsOnCopy: false,
                    blueFilter: 0,

                    useDefaultSchedule: true,
                    scheduleStartHour: 0,
                    scheduleFinishHour: 24,

                    backgroundSaturationLimit: 10,
                    backgroundContrast: 50,
                    backgroundLightnessLimit: 100,
                    backgroundGraySaturation: 0,
                    backgroundGrayHue: 0,
                    backgroundReplaceAllHues: false,
                    backgroundHueGravity: 0,

                    buttonSaturationLimit: 20,
                    buttonContrast: 5,
                    buttonLightnessLimit: 95,
                    buttonGraySaturation: 0,
                    buttonGrayHue: 0,
                    buttonReplaceAllHues: false,
                    buttonHueGravity: 0,

                    textSaturationLimit: 10,
                    textContrast: 60,
                    textLightnessLimit: 100,
                    textGraySaturation: 0,
                    textGrayHue: 0,
                    textSelectionHue: 231,
                    textReplaceAllHues: false,
                    textHueGravity: 0,

                    linkSaturationLimit: 20,
                    linkContrast: 60,
                    linkLightnessLimit: 100,
                    linkDefaultSaturation: 20,
                    linkDefaultHue: 231,
                    linkVisitedHue: 291,
                    linkReplaceAllHues: false,
                    linkHueGravity: 80,

                    borderSaturationLimit: 10,
                    borderContrast: 40,
                    borderLightnessLimit: 100,
                    borderGraySaturation: 0,
                    borderGrayHue: 0,
                    borderReplaceAllHues: false,
                    borderHueGravity: 0,

                    imageLightnessLimit: 100,
                    imageSaturationLimit: 10,
                    useImageHoverAnimation: false,

                    backgroundImageLightnessLimit: 100,
                    backgroundImageSaturationLimit: 10,

                    scrollbarSaturationLimit: 0,
                    scrollbarContrast: 5,
                    scrollbarLightnessLimit: 80,
                    scrollbarGrayHue: 0,
                    scrollbarSize: 10
                } as ColorScheme,

                // Inverted Light
                {
                    colorSchemeId: "invertedLight",
                    colorSchemeName: "Inverted Light",
                    runOnThisSite: true,
                    restoreColorsOnCopy: false,
                    blueFilter: 0,

                    useDefaultSchedule: true,
                    scheduleStartHour: 0,
                    scheduleFinishHour: 24,

                    backgroundSaturationLimit: 80,
                    backgroundContrast: 50,
                    backgroundLightnessLimit: 10,
                    backgroundGraySaturation: 0,
                    backgroundGrayHue: 0,
                    backgroundReplaceAllHues: false,
                    backgroundHueGravity: 0,

                    buttonSaturationLimit: 80,
                    buttonContrast: 4,
                    buttonLightnessLimit: 15,
                    buttonGraySaturation: 0,
                    buttonGrayHue: 0,
                    buttonReplaceAllHues: false,
                    buttonHueGravity: 0,

                    textSaturationLimit: 90,
                    textContrast: 62,
                    textLightnessLimit: 85,
                    textGraySaturation: 0,
                    textGrayHue: 0,
                    textSelectionHue: 207,
                    textReplaceAllHues: false,
                    textHueGravity: 0,

                    linkSaturationLimit: 60,
                    linkContrast: 55,
                    linkLightnessLimit: 75,
                    linkDefaultSaturation: 40,
                    linkDefaultHue: 231,
                    linkVisitedHue: 291,
                    linkReplaceAllHues: false,
                    linkHueGravity: 80,

                    borderSaturationLimit: 80,
                    borderContrast: 30,
                    borderLightnessLimit: 70,
                    borderGraySaturation: 0,
                    borderGrayHue: 0,
                    borderReplaceAllHues: false,
                    borderHueGravity: 0,

                    imageLightnessLimit: 75,
                    imageSaturationLimit: 100,
                    useImageHoverAnimation: false,

                    backgroundImageLightnessLimit: 40,
                    backgroundImageSaturationLimit: 100,

                    scrollbarSaturationLimit: 0,
                    scrollbarContrast: 0,
                    scrollbarLightnessLimit: 40,
                    scrollbarGrayHue: 0,
                    scrollbarSize: 10
                } as ColorScheme,

                // Inverted Grayscale
                {
                    colorSchemeId: "invertedGrayscale",
                    colorSchemeName: "Inverted Grayscale",
                    runOnThisSite: true,
                    restoreColorsOnCopy: false,
                    blueFilter: 0,

                    useDefaultSchedule: true,
                    scheduleStartHour: 0,
                    scheduleFinishHour: 24,

                    backgroundSaturationLimit: 10,
                    backgroundContrast: 50,
                    backgroundLightnessLimit: 10,
                    backgroundGraySaturation: 0,
                    backgroundGrayHue: 0,
                    backgroundReplaceAllHues: false,
                    backgroundHueGravity: 0,

                    buttonSaturationLimit: 20,
                    buttonContrast: 2,
                    buttonLightnessLimit: 7,
                    buttonGraySaturation: 0,
                    buttonGrayHue: 0,
                    buttonReplaceAllHues: false,
                    buttonHueGravity: 0,

                    textSaturationLimit: 10,
                    textContrast: 62,
                    textLightnessLimit: 85,
                    textGraySaturation: 0,
                    textGrayHue: 0,
                    textSelectionHue: 231,
                    textReplaceAllHues: false,
                    textHueGravity: 0,

                    linkSaturationLimit: 20,
                    linkContrast: 62,
                    linkLightnessLimit: 80,
                    linkDefaultSaturation: 20,
                    linkDefaultHue: 231,
                    linkVisitedHue: 291,
                    linkReplaceAllHues: false,
                    linkHueGravity: 80,

                    borderSaturationLimit: 10,
                    borderContrast: 30,
                    borderLightnessLimit: 50,
                    borderGraySaturation: 0,
                    borderGrayHue: 0,
                    borderReplaceAllHues: false,
                    borderHueGravity: 0,

                    imageLightnessLimit: 75,
                    imageSaturationLimit: 10,
                    useImageHoverAnimation: false,

                    backgroundImageLightnessLimit: 30,
                    backgroundImageSaturationLimit: 10,

                    scrollbarSaturationLimit: 0,
                    scrollbarContrast: 0,
                    scrollbarLightnessLimit: 40,
                    scrollbarGrayHue: 0,
                    scrollbarSize: 10
                } as ColorScheme,

                // Yellow on Black
                {
                    colorSchemeId: "yellowOnBlack",
                    colorSchemeName: "Yellow on Black",
                    runOnThisSite: true,
                    restoreColorsOnCopy: false,
                    blueFilter: 0,

                    useDefaultSchedule: true,
                    scheduleStartHour: 0,
                    scheduleFinishHour: 24,

                    backgroundSaturationLimit: 80,
                    backgroundContrast: 50,
                    backgroundLightnessLimit: 10,
                    backgroundGraySaturation: 0,
                    backgroundGrayHue: 0,
                    backgroundReplaceAllHues: false,
                    backgroundHueGravity: 0,

                    buttonSaturationLimit: 80,
                    buttonContrast: 3,
                    buttonLightnessLimit: 12,
                    buttonGraySaturation: 0,
                    buttonGrayHue: 0,
                    buttonReplaceAllHues: false,
                    buttonHueGravity: 0,

                    textSaturationLimit: 60,
                    textContrast: 55,
                    textLightnessLimit: 80,
                    textGraySaturation: 60,
                    textGrayHue: 54,
                    textSelectionHue: 231,
                    textReplaceAllHues: false,
                    textHueGravity: 80,

                    linkSaturationLimit: 80,
                    linkContrast: 50,
                    linkLightnessLimit: 70,
                    linkDefaultSaturation: 90,
                    linkDefaultHue: 54,
                    linkVisitedHue: 36,
                    linkReplaceAllHues: false,
                    linkHueGravity: 80,

                    borderSaturationLimit: 60,
                    borderContrast: 40,
                    borderLightnessLimit: 70,
                    borderGraySaturation: 50,
                    borderGrayHue: 54,
                    borderReplaceAllHues: false,
                    borderHueGravity: 80,

                    imageLightnessLimit: 75,
                    imageSaturationLimit: 100,
                    useImageHoverAnimation: false,

                    backgroundImageLightnessLimit: 40,
                    backgroundImageSaturationLimit: 100,

                    scrollbarSaturationLimit: 40,
                    scrollbarContrast: 0,
                    scrollbarLightnessLimit: 50,
                    scrollbarGrayHue: 54,
                    scrollbarSize: 10
                } as ColorScheme,

                // Green on Black
                {
                    colorSchemeId: "greenOnBlack",
                    colorSchemeName: "Green on Black",
                    runOnThisSite: true,
                    restoreColorsOnCopy: false,
                    blueFilter: 0,

                    useDefaultSchedule: true,
                    scheduleStartHour: 0,
                    scheduleFinishHour: 24,

                    backgroundSaturationLimit: 80,
                    backgroundContrast: 50,
                    backgroundLightnessLimit: 10,
                    backgroundGraySaturation: 0,
                    backgroundGrayHue: 0,
                    backgroundReplaceAllHues: false,
                    backgroundHueGravity: 0,

                    buttonSaturationLimit: 80,
                    buttonContrast: 3,
                    buttonLightnessLimit: 12,
                    buttonGraySaturation: 0,
                    buttonGrayHue: 0,
                    buttonReplaceAllHues: false,
                    buttonHueGravity: 0,

                    textSaturationLimit: 60,
                    textContrast: 55,
                    textLightnessLimit: 80,
                    textGraySaturation: 60,
                    textGrayHue: 122,
                    textSelectionHue: 231,
                    textReplaceAllHues: false,
                    textHueGravity: 80,

                    linkSaturationLimit: 80,
                    linkContrast: 50,
                    linkLightnessLimit: 70,
                    linkDefaultSaturation: 90,
                    linkDefaultHue: 88,
                    linkVisitedHue: 122,
                    linkReplaceAllHues: false,
                    linkHueGravity: 80,

                    borderSaturationLimit: 60,
                    borderContrast: 40,
                    borderLightnessLimit: 70,
                    borderGraySaturation: 50,
                    borderGrayHue: 122,
                    borderReplaceAllHues: false,
                    borderHueGravity: 80,

                    imageLightnessLimit: 75,
                    imageSaturationLimit: 100,
                    useImageHoverAnimation: false,

                    backgroundImageLightnessLimit: 40,
                    backgroundImageSaturationLimit: 100,

                    scrollbarSaturationLimit: 40,
                    scrollbarContrast: 0,
                    scrollbarLightnessLimit: 50,
                    scrollbarGrayHue: 122,
                    scrollbarSize: 10
                } as ColorScheme
            ]
        } as any as ColorScheme
}