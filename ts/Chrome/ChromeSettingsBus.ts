/// <reference path="./ChromePromise.ts" />
/// <reference path="../DI/-DI.ts" />
/// <reference path="../Settings/-Settings.ts" />
/// <reference path="../Events/-Events.ts" />
/// <reference path="../Settings/ExtensionModule.ts" />

namespace Chrome
{
    type ColorScheme = MidnightLizard.Settings.ColorScheme;
    type ColorSchemeResponse = (settings: ColorScheme) => void;
    type AnyResponse = (args: any) => void;
    const Action = MidnightLizard.Settings.SettingsMessageAction;
    const EventDispatcher = MidnightLizard.Events.ResponsiveEventDispatcher;
    /** Chrome Settings Communication Bus */
    @MidnightLizard.DI.injectable(MidnightLizard.Settings.ISettingsBus)
    class ChromeSettingsBus implements MidnightLizard.Settings.ISettingsBus
    {
        constructor(
            protected readonly _app: MidnightLizard.Settings.IApplicationSettings,
            protected readonly _chromePromise: Chrome.ChromePromise,
            protected readonly _document: Document,
            protected readonly _module: MidnightLizard.Settings.CurrentExtensionModule)
        {
            chrome.runtime.onMessage.addListener(
                (request: MidnightLizard.Settings.MessageTypes, sender, sendResponse) =>
                {
                    if (this._app.isDebug)
                    {
                        request.receiver = _module.name + " - " +
                            (window.top === window.self ? "Main frame" : "Child frame");
                        console.log(request);
                    }
                    // requests from popup window or background page
                    if (request.sender === MidnightLizard.Settings.ExtensionModule.PopupWindow ||
                        request.sender === MidnightLizard.Settings.ExtensionModule.BackgroundPage)
                    {
                        // actions only for content scripts in top frame
                        if (window.top === window.self)
                        {
                            switch (request.action)
                            {
                                case Action.GetCurrentSettings:
                                    this._onCurrentSettingsRequested.raise(sendResponse);
                                    break;

                                case Action.DeleteSettings:
                                    this._onSettingsDeletionRequested.raise(sendResponse);
                                    break;

                                default:
                                    break;
                            }
                        }
                        // actions for content scripts in all frames
                        switch (request.action)
                        {
                            case Action.ApplyNewSettings:
                                this._onNewSettingsApplicationRequested.raise(sendResponse, request.settings);
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
                    // requests from content scripts to background page
                    else if (request.sender === MidnightLizard.Settings.ExtensionModule.ContentScript &&
                        this._module.name === MidnightLizard.Settings.ExtensionModule.BackgroundPage)
                    {
                        switch (request.action)
                        {
                            case Action.SettingsApplied:
                                this._onSettingsApplied.raise(sendResponse, request.settings);
                                sendResponse(undefined);
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
            return this.sendMessageToSelectedTab<null>(
                new MidnightLizard.Settings.SettingsDeletionRequestMessage(
                    this._module.name));
        }

        public applySettings(settings: ColorScheme)
        {
            return this.sendMessageToSelectedTab<ColorScheme>(
                new MidnightLizard.Settings.NewSettingsApplicationRequestMessage(
                    this._module.name, settings));
        }

        public getCurrentSettings()
        {
            return this.sendMessageToSelectedTab<ColorScheme>(
                new MidnightLizard.Settings.CurrentSettingsRequestMessage(
                    this._module.name));
        }

        public toggleIsEnabled(isEnabled: boolean)
        {
            const msg = new MidnightLizard.Settings.IsEnabledToggleRequestMessage(
                this._module.name, isEnabled);
            return this.sendMessage(msg)
                .catch(ex => this._app.isDebug ? console.error(ex.message || ex) : null)
                .then(() => this.sendMessageToAllTabs<null>(msg));
        }

        public setTabZoom(tabId: number, zoom: number)
        {
            return this.sendMessageToTab<null>(tabId,
                new MidnightLizard.Settings.ZoomChangedMessage(
                    this._module.name, zoom));
        }

        public notifySettingsApplied(settings: ColorScheme)
        {
            if (window.top === window.self)
            {
                return this.sendMessage<ColorScheme>(
                    new MidnightLizard.Settings.SettingsAppliedMessage(
                        this._module.name, settings));
            }
            return Promise.resolve(settings);
        }
    }
}