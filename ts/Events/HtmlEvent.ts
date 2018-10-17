namespace MidnightLizard.Events
{
    type EventMap = DocumentEventMap & HTMLElementEventMap & {
        DOMContentLoaded: never,
        beforeprint: never,
        resize: never,
        unload: never,
        beforeunload: never,
        "before-get-inner-html": never,
        "after-get-inner-html": never
    };
    type Listener = (...args: any[]) => any;
    export const _handlers = new WeakMap<EventTarget, Map<keyof EventMap, Map<Listener, Listener>>>();

    export abstract class HtmlEvent
    {
        public static addEventListener(target: EventTarget, type: keyof EventMap,
            listener: Listener, thisArg?: any, useCapture?: boolean, ...args: any[]): Listener
        {
            if (target)
            {
                HtmlEvent.removeEventListener(target, type, listener);
                let handlersOnTarget = _handlers.get(target);
                if (handlersOnTarget === undefined)
                {
                    handlersOnTarget = new Map<keyof EventMap, Map<Listener, Listener>>();
                    _handlers.set(target, handlersOnTarget);
                }
                let handlersOfType = handlersOnTarget.get(type);
                if (handlersOfType === undefined)
                {
                    handlersOfType = new Map<Listener, Listener>();
                    handlersOnTarget.set(type, handlersOfType);
                }
                let boundHandler = thisArg || args.length > 0 ? listener.bind(thisArg, ...args) : listener;
                handlersOfType.set(listener as any, boundHandler);
                target.addEventListener(type, boundHandler, useCapture);
                return boundHandler;
            }
            else throw new Error("target is not a valid EventTarget object");
        }

        public static removeEventListener(target: EventTarget, type: keyof EventMap, listener: Listener): void
        {
            let handlersOnTarget = _handlers.get(target);
            if (handlersOnTarget !== undefined)
            {
                let handlersOfType = handlersOnTarget.get(type);
                if (handlersOfType !== undefined)
                {
                    let boundHandler = handlersOfType.get(listener as any);
                    if (boundHandler !== undefined)
                    {
                        target.removeEventListener(type, boundHandler, true);
                        target.removeEventListener(type, boundHandler, false);
                        handlersOfType.delete(listener as any);
                        if (handlersOfType.size === 0)
                        {
                            handlersOnTarget.delete(type);
                            if (handlersOnTarget.size === 0)
                            {
                                _handlers.delete(target);
                            }
                        }
                    }
                }
            }
        }

        public static removeAllEventListeners(target: EventTarget, type?: keyof EventMap)
        {
            let handlersOnTarget = _handlers.get(target);
            if (handlersOnTarget !== undefined)
            {
                for (let tp of type ? [type] : Array.from(handlersOnTarget.keys()))
                {
                    let handlersOfType = handlersOnTarget!.get(tp);
                    if (handlersOfType !== undefined)
                    {
                        for (let boundHandler of handlersOfType.values())
                        {
                            target.removeEventListener(tp, boundHandler, true);
                            target.removeEventListener(tp, boundHandler, false);
                        }
                        handlersOfType.clear();
                        handlersOnTarget.delete(tp);
                    }
                }
            }
        }
    }
}