export function group<T extends any>(object: T, by: (v: T[keyof T], k?: keyof T) => any): { [prop: string]: T[keyof T] }
{
    let result: { [prop: string]: any } = {};
    for (let key in object)
    {
        let value = object[key];
        let gr = by(value, key);
        if (!result[gr]) result[gr] = [];
        result[gr].push(value);
    }
    return result;
}

export function find<T extends any>(object: T, predicate: (v: T[keyof T], k?: keyof T) => boolean): T[keyof T] | null
{
    for (let key in object)
    {
        let value = object[key];
        if (predicate(value, key))
        {
            return value;
        }
    }
    return null;
}

export function filter<T extends any>(object: T, predicate: (v: T[keyof T], k?: keyof T) => boolean): T[keyof T][]
{
    let arr = new Array<T[keyof T]>();
    for (let key in object)
    {
        let value = object[key];
        if (predicate(value, key))
        {
            arr.push(value);
        }
    }
    return arr;
}