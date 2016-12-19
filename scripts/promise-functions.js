function forEachPromise(arrayOfParams, action, initialDelay, getNextDelay)
{
    var fePromise = Promise.resolve();
    var lastDelay = initialDelay || 0;
    arrayOfParams.forEach((params, index) =>
    {
        lastDelay = getNextDelay ? getNextDelay(lastDelay, index) : lastDelay;
        fePromise = Promise
            .all([action, lastDelay, params, fePromise])
            .then(x =>
             {
                 x[2] && x[2].push(x[3]);
                 return setTimeoutPromise(...x)
             });
    });
    return fePromise;
}

function setTimeoutPromise(action, delay, params)
{
    params && params.push(delay);
    return new Promise((resolve, reject) =>
    {
        if (delay)
        {
            setTimeout((r, a, p) => p ? r(a(...p)) : r(a()), delay, resolve, action, params);
        }
        else
        {
            params ? resolve(action(...params)) : resolve(action());
        }
    })
}