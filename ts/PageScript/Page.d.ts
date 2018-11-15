declare interface Object
{
    __defineGetter__<T>(propertyName: string, getter: () => T): void;
    __defineSetter__<T>(propertyName: string, setter: (value: T) => void): void;
    __proto__: any;
}

declare interface Node
{
    __lookupGetter__<T>(propertyName: string): () => T;
    __lookupSetter__<T>(propertyName: string): (value: T) => void;
    innerHtmlGetter: () => string;
    innerHtmlCache: { value: string, timestamp: number, consequentCalls: number };
}

declare interface Document
{
    originalQueryCommandValue(commandId: string): string;
}