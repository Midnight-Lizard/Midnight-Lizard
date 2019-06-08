declare var msCrypto: any;
const UUID_SIZE = 16;

function FillRandomBytes(buffer: Array<number> | Uint8Array, size: number)
{
    for (let i = 0; i < size; ++i)
    {
        buffer[i] = Math.random() * 0xff | 0;
    }
    return buffer;
}
function GenRandomBytes(size: number)
{
    if (typeof Uint8Array === "function")
    {
        if (typeof crypto !== "undefined")
            return crypto.getRandomValues(new Uint8Array(size));
        if (typeof msCrypto !== "undefined")
            return msCrypto.getRandomValues(new Uint8Array(size));
        return FillRandomBytes(new Uint8Array(size), size);
    }
    return FillRandomBytes(new Array(size), size);
}

export function guid(separator = "-")
{
    const data = GenRandomBytes(UUID_SIZE);
    // mark as random - RFC 4122 § 4.4
    data[6] = data[6] & 0x4f | 0x40;
    data[8] = data[8] & 0xbf | 0x80;
    let result = "";
    for (let offset = 0; offset < UUID_SIZE; ++offset)
    {
        const byte = data[offset];
        if (offset === 4 || offset === 6 || offset === 8)
        {
            result += separator;
        }
        if (byte < 16)
        {
            result += "0";
        }
        result += byte.toString(16).toLowerCase();
    }
    return result;
}