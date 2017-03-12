/// <reference path="../DI/-DI.ts" />
/// <reference path="../Popup/ICommandManager.ts" />

namespace Chrome
{
    @MidnightLizard.DI.injectable(MidnightLizard.Popup.ICommandManager)
    class ChromeCommandManager implements MidnightLizard.Popup.ICommandManager
    {
        constructor(protected readonly _chromePromise: Chrome.ChromePromise) { }

        getCommands(): Promise<{ name?: string, description?: string, shortcut?: string }[]>
        {
            return this._chromePromise.commands.getAll();
        }
    }
}