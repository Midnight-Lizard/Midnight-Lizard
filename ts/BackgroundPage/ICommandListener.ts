import { ArgumentedEvent } from "../Events/Event";

export abstract class ICommandListener
{
    abstract get onCommand(): ArgumentedEvent<string>;
}