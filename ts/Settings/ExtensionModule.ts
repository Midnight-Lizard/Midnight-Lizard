namespace MidnightLizard.Settings
{
    export enum ExtensionModule
    {
        ContentScript = "Content Script",
        BackgroundPage = "Background Page",
        PopupWindow = "Popup Window",
        PageScript = "Page Script"
    }

    export class CurrentExtensionModule
    {
        constructor(readonly name: ExtensionModule)
        {
        }
    }
}