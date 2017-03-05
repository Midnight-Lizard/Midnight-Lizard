/// <reference path="./ChromePromise.ts" />
/// <reference path="../DI/-DI.ts" />
/// <reference path="../Settings/-Settings.ts" />
/// <reference path="../Events/-Events.ts" />

namespace Chrome
{
    type ColorScheme = MidnightLizard.Settings.ColorScheme;
    type ColorSchemeResponse = (settings: ColorScheme) => void;
    type AnyResponse = (args: any) => void;
    let Action = MidnightLizard.Settings.SettingsMessageAction;
    let EventDispatcher = MidnightLizard.Events.ResponsiveEventDispatcher;
    /** Chrome Settings Communication Bus */
    @MidnightLizard.DI.injectable(MidnightLizard.Settings.ISettingsBus)
    class ChromeSettingsBus implements MidnightLizard.Settings.ISettingsBus
    {
        constructor(
            protected readonly _chromePromise: Chrome.ChromePromise,
            protected readonly _document: Document)
        {
            type message =
                MidnightLizard.Settings.CurrentSettingsRequestMessage | MidnightLizard.Settings.NewSettingsApplicationRequestMessage |
                MidnightLizard.Settings.SettingsDeletionRequestMessage | MidnightLizard.Settings.IsEnabledToggleRequestMessage;
            chrome.runtime.onMessage.addListener(
                (request: message, sender, sendResponse) =>
                {
                    if (!sender.tab)
                    {
                        switch (request.action)
                        {
                            case Action.GetCurrentSettings:
                                this._onCurrentSettingsRequested.raise(sendResponse);
                                break;

                            case Action.ApplyNewSettings:
                                this._onNewSettingsApplicationRequested.raise(sendResponse, request.settings);
                                break;

                            case Action.DeleteSettings:
                                this._onSettingsDeletionRequested.raise(sendResponse);
                                break;

                            case Action.ToggleIsEnabled:
                                this._onIsEnabledToggleRequested.raise(sendResponse, request.isEnabled);
                                break;

                            default:
                                break;
                        }
                    }
                });
        }

        protected _onCurrentSettingsRequested = new EventDispatcher<ColorSchemeResponse, null>();
        public get onCurrentSettingsRequested()
        {
            return this._onCurrentSettingsRequested.event;
        }

        protected _onNewSettingsApplicationRequested = new EventDispatcher<AnyResponse, ColorScheme>();
        public get onNewSettingsApplicationRequested()
        {
            return this._onNewSettingsApplicationRequested.event;
        }

        protected _onSettingsDeletionRequested = new EventDispatcher<AnyResponse, null>();
        public get onSettingsDeletionRequested()
        {
            return this._onSettingsDeletionRequested.event;
        }

        protected _onIsEnabledToggleRequested = new EventDispatcher<AnyResponse, boolean>();
        public get onIsEnabledToggleRequested()
        {
            return this._onIsEnabledToggleRequested.event;
        }

        protected sendMessageToSelectedTab<TResult>(msg: MidnightLizard.Settings.SettingsRequestMessage)
        {
            return this._chromePromise.tabs.query({ active: true, currentWindow: true })
                .then<TResult>(tabs => 
                this._chromePromise.tabs.sendMessage(tabs[0].id!, msg));
        }

        protected sendMessageToAllTabs<TResult>(msg: MidnightLizard.Settings.SettingsRequestMessage)
        {
            return this._chromePromise.tabs.query({}).then<Promise<TResult>[]>(
                tabs => tabs.map<Promise<TResult>>(
                    tab => this._chromePromise.tabs.sendMessage(tab.id!, msg)));
        }

        public deleteSettings()
        {
            return this.sendMessageToSelectedTab<null>(new MidnightLizard.Settings.SettingsDeletionRequestMessage());
        }

        public applySettings(settings: ColorScheme)
        {
            return this.sendMessageToSelectedTab<ColorScheme>(new MidnightLizard.Settings.NewSettingsApplicationRequestMessage(settings));
        }

        public getCurrentSettings()
        {
            return this.sendMessageToSelectedTab<ColorScheme>(new MidnightLizard.Settings.CurrentSettingsRequestMessage());
        }

        public toggleIsEnabled(isEnabled: boolean)
        {
            return this.sendMessageToAllTabs<null>(new MidnightLizard.Settings.IsEnabledToggleRequestMessage(isEnabled));
        }
    }
}