import { injectable } from "../Utils/DI";
import { ICommandListener } from "../BackgroundPage/ICommandListener";
import { ArgumentedEventDispatcher } from "../Events/EventDispatcher";
import { IApplicationSettings } from "../Settings/IApplicationSettings";

@injectable(ICommandListener)
export class ChromeCommandListener implements ICommandListener
{
    protected _onCommand = new ArgumentedEventDispatcher<string>();
    public get onCommand()
    {
        return this._onCommand.event;
    }

    constructor(app: IApplicationSettings)
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