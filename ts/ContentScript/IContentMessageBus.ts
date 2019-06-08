import { ArgumentedEvent } from "../Events/Event";
import { LocalMessageToContent, LocalMessageFromContent } from "../Settings/Messages";

export abstract class IContentMessageBus
{
    abstract get onMessage(): ArgumentedEvent<LocalMessageToContent>;

    abstract postMessage(message: LocalMessageFromContent): void;
}