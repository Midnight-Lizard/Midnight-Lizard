export abstract class ITranslationAccessor
{
    public abstract getMessage(messageKey: string, ...substitutions: string[]): string;
}