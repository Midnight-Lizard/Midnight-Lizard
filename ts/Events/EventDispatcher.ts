/// <reference path="./IEventHandler.ts" />
/// <reference path="./Event.ts" />
/// <reference path="../Utils/-Utils.ts" />

namespace MidnightLizard.Events
{
    export class ArgumentedEventDispatcher<TArg>
    {
        protected readonly _handlers = new Map<
            /**/ EventHandlerPriority, // handler priority
            /**/ Map<any, // context = thisArg
            /**/ Map<
            /**/    IArgumentedEventHandler<TArg>, // original handler
            /**/    IArgumentedEventHandler<TArg> // bound handler
            >>>();
        public readonly event: ArgumentedEvent<TArg>;

        constructor()
        {
            this.event = new ArgumentedEvent<TArg>(this);
        }

        public addListener(handler: IAEH<TArg>, thisArg: any, priority = EventHandlerPriority.Normal, ...args: any[])
            : (...args: any[]) => any
        {
            this.removeListener(handler, thisArg);
            let handlersInPriority = this._handlers.get(priority);
            if (handlersInPriority === undefined)
            {
                handlersInPriority = new Map<IAEH<TArg>, Map<any, IAEH<TArg>>>()
                this._handlers.set(priority, handlersInPriority);
            }
            let handlersInContext = handlersInPriority.get(thisArg);
            if (handlersInContext === undefined)
            {
                handlersInContext = new Map<any, IAEH<TArg>>();
                handlersInPriority.set(thisArg, handlersInContext);
            }
            let boundHandler: IAEH<TArg> = thisArg || args.length > 0 ? handler.bind(thisArg, ...args) : handler;
            handlersInContext.set(handler, boundHandler);
            return boundHandler;
        }

        public removeListener(handler: IAEH<TArg>, thisArg: any)
        {
            this._handlers.forEach((handlersInPriority, priority) =>
            {
                let handlersInContext = handlersInPriority.get(thisArg);
                if (handlersInContext !== undefined)
                {
                    handlersInContext.delete(handler);
                    if (handlersInContext.size === 0)
                    {
                        handlersInPriority.delete(thisArg);
                        if (handlersInPriority.size === 0)
                        {
                            this._handlers.delete(priority);
                        }
                    }
                }
            });
        }

        public removeAllListeners()
        {
            this._handlers.clear();
        }

        public raise(eventArgs?: TArg)
        {
            let keys = new Set(this._handlers.keys());
            Util.getEnumValues<EventHandlerPriority>(EventHandlerPriority)
                .filter(priority => keys.has(priority))
                .map(priority => { return { priority: priority, contexts: this._handlers.get(priority) ! } })
                .forEach(x => x.priority == EventHandlerPriority.After
                    ? setTimeout(([ctxt, ea, $this]: [AHIP<TArg>, TArg, AED<TArg>]) =>
                        $this.executeHandler(ctxt, ea), 1, x.contexts, eventArgs, this)
                    : this.executeHandler(x.contexts, eventArgs));
        }

        protected executeHandler(contexts: AHIP<TArg>, eventArgs?: TArg)
        {
            contexts.forEach(contexts => contexts.forEach(boundHandler => boundHandler(eventArgs)));
        }
    }

    export class ResponsiveEventDispatcher<TResponse extends Function, TArg> {
        protected readonly _handlers = new Map<
            /**/ EventHandlerPriority, // handler priority
            /**/ Map<any, // context = thisArg
            /**/ Map<
            /**/    IResponsiveEventHandler<TResponse, TArg>, // original handler
            /**/    IResponsiveEventHandler<TResponse, TArg> // bound handler
            >>>();

        readonly event: ResponsiveEvent<TResponse, TArg>;

        constructor()
        {
            this.event = new ResponsiveEvent<TResponse, TArg>(this);
        }

        public addListener(handler: IREH<TResponse, TArg>, thisArg: any, priority = EventHandlerPriority.Normal, ...args: any[])
        {
            this.removeListener(handler, thisArg);
            let handlersInPriority = this._handlers.get(priority);
            if (handlersInPriority === undefined)
            {
                handlersInPriority = new Map<IREH<TResponse, TArg>, Map<any, IREH<TResponse, TArg>>>()
                this._handlers.set(priority, handlersInPriority);
            }
            let handlersInContext = handlersInPriority.get(thisArg);
            if (handlersInContext === undefined)
            {
                handlersInContext = new Map<any, IREH<TResponse, TArg>>();
                handlersInPriority.set(thisArg, handlersInContext);
            }
            let boundHandler: IREH<TResponse, TArg> = thisArg || args.length > 0 ? handler.bind(thisArg, ...args) : handler;
            handlersInContext.set(handler, boundHandler);
            return boundHandler;
        }

        public removeListener(handler: IREH<TResponse, TArg>, thisArg: any)
        {
            this._handlers.forEach((handlersInPriority, priority) =>
            {
                let handlersInContext = handlersInPriority.get(thisArg);
                if (handlersInContext !== undefined)
                {
                    handlersInContext.delete(handler);
                    if (handlersInContext.size === 0)
                    {
                        handlersInPriority.delete(thisArg);
                        if (handlersInPriority.size === 0)
                        {
                            this._handlers.delete(priority);
                        }
                    }
                }
            });
        }

        public removeAllListeners()
        {
            this._handlers.clear();
        }

        public raise(response: TResponse, eventArgs?: TArg)
        {
            let keys = new Set(this._handlers.keys());
            Util.getEnumValues<EventHandlerPriority>(EventHandlerPriority)
                .filter(priority => keys.has(priority))
                .map(priority => { return { priority: priority, contexts: this._handlers.get(priority) ! } })
                .forEach(x => x.priority == EventHandlerPriority.After
                    ? setTimeout(([ctxt, resp, ea, $this]: [RHIP<TResponse, TArg>, TResponse, TArg, RED<TResponse, TArg>]) =>
                        $this.executeHandler(ctxt, resp, ea), 1, x.contexts, response, eventArgs, this)
                    : this.executeHandler(x.contexts, response, eventArgs));
        }

        protected executeHandler(contexts: RHIP<TResponse, TArg>, response: TResponse, eventArgs?: TArg)
        {
            contexts.forEach(context => context.forEach(boundHandler => boundHandler(response, eventArgs)));
        }
    }

    type IAEH<TArgs> = IArgumentedEventHandler<TArgs>
    type IREH<TResponse extends Function, TArgs> = IResponsiveEventHandler<TResponse, TArgs>
    type AHIP<TArgs> = Map<IAEH<TArgs>, Map<any, IAEH<TArgs>>>;
    type RHIP<TResponse extends Function, TArgs> = Map<IREH<TResponse, TArgs>, Map<any, IREH<TResponse, TArgs>>>;
    type AED<TArgs> = ArgumentedEventDispatcher<TArgs>;
    type RED<TResponse extends Function, TArgs> = ResponsiveEventDispatcher<TResponse, TArgs>;
}