/// <reference path="./ColorScheme.ts" />

namespace MidnightLizard.Settings
{

    export type ColorSchemeName = keyof typeof ColorSchemes;

    /**
     * ColorSchemes
     */
    export abstract class ColorSchemes extends ColorScheme
    {
        static default: ColorScheme =
        {
            settingsVersion: "",
            runOnThisSite: false,
            restoreColorsOnCopy: false,

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
        }

        static original: ColorScheme =
        {
            runOnThisSite: false,
            restoreColorsOnCopy: false,

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
        }

        static dimmedDust: ColorScheme =
        {
            runOnThisSite: true,
            restoreColorsOnCopy: false,

            useDefaultSchedule: true,
            scheduleStartHour: 0,
            scheduleFinishHour: 24,

            backgroundSaturationLimit: 80,
            backgroundContrast: 50,
            backgroundLightnessLimit: 20,
            backgroundGraySaturation: 10,
            backgroundGrayHue: 200,

            textSaturationLimit: 80,
            textContrast: 54,
            textLightnessLimit: 80,
            textGraySaturation: 24,
            textGrayHue: 16,

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
        }

        static appleMint: ColorScheme =
        {
            runOnThisSite: true,
            restoreColorsOnCopy: false,

            useDefaultSchedule: true,
            scheduleStartHour: 0,
            scheduleFinishHour: 24,

            backgroundSaturationLimit: 80,
            backgroundContrast: 50,
            backgroundLightnessLimit: 15,
            backgroundGraySaturation: 80,
            backgroundGrayHue: 174,

            textSaturationLimit: 80,
            textContrast: 60,
            textLightnessLimit: 90,
            textGraySaturation: 20,
            textGrayHue: 88,

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
        }

        static kappaDream: ColorScheme =
        {
            runOnThisSite: true,
            restoreColorsOnCopy: false,

            useDefaultSchedule: true,
            scheduleStartHour: 0,
            scheduleFinishHour: 24,

            backgroundSaturationLimit: 80,
            backgroundContrast: 50,
            backgroundLightnessLimit: 20,
            backgroundGraySaturation: 40,
            backgroundGrayHue: 122,

            textSaturationLimit: 80,
            textContrast: 55,
            textLightnessLimit: 90,
            textGraySaturation: 30,
            textGrayHue: 66,

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
        }

        static sunsetSails: ColorScheme =
        {
            runOnThisSite: true,
            restoreColorsOnCopy: false,

            useDefaultSchedule: true,
            scheduleStartHour: 0,
            scheduleFinishHour: 24,

            backgroundSaturationLimit: 80,
            backgroundContrast: 50,
            backgroundLightnessLimit: 20,
            backgroundGraySaturation: 40,
            backgroundGrayHue: 4,

            textSaturationLimit: 80,
            textContrast: 55,
            textLightnessLimit: 90,
            textGraySaturation: 20,
            textGrayHue: 45,

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
        }

        static morningMist: ColorScheme =
        {
            runOnThisSite: true,
            restoreColorsOnCopy: false,

            useDefaultSchedule: true,
            scheduleStartHour: 0,
            scheduleFinishHour: 24,

            backgroundSaturationLimit: 100,
            backgroundContrast: 50,
            backgroundLightnessLimit: 90,
            backgroundGraySaturation: 10,
            backgroundGrayHue: 200,

            textSaturationLimit: 100,
            textContrast: 60,
            textLightnessLimit: 95,
            textGraySaturation: 20,
            textGrayHue: 199,

            borderSaturationLimit: 100,
            borderContrast: 40,
            borderLightnessLimit: 95,
            borderGraySaturation: 20,
            borderGrayHue: 200,

            imageLightnessLimit: 90,
            imageSaturationLimit: 90,

            backgroundImageLightnessLimit: 90,
            backgroundImageSaturationLimit: 100,

            scrollbarSaturationLimit: 15,
            scrollbarContrast: 5,
            scrollbarLightnessLimit: 80,
            scrollbarGrayHue: 187
        }

        static antiqueCodex: ColorScheme =
        {
            runOnThisSite: true,
            restoreColorsOnCopy: false,

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
        }

        static increasedContrast: ColorScheme =
        {
            runOnThisSite: true,
            restoreColorsOnCopy: false,

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
        }

        static grayscale: ColorScheme =
        {
            runOnThisSite: true,
            restoreColorsOnCopy: false,

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
        }

        static invertedLight: ColorScheme =
        {
            runOnThisSite: true,
            restoreColorsOnCopy: false,

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
        }

        static invertedGrayscale: ColorScheme =
        {
            runOnThisSite: true,
            restoreColorsOnCopy: false,

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
        }

        static yellowOnBlack: ColorScheme =
        {
            runOnThisSite: true,
            restoreColorsOnCopy: false,

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
        }

        static greenOnBlack: ColorScheme =
        {
            runOnThisSite: true,
            restoreColorsOnCopy: false,

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
        }
    }
}