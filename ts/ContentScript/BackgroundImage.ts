namespace MidnightLizard.ContentScript
{
    export enum BackgroundImageType
    {
        Image,
        Gradient
    }

    export class BackgroundImage
    {
        constructor(readonly size: string, readonly data: string, readonly type: BackgroundImageType) { }
    }
}