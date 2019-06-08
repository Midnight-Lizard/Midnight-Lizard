import { injectable } from "../Utils/DI";
import { IContentMessageBus } from "../ContentScript/IContentMessageBus";
import { ArgumentedEventDispatcher } from "../Events/EventDispatcher";
import { LocalMessageToContent, LocalMessageFromContent } from "../Settings/Messages";
import { IApplicationSettings } from "../Settings/IApplicationSettings";

@injectable(IContentMessageBus)
export class ChromeContentMessageBus implements IContentMessageBus
{
    private connection?: chrome.runtime.Port;

    private _onMessage = new ArgumentedEventDispatcher<
        LocalMessageToContent>();
    public get onMessage()
    {
        return this._onMessage.event;
    }

    constructor(app: IApplicationSettings)
    {
        this.openConnection();
    }

    public postMessage(message: LocalMessageFromContent)
    {
        this.openConnection().postMessage(message);
    }

    openConnection(port?: any)
    {
        if (!this.connection || port)
        {
            this.connection = chrome.runtime.connect({ name: 'content' });
            this.connection.onMessage.addListener((msg, port) =>
            {
                this._onMessage.raise(msg);
            });
            this.connection.onDisconnect.addListener(this.openConnection.bind(this));
        }
        return this.connection;
    }
}