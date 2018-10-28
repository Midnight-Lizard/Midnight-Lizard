/// <reference path="./Public/PublicScheme.ts" />
/// <reference path="../ContentScript/BackgroundImage.ts" />

namespace MidnightLizard.Settings
{
    export type ExternalMessageFromPortal = InstallPublicSchemeCommand | UninstallPublicSchemeCommand | GetInstalledPublicSchemes;

    export type LocalMessageFromContent = FetchImage;

    export type WindowMessageFromContent = FetchExternalCss;

    export type WindowMessageToContent = PageScriptLoaded;

    export type MessageToBackgroundPage = ExternalMessageFromPortal | LocalMessageFromContent

    export type ExternalMessageToPortal = PublicSchemesChanged | ErrorMessage;

    export type LocalMessageToContent = ImageFetchFailed | ImageFetchCompleted | ErrorMessage;

    export type MessageFromBackgroundPage = ExternalMessageToPortal | LocalMessageToContent;

    export enum MessageType
    {
        GetInstalledPublicSchemes = "GetInstalledPublicSchemes",
        InstallPublicScheme = "InstallPublicScheme",
        PublicSchemesChanged = "PublicSchemesChanged",
        UninstallPublicScheme = "UninstallPublicScheme",
        ErrorMessage = "ErrorMessage",
        FetchImage = "FetchImage",
        ImageFetchFailed = "ImageFetchFailed",
        ImageFetchCompleted = "ImageFetchCompleted",
        FetchExternalCss = "FetchExternalCss",
        PageScriptLoaded = "PageScriptLoaded",
    }

    export class GetInstalledPublicSchemes
    {
        type: MessageType.GetInstalledPublicSchemes = MessageType.GetInstalledPublicSchemes;
        constructor() { }
    }

    export class InstallPublicSchemeCommand
    {
        type: MessageType.InstallPublicScheme = MessageType.InstallPublicScheme;
        constructor(readonly publicScheme: Readonly<Public.PublicScheme>) { }
    }

    export class UninstallPublicSchemeCommand
    {
        type: MessageType.UninstallPublicScheme = MessageType.UninstallPublicScheme;
        constructor(readonly publicSchemeId: Public.PublicSchemeId) { }
    }

    export class PublicSchemesChanged
    {
        type: MessageType.PublicSchemesChanged = MessageType.PublicSchemesChanged;
        constructor(readonly publicSchemeIds: Readonly<Public.PublicSchemeId[]>) { }
    }

    export class ErrorMessage
    {
        type: MessageType.ErrorMessage = MessageType.ErrorMessage;
        constructor(
            readonly errorMessage: string,
            readonly details: any) { }
    }

    export class FetchImage
    {
        type: MessageType.FetchImage = MessageType.FetchImage;
        constructor(readonly url: string, readonly maxSize: number) { }
    }

    export class FetchExternalCss
    {
        type: MessageType.FetchExternalCss = MessageType.FetchExternalCss;
        constructor(readonly externalCssUrl: string) { }
    }

    export class PageScriptLoaded
    {
        type: MessageType.PageScriptLoaded = MessageType.PageScriptLoaded;
        constructor() { }
    }

    export class ImageFetchCompleted
    {
        type: MessageType.ImageFetchCompleted = MessageType.ImageFetchCompleted;
        constructor(readonly url: string, readonly img: ContentScript.BackgroundImageCache) { }
    }

    export class ImageFetchFailed
    {
        type: MessageType.ImageFetchFailed = MessageType.ImageFetchFailed;
        constructor(readonly url: string, readonly error: string) { }
    }
}