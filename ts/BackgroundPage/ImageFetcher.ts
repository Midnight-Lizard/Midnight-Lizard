import { BackgroundImageCache } from "../ContentScript/BackgroundImage";
import { injectable } from "../Utils/DI";

const noneImageDataUrl = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxIiBoZWlnaHQ9IjEiPgo8L3N2Zz4=";

export abstract class IImageFetcher
{
    abstract fetchImage(url: string, maxSize: number): Promise<BackgroundImageCache>;
}

@injectable(IImageFetcher)
export class ImageFetcher implements IImageFetcher
{
    constructor() { }

    public fetchImage(url: string, maxSize: number)
    {
        const dataUrlPromise = url && url.startsWith("data:image") ? Promise.resolve(url) :
            fetch(url, { cache: "force-cache" })
                .then(resp => resp.blob())
                .then(blob => new Promise<string>((resolve, reject) =>
                {
                    if (maxSize === -1 || blob.size < maxSize)
                    {
                        let rdr = new FileReader();
                        rdr.onload = () => resolve(rdr.result as any);
                        rdr.onerror = () => reject(`Faild to load image: ${url}\n${rdr.error!.message}`);
                        rdr.readAsDataURL(blob);
                    }
                    else
                    {
                        resolve(noneImageDataUrl);
                    }
                }));
        return dataUrlPromise.then(dataUrl => new Promise<BackgroundImageCache>((resolve, reject) =>
        {
            let img = new Image();
            img.onload = () => resolve({ d: dataUrl, w: img.naturalWidth, h: img.naturalHeight });
            img.onerror = (e) => reject(`Faild draw the image: ${url}\n${e}`);
            img.src = dataUrl;
        }));
    }
}