export interface IArgumentedEventHandler<TArg>
{
    (eventArg?: TArg): void;
}

export interface IResponsiveEventHandler<TResponse extends Function, TArg>
{
    (response: TResponse, eventArg?: TArg): void;
}