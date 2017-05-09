/// <reference path="../DI/-DI.ts" />
/// <reference path="../Colors/-Colors.ts" />
/// <reference path="../Settings/-Settings.ts" />
/// <reference path="../ContentScript/-ContentScript.ts" />
/// <reference path="../Controls/-Controls.ts" />
/// <reference path="../Events/-Events.ts" />
/// <reference path="ICommandManager.ts" />

namespace MidnightLizard.Popup
{
    let dom = Events.HtmlEvent;
    export abstract class IPopupManager { }

    @DI.injectable(IPopupManager)
    class PopupManager
    {
        protected _currentSiteSettings: Settings.ColorScheme;
        protected _colorSchemeSelect: HTMLSelectElement;
        protected _applyButton: HTMLButtonElement;
        protected _closeButton: HTMLButtonElement;
        protected _setAsDefaultButton: HTMLButtonElement;
        protected _hostName: HTMLAnchorElement;
        protected _isEnabledToggle: HTMLInputElement;
        protected _useDefaultScheduleCheckBox: HTMLInputElement;
        protected _forgetAllSitesButton: HTMLButtonElement;
        protected _forgetThisSiteButton: HTMLButtonElement;
        protected _deleteColorSchemeButton: HTMLButtonElement;
        protected _saveColorSchemeButton: HTMLButtonElement;
        protected _newColorSchemeName: HTMLInputElement;
        protected _colorSchemeForEdit: HTMLSelectElement;

        constructor(
            protected readonly _popup: Document,
            protected readonly _settingsManager: MidnightLizard.Popup.IPopupSettingsManager,
            protected readonly _commandManager: MidnightLizard.Popup.ICommandManager,
            protected readonly _app: MidnightLizard.Settings.IApplicationSettings,
            protected readonly _documentProcessor: MidnightLizard.ContentScript.IDocumentProcessor,
            protected readonly _textShadowColorProcessor: MidnightLizard.Colors.ITextShadowColorProcessor,
            protected readonly _dynamicSettingsManager: MidnightLizard.Settings.IDynamicSettingsManager,
            protected readonly _dynamicTextColorProcessor: MidnightLizard.Colors.IDynamicTextColorProcessor,
            protected readonly _dynamicBackgroundColorProcessor: MidnightLizard.Colors.IDynamicBackgroundColorProcessor)
        {
            _settingsManager.onSettingsInitialized.addListener(this.beforeSettingsInitialized, this, Events.EventHandlerPriority.High);
            _settingsManager.onSettingsInitializationFailed.addListener(this.onSettingsInitializationFailed, this);
            _settingsManager.onSettingsChanged.addListener(this.beforeSettingsChanged, this, Events.EventHandlerPriority.High);
            _documentProcessor.onRootDocumentProcessing.addListener(this.beforeRootDocumentProcessedFirstTime, this, Events.EventHandlerPriority.High);
        }

        protected beforeSettingsInitialized(shift: Colors.ComponentShift): void
        {
            this._currentSiteSettings = this._settingsManager.currentSettings;
        }

        protected onSettingsInitializationFailed(ex: any): void
        {
            this._popup.getElementById("dialogError")!.style.display = "block";
            this._closeButton = this._popup.getElementById("closeBtn") as HTMLButtonElement;
            this._closeButton.onclick = this._popup.defaultView.close.bind(this._popup.defaultView);
        }

        protected beforeRootDocumentProcessedFirstTime(doc: Document): void
        {
            this._documentProcessor.onRootDocumentProcessing.removeListener(this.beforeRootDocumentProcessedFirstTime, this);
            this._setAsDefaultButton = doc.getElementById("setAsDefaultBtn") as HTMLButtonElement;
            this._colorSchemeSelect = doc.getElementById("colorScheme") as HTMLSelectElement;
            this._applyButton = doc.getElementById("applyBtn") as HTMLButtonElement;
            this._closeButton = doc.getElementById("closeBtn") as HTMLButtonElement;
            this._hostName = doc.getElementById("hostName") as HTMLAnchorElement;
            this._isEnabledToggle = doc.getElementById("isEnabled") as HTMLInputElement;
            this._forgetAllSitesButton = doc.getElementById("forgetAllSitesBtn") as HTMLButtonElement;
            this._forgetThisSiteButton = doc.getElementById("forgetThisSiteBtn") as HTMLButtonElement;
            this._useDefaultScheduleCheckBox = doc.getElementById("useDefaultSchedule") as HTMLInputElement;
            this._saveColorSchemeButton = doc.getElementById("saveColorSchemeBtn") as HTMLButtonElement;
            this._deleteColorSchemeButton = doc.getElementById("deleteColorSchemeBtn") as HTMLButtonElement;
            this._newColorSchemeName = doc.getElementById("newColorSchemeName") as HTMLInputElement;
            this._colorSchemeForEdit = doc.getElementById("colorSchemeForEdit") as HTMLSelectElement;

            this._commandManager.getCommands()
                .then(commands =>
                {
                    let globalToggleCommand = commands.find(cmd => cmd.name === "global-toggle");
                    if (globalToggleCommand && globalToggleCommand.shortcut)
                    {
                        (doc.getElementById("isEnabledSwitch") as HTMLLabelElement).title += `\nShortcut: ${globalToggleCommand.shortcut}`;
                    }
                })
                .catch(ex => alert("Commands acquiring failed.\n" + (ex.message || ex)));

            this._forgetAllSitesButton.onRoomRulesApplied = new Events.ArgumentedEventDispatcher<ContentScript.RoomRules>();
            this._forgetAllSitesButton.onRoomRulesApplied.addListener(this.onButtonRoomRulesApplied, this);
            let range = document.querySelector(".ml-input-range") as HTMLInputElement;
            range.onRoomRulesApplied = new Events.ArgumentedEventDispatcher<ContentScript.RoomRules>();
            range.onRoomRulesApplied.addListener(this.onRangeRoomRulesApplied as any, this, Events.EventHandlerPriority.Normal, range);

            this._hostName.onclick = this._closeButton.onclick = doc.defaultView.close.bind(doc.defaultView);
            this._applyButton.onclick = this.applySettingsOnPage.bind(this);
            this._isEnabledToggle.onchange = this.toggleIsEnabled.bind(this);
            this._useDefaultScheduleCheckBox.onchange = this.toggleSchedule.bind(this);
            this._forgetAllSitesButton.onclick = this.forgetAllSitesSettings.bind(this);
            this._forgetThisSiteButton.onclick = this.forgetCurrentSiteSettings.bind(this);
            this._setAsDefaultButton.onclick = this.setAsDefaultSettings.bind(this);

            this._colorSchemeForEdit.onchange = this.onColorSchemeForEditChanged.bind(this);
            this._deleteColorSchemeButton.onclick = this.deleteUserColorScheme.bind(this);
            this._saveColorSchemeButton.onclick = this.saveUserColorScheme.bind(this);
            this._newColorSchemeName.oninput = this.updateColorSchemeButtons.bind(this);

            Controls.Tab.initTabControl(doc);
            Controls.Slider.initSliders(doc);

            this._hostName.innerText = this._currentSiteSettings.hostName || "current page";

            this.fillColorSchemesSelectLists();
            this.setUpInputFields(this._currentSiteSettings);
            this.setUpColorSchemeSelectValue(this._currentSiteSettings);
            this.updateButtonStates();
            this.toggleSchedule();
            this.onColorSchemeForEditChanged();
        }

        protected beforeSettingsChanged(response: (scheme: Settings.ColorScheme) => void, shift: Colors.ComponentShift): void
        {
            this._popup.documentElement.style.cssText = "";
            this.updateButtonStates();
            this.toggleSchedule();
        }

        protected onInputFieldChanged()
        {
            let settings = this.getSettingsFromPopup();
            this.setUpColorSchemeSelectValue(settings);
            this._settingsManager.changeSettings(settings);
        }

        protected getSettingsFromPopup()
        {
            let settings = new Settings.ColorScheme(), value: string | number | boolean;
            settings.isEnabled = this._isEnabledToggle.checked;
            for (let setting of Array.prototype.slice.call(document.querySelectorAll(".setting")))
            {
                switch (setting.type)
                {
                    case "hidden":
                        value = setting.value as string;
                        break;

                    case "checkbox":
                        value = setting.checked as boolean;
                        break;

                    default:
                        value = setting.valueAsNumber ? setting.valueAsNumber : parseInt(setting.value);
                        break;
                }
                settings[setting.id as Settings.ColorSchemePropertyName] = value;
            }
            return settings;
        }

        protected applySettingsOnPopup(settings: Settings.ColorScheme)
        {
            this.setUpInputFields(settings);
            this._settingsManager.changeSettings(settings);
        }

        protected applySettingsOnPage()
        {
            this._settingsManager
                .applySettings()
                .then(newSiteSettings => this._currentSiteSettings = newSiteSettings)
                .then(x => this.updateButtonStates())
                .catch(ex => alert("Settings application failed.\n" + (ex.message || ex)));
        }

        protected toggleIsEnabled()
        {
            this._currentSiteSettings.isEnabled = this._isEnabledToggle.checked;
            this._settingsManager
                .toggleIsEnabled(this._isEnabledToggle.checked)
                .catch(ex => alert("Extension toggle switching failed.\n" + (ex.message || ex)));
        }

        protected fillColorSchemesSelectLists()
        {
            const customScheme = Object.assign({}, this._settingsManager.currentSettings);
            customScheme.colorSchemeId = "custom" as Settings.ColorSchemeName;
            customScheme.colorSchemeName = "Custom";
            this.addColorSchemeOption(this._colorSchemeSelect, customScheme);
            customScheme.colorSchemeName = "New color scheme";
            this.addColorSchemeOption(this._colorSchemeForEdit, customScheme);
            let schemeName: Settings.ColorSchemeName;

            const defaultSettings = this._settingsManager.getDefaultSettingsCache();
            defaultSettings.colorSchemeId = Settings.ColorSchemes.default.colorSchemeId;
            defaultSettings.colorSchemeName = Settings.ColorSchemes.default.colorSchemeName;

            for (schemeName in Settings.ColorSchemes)
            {
                this.addColorSchemeOption(this._colorSchemeSelect,
                    schemeName === Settings.ColorSchemes.default.colorSchemeId ? defaultSettings : Settings.ColorSchemes[schemeName]);

                if (schemeName !== Settings.ColorSchemes.default.colorSchemeId && schemeName !== Settings.ColorSchemes.original.colorSchemeId)
                {
                    this.addColorSchemeOption(this._colorSchemeForEdit, Settings.ColorSchemes[schemeName]);
                }
            }
        }

        protected addColorSchemeOption(select: HTMLSelectElement, colorScheme: Settings.ColorScheme)
        {
            const option = this._popup.createElement("option");
            option.value = colorScheme.colorSchemeId;
            option.text = colorScheme.colorSchemeName;

            this._dynamicSettingsManager.changeSettings(colorScheme);
            option.style.color = this._dynamicTextColorProcessor.changeColor(Colors.RgbaColor.Black, colorScheme.backgroundLightnessLimit / 100, option).color;
            option.style.backgroundColor = this._dynamicBackgroundColorProcessor.changeColor(Colors.RgbaColor.White, false, option).color;

            select.appendChild(option);
            return option;
        }

        protected onColorSchemeForEditChanged()
        {
            if (this._colorSchemeForEdit.selectedOptions.length)
            {
                this._newColorSchemeName.value = (this._colorSchemeForEdit.selectedOptions[0] as HTMLOptionElement).text;
                this.updateColorSchemeButtons();
            }
        }

        protected updateColorSchemeButtons()
        {
            this._saveColorSchemeButton.disabled = this._colorSchemeForEdit.value !== "custom" &&
                this._settingsManager.settingsAreEqual(this._settingsManager.currentSettings,
                    Settings.ColorSchemes[this._colorSchemeForEdit.value as Settings.ColorSchemeName]) &&
                Settings.ColorSchemes[this._colorSchemeForEdit.value as Settings.ColorSchemeName].colorSchemeName ===
                this._newColorSchemeName.value as Settings.ColorSchemeName;
            this._deleteColorSchemeButton.disabled = this._colorSchemeForEdit.value === "custom";
        }

        protected saveUserColorScheme()
        {
            const colorSchemeForEditName = this._colorSchemeForEdit.value !== "custom"
                ? Settings.ColorSchemes[this._colorSchemeForEdit.value as Settings.ColorSchemeName].colorSchemeName : "";
            if (this._colorSchemeForEdit.value === "custom" ||
                confirm(`You are about to update color scheme [${colorSchemeForEditName}] with current popup settings and ${
                    colorSchemeForEditName === this._newColorSchemeName.value ? "a" : "the new"} name [${this._newColorSchemeName.value}]. Are you sure want to continue?`))
            {
                const newScheme = Object.assign({}, this._settingsManager.currentSettings);
                newScheme.colorSchemeId = this._colorSchemeForEdit.value as Settings.ColorSchemeName;
                newScheme.colorSchemeName = this._newColorSchemeName.value;
                if (this._colorSchemeForEdit.value === "custom")
                {
                    newScheme.colorSchemeId = Util.guid("") as Settings.ColorSchemeName;
                }
                this._settingsManager.saveUserColorScheme(newScheme)
                    .then(x =>
                    {
                        this.updateColorSchemeLists();
                        alert("Done. It will take effect after page refresh.");
                    })
                    .catch(ex => alert("Color scheme update failed.\n" + (ex.message || ex)));
            }
        }

        protected deleteUserColorScheme()
        {
            if (confirm(`You are about to delete color scheme [${
                Settings.ColorSchemes[this._colorSchemeForEdit.value as Settings.ColorSchemeName].colorSchemeName
                }]. Deleting system color schemes will just remove all overrides from the specified color scheme. There is no way to completely delete any system color scheme. Are you sure want to continue?`))
            {
                this._settingsManager.deleteUserColorScheme(this._colorSchemeForEdit.value as Settings.ColorSchemeName)
                    .then(x =>
                    {
                        this.updateColorSchemeLists();
                        alert("Done. It will take effect after page refresh.");
                    })
                    .catch(ex => alert("Color scheme deletion failed.\n" + (ex.message || ex)));
            }
        }

        protected updateColorSchemeLists()
        {
            this._settingsManager.getDefaultSettings().then(defaultSettings =>
            {
                this._settingsManager.initDefaultColorSchemes();
                this._settingsManager.applyUserColorSchemes(defaultSettings);
                dom.removeAllEventListeners(this._colorSchemeSelect);
                dom.removeAllEventListeners(this._colorSchemeForEdit);
                this._colorSchemeSelect.innerHTML = "";
                this._colorSchemeForEdit.innerHTML = "";
                this.fillColorSchemesSelectLists();
                const settings = this._settingsManager.currentSettings;
                this.setUpColorSchemeSelectValue(settings);
                this.updateButtonStates();
                if (settings.colorSchemeId &&
                    settings.colorSchemeId !== "custom" as Settings.ColorSchemeName &&
                    settings.colorSchemeId !== Settings.ColorSchemes.default.colorSchemeId &&
                    settings.colorSchemeId !== Settings.ColorSchemes.original.colorSchemeId &&
                    Settings.ColorSchemes[settings.colorSchemeId])
                {
                    this._colorSchemeForEdit.value = settings.colorSchemeId;
                }
                else
                {
                    this._colorSchemeForEdit.value = "custom";
                }
                this.onColorSchemeForEditChanged();
            });
        }

        protected toggleSchedule()
        {
            if (this._useDefaultScheduleCheckBox.checked)
            {
                this._popup.getElementById("scheduleStartHourContainer")!.classList.add("disabled");
                this._popup.getElementById("scheduleFinishHourContainer")!.classList.add("disabled");
            }
            else
            {
                this._popup.getElementById("scheduleStartHourContainer")!.classList.remove("disabled");
                this._popup.getElementById("scheduleFinishHourContainer")!.classList.remove("disabled");
            }
        }

        protected forgetAllSitesSettings()
        {
            if (confirm("All the settings and custom color schemes you have ever made will be deleted! Are you sure want to continue?"))
            {
                this._settingsManager
                    .deleteAllSettings()
                    .then(x => this.updateButtonStates())
                    .then(x => alert("Done. It will take effect after page refresh."))
                    .catch(ex => alert("All sites settings deletion failed.\n" + (ex.message || ex)));
            }
        }

        protected forgetCurrentSiteSettings()
        {
            this._settingsManager
                .deleteCurrentSiteSettings()
                .then(x => alert("Done. It will take effect after page refresh."))
                .catch(ex => alert("Current site settings deletion failed.\n" + (ex.message || ex)));
        }

        protected setAsDefaultSettings()
        {
            this._settingsManager
                .setAsDefaultSettings()
                .then(x => this.updateButtonStates())
                .catch(ex => alert("Default settings setup failed.\n" + (ex.message || ex)));
        }

        protected setUpInputFields(settings: Settings.ColorScheme)
        {
            if (settings.colorSchemeId &&
                settings.colorSchemeId !== "custom" as Settings.ColorSchemeName &&
                settings.colorSchemeId !== Settings.ColorSchemes.default.colorSchemeId &&
                settings.colorSchemeId !== Settings.ColorSchemes.original.colorSchemeId &&
                Settings.ColorSchemes[settings.colorSchemeId])
            {
                this._colorSchemeForEdit.value = settings.colorSchemeId;
            }
            else
            {
                this._colorSchemeForEdit.value = "custom";
            }
            this.onColorSchemeForEditChanged();
            let setting: Settings.ColorSchemePropertyName;
            for (setting in settings)
            {
                let input = this._popup.getElementById(setting) as HTMLInputElement | HTMLSelectElement;
                if (input)
                {
                    dom.removeAllEventListeners(input);
                    let settingValue = settings[setting];
                    switch (input.type)
                    {
                        case "hidden":
                            input.value = settingValue!.toString();
                            break;

                        case "checkbox":
                            (input as any).checked = settingValue;
                            break;

                        case "range":
                            input.value = settingValue!.toString();
                            dom.addEventListener(input, "input", MidnightLizard.Controls.Slider.onRangeChanged, input)();
                            break;

                        case "select-one":
                            input.value = settingValue!.toString();
                            dom.addEventListener(input, "change", PopupManager.onHueChanged, input)();
                            break;

                        default: break;
                    }
                    if (setting !== "isEnabled")
                    {
                        dom.addEventListener(input, "change", this.onInputFieldChanged, this);
                    }
                }
            }
        }

        protected updateButtonStates()
        {
            this.updateColorSchemeButtons();
            this._applyButton.disabled = this._settingsManager.settingsAreEqual(this._settingsManager.currentSettings, this._currentSiteSettings);
            Promise
                .all([this._settingsManager.currentSettings, this._settingsManager.getDefaultSettings()])
                .then(([currentSettings, defaultSettings]) =>
                {
                    this._setAsDefaultButton.disabled = this._settingsManager.settingsAreEqual(currentSettings, defaultSettings);
                });
        }

        protected static onHueChanged(this: HTMLSelectElement)
        {
            this.style.cssText = (this.options[this.selectedIndex] as HTMLOptionElement).style.cssText;
            if (this.hasAttribute("display-color-on"))
            {
                this.ownerDocument.getElementById(this.getAttribute("display-color-on")!)!.style.fill = this.style.backgroundColor;
            }
        }

        protected setUpColorSchemeSelectValue(settings: Settings.ColorScheme)
        {
            dom.removeAllEventListeners(this._colorSchemeSelect);
            setUp:
            {
                if (!settings.runOnThisSite)
                {
                    this._colorSchemeSelect.value = "original";
                }
                else
                {
                    if (settings.colorSchemeId && settings.colorSchemeId !== "custom" as Settings.ColorSchemeName &&
                        Settings.ColorSchemes[settings.colorSchemeId])
                    {
                        this._colorSchemeSelect.value = settings.colorSchemeId;
                    }
                    else
                    {
                        let scheme: Settings.ColorSchemeName;
                        for (scheme in Settings.ColorSchemes)
                        {
                            if (this._settingsManager.settingsAreEqual(Settings.ColorSchemes[scheme], settings))
                            {
                                this._colorSchemeSelect.value = scheme;
                                break setUp;
                            }
                        }
                        this._colorSchemeSelect.value = "custom";
                    }
                }
            }
            settings.colorSchemeId = this._colorSchemeSelect.value as Settings.ColorSchemeName;
            dom.addEventListener(this._colorSchemeSelect, "change", this.onColorSchemeChanged, this);
        }

        protected onColorSchemeChanged()
        {
            if (this._colorSchemeSelect.value === "default")
            {
                this._settingsManager.getDefaultSettings()
                    .then(this.applySettingsOnPopup.bind(this));
            }
            else
            {
                let selectedScheme;
                if (this._colorSchemeSelect.value === "custom")
                {
                    this.applySettingsOnPopup(this._currentSiteSettings);
                }
                else
                {
                    let selectedScheme = Object.assign({}, Settings.ColorSchemes[this._colorSchemeSelect.value as Settings.ColorSchemeName]);
                    selectedScheme.isEnabled = this._isEnabledToggle.checked;
                    selectedScheme.settingsVersion = this._currentSiteSettings.settingsVersion;
                    this.applySettingsOnPopup(selectedScheme);
                }
            }
        }

        protected onButtonRoomRulesApplied(roomRules: ContentScript.RoomRules)
        {
            let props = Object.assign({}, ContentScript.USP.htm);
            props.css = { shdColor: "--icon-shadow-color" } as any;
            let newRules = Object.assign(new ContentScript.RoomRules(),
                {
                    textShadow:
                    {
                        value: (roomRules.textShadow && roomRules.textShadow.color && roomRules.textShadow.color.color)
                            ? roomRules.textShadow.color.color
                            : "black"
                    }
                });
            this._documentProcessor.applyRoomRules(this._forgetAllSitesButton.parentElement!, newRules, props, true);
        }

        protected onRangeRoomRulesApplied(tag: HTMLElement, roomRules: ContentScript.RoomRules)
        {
            let currentStyle = tag.ownerDocument.defaultView.getComputedStyle(tag, "");
            let props = Object.assign({}, ContentScript.USP.htm);
            props.css =
                {
                    bgrColor: "--pseudo-background-color",
                    brdColor: "--pseudo-border-color",
                    fntColor: "--pseudo-color",
                    shdColor: "--pseudo-text-shadow-color"
                };

            let shadowColor = this._textShadowColorProcessor.changeColor(
                Colors.RgbaColor.Gray, roomRules.color!.light, tag,
                Math.abs(roomRules.color!.light - roomRules.backgroundColor!.light) / 1.4);
            let newRules = Object.assign(new ContentScript.RoomRules(),
                {
                    backgroundColor: { color: currentStyle.backgroundColor },
                    color: { color: currentStyle.color },
                    borderColor: { color: currentStyle.borderColor },
                    textShadow: { value: shadowColor.color }
                });
            this._documentProcessor.applyRoomRules(tag.ownerDocument.documentElement, newRules, props, true);
        }
    }
}