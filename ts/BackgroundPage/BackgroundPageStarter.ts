/// <reference path="../DI/-DI.ts" />
/// <reference path="CommandProcessor.ts" />

namespace MidnightLizard.BackgroundPage
{
    DI.Container.register(Document, class { constructor() { return document } });
    DI.Container.resolve(ICommandProcessor);
}