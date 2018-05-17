/// <reference path="../DI/-DI.ts" />
/// <reference path="../Events/-Events.ts" />
/// <reference path="../BackgroundPage/ICommandListener.ts" />
/// <reference path="../Settings/IApplicationSettings.ts" />

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

        constructor(app: MidnightLizard.Settings.IApplicationSettings)
        {
            if (app.isDesktop)
            {
                chrome.commands.onCommand.addListener(command =>
                {
                    this._onCommand.raise(command);
                });
            }
        }
    }
}