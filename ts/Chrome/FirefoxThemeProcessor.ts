import { injectable } from "../Utils/DI";
import { IApplicationSettings, BrowserName } from "../Settings/IApplicationSettings";
import { ISettingsBus } from "../Settings/ISettingsBus";
import { IDynamicSettingsManager } from "../Settings/DynamicSettingsManager";
import { IDynamicBackgroundColorProcessor, IDynamicTextSelectionColorProcessor } from "../Colors/BackgroundColorProcessor";
import
{
    IDynamicTextColorProcessor, IDynamicLinkColorProcessor, IDynamicVisitedLinkColorProcessor,
    IDynamicBorderColorProcessor, IDynamicButtonBackgroundColorProcessor
} from "../Colors/ForegroundColorProcessor";
import { ColorScheme } from "../Settings/ColorScheme";
import { IThemeProcessor } from "../BackgroundPage/IThemeProcessor";
import { RgbaColor } from "../Colors/RgbaColor";

@injectable(IThemeProcessor)
export class FirefoxThemeProcessor implements IThemeProcessor
{
    constructor(
        app: IApplicationSettings,
        settingsBus: ISettingsBus,
        settingsManager: IDynamicSettingsManager,
        backgroundColorProcessor: IDynamicBackgroundColorProcessor,
        textColorProcessor: IDynamicTextColorProcessor,
        linkColorProcessor: IDynamicLinkColorProcessor,
        visitedLinkColorProcessor: IDynamicVisitedLinkColorProcessor,
        borderColorProcessor: IDynamicBorderColorProcessor,
        selectionColorProcessor: IDynamicTextSelectionColorProcessor,
        buttonColorProcessor: IDynamicButtonBackgroundColorProcessor)
    {
        if (app.browserName === BrowserName.Firefox)
        {
            browser.runtime.getBrowserInfo().then(info =>
            {
                const mainVersion = parseInt(info.version.split('.')[0]);
                const applySettingsOnTheme =
                    ([settings, wnd, defaultSettings]: [ColorScheme, browser.windows.Window, ColorScheme]) =>
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
                                    darkGray = new RgbaColor(80, 80, 80, 1).toString(),
                                    normalGray = new RgbaColor(180, 180, 180, 1).toString(),
                                    lightGray = new RgbaColor(240, 240, 240, 1).toString();
                                const
                                    mainBgColor = backgroundColorProcessor
                                        .changeColor(RgbaColor.White, true, document.body),

                                    midBgColor = backgroundColorProcessor
                                        .changeColor(settings.backgroundLightnessLimit < 40
                                            ? darkGray
                                            : RgbaColor.White, true, document.body),
                                    midTextColor = textColorProcessor
                                        .changeColor(RgbaColor.Black, midBgColor.light, document.body),
                                    midBorderColor = borderColorProcessor
                                        .changeColor(RgbaColor.Black, midBgColor.light, document.body),

                                    darkBgColor = backgroundColorProcessor
                                        .changeColor(darkGray, true, document.body),
                                    darkTextColor = textColorProcessor
                                        .changeColor(RgbaColor.Black, darkBgColor.light, document.body),
                                    darkBorderColor = borderColorProcessor
                                        .changeColor(RgbaColor.Black, darkBgColor.light, document.body),

                                    buttonColor = buttonColorProcessor
                                        .changeColor(RgbaColor.White, mainBgColor.light, document.body),
                                    buttonHoverColor = buttonColorProcessor
                                        .changeColor(normalGray, buttonColor.light, document.body),
                                    buttonActiveColor = buttonColorProcessor
                                        .changeColor(lightGray, buttonColor.light, document.body),
                                    lightTextColor = textColorProcessor
                                        .changeColor(RgbaColor.Black, buttonColor.light, document.body),
                                    activeTextColor = textColorProcessor
                                        .changeColor(RgbaColor.Black, buttonActiveColor.light, document.body),
                                    lightBorderColor = borderColorProcessor
                                        .changeColor(RgbaColor.Black, buttonColor.light, document.body),

                                    linkColor = linkColorProcessor
                                        .changeColor(darkGray, buttonColor.light, document.body),
                                    visitedLinkColor = visitedLinkColorProcessor
                                        .changeColor(darkGray, buttonColor.light, document.body),

                                    selectionBgColor = selectionColorProcessor
                                        .changeColor(RgbaColor.White, false, document.body);

                                const theme: browser._manifest.ThemeType = { colors: {} };
                                if (mainVersion < 59)
                                {
                                    Object.assign(theme.colors, {
                                        accentcolor: darkBgColor.color!,
                                        textcolor: darkTextColor.color!
                                    });

                                    if (mainVersion >= 57)
                                    {
                                        Object.assign(theme.colors, {
                                            toolbar_text: lightTextColor.color,
                                        });
                                    }
                                }
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
                                        frame: darkBgColor.color!,
                                        bookmark_text: lightTextColor.color,
                                        tab_background_text: darkTextColor.color!,
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
                                if (mainVersion >= 64)
                                {
                                    Object.assign(theme.colors, {
                                        sidebar: buttonColor.color,
                                        sidebar_highlight: buttonActiveColor.color,
                                        sidebar_highlight_text: activeTextColor.color,
                                        sidebar_text: lightTextColor.color,
                                        sidebar_border: darkBorderColor.color
                                    });
                                }
                                console.log(theme);
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