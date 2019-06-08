import { injectable } from "../Utils/DI";
import { ITranslationAccessor } from "../i18n/ITranslationAccessor";

@injectable(ITranslationAccessor)
export class ChromeTranslationAccessor implements ITranslationAccessor
{
    constructor()
    {
    }

    public getMessage(messageKey: string, ...substitutions: string[]): string
    {
        return chrome.i18n.getMessage(messageKey, substitutions);
    }
}