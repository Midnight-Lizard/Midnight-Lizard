/// <reference path="../DI/-DI.ts" />
/// <reference path="../BackgroundPage/IThemeProcessor.ts" />
/// <reference path="../Settings/IApplicationSettings.ts" />
/// <reference path="../Colors/RgbaColor.ts" />
/// <reference path="../Colors/BackgroundColorProcessor.ts" />
/// <reference path="../Colors/ForegroundColorProcessor.ts" />
/// <reference path="../Popup/PopupSettingsManager.ts" />

namespace Firefox
{
    const cx = MidnightLizard.Colors;

    @MidnightLizard.DI.injectable(MidnightLizard.BackgroundPage.IThemeProcessor)
    class FirefoxThemeProcessor implements MidnightLizard.BackgroundPage.IThemeProcessor
    {
        constructor(
            app: MidnightLizard.Settings.IApplicationSettings,
            settingsBus: MidnightLizard.Settings.ISettingsBus,
            settingsManager: MidnightLizard.Settings.IDynamicSettingsManager,
            backgroundColorProcessor: MidnightLizard.Colors.IDynamicBackgroundColorProcessor,
            textColorProcessor: MidnightLizard.Colors.IDynamicTextColorProcessor,
            linkColorProcessor: MidnightLizard.Colors.IDynamicLinkColorProcessor,
            visitedLinkColorProcessor: MidnightLizard.Colors.IDynamicVisitedLinkColorProcessor,
            borderColorProcessor: MidnightLizard.Colors.IDynamicBorderColorProcessor,
            selectionColorProcessor: MidnightLizard.Colors.IDynamicTextSelectionColorProcessor,
            buttonColorProcessor: MidnightLizard.Colors.IDynamicButtonBackgroundColorProcessor)
        {
            if (app.browserName === MidnightLizard.Settings.BrowserName.Firefox)
            {
                const applySettingsOnTheme = (set: MidnightLizard.Settings.ColorScheme) =>
                {
                    settingsManager.changeSettings(set);
                    const
                        darkGray = new cx.RgbaColor(80, 80, 80, 1).toString(),
                        lightGray = new cx.RgbaColor(240, 240, 240, 1).toString();
                    const
                        darkBgColor = backgroundColorProcessor
                            .changeColor(darkGray, true, document.body),
                        darkTextColor = textColorProcessor
                            .changeColor(cx.RgbaColor.Black, darkBgColor.light, document.body),
                        darkBorderColor = borderColorProcessor
                            .changeColor(cx.RgbaColor.Black, darkBgColor.light, document.body),

                        midBgColor = backgroundColorProcessor
                            .changeColor(set.backgroundLightnessLimit < 40
                                ? darkGray
                                : cx.RgbaColor.White, true, document.body),
                        midTextColor = textColorProcessor
                            .changeColor(cx.RgbaColor.Black, midBgColor.light, document.body),
                        midBorderColor = borderColorProcessor
                            .changeColor(cx.RgbaColor.Black, midBgColor.light, document.body),

                        lightBgColor = backgroundColorProcessor
                            .changeColor(set.backgroundLightnessLimit < 40
                                ? cx.RgbaColor.White
                                : lightGray, true, document.body),
                        lightTextColor = textColorProcessor
                            .changeColor(cx.RgbaColor.Black, lightBgColor.light, document.body),
                        lightBorderColor = borderColorProcessor
                            .changeColor(cx.RgbaColor.Black, lightBgColor.light, document.body),

                        buttonColor = buttonColorProcessor
                            .changeColor(cx.RgbaColor.White, lightBgColor.light, document.body),
                        buttonHoverColor = buttonColorProcessor
                            .changeColor(lightGray, lightBgColor.light, document.body),

                        linkColor = linkColorProcessor
                            .changeColor(darkGray, lightBgColor.light, document.body),
                        visitedLinkColor = visitedLinkColorProcessor
                            .changeColor(darkGray, lightBgColor.light, document.body),

                        selectionBgColor = selectionColorProcessor
                            .changeColor(cx.RgbaColor.White, false, document.body);

                    browser.theme.update({
                        colors: {
                            accentcolor: darkBgColor.color,
                            textcolor: darkTextColor.color,

                            button_background_hover: buttonHoverColor.color,
                            button_background_active: buttonColor.color,

                            toolbar: lightBgColor.color,
                            toolbar_text: lightTextColor.color,
                            toolbar_bottom_separator: lightBorderColor.color,
                            toolbar_top_separator: darkBorderColor.color,
                            toolbar_field: midBgColor.color,
                            toolbar_field_border: midBorderColor.color,
                            toolbar_field_text: midTextColor.color,

                            tab_line: linkColor.color,
                            tab_loading: linkColor.color,

                            icons_attention: visitedLinkColor.color,

                            popup: midBgColor.color,
                            popup_text: midTextColor.color,
                            popup_border: midBorderColor.color
                        } as any
                    });
                };
                const updateTheme = () =>
                {
                    settingsBus.getCurrentSettings()
                        .then(applySettingsOnTheme)
                        .catch(ex =>
                        {
                            settingsManager
                                .getDefaultSettings()
                                .then(applySettingsOnTheme)
                                .catch(exx => browser.theme.reset());
                        });
                };

                chrome.tabs.onActivated.addListener(updateTheme);
                let lastTimeout: number;
                chrome.tabs.onUpdated.addListener((tabId, info) =>
                    info.status === "complete" && updateTheme());
                settingsBus.onSettingsApplied.addListener((resp, set) =>
                {
                    applySettingsOnTheme(set!);
                    resp(set);
                }, null);
            }
        }
    }
}