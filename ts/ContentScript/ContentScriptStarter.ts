/// <reference path="../DI/-DI.ts" />
/// <reference path="../Typings/MidnightLizard.d.ts" />
/// <reference path="../ContentScript/-ContentScript.ts" />
/// <reference path="../Settings/ExtensionModule.ts" />

namespace MidnightLizard.ContentScript
{
    DI.Container.register(Document, class { constructor() { return document } });
    DI.Container.register(Settings.CurrentExtensionModule, class
    {
        constructor()
        {
            return new Settings.CurrentExtensionModule(
                Settings.ExtensionModule.ContentScript);
        }
    });
    DI.Container.resolve(ISettingsManager);
    DI.Container.resolve(IDocumentProcessor);
}