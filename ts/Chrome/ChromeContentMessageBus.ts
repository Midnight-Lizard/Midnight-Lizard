/// <reference path="../DI/-DI.ts" />
/// <reference path="../Events/-Events.ts" />
/// <reference path="../ContentScript/IContentMessageBus.ts" />
/// <reference path="../Settings/Messages.ts" />

namespace Chrome
{
    @MidnightLizard.DI.injectable(MidnightLizard.ContentScript.IContentMessageBus)
    class ChromeContentMessageBus implements MidnightLizard.ContentScript.IContentMessageBus
    {
        private connection?: chrome.runtime.Port;

        private _onMessage = new MidnightLizard.Events.ArgumentedEventDispatcher<
            MidnightLizard.Settings.LocalMessageToContent>();
        public get onMessage()
        {
            return this._onMessage.event;
        }

        constructor(app: MidnightLizard.Settings.IApplicationSettings)
        {
            this.openConnection();
        }

        public postMessage(message: MidnightLizard.Settings.LocalMessageFromContent)
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
                this.connection.onDisconnect.addListener(this.openConnection);
            }
            return this.connection;
        }
    }
}