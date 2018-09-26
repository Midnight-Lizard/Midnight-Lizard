/// <reference path="../Events/-Events.ts" />
/// <reference path="../Settings/ExternalMessages.ts" />

namespace MidnightLizard.BackgroundPage
{
    export abstract class IExternalMessageBus
    {
        abstract get onMessage(): Events.ArgumentedEvent<{ port: any, message: Settings.IncommingExternalMessage }>;
        abstract get onConnected(): Events.ArgumentedEvent<any>;

        abstract sendCurrentPublicSchemes(port: any, publicSchemeIds: MidnightLizard.Settings.Public.PublicSchemeId[]): void;
        abstract notifyPublicSchemesChanged(publicSchemeIds: MidnightLizard.Settings.Public.PublicSchemeId[]): void;
        abstract notifyError(port: any, errorMessage: string, details: any): void;
    }
}