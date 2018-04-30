/// <reference path="../DI/-DI.ts" />
/// <reference path="../Typings/MidnightLizard.d.ts" />
/// <reference path="../Settings/-Settings.ts" />
/// <reference path="../Settings/ExtensionModule.ts" />
/// <reference path="-Popup.ts" />

namespace MidnightLizard.Popup
{
    DI.Container.register(Document, class { constructor() { return document } });
    DI.Container.register(Settings.CurrentExtensionModule, class
    {
        constructor()
        {
            return new Settings.CurrentExtensionModule(
                Settings.ExtensionModule.PopupWindow);
        }
    });
    DI.Container.resolve(IPopupManager);
}