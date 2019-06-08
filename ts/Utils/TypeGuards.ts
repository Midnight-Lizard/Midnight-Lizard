/** Name of type {boolean} */
export const BOOL = Boolean.name.toLowerCase();
/** Name of type {number} */
export const NUM = Number.name.toLowerCase();
/** Name of type {string} */
export const STR = String.name.toLowerCase();

/** {number} type guard */
export function isNum(arg: any): arg is number
{
    return typeof arg === NUM;
}

/** {string} type guard */
export function isStr(arg: any): arg is string
{
    return typeof arg === STR;
}

/** {boolean} type guard */
export function isBool(arg: any): arg is boolean
{
    return typeof arg === BOOL;
}