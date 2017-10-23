/// <reference path="./ColorScheme.ts" />

namespace MidnightLizard.Settings
{

    export type ColorSchemeName = keyof typeof ColorSchemes;

    /**
     * ColorSchemes
     */
    export abstract class ColorSchemes extends ColorScheme
    {
        static default: ColorScheme;
        static original: ColorScheme;
        static dimmedDust: ColorScheme;
        static appleMint: ColorScheme;
        static kappaDream: ColorScheme;
        static sunsetSails: ColorScheme;
        static morningMist: ColorScheme;
        static antiqueCodex: ColorScheme;
        static increasedContrast: ColorScheme;
        static grayscale: ColorScheme;
        static invertedLight: ColorScheme;
        static invertedGrayscale: ColorScheme;
        static yellowOnBlack: ColorScheme;
        static greenOnBlack: ColorScheme;
    }

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
                    settingsVersion: "",
                    runOnThisSite: false,
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

                    textSaturationLimit: 100,
                    textContrast: 0,
                    textLightnessLimit: 100,
                    textGraySaturation: 0,
                    textGrayHue: 0,

                    linkSaturationLimit: 100,
                    linkContrast: 0,
                    linkLightnessLimit: 100,
                    linkDefaultSaturation: 0,
                    linkDefaultHue: 0,

                    borderSaturationLimit: 100,
                    borderContrast: 0,
                    borderLightnessLimit: 100,
                    borderGraySaturation: 0,
                    borderGrayHue: 0,

                    imageLightnessLimit: 100,
                    imageSaturationLimit: 100,

                    backgroundImageLightnessLimit: 100,
                    backgroundImageSaturationLimit: 100,

                    scrollbarSaturationLimit: 0,
                    scrollbarContrast: 0,
                    scrollbarLightnessLimit: 100,
                    scrollbarGrayHue: 0
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

                    textSaturationLimit: 100,
                    textContrast: 0,
                    textLightnessLimit: 100,
                    textGraySaturation: 0,
                    textGrayHue: 0,

                    linkSaturationLimit: 100,
                    linkContrast: 0,
                    linkLightnessLimit: 100,
                    linkDefaultSaturation: 0,
                    linkDefaultHue: 0,

                    borderSaturationLimit: 100,
                    borderContrast: 0,
                    borderLightnessLimit: 100,
                    borderGraySaturation: 0,
                    borderGrayHue: 0,

                    imageLightnessLimit: 100,
                    imageSaturationLimit: 100,

                    backgroundImageLightnessLimit: 100,
                    backgroundImageSaturationLimit: 100,

                    scrollbarSaturationLimit: 0,
                    scrollbarContrast: 0,
                    scrollbarLightnessLimit: 100,
                    scrollbarGrayHue: 0
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
                    backgroundLightnessLimit: 15,
                    backgroundGraySaturation: 5,
                    backgroundGrayHue: 200,

                    textSaturationLimit: 80,
                    textContrast: 54,
                    textLightnessLimit: 80,
                    textGraySaturation: 24,
                    textGrayHue: 16,

                    linkSaturationLimit: 80,
                    linkContrast: 54,
                    linkLightnessLimit: 70,
                    linkDefaultSaturation: 70,
                    linkDefaultHue: 207,

                    borderSaturationLimit: 80,
                    borderContrast: 30,
                    borderLightnessLimit: 50,
                    borderGraySaturation: 20,
                    borderGrayHue: 16,

                    imageLightnessLimit: 80,
                    imageSaturationLimit: 90,

                    backgroundImageLightnessLimit: 40,
                    backgroundImageSaturationLimit: 80,

                    scrollbarSaturationLimit: 10,
                    scrollbarContrast: 5,
                    scrollbarLightnessLimit: 50,
                    scrollbarGrayHue: 174
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

                    backgroundSaturationLimit: 80,
                    backgroundContrast: 50,
                    backgroundLightnessLimit: 15,
                    backgroundGraySaturation: 60,
                    backgroundGrayHue: 174,

                    textSaturationLimit: 80,
                    textContrast: 60,
                    textLightnessLimit: 90,
                    textGraySaturation: 20,
                    textGrayHue: 88,

                    linkSaturationLimit: 80,
                    linkContrast: 60,
                    linkLightnessLimit: 80,
                    linkDefaultSaturation: 50,
                    linkDefaultHue: 122,

                    borderSaturationLimit: 80,
                    borderContrast: 30,
                    borderLightnessLimit: 50,
                    borderGraySaturation: 10,
                    borderGrayHue: 122,

                    imageLightnessLimit: 80,
                    imageSaturationLimit: 100,

                    backgroundImageLightnessLimit: 40,
                    backgroundImageSaturationLimit: 100,

                    scrollbarSaturationLimit: 12,
                    scrollbarContrast: 5,
                    scrollbarLightnessLimit: 50,
                    scrollbarGrayHue: 122
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

                    backgroundSaturationLimit: 80,
                    backgroundContrast: 50,
                    backgroundLightnessLimit: 15,
                    backgroundGraySaturation: 30,
                    backgroundGrayHue: 122,

                    textSaturationLimit: 80,
                    textContrast: 55,
                    textLightnessLimit: 90,
                    textGraySaturation: 30,
                    textGrayHue: 66,

                    linkSaturationLimit: 80,
                    linkContrast: 55,
                    linkLightnessLimit: 80,
                    linkDefaultSaturation: 70,
                    linkDefaultHue: 66,

                    borderSaturationLimit: 80,
                    borderContrast: 30,
                    borderLightnessLimit: 50,
                    borderGraySaturation: 20,
                    borderGrayHue: 88,

                    imageLightnessLimit: 80,
                    imageSaturationLimit: 100,

                    backgroundImageLightnessLimit: 40,
                    backgroundImageSaturationLimit: 100,

                    scrollbarSaturationLimit: 30,
                    scrollbarContrast: 5,
                    scrollbarLightnessLimit: 50,
                    scrollbarGrayHue: 122
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

                    textSaturationLimit: 80,
                    textContrast: 55,
                    textLightnessLimit: 90,
                    textGraySaturation: 20,
                    textGrayHue: 45,

                    linkSaturationLimit: 80,
                    linkContrast: 55,
                    linkLightnessLimit: 80,
                    linkDefaultSaturation: 70,
                    linkDefaultHue: 45,

                    borderSaturationLimit: 80,
                    borderContrast: 30,
                    borderLightnessLimit: 50,
                    borderGraySaturation: 20,
                    borderGrayHue: 14,

                    imageLightnessLimit: 80,
                    imageSaturationLimit: 100,

                    backgroundImageLightnessLimit: 40,
                    backgroundImageSaturationLimit: 100,

                    scrollbarSaturationLimit: 30,
                    scrollbarContrast: 5,
                    scrollbarLightnessLimit: 50,
                    scrollbarGrayHue: 36
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

                    textSaturationLimit: 90,
                    textContrast: 60,
                    textLightnessLimit: 95,
                    textGraySaturation: 20,
                    textGrayHue: 199,

                    linkSaturationLimit: 90,
                    linkContrast: 60,
                    linkLightnessLimit: 100,
                    linkDefaultSaturation: 100,
                    linkDefaultHue: 231,

                    borderSaturationLimit: 90,
                    borderContrast: 40,
                    borderLightnessLimit: 95,
                    borderGraySaturation: 20,
                    borderGrayHue: 200,

                    imageLightnessLimit: 90,
                    imageSaturationLimit: 90,

                    backgroundImageLightnessLimit: 90,
                    backgroundImageSaturationLimit: 90,

                    scrollbarSaturationLimit: 15,
                    scrollbarContrast: 5,
                    scrollbarLightnessLimit: 80,
                    scrollbarGrayHue: 187
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

                    textSaturationLimit: 80,
                    textContrast: 80,
                    textLightnessLimit: 100,
                    textGraySaturation: 40,
                    textGrayHue: 16,

                    linkSaturationLimit: 80,
                    linkContrast: 80,
                    linkLightnessLimit: 100,
                    linkDefaultSaturation: 100,
                    linkDefaultHue: 14,

                    borderSaturationLimit: 80,
                    borderContrast: 60,
                    borderLightnessLimit: 100,
                    borderGraySaturation: 40,
                    borderGrayHue: 36,

                    imageLightnessLimit: 93,
                    imageSaturationLimit: 50,

                    backgroundImageLightnessLimit: 93,
                    backgroundImageSaturationLimit: 30,

                    scrollbarSaturationLimit: 15,
                    scrollbarContrast: 5,
                    scrollbarLightnessLimit: 85,
                    scrollbarGrayHue: 16
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

                    textSaturationLimit: 100,
                    textContrast: 60,
                    textLightnessLimit: 100,
                    textGraySaturation: 40,
                    textGrayHue: 16,

                    linkSaturationLimit: 100,
                    linkContrast: 60,
                    linkLightnessLimit: 100,
                    linkDefaultSaturation: 100,
                    linkDefaultHue: 231,

                    borderSaturationLimit: 100,
                    borderContrast: 55,
                    borderLightnessLimit: 100,
                    borderGraySaturation: 10,
                    borderGrayHue: 16,

                    imageLightnessLimit: 100,
                    imageSaturationLimit: 100,

                    backgroundImageLightnessLimit: 100,
                    backgroundImageSaturationLimit: 100,

                    scrollbarSaturationLimit: 0,
                    scrollbarContrast: 5,
                    scrollbarLightnessLimit: 80,
                    scrollbarGrayHue: 0
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

                    textSaturationLimit: 10,
                    textContrast: 60,
                    textLightnessLimit: 100,
                    textGraySaturation: 0,
                    textGrayHue: 0,

                    linkSaturationLimit: 10,
                    linkContrast: 60,
                    linkLightnessLimit: 100,
                    linkDefaultSaturation: 20,
                    linkDefaultHue: 231,

                    borderSaturationLimit: 10,
                    borderContrast: 40,
                    borderLightnessLimit: 100,
                    borderGraySaturation: 0,
                    borderGrayHue: 0,

                    imageLightnessLimit: 100,
                    imageSaturationLimit: 10,

                    backgroundImageLightnessLimit: 100,
                    backgroundImageSaturationLimit: 10,

                    scrollbarSaturationLimit: 0,
                    scrollbarContrast: 5,
                    scrollbarLightnessLimit: 80,
                    scrollbarGrayHue: 0
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

                    textSaturationLimit: 80,
                    textContrast: 50,
                    textLightnessLimit: 70,
                    textGraySaturation: 0,
                    textGrayHue: 0,

                    linkSaturationLimit: 80,
                    linkContrast: 50,
                    linkLightnessLimit: 70,
                    linkDefaultSaturation: 40,
                    linkDefaultHue: 231,

                    borderSaturationLimit: 80,
                    borderContrast: 30,
                    borderLightnessLimit: 70,
                    borderGraySaturation: 0,
                    borderGrayHue: 0,

                    imageLightnessLimit: 75,
                    imageSaturationLimit: 100,

                    backgroundImageLightnessLimit: 40,
                    backgroundImageSaturationLimit: 100,

                    scrollbarSaturationLimit: 0,
                    scrollbarContrast: 5,
                    scrollbarLightnessLimit: 50,
                    scrollbarGrayHue: 0
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

                    textSaturationLimit: 10,
                    textContrast: 50,
                    textLightnessLimit: 80,
                    textGraySaturation: 0,
                    textGrayHue: 0,

                    linkSaturationLimit: 10,
                    linkContrast: 50,
                    linkLightnessLimit: 80,
                    linkDefaultSaturation: 10,
                    linkDefaultHue: 231,

                    borderSaturationLimit: 10,
                    borderContrast: 30,
                    borderLightnessLimit: 50,
                    borderGraySaturation: 0,
                    borderGrayHue: 0,

                    imageLightnessLimit: 75,
                    imageSaturationLimit: 10,

                    backgroundImageLightnessLimit: 30,
                    backgroundImageSaturationLimit: 10,

                    scrollbarSaturationLimit: 0,
                    scrollbarContrast: 5,
                    scrollbarLightnessLimit: 50,
                    scrollbarGrayHue: 0
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

                    textSaturationLimit: 80,
                    textContrast: 50,
                    textLightnessLimit: 80,
                    textGraySaturation: 60,
                    textGrayHue: 54,

                    linkSaturationLimit: 80,
                    linkContrast: 50,
                    linkLightnessLimit: 70,
                    linkDefaultSaturation: 90,
                    linkDefaultHue: 54,

                    borderSaturationLimit: 80,
                    borderContrast: 40,
                    borderLightnessLimit: 70,
                    borderGraySaturation: 50,
                    borderGrayHue: 54,

                    imageLightnessLimit: 75,
                    imageSaturationLimit: 100,

                    backgroundImageLightnessLimit: 40,
                    backgroundImageSaturationLimit: 100,

                    scrollbarSaturationLimit: 40,
                    scrollbarContrast: 5,
                    scrollbarLightnessLimit: 50,
                    scrollbarGrayHue: 54
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

                    textSaturationLimit: 80,
                    textContrast: 50,
                    textLightnessLimit: 80,
                    textGraySaturation: 60,
                    textGrayHue: 122,

                    linkSaturationLimit: 80,
                    linkContrast: 50,
                    linkLightnessLimit: 70,
                    linkDefaultSaturation: 90,
                    linkDefaultHue: 122,

                    borderSaturationLimit: 80,
                    borderContrast: 40,
                    borderLightnessLimit: 70,
                    borderGraySaturation: 50,
                    borderGrayHue: 122,

                    imageLightnessLimit: 75,
                    imageSaturationLimit: 100,

                    backgroundImageLightnessLimit: 40,
                    backgroundImageSaturationLimit: 100,

                    scrollbarSaturationLimit: 40,
                    scrollbarContrast: 5,
                    scrollbarLightnessLimit: 50,
                    scrollbarGrayHue: 122
                } as ColorScheme
            ]
        } as any as ColorScheme
}