/// <reference path="../DI/-DI.ts" />
/// <reference path="../Events/-Events.ts" />
/// <reference path="../Settings/Messages.ts" />

namespace MidnightLizard.ContentScript
{
    /** Communication between Content Script and Page Script */
    export abstract class IWindowMessageBus
    {
        abstract postMessage(message: MidnightLizard.Settings.WindowMessageFromContent): void;
    }

    @MidnightLizard.DI.injectable(MidnightLizard.ContentScript.IWindowMessageBus)
    class WindowMessageBus implements MidnightLizard.ContentScript.IWindowMessageBus
    {
        private _pageScriptLoaded = false;
        private readonly _messageBuffer = new Set<MidnightLizard.Settings.WindowMessageFromContent>();

        constructor(private readonly rootDoc: Document)
        {
            rootDoc.documentElement.addEventListener(Settings.MessageType.PageScriptLoaded, (e) =>
            {
                this._pageScriptLoaded = true;
                this._messageBuffer.forEach(this.postMessage.bind(this));
                this._messageBuffer.clear();
            });
        }

        public postMessage(message: MidnightLizard.Settings.WindowMessageFromContent)
        {
            if (this._pageScriptLoaded)
            {
                const { type: messageType, ...msg } = message;
                const event = new CustomEvent(messageType, { detail: JSON.stringify(msg) });
                this.rootDoc.documentElement.dispatchEvent(event);
            }
            else
            {
                this._messageBuffer.add(message);
            }
        }
    }
}