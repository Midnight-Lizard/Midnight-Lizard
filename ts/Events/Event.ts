/// <reference path="./IEventHandler.ts" />
/// <reference path="./EventDispatcher.ts" />

namespace MidnightLizard.Events
{
    export enum EventHandlerPriority
    {
        /** Handlers with this priority will be called first of all */
        High = 1,
        /** Handlers with this priority will be called right after handlers with {High} priority */
        Normal = 2,
        /** Handlers with this priority will be called right after handlers with {Normal} priority */
        Low = 3,
        /** Handlers with this priority will be called after all others whithin {setTimeout} 1ms */
        After = 4
    }

    /**
     * Event
     */
    export class ArgumentedEvent<TArg> {
        constructor(
            private readonly _dispatcher: ArgumentedEventDispatcher<TArg>)
        {
        }

        addListener(handler: IArgumentedEventHandler<TArg>, thisArg: any, priority = EventHandlerPriority.Normal, ...args: any[])
            : (...args: any[]) => any
        {
            return this._dispatcher.addListener(handler, thisArg, priority, ...args);
        }

        removeListener(handler: IArgumentedEventHandler<TArg>, thisArg: any)
        {
            this._dispatcher.removeListener(handler, thisArg);
        }

        removeAllListeners()
        {
            this._dispatcher.removeAllListeners();
        }
    }
    export class ResponsiveEvent<TResponse extends Function, TArg> {
        constructor(
            private readonly dispatcher: ResponsiveEventDispatcher<TResponse, TArg>)
        {
        }

        addListener(handler: IResponsiveEventHandler<TResponse, TArg>, thisArg: any, priority = EventHandlerPriority.Normal, ...args: any[])
        {
            this.dispatcher.addListener(handler, thisArg, priority, ...args);
        }

        removeListener(handler: IResponsiveEventHandler<TResponse, TArg>, thisArg: any)
        {
            this.dispatcher.removeListener(handler, thisArg);
        }

        removeAllListeners()
        {
            this.dispatcher.removeAllListeners();
        }
    }
}