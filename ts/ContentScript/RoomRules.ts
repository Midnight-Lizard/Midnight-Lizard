/// <reference path="../Colors/-Colors.ts" />
/// <reference path="BackgroundImage.ts" />


namespace MidnightLizard.ContentScript
{
    export interface RoomRules
    {
        owner?: any;
        backgroundColor?: Colors.ColorEntry | null | undefined;
        placeholderColor?: Colors.ColorEntry | null | undefined;
        color?: Colors.ColorEntry | null | undefined;
        linkColor?: Colors.ColorEntry | null | undefined;
        visitedColor?: Colors.ColorEntry | null | undefined;
        linkColor$Hover?: Colors.ColorEntry | null | undefined;
        visitedColor$Hover?: Colors.ColorEntry | null | undefined;
        linkColor$Avtive?: Colors.ColorEntry | null | undefined;
        visitedColor$Active?: Colors.ColorEntry | null | undefined;
        borderColor?: Colors.ColorEntry | null | undefined;
        borderTopColor?: Colors.ColorEntry | null | undefined;
        borderRightColor?: Colors.ColorEntry | null | undefined;
        borderBottomColor?: Colors.ColorEntry | null | undefined;
        borderLeftColor?: Colors.ColorEntry | null | undefined;
        textShadow?: { value: string, color: Colors.ColorEntry | null } | null | undefined;
        filter?: { value: string } | null | undefined;
        transitionProperty?: { value: string } | null | undefined;
        display?: string | null | undefined;
        attributes?: Map<string, string>;
        backgroundImages?: Array<Promise<BackgroundImage> | BackgroundImage>;
        hasBackgroundImageSet?: boolean;
        hasBackgroundImagePromises?: boolean;
    }
}