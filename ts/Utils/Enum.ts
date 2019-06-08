export function getEnumValues<T>(enumType: any): T[]
{
    return Object.values<T>(enumType)
        .filter(key => !isNaN(Number(key)));
}

export function getEnumNames(enumType: any): string[]
{
    return Object.keys(enumType)
        .filter(key => isNaN(Number(key)));
}