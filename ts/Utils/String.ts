export function escapeRegex(str: string): string
{
    return str.replace(/[\[\](){}?*+\^\$\\\.|\-]/g, "\\$&");
}

export function trim(str: string, characters: string, flags: string = "gi")
{
    characters = escapeRegex(characters);
    return str.replace(new RegExp("^[" + characters + "]+|[" + characters + "]+$", flags), '');
}

export function hashCode(str: string)
{
    let hash = 0, chr: number, len: number;
    if (str && str.length !== 0)
    {
        for (let i = 0, len = str.length; i < len; i++)
        {
            chr = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + chr;
            hash = hash | 0; // Convert to 32bit integer
        }
    }
    return hash;
}