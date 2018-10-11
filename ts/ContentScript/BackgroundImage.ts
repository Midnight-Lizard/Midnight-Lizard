namespace MidnightLizard.ContentScript
{
    export enum BackgroundImageType
    {
        Image,
        Gradient
    }

    export class BackgroundImage
    {
        constructor(
            readonly size: string,
            readonly data: string,
            readonly type: BackgroundImageType)
        { }
    }

    export interface BackgroundImageCache
    {
        /** data url */
        readonly d: string;
        /** natural image width */
        readonly w: number;
        /** natural image height */
        readonly h:number;

    }
}