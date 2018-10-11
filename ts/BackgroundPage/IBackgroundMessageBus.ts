/// <reference path="../Events/-Events.ts" />
/// <reference path="../Settings/Messages.ts" />

namespace MidnightLizard.BackgroundPage
{
    export abstract class IBackgroundMessageBus
    {
        abstract get onMessage(): Events.ArgumentedEvent<{ port: any, message: Settings.MessageToBackgroundPage }>;
        abstract get onConnected(): Events.ArgumentedEvent<any>;

        abstract postMessage(port: chrome.runtime.Port, message: MidnightLizard.Settings.MessageFromBackgroundPage): void;
        abstract broadcastMessage(message: MidnightLizard.Settings.MessageFromBackgroundPage, portType: string): void;
    }
}