import { injectable } from "../Utils/DI";
import { ICommandManager } from "../Popup/ICommandManager";
import { ChromePromise } from "./ChromePromise";

@injectable(ICommandManager)
export class ChromeCommandManager implements ICommandManager
{
    constructor(protected readonly _chromePromise: ChromePromise) { }

    getCommands(): Promise<{ name?: string, description?: string, shortcut?: string }[]>
    {
        return this._chromePromise.commands.getAll();
    }
}