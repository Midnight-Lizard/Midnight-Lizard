import { injectable } from "../Utils/DI";
import { IBackgroundMessageBus } from "../BackgroundPage/IBackgroundMessageBus";
import { ArgumentedEventDispatcher } from "../Events/EventDispatcher";
import { MessageToBackgroundPage, MessageFromBackgroundPage } from "../Settings/Messages";
import { IApplicationSettings } from "../Settings/IApplicationSettings";

@injectable(IBackgroundMessageBus)
export class ChromeBackgroundMessageBus implements IBackgroundMessageBus
{
    private readonly connections = new Set<chrome.runtime.Port>();

    private _onMessage = new ArgumentedEventDispatcher<{
        port: chrome.runtime.Port, message: MessageToBackgroundPage
    }>();
    public get onMessage()
    {
        return this._onMessage.event;
    }

    private _onConnected = new ArgumentedEventDispatcher<any>();
    public get onConnected()
    {
        return this._onConnected.event;
    }

    constructor(private readonly _app: IApplicationSettings)
    {
        const handler = (port: chrome.runtime.Port) =>
        {
            if (!this.connections.has(port))
            {
                this.connections.add(port);
                port.onDisconnect.addListener(closedPort => this.connections.delete(closedPort));
                port.onMessage.addListener(message =>
                {
                    if (_app.isDebug)
                    {
                        console.log(message);
                    }
                    this._onMessage.raise({ port, message })
                });
                this._onConnected.raise(port);
            }
        };
        chrome.runtime.onConnect.addListener(handler);
    }

    public postMessage(port: chrome.runtime.Port, message: MessageFromBackgroundPage)
    {
        if (this._app.isDebug)
        {
            console.log(message);
        }
        port.postMessage(message);
    }

    public broadcastMessage(message: MessageFromBackgroundPage, portType: string)
    {
        if (this._app.isDebug)
        {
            console.log(message);
        }
        for (const port of this.connections)
        {
            if (port.name === portType)
            {
                port.postMessage(message);
            }
        }
    }
}