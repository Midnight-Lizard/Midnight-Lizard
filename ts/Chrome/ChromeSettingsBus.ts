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
            chrome.runtime.onMessage.addListener(
                (request: MidnightLizard.Settings.MessageTypes, sender, sendResponse) =>
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

                            case Action.ZoomChanged:
                                this._onZoomChanged.raise(sendResponse, request.zoom);
                                break;

                            default:
                                break;
                        }
                    }
                    else
                    {
                        switch (request.action)
                        {
                            case Action.SettingsApplied:
                                this._onSettingsApplied.raise(sendResponse, request.settings);
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

        protected _onSettingsApplied = new EventDispatcher<AnyResponse, ColorScheme>();
        public get onSettingsApplied()
        {
            return this._onSettingsApplied.event;
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

        protected _onZoomChanged = new EventDispatcher<AnyResponse, number>();
        public get onZoomChanged()
        {
            return this._onZoomChanged.event;
        }

        protected sendMessage<TResult>(msg: MidnightLizard.Settings.MessageTypes)
        {
            return this._chromePromise.runtime.sendMessage<TResult>(msg);
        }

        protected sendMessageToSelectedTab<TResult>(msg: MidnightLizard.Settings.MessageTypes)
        {
            return this._chromePromise.tabs.query({ active: true, currentWindow: true })
                .then(tabs =>
                    this._chromePromise.tabs.sendMessage<TResult>(tabs[0].id!, msg));
        }

        protected sendMessageToAllTabs<TResult>(msg: MidnightLizard.Settings.MessageTypes)
        {
            return this._chromePromise.tabs.query({}).then(tabs => tabs.map(
                tab => this._chromePromise.tabs.sendMessage<TResult>(tab.id!, msg)));
        }

        protected sendMessageToTab<TResult>(tabId: number, msg: MidnightLizard.Settings.MessageTypes)
        {
            return this._chromePromise.tabs.sendMessage<TResult>(tabId, msg);
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

        public setTabZoom(tabId: number, zoom: number)
        {
            return this.sendMessageToTab<null>(tabId, new MidnightLizard.Settings.ZoomChangedMessage(zoom));
        }

        public notifySettingsApplied(settings: ColorScheme)
        {
            return this.sendMessage<ColorScheme>(new MidnightLizard.Settings.SettingsAppliedMessage(settings));
        }
    }
}