import { PublicScheme, PublicSchemeId } from "./Public/PublicScheme";
import { BackgroundImageCache } from "../ContentScript/BackgroundImage";

export type ExternalMessageFromPortal =
    InstallPublicSchemeCommand | UninstallPublicSchemeCommand |
    ApplyPublicSchemeCommand | SetPublicSchemeAsDefaultCommand |
    GetInstalledPublicSchemes;

export type LocalMessageFromContent = FetchImage | FetchExternalCss;

export type WindowMessageFromContent = never;

export type WindowMessageToContent = PageScriptLoaded;

export type MessageToBackgroundPage = ExternalMessageFromPortal | LocalMessageFromContent

export type ExternalMessageToPortal = PublicSchemesChanged | ErrorMessage;

export type LocalMessageToContent = ImageFetchFailed | ImageFetchCompleted | ErrorMessage
    | ExternalCssFetchCompleted | ExternalCssFetchFailed;

export type MessageFromBackgroundPage = ExternalMessageToPortal | LocalMessageToContent;

export enum MessageType
{
    GetInstalledPublicSchemes = "GetInstalledPublicSchemes",
    InstallPublicScheme = "InstallPublicScheme",
    PublicSchemesChanged = "PublicSchemesChanged",
    UninstallPublicScheme = "UninstallPublicScheme",
    ApplyPublicScheme = "ApplyPublicScheme",
    SetPublicSchemeAsDefault = "SetPublicSchemeAsDefault",
    ErrorMessage = "ErrorMessage",
    FetchImage = "FetchImage",
    ImageFetchFailed = "ImageFetchFailed",
    ImageFetchCompleted = "ImageFetchCompleted",
    FetchExternalCss = "FetchExternalCss",
    PageScriptLoaded = "PageScriptLoaded",
    ExternalCssFetchCompleted = "ExternalCssFetchCompleted",
    ExternalCssFetchFailed = "ExternalCssFetchFailed"
}

export class GetInstalledPublicSchemes
{
    readonly type: MessageType.GetInstalledPublicSchemes = MessageType.GetInstalledPublicSchemes;
    constructor() { }
}

export class InstallPublicSchemeCommand
{
    readonly type: MessageType.InstallPublicScheme = MessageType.InstallPublicScheme;
    constructor(readonly publicScheme: Readonly<PublicScheme>) { }
}

export class UninstallPublicSchemeCommand
{
    readonly type: MessageType.UninstallPublicScheme = MessageType.UninstallPublicScheme;
    constructor(readonly publicSchemeId: PublicSchemeId) { }
}

export class ApplyPublicSchemeCommand
{
    readonly type = MessageType.ApplyPublicScheme;
    constructor(readonly publicSchemeId: PublicSchemeId, readonly hostName: string) { }
}

export class SetPublicSchemeAsDefaultCommand
{
    readonly type = MessageType.SetPublicSchemeAsDefault;
    constructor(readonly publicSchemeId: PublicSchemeId) { }
}

export class PublicSchemesChanged
{
    readonly type = MessageType.PublicSchemesChanged;
    constructor(readonly publicSchemeIds: Readonly<PublicSchemeId[]>) { }
}

export class ErrorMessage
{
    readonly type = MessageType.ErrorMessage;
    constructor(
        readonly errorMessage: string,
        readonly details: any) { }
}

export class FetchImage
{
    readonly type = MessageType.FetchImage;
    constructor(readonly url: string, readonly maxSize: number) { }
}

export class FetchExternalCss
{
    readonly type = MessageType.FetchExternalCss;
    constructor(readonly url: string) { }
}

export class ExternalCssFetchCompleted
{
    readonly type = MessageType.ExternalCssFetchCompleted;
    constructor(readonly url: string, readonly cssText: string) { }
}

export class ExternalCssFetchFailed
{
    readonly type = MessageType.ExternalCssFetchFailed;
    constructor(readonly url: string, readonly error: string) { }
}

export class PageScriptLoaded
{
    readonly type = MessageType.PageScriptLoaded;
    constructor() { }
}

export class ImageFetchCompleted
{
    readonly type = MessageType.ImageFetchCompleted;
    constructor(readonly url: string, readonly img: BackgroundImageCache) { }
}

export class ImageFetchFailed
{
    readonly type = MessageType.ImageFetchFailed;
    constructor(readonly url: string, readonly error: string) { }
}