/// <reference path="../DI/-DI.ts" />
/// <reference path="CommandProcessor.ts" />
/// <reference path="IZoomService.ts" />
/// <reference path="IUninstallUrlSetter.ts" />

namespace MidnightLizard.BackgroundPage
{
    DI.Container.register(Document, class { constructor() { return document } });
    DI.Container.resolve(ICommandProcessor);
    DI.Container.resolve(IZoomService);
    DI.Container.resolve(IUninstallUrlSetter);
}