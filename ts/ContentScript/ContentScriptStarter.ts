/// <reference path="../DI/-DI.ts" />
/// <reference path="../Typings/MidnightLizard.d.ts" />
/// <reference path="../ContentScript/-ContentScript.ts" />

namespace MidnightLizard.ContentScript
{
    DI.Container.register(Document, class { constructor() { return document } });
    DI.Container.resolve(ISettingsManager);
    DI.Container.resolve(IDocumentProcessor);
}