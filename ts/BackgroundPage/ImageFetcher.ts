/// <reference path="../DI/-DI.ts" />
/// <reference path="../ContentScript/BackgroundImage.ts" />

namespace MidnightLizard.BackgroundPage
{
    declare type BackgroundImageCache = MidnightLizard.ContentScript.BackgroundImageCache;

    export abstract class IImageFetcher
    {
        abstract fetchImage(url: string, maxSize: number): Promise<BackgroundImageCache>;
    }

    @DI.injectable(IImageFetcher)
    class ImageFetcher implements IImageFetcher
    {
        constructor() { }

        public fetchImage(url: string, maxSize: number)
        {
            return fetch(url, { cache: "force-cache" })
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
                        reject(`${url} is too big (${blob.size / 1024} KB)`);
                    }
                }))
                .then(dataUrl => new Promise<BackgroundImageCache>((resolve, reject) =>
                {
                    let img = new Image();
                    img.onload = () => resolve({ d: dataUrl, w: img.naturalWidth, h: img.naturalHeight });
                    img.onerror = (e) => reject(`Faild to load image: ${url}\n${e.message}`);
                    img.src = dataUrl;
                }));
        }
    }
}