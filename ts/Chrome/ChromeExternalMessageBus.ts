/// <reference path="../DI/-DI.ts" />
/// <reference path="../Events/-Events.ts" />
/// <reference path="../BackgroundPage/IExternalMessageBus.ts" />
/// <reference path="../Settings/ExternalMessages.ts" />

namespace Chrome
{
    @MidnightLizard.DI.injectable(MidnightLizard.BackgroundPage.IExternalMessageBus)
    class ChromeExternalMessageBus implements MidnightLizard.BackgroundPage.IExternalMessageBus
    {
        private readonly connections = new Set<chrome.runtime.Port>();

        private _onMessage = new MidnightLizard.Events.ArgumentedEventDispatcher<{
            port: chrome.runtime.Port, message: MidnightLizard.Settings.IncommingExternalMessage
        }>();
        public get onMessage()
        {
            return this._onMessage.event;
        }

        private _onConnected = new MidnightLizard.Events.ArgumentedEventDispatcher<any>();
        public get onConnected()
        {
            return this._onConnected.event;
        }

        constructor(app: MidnightLizard.Settings.IApplicationSettings)
        {
            const handler = (port: chrome.runtime.Port) =>
            {
                if (!this.connections.has(port))
                {
                    this.connections.add(port);
                    port.onDisconnect.addListener(closedPort => this.connections.delete(closedPort));
                    port.onMessage.addListener(message => this._onMessage.raise({ port, message }));
                    this._onConnected.raise(port);
                }
            };
            chrome.runtime.onConnect.addListener(handler);
        }

        public sendCurrentPublicSchemes(port: chrome.runtime.Port, publicSchemeIds: MidnightLizard.Settings.Public.PublicSchemeId[])
        {
            port.postMessage(new MidnightLizard.Settings.PublicSchemesChanged(publicSchemeIds));
        }

        public notifyPublicSchemesChanged(publicSchemeIds: MidnightLizard.Settings.Public.PublicSchemeId[])
        {
            const message = new MidnightLizard.Settings.PublicSchemesChanged(publicSchemeIds);
            for (const port of this.connections)
            {
                port.postMessage(message);
            }
        }

        notifyError(port: chrome.runtime.Port, errorMessage: string, details: any): void
        {
            port.postMessage(new MidnightLizard.Settings.ErrorMessage(errorMessage, details));
        }
    }
}