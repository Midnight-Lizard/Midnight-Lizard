/// <reference path="../DI/-DI.ts" />
/// <reference path="../Typings/MidnightLizard.d.ts" />
/// <reference path="./CommandProcessor.ts" />
/// <reference path="./IZoomService.ts" />
/// <reference path="./IUninstallUrlSetter.ts" />
/// <reference path="./IThemeProcessor.ts" />
/// <reference path="../Settings/ExtensionModule.ts" />
/// <reference path="./IApplicationInstaller.ts" />

namespace MidnightLizard.BackgroundPage
{
    DI.Container.register(Document, class { constructor() { return document } });
    DI.Container.register(Settings.CurrentExtensionModule, class
    {
        constructor()
        {
            return new Settings.CurrentExtensionModule(
                Settings.ExtensionModule.BackgroundPage);
        }
    });
    DI.Container.resolve(ICommandProcessor);
    DI.Container.resolve(IZoomService);
    DI.Container.resolve(IUninstallUrlSetter);
    DI.Container.resolve(IThemeProcessor);
    DI.Container.resolve(IApplicationInstaller);
}