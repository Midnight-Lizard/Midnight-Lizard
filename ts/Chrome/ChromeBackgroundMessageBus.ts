/// <reference path="../DI/-DI.ts" />
/// <reference path="../Events/-Events.ts" />
/// <reference path="../BackgroundPage/IBackgroundMessageBus.ts" />
/// <reference path="../Settings/Messages.ts" />

namespace Chrome
{
    @MidnightLizard.DI.injectable(MidnightLizard.BackgroundPage.IBackgroundMessageBus)
    class ChromeBackgroundMessageBus implements MidnightLizard.BackgroundPage.IBackgroundMessageBus
    {
        private readonly connections = new Set<chrome.runtime.Port>();

        private _onMessage = new MidnightLizard.Events.ArgumentedEventDispatcher<{
            port: chrome.runtime.Port, message: MidnightLizard.Settings.MessageToBackgroundPage
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

        public postMessage(port: chrome.runtime.Port, message: MidnightLizard.Settings.MessageFromBackgroundPage)
        {
            port.postMessage(message);
        }

        public broadcastMessage(message: MidnightLizard.Settings.MessageFromBackgroundPage, portType: string)
        {
            for (const port of this.connections)
            {
                if (port.name === portType)
                {
                    port.postMessage(message);
                }
            }
        }
    }
}