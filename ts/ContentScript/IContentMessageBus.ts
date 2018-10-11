/// <reference path="../Events/-Events.ts" />
/// <reference path="../Settings/Messages.ts" />

namespace MidnightLizard.ContentScript
{
    export abstract class IContentMessageBus
    {
        abstract get onMessage(): Events.ArgumentedEvent<Settings.LocalMessageToContent>;

        abstract postMessage(message: MidnightLizard.Settings.LocalMessageFromContent): void;
    }
}