namespace MidnightLizard.Util
{
    /** ([1,2,3,4,5], 2) => [ [1,2], [3,4], [5] ] */
    export function sliceIntoChunks(array: any[], chunk: number)
    {
        return array.reduce((ar, it, i) =>
        {
            const ix = Math.floor(i / chunk);
            if (!ar[ix]) ar[ix] = [];
            ar[ix].push(it);
            return ar;
        }, []) as Array<any[]>;
    }
}