import { Container } from "../Utils/DI";
import { CurrentExtensionModule, ExtensionModule } from "../Settings/ExtensionModule";
import { IPopupManager } from "./PopupManager";

Container.register(Document, class { constructor() { return document } });
Container.register(CurrentExtensionModule, class
{
    constructor()
    {
        return new CurrentExtensionModule(
            ExtensionModule.PopupWindow);
    }
});
export class PopupStarter
{
    constructor(...registerations: any[])
    {
        Container.resolve(IPopupManager);
    }
}