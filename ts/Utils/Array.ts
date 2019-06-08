/** ([1,2,3,4,5], 2) => [ [1,2], [3,4], [5] ] */
export function sliceIntoChunks<TSource>(array: TSource[], chunk: number)
{
    return array.reduce((ar, it, i) =>
    {
        const ix = Math.floor(i / chunk);
        if (!ar[ix]) ar[ix] = [];
        ar[ix].push(it);
        return ar;
    }, new Array<TSource[]>());
}

export function setsAreEqual<TSource>(set1: Set<TSource>, set2: Set<TSource>)
{
    if (!set1 && !!set2 || !!set1 && !set2) return false;
    if (!set1 && !set2) return true;
    if (set1.size !== set2.size) return false;
    for (const a of set1) if (!set2.has(a)) return false;
    return true;
}

export function firstSetIncludesAllElementsOfSecondSet<TSource>(set1: Set<TSource>, set2: Set<TSource>)
{
    if (!set1 || !set1.size || !set2 || !set2.size) return false;
    for (const a of set2) if (!set1.has(a)) return false;
    return true;
}