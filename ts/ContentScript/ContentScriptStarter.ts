import { Container } from "../Utils/DI";
import { CurrentExtensionModule, ExtensionModule } from "../Settings/ExtensionModule";
import { ISettingsManager } from "./SettingsManager";
import { IDocumentProcessor } from "./DocumentProcessor";

Container.register(Document, class { constructor() { return document } });
Container.register(CurrentExtensionModule, class
{
    constructor()
    {
        return new CurrentExtensionModule(
            ExtensionModule.ContentScript);
    }
});

export class ContentScriptStarter
{
    constructor(...registerations: any[])
    {
        Container.resolve(ISettingsManager);
        Container.resolve(IDocumentProcessor);
    }
}