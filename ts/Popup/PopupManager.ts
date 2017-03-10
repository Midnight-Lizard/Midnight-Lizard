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

        constructor(
            protected readonly _popup: Document,
            protected readonly _settingsManager: MidnightLizard.Popup.IPopupSettingsManager,
            protected readonly _commandManager: MidnightLizard.Popup.ICommandManager,
            protected readonly _app: MidnightLizard.Settings.IApplicationSettings,
            protected readonly _documentProcessor: MidnightLizard.ContentScript.IDocumentProcessor,
            protected readonly _textShadowColorProcessor: MidnightLizard.Colors.ITextShadowColorProcessor)
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

            PopupManager.ignoreSelect(this._colorSchemeSelect);
            this._colorSchemeSelect.mlIgnore = false;

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

            Controls.Tab.initTabControl(doc);
            Controls.Slider.initSliders(doc);

            this._hostName.innerText = this._currentSiteSettings.hostName || "{unknown}";

            this.setUpInputFields(this._currentSiteSettings);
            this.setUpColorSchemeSelectValue(this._currentSiteSettings);
            this.updateButtonStates();
            this.toggleSchedule();
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
            if (confirm("Are you sure? All the settings you have ever made will be deleted!"))
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
                            PopupManager.ignoreSelect(input as HTMLSelectElement);
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
            this._applyButton.disabled = this.settingsAreEqual(this._settingsManager.currentSettings, this._currentSiteSettings);
            Promise
                .all([this._settingsManager.currentSettings, this._settingsManager.getDefaultSettings()])
                .then(([currentSettings, defaultSettings]) =>
                {
                    this._setAsDefaultButton.disabled = this.settingsAreEqual(currentSettings, defaultSettings);
                });
        }

        protected settingsAreEqual(first: Settings.ColorScheme, second: Settings.ColorScheme): boolean
        {
            const excludeSettingsForCompare: Settings.ColorSchemePropertyName[] = ["isEnabled", "exist", "hostName", "isDefault", "settingsVersion"];
            for (let setting in first)
            {
                let prop = setting as Settings.ColorSchemePropertyName;
                if (excludeSettingsForCompare.indexOf(prop) == -1)
                {
                    if (first[prop] !== second[prop])
                    {
                        return false;
                    }
                }
            }
            return true;
        }

        protected static ignoreSelect(select: HTMLSelectElement)
        {
            select.mlIgnore = true;
            Array.prototype.forEach.call(select.options, (opt: HTMLOptionElement) => opt.mlIgnore = true);
        }

        protected static onHueChanged(this: HTMLSelectElement)
        {
            this.style.cssText = (this.options[this.selectedIndex] as HTMLOptionElement).style.cssText;
        }

        protected setUpColorSchemeSelectValue(settings: Settings.ColorScheme)
        {
            dom.removeAllEventListeners(this._colorSchemeSelect);
            setUp:
            {
                if (settings.isDefault)
                {
                    this._colorSchemeSelect.value = "default";
                }
                else if (!settings.runOnThisSite)
                {
                    this._colorSchemeSelect.value = "original";
                }
                else
                {
                    let scheme: Settings.ColorSchemeName;
                    for (scheme in Settings.ColorSchemes)
                    {
                        if (this.settingsAreEqual(Settings.ColorSchemes[scheme], settings))
                        {
                            this._colorSchemeSelect.value = scheme;
                            break setUp;
                        }
                    }
                    this._colorSchemeSelect.value = "custom";
                }
            }
            dom.addEventListener(this._colorSchemeSelect, "change", this.onColorSchemeChanged, this);
        }

        protected onColorSchemeChanged()
        {
            if (this._colorSchemeSelect.value == "default")
            {
                this._settingsManager.getDefaultSettings()
                    .then(this.applySettingsOnPopup.bind(this));
            }
            else
            {
                let selectedScheme;
                if (this._colorSchemeSelect.value == "custom")
                {
                    this.applySettingsOnPopup(this._currentSiteSettings);
                }
                else
                {
                    let selectedScheme = Object.assign(
                        {
                            isEnabled: this._isEnabledToggle.checked,
                            settingsVersion: this._currentSiteSettings.settingsVersion
                        },
                        Settings.ColorSchemes[this._colorSchemeSelect.value as Settings.ColorSchemeName]);
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