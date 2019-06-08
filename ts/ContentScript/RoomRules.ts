import { ColorEntry } from "../Colors/ColorEntry";
import { BackgroundImage } from "./BackgroundImage";

export interface RoomRules
{
    owner?: any;
    backgroundColor?: ColorEntry | null | undefined;
    placeholderColor?: ColorEntry | null | undefined;
    color?: ColorEntry | null | undefined;
    linkColor?: ColorEntry | null | undefined;
    visitedColor?: ColorEntry | null | undefined;
    linkColor$Hover?: ColorEntry | null | undefined;
    visitedColor$Hover?: ColorEntry | null | undefined;
    linkColor$Avtive?: ColorEntry | null | undefined;
    visitedColor$Active?: ColorEntry | null | undefined;
    borderColor?: ColorEntry | null | undefined;
    borderTopColor?: ColorEntry | null | undefined;
    borderRightColor?: ColorEntry | null | undefined;
    borderBottomColor?: ColorEntry | null | undefined;
    borderLeftColor?: ColorEntry | null | undefined;
    textShadow?: { value: string, color: ColorEntry | null } | null | undefined;
    filter?: { value: string } | null | undefined;
    transitionProperty?: { value: string } | null | undefined;
    display?: string | null | undefined;
    attributes?: Map<string, string>;
    backgroundImages?: Array<Promise<BackgroundImage> | BackgroundImage>;
    hasBackgroundImageSet?: boolean;
    hasBackgroundImagePromises?: boolean;
}