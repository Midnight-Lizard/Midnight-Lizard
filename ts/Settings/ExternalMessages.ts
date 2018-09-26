/// <reference path="./Public/PublicScheme.ts" />

namespace MidnightLizard.Settings
{
    export type IncommingExternalMessage = InstallPublicSchemeCommand | UninstallPublicSchemeCommand;
    export type OutgoingExternalMessage = PublicSchemesChanged | ErrorMessage;

    export enum ExternalMessageType
    {
        InstallPublicScheme = "InstallPublicScheme",
        PublicSchemesChanged = "PublicSchemesChanged",
        UninstallPublicScheme = "UninstallPublicScheme",
        ErrorMessage = "ErrorMessage"
    }

    export class InstallPublicSchemeCommand
    {
        type: ExternalMessageType.InstallPublicScheme = ExternalMessageType.InstallPublicScheme;
        constructor(readonly publicScheme: Readonly<Public.PublicScheme>) { }
    }

    export class UninstallPublicSchemeCommand
    {
        type: ExternalMessageType.UninstallPublicScheme = ExternalMessageType.UninstallPublicScheme;
        constructor(readonly publicSchemeId: Public.PublicSchemeId) { }
    }

    export class PublicSchemesChanged
    {
        type: ExternalMessageType.PublicSchemesChanged = ExternalMessageType.PublicSchemesChanged;
        constructor(readonly publicSchemeIds: Readonly<Public.PublicSchemeId[]>) { }
    }

    export class ErrorMessage
    {
        type: ExternalMessageType.ErrorMessage = ExternalMessageType.ErrorMessage;
        constructor(
            readonly errorMessage: string,
            readonly details: any) { }
    }
}