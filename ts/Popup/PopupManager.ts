/// <reference path="../DI/-DI.ts" />
/// <reference path="../Colors/-Colors.ts" />
/// <reference path="../Settings/-Settings.ts" />
/// <reference path="../ContentScript/-ContentScript.ts" />
/// <reference path="../Controls/-Controls.ts" />
/// <reference path="../Events/-Events.ts" />
/// <reference path="ICommandManager.ts" />
/// <reference path="../Utils/-Utils.ts" />
/// <reference path="../Settings/SettingsExporter.ts" />
/// <reference path="../Settings/SettingsImporter.ts" />
/// <reference path="../i18n/DocumentTranslator.ts" />
/// <reference path="../Colors/RangeFillColorProcessor.ts" />
/// <reference path="../Settings/MatchPatternProcessor.ts" />
/// <reference path="../Settings/Public/PublicSettingsManager.ts" />

namespace MidnightLizard.Popup
{
    const dom = Events.HtmlEvent;
    const editMark = Settings.ColorSchemeNamePrefix.FromFile;
    export abstract class IPopupManager { }

    @DI.injectable(IPopupManager)
    class PopupManager
    {
        protected readonly _inputChangeDebounceTime = 300;
        protected _colorSchemeSelect!: HTMLSelectElement;
        protected _applyButton!: HTMLButtonElement;
        protected _setAsDefaultButton!: HTMLButtonElement;
        protected _hostName!: HTMLAnchorElement;
        protected _hostState!: HTMLElement;
        protected _facebookLink!: HTMLAnchorElement;
        protected _isEnabledToggle!: HTMLInputElement;
        protected _runOnThisSiteCheckBox!: HTMLInputElement;
        protected _useDefaultScheduleCheckBox!: HTMLInputElement;
        protected _forgetAllSitesButton!: HTMLButtonElement;
        private _deleteAllWebsitesSettingsButton!: HTMLButtonElement;
        protected _forgetThisSiteButton!: HTMLButtonElement;
        protected _deleteColorSchemeButton!: HTMLButtonElement;
        protected _saveColorSchemeButton!: HTMLButtonElement;
        protected _hiddenSaveColorSchemeButton!: HTMLButtonElement;
        protected _exportColorSchemeButton!: HTMLButtonElement;
        protected _newColorSchemeName!: HTMLInputElement;
        protected _colorSchemeForEdit!: HTMLSelectElement;
        protected _importColorSchemeFileInput!: HTMLInputElement;
        protected _syncSettingsCheckBox!: HTMLInputElement;
        protected _settingsForm!: HTMLFormElement;
        protected _lastMatchPatternChangeTimeout = 0;
        protected get currentSiteSettings()
        {
            return this._settingsManager.currentSiteSettings;
        }

        constructor(
            protected readonly _popup: Document,
            protected readonly _settingsManager: MidnightLizard.Popup.IPopupSettingsManager,
            protected readonly _publicSettingsManager: MidnightLizard.Settings.Public.IPublicSettingsManager,
            protected readonly _commandManager: MidnightLizard.Popup.ICommandManager,
            protected readonly _app: MidnightLizard.Settings.IApplicationSettings,
            protected readonly _documentProcessor: MidnightLizard.ContentScript.IDocumentProcessor,
            protected readonly _textShadowColorProcessor: MidnightLizard.Colors.ITextShadowColorProcessor,
            protected readonly _dynamicSettingsManager: MidnightLizard.Settings.IDynamicSettingsManager,
            protected readonly _dynamicTextColorProcessor: MidnightLizard.Colors.IDynamicTextColorProcessor,
            protected readonly _dynamicBackgroundColorProcessor: MidnightLizard.Colors.IDynamicBackgroundColorProcessor,
            protected readonly _settingsExporter: MidnightLizard.Settings.ISettingsExporter,
            protected readonly _settingsImporter: MidnightLizard.Settings.ISettingsImporter,
            protected readonly _documentTranslator: MidnightLizard.i18n.IDocumentTranslator,
            protected readonly _i18n: MidnightLizard.i18n.ITranslationAccessor,
            protected readonly _rangeFillColorProcessor: MidnightLizard.Colors.IRangeFillColorProcessor,
            protected readonly _matchPatternProcessor: MidnightLizard.Settings.IMatchPatternProcessor)
        {
            dom.addEventListener(_popup, "DOMContentLoaded", this.popupContentloaded, this);
            dom.addEventListener(_popup.defaultView!, "resize", this.setPopupScale, this);
            _settingsManager.onSettingsInitialized.addListener(this.beforeSettingsInitialized, this, Events.EventHandlerPriority.High);
            _settingsManager.onSettingsInitializationFailed.addListener(this.onSettingsInitializationFailed, this);
            _settingsManager.onSettingsChanged.addListener(this.beforeSettingsChanged, this, Events.EventHandlerPriority.High);
            _documentProcessor.onRootDocumentProcessing.addListener(this.beforeRootDocumentProcessedFirstTime as any, this, Events.EventHandlerPriority.High);
        }

        protected popupContentloaded()
        {
            this._documentTranslator.translateDocument(this._popup);
        }

        protected setPopupScale()
        {
            this._popup.documentElement!.style
                .setProperty("--popup-scale",
                    (
                        this._popup.defaultView!.innerWidth / 680.0
                        // Math.min(
                        //     this._popup.defaultView.innerWidth / 680.0,
                        //     this._popup.defaultView.innerHeight / 600.0,
                        // )
                    ).toString());
        }

        protected beforeSettingsInitialized(shift?: Colors.ComponentShift): void
        {
            if (!this._settingsManager.isActive)
            {
                this.beforeRootDocumentProcessedFirstTime(this._popup);
            }
        }

        protected onSettingsInitializationFailed(ex: any): void
        {
            this._popup.getElementById("dialogError")!.style.display = "block";
            this._popup.documentElement!.removeAttribute("ml-stage");
        }

        protected beforeRootDocumentProcessedFirstTime(doc: Document): void
        {
            this._documentProcessor.onRootDocumentProcessing.removeListener(this.beforeRootDocumentProcessedFirstTime as any, this);
            this._setAsDefaultButton = doc.getElementById("setAsDefaultBtn") as HTMLButtonElement;
            this._colorSchemeSelect = doc.getElementById("colorScheme") as HTMLSelectElement;
            this._applyButton = doc.getElementById("applyBtn") as HTMLButtonElement;
            this._hostName = doc.getElementById("hostName") as HTMLAnchorElement;
            this._hostState = doc.getElementById("hostState")!;
            this._facebookLink = doc.getElementById("facebook-link") as HTMLAnchorElement;
            this._isEnabledToggle = doc.getElementById("isEnabled") as HTMLInputElement;
            this._forgetAllSitesButton = doc.getElementById("forgetAllSitesBtn") as HTMLButtonElement;
            this._deleteAllWebsitesSettingsButton = doc.getElementById("deleteAllSitesSettingsBtn") as HTMLButtonElement;
            this._forgetThisSiteButton = doc.getElementById("forgetThisSiteBtn") as HTMLButtonElement;
            this._useDefaultScheduleCheckBox = doc.getElementById("useDefaultSchedule") as HTMLInputElement;
            this._runOnThisSiteCheckBox = doc.getElementById("runOnThisSite") as HTMLInputElement;
            this._saveColorSchemeButton = doc.getElementById("saveColorSchemeBtn") as HTMLButtonElement;
            this._hiddenSaveColorSchemeButton = doc.getElementById("hiddenSaveColorSchemeButton") as HTMLButtonElement;
            this._deleteColorSchemeButton = doc.getElementById("deleteColorSchemeBtn") as HTMLButtonElement;
            this._exportColorSchemeButton = doc.getElementById("exportColorSchemeBtn") as HTMLButtonElement;
            this._newColorSchemeName = doc.getElementById("newColorSchemeName") as HTMLInputElement;
            this._colorSchemeForEdit = doc.getElementById("colorSchemeForEdit") as HTMLSelectElement;
            this._importColorSchemeFileInput = doc.getElementById("importColorSchemeFileInput") as HTMLInputElement;
            this._syncSettingsCheckBox = doc.getElementById("syncSettings") as HTMLInputElement;
            this._settingsForm = doc.getElementById("settingsForm") as HTMLFormElement;

            this._settingsManager.getCurrentSorage().then(isSync =>
            {
                this._syncSettingsCheckBox.checked = isSync;
                this._syncSettingsCheckBox.onchange = this.onSettingsSyncChanged.bind(this);
            });

            const changeLogLink = doc.getElementById("change-log-link")!;
            changeLogLink.setAttribute("tooltip",
                `✏ ${this._app.version}\n${this._i18n.getMessage("changeLogLink_@tooltip")}`);
            changeLogLink.firstElementChild!.setAttribute("href", `../ui/change-log.html#${this._app.version}`);

            (doc.querySelector("#rate-link a") as HTMLAnchorElement).href =
                this._app.browserName === MidnightLizard.Settings.BrowserName.Chrome
                    ? "https://chrome.google.com/webstore/detail/midnight-lizard/pbnndmlekkboofhnbonilimejonapojg/reviews"
                    : `https://addons.mozilla.org/${this._app.currentLocale}/firefox/addon/midnight-lizard-quantum/reviews/`;

            doc.querySelectorAll(".ml-input-range-icon,.ml-input-range-icon *").forEach(tag => tag.mlIgnore = true);

            if (this._app.isDesktop)
            {
                this._commandManager.getCommands()
                    .then(commands =>
                    {
                        for (const command of commands)
                        {
                            if (command.shortcut)
                            {
                                switch (command.name)
                                {
                                    case "global-toggle":
                                        const isEnabledSwitch = doc.getElementById("isEnabledSwitch")!;
                                        isEnabledSwitch.setAttribute("tooltip", isEnabledSwitch.getAttribute("tooltip") +
                                            `\n${this._i18n.getMessage("shortcut_text_lable")}: ${command.shortcut}`);
                                        break;

                                    case "current-toggle":
                                        const hostState = doc.querySelector(`[i18n="hostState"]`)!;
                                        hostState.setAttribute("tooltip", hostState.getAttribute("tooltip") +
                                            `\n${this._i18n.getMessage("shortcut_text_lable")}: ${command.shortcut}`);
                                        break;
                                }
                            }
                        }
                    })
                    .catch(ex => this._app.isDebug && console.error("Commands acquiring failed.\n" + (ex.message || ex)));
            }

            this._forgetAllSitesButton.onRoomRulesApplied = new Events.ArgumentedEventDispatcher<ContentScript.RoomRules>();
            this._forgetAllSitesButton.onRoomRulesApplied.addListener(this.onButtonRoomRulesApplied as any, this);
            const range = doc.querySelector(".ml-input-range") as HTMLInputElement;
            range.onRoomRulesApplied = new Events.ArgumentedEventDispatcher<ContentScript.RoomRules>();
            range.onRoomRulesApplied.addListener(this.onRangeRoomRulesApplied as any, this, Events.EventHandlerPriority.Normal, range);
            const tabItemSep = doc.querySelector(".ml-tab-item-separator") as HTMLLIElement;
            tabItemSep.onRoomRulesApplied = new Events.ArgumentedEventDispatcher<ContentScript.RoomRules>();
            range.onRoomRulesApplied.addListener(this.onTabItemSeparatorRoomRulesApplied as any, this, Events.EventHandlerPriority.Normal, tabItemSep);
            const footer = doc.querySelector(".ml-dialog-footer") as HTMLLIElement;
            footer.onRoomRulesApplied = new Events.ArgumentedEventDispatcher<ContentScript.RoomRules>();
            footer.onRoomRulesApplied.addListener(this.onFotterRoomRulesApplied as any, this, Events.EventHandlerPriority.Normal, footer);

            this._hostState.onclick = this._hostName.onclick = this.toggleRunOnThisSite.bind(this);
            this._applyButton.onclick = this.applySettingsOnPage.bind(this);
            this._isEnabledToggle.onchange = this.toggleIsEnabled.bind(this);
            this._useDefaultScheduleCheckBox.onchange = this.toggleSchedule.bind(this);
            this._forgetAllSitesButton.onclick = this.forgetAllSitesSettings.bind(this);
            this._forgetThisSiteButton.onclick = this.forgetCurrentSiteSettings.bind(this);
            this._deleteAllWebsitesSettingsButton.onclick = this.deleteAllWebsitesSettings.bind(this);
            this._setAsDefaultButton.onclick = this.setAsDefaultSettings.bind(this);

            this._colorSchemeForEdit.onchange = this.onColorSchemeForEditChanged.bind(this);
            this._deleteColorSchemeButton.onclick = this.deleteUserColorScheme.bind(this);
            this._hiddenSaveColorSchemeButton.onclick =
                this._saveColorSchemeButton.onclick = this.saveUserColorScheme.bind(this);
            this._newColorSchemeName.oninput = this.updateColorSchemeButtons.bind(this);
            this._exportColorSchemeButton.onclick = this.exportColorScheme.bind(this);
            this._importColorSchemeFileInput.onchange = this.importColorSchemes.bind(this);
            this._importColorSchemeFileInput.onclick = this.importColorSchemesClick.bind(this);

            Controls.Tab.initTabControl(doc, (tab) =>
            {
                if (tab === "text")
                {
                    const text = this._popup.getElementById("selection") as Node;
                    if (text)
                    {
                        const selection = this._popup.defaultView!.getSelection();
                        const range = this._popup.createRange();
                        range.selectNodeContents(text);
                        selection.removeAllRanges();
                        selection.addRange(range);
                    }
                }
            });
            Controls.Slider.initSliders(doc);

            this._hostName.innerText = this.getHostName();

            this.fillColorSchemesSelectLists();
            this.setUpInputFields(this.currentSiteSettings);
            this.setUpColorSchemeSelectValue(this.currentSiteSettings);
            this.setUpDefaultInputFields();
            this.updateButtonStates();
            this.toggleSchedule();
            this.onColorSchemeForEditChanged();
        }

        private getHostName(): string
        {
            if (this.currentSiteSettings.location)
            {
                const location = new URL(this.currentSiteSettings.location)
                if (location.protocol === "file:")
                {
                    return this._i18n.getMessage("localFiles_text_label");
                }
                return location.hostname;
            }
            return "current page";
        }

        protected beforeSettingsChanged(response: (scheme: Settings.ColorScheme) => void, shift?: Colors.ComponentShift): void
        {
            this._popup.documentElement!.style.cssText = "";
            this.setPopupScale();
            this.updateButtonStates();
            this.toggleSchedule();
        }

        protected onInputFieldChanged()
        {
            let settings = this.getSettingsFromPopup();
            this.setUpColorSchemeSelectValue(settings);
            this._settingsManager.changeSettings(settings);
        }

        protected onDefaultInputFieldChanged()
        {
            this._settingsManager.getDefaultSettings()
                .then(defSet =>
                {
                    let newDefSet = this.getDefaultSettingsFromPopup();
                    if (defSet.changeBrowserTheme && !newDefSet.changeBrowserTheme &&
                        this._app.browserName === Settings.BrowserName.Firefox &&
                        confirm(this._i18n.getMessage("resetThemeConfirmationMessage")))
                    {
                        browser.theme.reset();
                    }
                    return this._settingsManager.changeDefaultSettings(newDefSet);
                })
                .then(newDefSet =>
                {
                    if (this._settingsManager.currentSettings.colorSchemeId ===
                        Settings.ColorSchemes.default.colorSchemeId)
                    {
                        this.setUpInputFields(this._settingsManager.currentSettings);
                    }
                    if (this.currentSiteSettings.colorSchemeId ===
                        Settings.ColorSchemes.default.colorSchemeId)
                    {
                        this._settingsManager.currentSiteSettings = newDefSet;
                        this.updateButtonStates();
                    }
                })
                .catch(async ex =>
                {
                    const reason = await this._settingsManager.getErrorReason(ex);
                    alert(this._i18n.getMessage("setAsDefaultFailureMessage") + reason);
                });

        }

        protected getDefaultSettingsFromPopup()
        {
            let settings: Settings.ColorScheme = {} as any, value: string | number | boolean,
                propName: Settings.ColorSchemePropertyName;
            for (let setting of Array.from(document.querySelectorAll(".default-setting")) as HTMLInputElement[])
            {
                propName = setting.id.replace("default_", "") as any;
                switch (typeof Settings.ColorSchemes.default[propName])
                {
                    case "boolean":
                        value = setting.checked as boolean;
                        break;

                    case "number":
                        value = parseInt(setting.value);
                        break;

                    default:
                        value = setting.value;
                        break;
                }
                settings[propName] = value;
            }
            return settings;
        }

        protected getSettingsFromPopup()
        {
            let settings: Settings.ColorScheme = {} as any, value: string | number | boolean | string[];
            settings.isEnabled = this._isEnabledToggle.checked;
            for (let setting of Array.from(document.querySelectorAll(".setting")) as HTMLInputElement[])
            {
                switch (typeof Settings.ColorSchemes.default[setting.id as Settings.ColorSchemePropertyName])
                {
                    case "boolean":
                        value = setting.checked as boolean;
                        break;

                    case "number":
                        value = parseInt(setting.value);
                        break;

                    default:
                        value = setting.value;
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
                .then(x => Object.assign(
                    this._settingsManager.currentSiteSettings,
                    this._settingsManager.currentSettings))
                .then(x => this.updateButtonStates())
                .catch(ex => alert(this._i18n.getMessage("applyOnPageFailureMessage") + (ex.message || ex)));
            return false;
        }

        protected toggleRunOnThisSite()
        {
            this._runOnThisSiteCheckBox.checked = !this._runOnThisSiteCheckBox.checked;
            this.onInputFieldChanged();
            this.applySettingsOnPage();
        }

        protected toggleIsEnabled()
        {
            this.currentSiteSettings.isEnabled = this._isEnabledToggle.checked;
            this._settingsManager
                .toggleIsEnabled(this._isEnabledToggle.checked)
                .catch(ex => alert(this._i18n.getMessage("toggleExtensionFailureMessage") + (ex.message || ex)));
        }

        protected fillColorSchemesSelectLists()
        {
            const customScheme = Object.assign({}, this._settingsManager.currentSettings);
            customScheme.colorSchemeId = "custom" as Settings.ColorSchemeId;
            customScheme.colorSchemeName = this._i18n.getMessage("colorSchemeName_Custom");
            this.addColorSchemeOption(this._colorSchemeSelect, customScheme);
            customScheme.colorSchemeName = this._i18n.getMessage("colorSchemeName_New");
            this.addColorSchemeOption(this._colorSchemeForEdit, customScheme);
            let schemeName: Settings.ColorSchemeId;

            const defaultSettings = this._settingsManager.getDefaultSettingsCache();
            defaultSettings.colorSchemeId = Settings.ColorSchemes.default.colorSchemeId;
            defaultSettings.colorSchemeName = Settings.ColorSchemes.default.colorSchemeName;

            for (schemeName in Settings.ColorSchemes)
            {
                this.addColorSchemeOption(this._colorSchemeSelect,
                    schemeName === Settings.ColorSchemes.default.colorSchemeId ? defaultSettings : Settings.ColorSchemes[schemeName]);

                if (schemeName !== Settings.ColorSchemes.default.colorSchemeId)
                {
                    this.addColorSchemeOption(this._colorSchemeForEdit, Settings.ColorSchemes[schemeName]);
                }
            }

            this._publicSettingsManager.getInstalledPublicColorSchemeIds()
                .then(publicColorSchemeIds =>
                {
                    this.setPublicSchemePrefixToOptions(this._colorSchemeForEdit, publicColorSchemeIds);
                    this.setPublicSchemePrefixToOptions(this._colorSchemeSelect, publicColorSchemeIds);
                });
        }

        protected setPublicSchemePrefixToOptions(select: HTMLSelectElement, publicColorSchemeIds: Settings.ColorSchemeId[])
        {
            for (const id of publicColorSchemeIds)
            {
                const option = select.namedItem(id);
                if (option)
                {
                    option.text = Settings.ColorSchemeNamePrefix.Public + option.text;
                }
            }
        }

        protected addColorSchemeOption(select: HTMLSelectElement, colorScheme: Settings.ColorScheme)
        {
            const option = this._popup.createElement("option");
            option.id = option.value = colorScheme.colorSchemeId;
            option.text = colorScheme.colorSchemeName;

            this._dynamicSettingsManager.changeSettings(colorScheme);
            option.style.setProperty("color",
                this._dynamicTextColorProcessor.changeColor(
                    Colors.RgbaColor.Black,
                    colorScheme.backgroundLightnessLimit / 100,
                    option).color, "important");
            option.style.setProperty("background-color",
                this._dynamicBackgroundColorProcessor.changeColor(
                    Colors.RgbaColor.White,
                    false,
                    option).color, "important");

            select.appendChild(option);
            return option;
        }

        protected onColorSchemeForEditChanged()
        {
            if (this._colorSchemeForEdit.selectedOptions.length)
            {
                this._newColorSchemeName.value = (this._colorSchemeForEdit.selectedOptions[0] as HTMLOptionElement).text
                    .replace(editMark, "").replace(Settings.ColorSchemeNamePrefix.Public, "");
                this.updateColorSchemeButtons();
            }
        }

        protected onSettingsSyncChanged()
        {
            this._settingsManager.toggleSync(this._syncSettingsCheckBox.checked)
                .then(x => this.updateColorSchemeListsFromDefaultSettings())
                .catch(ex => alert(this._i18n.getMessage("syncChangeFailureMessage") + (ex.message || ex)));
        }

        protected updateColorSchemeButtons()
        {
            const formHasErrors = !this._settingsForm.checkValidity();
            this._hiddenSaveColorSchemeButton.disabled = this._saveColorSchemeButton.disabled = formHasErrors ||
                this._colorSchemeForEdit.value !== "custom" &&
                this._settingsManager.settingsAreEqual(this._settingsManager.currentSettings,
                    Settings.ColorSchemes[this._colorSchemeForEdit.value as Settings.ColorSchemeId]) &&
                Settings.ColorSchemes[this._colorSchemeForEdit.value as Settings.ColorSchemeId].colorSchemeName ===
                this._newColorSchemeName.value as Settings.ColorSchemeId;
            this._deleteColorSchemeButton.disabled = this._colorSchemeForEdit.value === "custom";
            this._exportColorSchemeButton.disabled = formHasErrors;
            if (!this._hiddenSaveColorSchemeButton.disabled &&
                this._colorSchemeSelect.value !== Settings.ColorSchemes.default.colorSchemeId &&
                this._colorSchemeForEdit.value !== "custom")
            {
                this._hiddenSaveColorSchemeButton.classList.remove("hidden");
            }
            else
            {
                this._hiddenSaveColorSchemeButton.classList.add("hidden");
            }

            this._exportColorSchemeButton.title = this._i18n.getMessage("exportColorSchemeBtn_@title",
                this._colorSchemeSelect.selectedOptions[0].text,
                this._colorSchemeForEdit.selectedOptions[0].text,
                this._newColorSchemeName.value
            );
        }

        protected exportColorScheme()
        {
            const newScheme = Object.assign({}, this._settingsManager.currentSettings);
            newScheme.colorSchemeId = this._colorSchemeForEdit.value as Settings.ColorSchemeId;
            newScheme.colorSchemeName = this._newColorSchemeName.value;
            if (this._colorSchemeForEdit.value === "custom")
            {
                newScheme.colorSchemeId = Util.guid("") as Settings.ColorSchemeId;
            }
            this._settingsExporter.export(newScheme);
            return false;
        }

        protected importColorSchemesClick(event: Event)
        {
            if (this._app.browserName === Settings.BrowserName.Firefox)
            {
                alert(this._i18n.getMessage("colorSchemeImportNotSupportedMessage"));
                event.preventDefault();
                return true;
            }
            return;
        }

        protected importColorSchemes()
        {
            if (this._importColorSchemeFileInput.files)
            {
                Promise.all(this._settingsImporter.import(this._importColorSchemeFileInput.files))
                    .then(colorSchemes =>
                    {
                        const importedColorSchemes: Settings.ColorScheme = {} as any;
                        importedColorSchemes.userColorSchemes = new Array<Settings.ColorScheme>();
                        colorSchemes.forEach(arr => importedColorSchemes.userColorSchemes!.push(...arr));
                        if (importedColorSchemes.userColorSchemes && importedColorSchemes.userColorSchemes.length > 0)
                        {
                            importedColorSchemes.userColorSchemes.forEach(cs => cs.colorSchemeName = editMark + cs.colorSchemeName)
                            this.updateColorSchemeLists(importedColorSchemes);
                            this._colorSchemeSelect.value = importedColorSchemes.userColorSchemes[0].colorSchemeId;
                            this.onColorSchemeChanged();
                            const msg = this._i18n.getMessage("colorSchemeImportSuccessMessage",
                                importedColorSchemes.userColorSchemes.length.toString(),
                                editMark);
                            alert(msg);
                        }
                    })
                    .catch(error => alert(error));
            }
            return false;
        }

        protected saveUserColorScheme(e: Event)
        {
            const colorSchemeForEditName = this._colorSchemeForEdit.value !== "custom"
                ? Settings.ColorSchemes[this._colorSchemeForEdit.value as Settings.ColorSchemeId].colorSchemeName : "";
            if (this._colorSchemeForEdit.value === "custom" ||
                e.target && e.target instanceof HTMLButtonElement &&
                e.target.id === this._hiddenSaveColorSchemeButton.id ||
                confirm(this._i18n.getMessage("colorSchemeSaveConfirmationMessage",
                    colorSchemeForEditName, this._newColorSchemeName.value)))
            {
                const newScheme = Object.assign({}, this._settingsManager.currentSettings);
                newScheme.colorSchemeId = this._colorSchemeForEdit.value as Settings.ColorSchemeId;
                newScheme.colorSchemeName = this._newColorSchemeName.value;
                if (this._colorSchemeForEdit.value === "custom")
                {
                    newScheme.colorSchemeId = Util.guid("") as Settings.ColorSchemeId;
                }
                this._settingsManager.saveUserColorScheme(newScheme)
                    .then(async (x) =>
                    {
                        this._settingsManager.changeSettings(newScheme);
                        await this.updateColorSchemeListsFromDefaultSettings();
                    })
                    .catch(async ex =>
                    {
                        const reason = await this._settingsManager.getErrorReason(ex);
                        alert(this._i18n.getMessage("colorSchemeSaveFailureMessage") + reason);
                    });
            }
            if (e.target && e.target instanceof HTMLButtonElement &&
                e.target.id !== this._hiddenSaveColorSchemeButton.id)
            {
                return false;
            }
            return true;
        }

        protected deleteUserColorScheme()
        {
            if (confirm(this._i18n.getMessage("colorSchemeDeleteConfirmationMessage",
                Settings.ColorSchemes[this._colorSchemeForEdit.value as Settings.ColorSchemeId].colorSchemeName)))
            {
                const colorSchemeId = this._colorSchemeForEdit.value as Settings.ColorSchemeId;
                this._settingsManager.deleteUserColorScheme(colorSchemeId)
                    // TODO: the next line should be removed when there will be a special UI for Public Schemes deletion
                    .then(x => this._publicSettingsManager.uninstallPublicSchemeByColorSchemeId(colorSchemeId))
                    .then(x => this.updateColorSchemeListsFromDefaultSettings())
                    .catch(ex => alert(this._i18n.getMessage("colorSchemeDeleteFailureMessage") + (ex.message || ex)));
            }
            return false;
        }

        protected async updateColorSchemeListsFromDefaultSettings()
        {
            this._settingsManager.initDefaultColorSchemes();
            await this._settingsManager.getDefaultSettings();
            this.updateColorSchemeLists();
        }

        protected updateColorSchemeLists(colorScheme?: Settings.ColorScheme)
        {
            if (colorScheme)
            {
                this._settingsManager.applyUserColorSchemesFromMemory(colorScheme);
            }
            dom.removeAllEventListeners(this._colorSchemeSelect);
            dom.removeAllEventListeners(this._colorSchemeForEdit);
            this._colorSchemeSelect.textContent = "";
            this._colorSchemeForEdit.textContent = "";
            this.fillColorSchemesSelectLists();
            const settings = this._settingsManager.currentSettings;
            this.setUpColorSchemeSelectValue(settings);
            this.updateButtonStates();
            if (settings.colorSchemeId &&
                settings.colorSchemeId !== "custom" as Settings.ColorSchemeId &&
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
            if (confirm(this._i18n.getMessage("forgetAllConfirmationMessage")))
            {
                this._settingsManager
                    .deleteAllSettings()
                    .then(x => this.updateButtonStates())
                    .catch(ex => alert(this._i18n.getMessage("forgetAllFailureMessage") + (ex.message || ex)));
            }
            return false;
        }

        protected forgetCurrentSiteSettings()
        {
            this._settingsManager
                .deleteCurrentSiteSettings()
                .catch(ex => alert(this._i18n.getMessage("forgetThisFailureMessage") + (ex.message || ex)));
        }

        protected deleteAllWebsitesSettings()
        {
            this._settingsManager
                .deleteAllWebsitesSettings()
                .catch(ex => alert(this._i18n.getMessage("deleteAllWebsitesSettingsFailureMessage") +
                    (ex.message || ex)));
        }

        protected setAsDefaultSettings()
        {
            this._settingsManager
                .setAsDefaultSettings()
                .then(x =>
                {
                    this.setUpDefaultInputFields();
                    this.updateButtonStates();
                })
                .catch(async ex =>
                {
                    const reason = await this._settingsManager.getErrorReason(ex);
                    alert(this._i18n.getMessage("setAsDefaultFailureMessage") + reason);
                });
            return false;
        }

        protected setUpDefaultInputFields()
        {
            const settings = this._settingsManager.getDefaultSettingsCache();
            let setting: Settings.ColorSchemePropertyName;
            for (setting in settings)
            {
                let input = this._popup.getElementById(`default_${setting}`) as HTMLInputElement | HTMLSelectElement;
                if (input)
                {
                    dom.removeAllEventListeners(input);
                    let settingValue = settings[setting];
                    switch (input.type)
                    {
                        case "checkbox":
                            (input as any).checked = settingValue;
                            break;

                        case "range":
                            input.value = settingValue!.toString();
                            dom.addEventListener(input, "input", MidnightLizard.Controls.Slider.onRangeChanged, input)();
                            if (input.classList.contains("hue"))
                            {
                                dom.addEventListener(input, "change", PopupManager.onHueRangeChanged, input)();
                            }
                            break;

                        case "select-one":
                            input.value = settingValue!.toString();
                            if (input.classList.contains("ml-dialog-hue-select"))
                            {
                                dom.addEventListener(input, "change", PopupManager.onHueChanged, input)();
                            }
                            break;

                        default: break;
                    }
                    dom.addEventListener(input, "change", this.onDefaultInputFieldChanged, this);
                }
            }
        }

        protected setUpInputFields(settings: Settings.ColorScheme)
        {
            if (settings.colorSchemeId)
            {
                if (settings.colorSchemeId === Settings.ColorSchemes.default.colorSchemeId &&
                    this._settingsManager.defaultColorSchemeId &&
                    this._settingsManager.defaultColorSchemeId !== "custom" as Settings.ColorSchemeId &&
                    Settings.ColorSchemes[this._settingsManager.defaultColorSchemeId])
                {
                    this._colorSchemeForEdit.value = this._settingsManager.defaultColorSchemeId;
                }
                else if (settings.colorSchemeId !== "custom" as Settings.ColorSchemeId &&
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
            }
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
                            if (input.classList.contains("hue"))
                            {
                                dom.addEventListener(input, "change", PopupManager.onHueRangeChanged, input)();
                            }
                            break;

                        case "textarea":
                            input.value = settingValue as string;
                            if (/match/gi.test(input.id))
                            {
                                dom.addEventListener(input, "input", this.validateMatchPaterns, this, false, input)();
                            }
                            dom.addEventListener(input, "input", this.debounceInputChange, this);
                            break;

                        case "select-one":
                            input.value = settingValue!.toString();
                            if (input.classList.contains("ml-dialog-hue-select"))
                            {
                                dom.addEventListener(input, "change", PopupManager.onHueChanged, input)();
                            }
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
            const formHasErrors = !this._settingsForm.checkValidity();
            this._hostState.className = this._settingsManager.currentSettings.runOnThisSite ? "run" : "do-not-run";
            this._applyButton.disabled = formHasErrors ||
                this._settingsManager.settingsAreEqual(this._settingsManager.currentSettings, this.currentSiteSettings) &&
                this._settingsManager.currentSettings.runOnThisSite === this.currentSiteSettings.runOnThisSite;
            Promise
                .all([this._settingsManager.currentSettings, this._settingsManager.getDefaultSettings()])
                .then(([currentSettings, defaultSettings]) =>
                {
                    this._setAsDefaultButton.disabled = formHasErrors ||
                        currentSettings.colorSchemeId === Settings.ColorSchemes.default.colorSchemeId ||
                        this._settingsManager.settingsAreEqual(currentSettings, defaultSettings) &&
                        currentSettings.runOnThisSite === defaultSettings.runOnThisSite;
                });
        }

        protected debounceInputChange()
        {
            if (this._lastMatchPatternChangeTimeout)
            {
                clearTimeout(this._lastMatchPatternChangeTimeout);
            }
            this._lastMatchPatternChangeTimeout = setTimeout(() =>
            {
                this.onInputFieldChanged();
            }, this._inputChangeDebounceTime);
        }

        protected validateMatchPaterns(textarea: HTMLTextAreaElement)
        {
            const currentValidationMessage = textarea.validationMessage;
            const validationMessages = [], currentPageMatchPatterns = [];
            if (textarea.value)
            {
                for (const pattern of textarea.value.split("\n"))
                {
                    const validationMessage = this._matchPatternProcessor.validatePattern(pattern);
                    if (validationMessage !== "")
                    {
                        validationMessages.push(validationMessage);
                    }
                    else if (this.currentSiteSettings.location &&
                        this._matchPatternProcessor.testUrl(pattern, this.currentSiteSettings.location, false))
                    {
                        currentPageMatchPatterns.push(pattern);
                    }
                }
            }
            const newValidationMessage = validationMessages.join("\n");
            textarea.setCustomValidity(newValidationMessage);
            textarea.title = newValidationMessage;
            if (currentValidationMessage !== newValidationMessage)
            {
                this.updateButtonStates();
            }
            const matchResults = textarea.nextElementSibling! as HTMLElement;
            if (textarea.value)
            {
                if (currentPageMatchPatterns.length > 0)
                {
                    matchResults.classList.add("match");
                    matchResults.classList.remove("nomatch");
                    matchResults.textContent = this._i18n.getMessage("matchCurrentPage_text_message");
                    matchResults.title = this._i18n.getMessage("matchCurrentPage_@title") +
                        currentPageMatchPatterns
                            .map((p, i) => `${i + 1}) '${p}'`).join("\n");
                }
                else
                {
                    matchResults.classList.add("nomatch");
                    matchResults.classList.remove("match");
                    matchResults.textContent = this._i18n.getMessage("noMatchForCurrentPage_text_message");
                    matchResults.title = "";
                }
            }
            else
            {
                matchResults.classList.remove("match");
                matchResults.classList.remove("nomatch");
            }
        }

        protected static onHueRangeChanged(this: HTMLInputElement)
        {
            if (this.hasAttribute("display-color-on"))
            {
                const displayColorOn = this.ownerDocument!.getElementById(
                    this.getAttribute("display-color-on") || "-");
                if (displayColorOn)
                {
                    displayColorOn.style.fill = `hsl(${this.value},100%,50%)`;
                }
            }
        }

        protected static onHueChanged(this: HTMLSelectElement)
        {
            this.style.cssText = (this.options[this.selectedIndex] as HTMLOptionElement).style.cssText;
            if (this.hasAttribute("display-color-on"))
            {
                this.ownerDocument!.getElementById(this.getAttribute("display-color-on")!)!.style.fill = this.style.backgroundColor;
            }
        }

        private updateCustomColorSchemeName()
        {
            const customName = this._i18n.getMessage("colorSchemeName_Custom");
            this._colorSchemeSelect.options.namedItem("custom")!.textContent = `${customName}`;
        }

        protected setUpColorSchemeSelectValue(settings: Settings.ColorScheme)
        {
            dom.removeAllEventListeners(this._colorSchemeSelect);
            this.updateCustomColorSchemeName();

            setUp:
            {
                if (settings.colorSchemeId && settings.colorSchemeId !== "custom" as Settings.ColorSchemeId &&
                    Settings.ColorSchemes[settings.colorSchemeId])
                {
                    this._colorSchemeSelect.value = settings.colorSchemeId;
                }
                else
                {
                    let scheme: Settings.ColorSchemeId;
                    for (scheme in Settings.ColorSchemes)
                    {
                        if (scheme !== Settings.ColorSchemes.default.colorSchemeId &&
                            this._settingsManager.settingsAreEqual(Settings.ColorSchemes[scheme], settings))
                        {
                            this._colorSchemeSelect.value = scheme;
                            break setUp;
                        }
                    }
                    this._colorSchemeSelect.value = "custom";
                    if (this._colorSchemeForEdit.value !== "custom")
                    {
                        this._colorSchemeSelect.options.namedItem("custom")!.textContent =
                            Settings.ColorSchemeNamePrefix.Unsaved +
                            this._colorSchemeForEdit.selectedOptions[0].textContent;
                    }
                }
            }
            this.setColorSchemeAttribute();
            settings.colorSchemeId = this._colorSchemeSelect.value as Settings.ColorSchemeId;
            dom.addEventListener(this._colorSchemeSelect, "change", this.onColorSchemeChanged, this);
        }

        protected onColorSchemeChanged()
        {
            this.setColorSchemeAttribute();
            this.updateCustomColorSchemeName();

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
                    this.applySettingsOnPopup(this.currentSiteSettings);
                }
                else
                {
                    let selectedScheme = Object.assign({}, Settings.ColorSchemes[this._colorSchemeSelect.value as Settings.ColorSchemeId]);
                    selectedScheme.isEnabled = this._isEnabledToggle.checked;
                    this.applySettingsOnPopup(selectedScheme);
                }
            }
        }

        private setColorSchemeAttribute()
        {
            this._popup.documentElement!.setAttribute("ml-color-scheme",
                this._colorSchemeSelect.value);
        }

        protected onButtonRoomRulesApplied(roomRules: ContentScript.RoomRules)
        {
            let props = Object.assign({}, ContentScript.USP.htm);
            props.css = { shdColor: "--icon-shadow-color" } as any;
            let newRules = Object.assign({},
                {
                    textShadow:
                    {
                        value: (roomRules.textShadow && roomRules.textShadow.color && roomRules.textShadow.color.color)
                            ? roomRules.textShadow.color.color
                            : "black"
                    }
                } as ContentScript.RoomRules);
            this._documentProcessor.applyRoomRules(this._forgetAllSitesButton.parentElement!, newRules, props);
        }

        protected onRangeRoomRulesApplied(tag: HTMLElement, roomRules: ContentScript.RoomRules)
        {
            let currentStyle = tag.ownerDocument!.defaultView!.getComputedStyle(tag, "");
            let props = Object.assign({}, ContentScript.USP.htm);
            props.css =
                {
                    bgrColor: "--pseudo-background-color",
                    brdColor: "--pseudo-border-color",
                    fntColor: "--pseudo-color",
                    shdColor: "--pseudo-text-shadow-color"
                };

            const rangeFillColor = this._rangeFillColorProcessor.changeColor(
                this._settingsManager.shift,
                roomRules.color!.light,
                roomRules.backgroundColor!.light);
            const newRules = Object.assign({},
                {
                    backgroundColor: { color: currentStyle.backgroundColor },
                    color: { color: currentStyle.color },
                    borderColor: { color: currentStyle.borderColor },
                    textShadow: { value: rangeFillColor.color }
                } as ContentScript.RoomRules);
            this._documentProcessor.applyRoomRules(tag.ownerDocument!.documentElement!, newRules, props);
        }

        protected onTabItemSeparatorRoomRulesApplied(tag: HTMLLIElement, roomRules: ContentScript.RoomRules)
        {
            let currentStyle = tag.ownerDocument!.defaultView!.getComputedStyle(tag, "");
            let props = Object.assign({}, ContentScript.USP.htm);
            props.css =
                {
                    bgrColor: "",
                    brdColor: "--tab-item-border-color",
                    fntColor: "",
                    shdColor: ""
                };
            let newRules = Object.assign({},
                {
                    borderColor: { color: currentStyle.borderRightColor }
                } as ContentScript.RoomRules);
            this._documentProcessor.applyRoomRules(tag.ownerDocument!.documentElement!, newRules, props);
        }

        protected onFotterRoomRulesApplied(tag: HTMLLIElement, roomRules: ContentScript.RoomRules)
        {
            let currentStyle = tag.ownerDocument!.defaultView!.getComputedStyle(tag, "");
            let props = Object.assign({}, ContentScript.USP.htm);
            props.css =
                {
                    bgrColor: "--ml-footer-background-color",
                    brdColor: "",
                    fntColor: "",
                    shdColor: ""
                };
            let newRules = Object.assign({},
                {
                    backgroundColor: { color: currentStyle.backgroundColor }
                } as ContentScript.RoomRules);
            this._documentProcessor.applyRoomRules(tag.ownerDocument!.documentElement!, newRules, props);
        }
    }
}