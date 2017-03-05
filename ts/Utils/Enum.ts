namespace MidnightLizard.Util
{
    export function getEnumValues<T>(enumType: any): T[]
    {
        return Object.keys(enumType)
            .map(key => enumType[key])
            .filter(key => !isNaN(Number(key))) as T[];
    }

    export function getEnumNames(enumType: any): string[]
    {
        return Object.keys(enumType)
            .map(key => enumType[key])
            .filter(key => isNaN(Number(key)));
    }
}