/// <reference path="../Colors/-Colors.ts" />
/// <reference path="BackgroundImage.ts" />


namespace MidnightLizard.ContentScript
{
    export class RoomRules
    {
        owner: any;
        backgroundColor: Colors.ColorEntry | null | undefined;
        color: Colors.ColorEntry | null | undefined;
        visitedColor: Colors.ColorEntry | null | undefined;
        color$Hover: Colors.ColorEntry | null | undefined;
        visitedColor$Hover: Colors.ColorEntry | null | undefined;
        color$Avtive: Colors.ColorEntry | null | undefined;
        visitedColor$Active: Colors.ColorEntry | null | undefined;
        borderColor: Colors.ColorEntry | null | undefined;
        borderTopColor: Colors.ColorEntry | null | undefined;
        borderRightColor: Colors.ColorEntry | null | undefined;
        borderBottomColor: Colors.ColorEntry | null | undefined;
        borderLeftColor: Colors.ColorEntry | null | undefined;
        textShadow: { value: string, color: Colors.ColorEntry | null } | null | undefined;
        filter: { value: string } | null | undefined;
        keepFilter: boolean | undefined;
        transitionDuration: { value: string } | null | undefined;
        display: string | null | undefined;
        attributes?: Map<string, string>;
        backgroundImageKeys: any;
        backgroundImages?: Array<Promise<BackgroundImage> | BackgroundImage>;
        hasBackgroundImagePromises: boolean = false;
    }
}