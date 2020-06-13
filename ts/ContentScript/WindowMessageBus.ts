import { WindowMessageFromContent, MessageType } from "../Settings/Messages";
import { injectable } from "../Utils/DI";

/** Communication between Content Script and Page Script */
export abstract class IWindowMessageBus
{
    abstract postMessage(message: WindowMessageFromContent): void;
}

@injectable(IWindowMessageBus)
class WindowMessageBus implements IWindowMessageBus
{
    private _pageScriptLoaded = false;
    private readonly _messageBuffer = new Set<WindowMessageFromContent>();

    constructor(private readonly rootDoc: Document)
    {
        rootDoc.documentElement.addEventListener(MessageType.PageScriptLoaded, (e) =>
        {
            this._pageScriptLoaded = true;
            this._messageBuffer.forEach(this.postMessage.bind(this));
            this._messageBuffer.clear();
        });
    }

    public postMessage(message: WindowMessageFromContent)
    {
        if (this._pageScriptLoaded)
        {
            const { type: messageType, ...msg } = message as any;
            const event = new CustomEvent(messageType, { detail: JSON.stringify(msg) });
            this.rootDoc.documentElement.dispatchEvent(event);
        }
        else
        {
            this._messageBuffer.add(message);
        }
    }
}