import { ArgumentedEvent } from "../Events/Event";
import { MessageFromBackgroundPage, MessageToBackgroundPage } from "../Settings/Messages";

export abstract class IBackgroundMessageBus
{
    abstract get onMessage(): ArgumentedEvent<{ port: any, message: MessageToBackgroundPage }>;
    abstract get onConnected(): ArgumentedEvent<any>;

    abstract postMessage(port: chrome.runtime.Port, message: MessageFromBackgroundPage): void;
    abstract broadcastMessage(message: MessageFromBackgroundPage, portType: string): void;
}