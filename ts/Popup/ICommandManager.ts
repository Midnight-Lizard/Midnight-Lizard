namespace MidnightLizard.Popup
{
    export abstract class ICommandManager
    {
        abstract getCommands(): Promise<{ name?: string, description?: string, shortcut?: string}[]>;
    }
}