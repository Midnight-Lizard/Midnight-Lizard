/// <reference path="../DI/-DI.ts" />
/// <reference path="../Typings/MidnightLizard.d.ts" />
/// <reference path="../Settings/-Settings.ts" />
/// <reference path="-Popup.ts" />

namespace MidnightLizard.Popup
{
    DI.Container.register(Document, class { constructor() { return document } });
    DI.Container.resolve(IPopupManager);
}