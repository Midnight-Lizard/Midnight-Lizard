/// <reference path="../DI/-DI.ts" />
/// <reference path="../Events/-Events.ts" />
/// <reference path="../BackgroundPage/ICommandListener.ts" />

namespace Chrome
{
    @MidnightLizard.DI.injectable(MidnightLizard.BackgroundPage.ICommandListener)
    class ChromeCommandListener implements MidnightLizard.BackgroundPage.ICommandListener
    {
        protected _onCommand = new MidnightLizard.Events.ArgumentedEventDispatcher<string>();
        public get onCommand()
        {
            return this._onCommand.event;
        }

        constructor()
        {
            chrome.commands.onCommand.addListener(command =>
            {
                this._onCommand.raise(command);
            });
        }
    }
}