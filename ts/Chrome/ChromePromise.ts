/// <reference path="../DI/-DI.ts" />

namespace Chrome
{
    /**
     * ChromePromise
     */
    @MidnightLizard.DI.injectable()
    export class ChromePromise
    {
        [anyProperty: string]: any;
        storage: typeof Storage;
        runtime: typeof Runtime;
        tabs: typeof Tabs;
        commands: typeof Commands;

        constructor()
        {
            this.fillProperties(chrome, this);
        }

        protected setPromiseFunction(fn: (...x: any[]) => any, thisArg: any)
        {
            return (...args: any[]) =>
            {
                return new Promise((resolve, reject) =>
                {
                    Array.prototype.push.call(args, callback);
                    fn.apply(thisArg, args);
                    function callback(...results: any[])
                    {
                        let err = chrome.runtime.lastError;
                        if (err)
                        {
                            reject(err);
                        }
                        else
                        {
                            switch (results.length)
                            {
                                case 0:
                                    resolve();
                                    break;
                                case 1:
                                    resolve(results[0]);
                                    break;
                                default:
                                    resolve(results);
                            }
                        }
                    }
                });
            };
        }

        protected fillProperties(source: any, target: any)
        {
            for (let key in source)
            {
                if (Object.prototype.hasOwnProperty.call(source, key))
                {
                    let val = source[key];
                    let type = typeof val;
                    if (type === 'object' && !(val instanceof ChromePromise))
                    {
                        target[key] = {};
                        this.fillProperties(val, target[key]);
                    }
                    else if (type === 'function')
                    {
                        target[key] = this.setPromiseFunction(val, source);
                    }
                    else
                    {
                        target[key] = val;
                    }
                }
            }
        }
    }

    namespace Commands
    {
        export declare function getAll(): Promise<chrome.commands.Command[]>;
    }

    namespace Tabs
    {
        export declare function query(queryInfo: chrome.tabs.QueryInfo): Promise<chrome.tabs.Tab[]>;
        export declare function sendMessage(tabId: number, message: any): Promise<any>;
    }

    namespace Runtime
    {
        export declare function sendMessage(message: any): Promise<any>;
    }

    namespace Storage
    {
        interface StorageArea
        {
            set(items: Object): Promise<null>;
            get(keys: string | string[] | Object | null): Promise<{ [key: string]: any }>;
            clear(): Promise<null>;
            remove(key: string): Promise<null>;
        }
        export var local: StorageArea;
        export var sync: StorageArea;
    }
}