/// <reference path="../Events/-Events.ts" />

namespace MidnightLizard.BackgroundPage
{
    export abstract class ICommandListener
    {
        abstract get onCommand(): Events.ArgumentedEvent<string>;
    }
}