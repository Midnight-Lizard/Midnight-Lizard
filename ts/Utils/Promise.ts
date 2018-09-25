namespace MidnightLizard.Util
{
    export declare type GetNextDelay = (params: any[], prevDelay?: number, index?: number) => number;
    export declare type AsyncActionType<TResult> = (...p: any[]) => Promise<TResult> | TResult;

    export function forEachPromise<TResult>(
        arrayOfParams: any[][],
        action: AsyncActionType<TResult>,
        initialDelay = 0,
        getNextDelay?: GetNextDelay)
    {
        let fePromise: Promise<TResult> = null!;
        let lastDelay = initialDelay;
        arrayOfParams.forEach((params, index) =>
        {
            lastDelay = getNextDelay ? getNextDelay(params, lastDelay, index) : lastDelay;
            fePromise = Promise
                .all([action, lastDelay, params, fePromise])
                .then(([act, delay, params, prev]) =>
                {
                    params && params.push(prev);
                    return setTimeoutPromise(act, delay, params)
                });
        });
        return fePromise;
    }

    export function setTimeoutPromise<TResult>(
        action: AsyncActionType<TResult>, delay: number, params: any[])
    {
        params && params.push(delay);
        return new Promise<TResult>((resolve, reject) =>
        {
            if (delay)
            {
                setTimeout((r: typeof resolve, a: typeof action, p: any[]) => p ? r(a(...p)) : r(a()), delay, resolve, action, params);
            }
            else
            {
                params ? resolve(action(...params)) : resolve(action());
            }
        });
    }

    export enum PromiseStatus
    {
        Success,
        Failure
    }

    export class HandledPromiseResult<TResult>
    {
        constructor(readonly status: PromiseStatus, readonly data?: TResult) { }
    }

    /** Handles promise results in order to be safely used inside Promise.all so one failure would not stop the process */
    export function handlePromise<TResult>(promise: Promise<TResult>)
    {
        return promise && promise.then(
            result => new HandledPromiseResult<TResult>(PromiseStatus.Success, result),
            error => new HandledPromiseResult<TResult>(PromiseStatus.Failure, error));
    }
}