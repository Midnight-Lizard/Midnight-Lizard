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
                browser.runtime.getBrowserInfo().then(info =>
                {
                    const mainVersion = parseInt(info.version.split('.')[0]);
                    const applySettingsOnTheme =
                        ([settings, wnd, defaultSettings]: [MidnightLizard.Settings.ColorScheme, browser.windows.Window, MidnightLizard.Settings.ColorScheme]) =>
                        {
                            if (defaultSettings.changeBrowserTheme)
                            {
                                settingsManager.changeSettings(settings, true);
                                if (!settingsManager.isActive)
                                {
                                    settingsManager.changeSettings(defaultSettings, true);
                                }
                                if (settingsManager.isActive)
                                {
                                    const
                                        darkGray = new cx.RgbaColor(80, 80, 80, 1).toString(),
                                        normalGray = new cx.RgbaColor(180, 180, 180, 1).toString(),
                                        lightGray = new cx.RgbaColor(240, 240, 240, 1).toString();
                                    const
                                        mainBgColor = backgroundColorProcessor
                                            .changeColor(cx.RgbaColor.White, true, document.body),

                                        midBgColor = backgroundColorProcessor
                                            .changeColor(settings.backgroundLightnessLimit < 40
                                                ? darkGray
                                                : cx.RgbaColor.White, true, document.body),
                                        midTextColor = textColorProcessor
                                            .changeColor(cx.RgbaColor.Black, midBgColor.light, document.body),
                                        midBorderColor = borderColorProcessor
                                            .changeColor(cx.RgbaColor.Black, midBgColor.light, document.body),

                                        darkBgColor = backgroundColorProcessor
                                            .changeColor(darkGray, true, document.body),
                                        darkTextColor = textColorProcessor
                                            .changeColor(cx.RgbaColor.Black, darkBgColor.light, document.body),
                                        darkBorderColor = borderColorProcessor
                                            .changeColor(cx.RgbaColor.Black, darkBgColor.light, document.body),

                                        buttonColor = buttonColorProcessor
                                            .changeColor(cx.RgbaColor.White, mainBgColor.light, document.body),
                                        buttonHoverColor = buttonColorProcessor
                                            .changeColor(normalGray, buttonColor.light, document.body),
                                        buttonActiveColor = buttonColorProcessor
                                            .changeColor(lightGray, buttonColor.light, document.body),
                                        lightTextColor = textColorProcessor
                                            .changeColor(cx.RgbaColor.Black, buttonColor.light, document.body),
                                        lightBorderColor = borderColorProcessor
                                            .changeColor(cx.RgbaColor.Black, buttonColor.light, document.body),

                                        linkColor = linkColorProcessor
                                            .changeColor(darkGray, buttonColor.light, document.body),
                                        visitedLinkColor = visitedLinkColorProcessor
                                            .changeColor(darkGray, buttonColor.light, document.body),

                                        selectionBgColor = selectionColorProcessor
                                            .changeColor(cx.RgbaColor.White, false, document.body);

                                    const theme: browser._manifest.ThemeType = {
                                        colors: {
                                            accentcolor: darkBgColor.color!,
                                            textcolor: darkTextColor.color!
                                        }
                                    };
                                    if (mainVersion < 60)
                                    {
                                        theme.images = {
                                            "headerURL": "img/none.svg"
                                        };
                                    }
                                    if (mainVersion >= 57)
                                    {
                                        Object.assign(theme.colors, {
                                            toolbar: buttonColor.color,
                                            toolbar_text: lightTextColor.color,
                                            toolbar_field: midBgColor.color,
                                            toolbar_field_text: midTextColor.color
                                        });
                                    }
                                    if (mainVersion >= 58)
                                    {
                                        Object.assign(theme.colors, {
                                            toolbar_bottom_separator: lightBorderColor.color,
                                            toolbar_top_separator: darkBorderColor.color,
                                            toolbar_vertical_separator: darkBorderColor.color
                                        });
                                    }
                                    if (mainVersion >= 59)
                                    {
                                        Object.assign(theme.colors, {
                                            toolbar_field_border: midBorderColor.color,
                                            toolbar_field_separator: darkBorderColor.color
                                        });
                                    }
                                    if (mainVersion >= 60)
                                    {
                                        Object.assign(theme.colors, {
                                            button_background_hover: buttonHoverColor.color,
                                            button_background_active: buttonActiveColor.color,

                                            tab_line: linkColor.color,
                                            tab_loading: linkColor.color,

                                            icons_attention: visitedLinkColor.color,

                                            popup: midBgColor.color,
                                            popup_text: midTextColor.color,
                                            popup_border: midBorderColor.color
                                        });
                                    }
                                    if (wnd.id !== undefined)
                                    {
                                        browser.theme.update(wnd.id, theme);
                                    }
                                    else
                                    {
                                        browser.theme.update(theme);
                                    }
                                }
                                else
                                {
                                    browser.theme.reset();
                                }
                            }
                        };
                    const getCurrentWindow = () => browser.windows.getCurrent();
                    const updateTheme = () =>
                    {
                        settingsManager.getDefaultSettings().then(defaultSettings =>
                        {
                            Promise.all([
                                settingsBus.getCurrentSettings(),
                                getCurrentWindow(),
                                defaultSettings
                            ])
                                .then(applySettingsOnTheme)
                                .catch(ex =>
                                {
                                    Promise.all([
                                        defaultSettings,
                                        getCurrentWindow(),
                                        defaultSettings
                                    ])
                                        .then(applySettingsOnTheme)
                                        .catch(exx =>
                                        {
                                            if (defaultSettings.changeBrowserTheme)
                                            {
                                                browser.theme.reset()
                                            }
                                        });
                                });
                        });
                    };

                    chrome.tabs.onActivated
                        .addListener(updateTheme);

                    chrome.tabs.onUpdated
                        .addListener((tabId, info) =>
                            info.status === "complete" && updateTheme());

                    settingsBus.onSettingsApplied
                        .addListener((resp, set) =>
                        {
                            resp(set);
                            updateTheme();
                        }, null);

                    settingsBus.onIsEnabledToggleRequested
                        .addListener((resp, isEnabled) =>
                        {
                            resp(isEnabled);
                            settingsManager.getDefaultSettings()
                                .then(defaultSettings =>
                                {
                                    if (!isEnabled && defaultSettings.changeBrowserTheme)
                                    {
                                        browser.theme.reset();
                                    }
                                });
                        }, null);
                });
            }
        }
    }
}