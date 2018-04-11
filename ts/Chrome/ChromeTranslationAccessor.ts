/// <reference path="../DI/-DI.ts" />
/// <reference path="../i18n/ITranslationAccessor.ts" />

namespace Chrome
{
    @MidnightLizard.DI.injectable(MidnightLizard.i18n.ITranslationAccessor)
    class ChromeTranslationAccessor implements MidnightLizard.i18n.ITranslationAccessor
    {
        constructor()
        {
        }

        public getMessage(messageKey: string, ...substitutions: string[]): string
        {
            return chrome.i18n.getMessage(messageKey, substitutions);
        }
    }
}