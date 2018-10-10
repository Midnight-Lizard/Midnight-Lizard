/// <reference path="../DI/-DI.ts" />
/// <reference path="../Settings/BaseSettingsManager.ts" />
/// <reference path="./BackgroundImage.ts" />
/// <reference path="./Pseudos.ts" />

namespace MidnightLizard.ContentScript
{
    export abstract class IBackgroundImageProcessor
    {
        abstract process(tag: HTMLElement | PseudoElement, index: number, url: string,
            size: string, roomRules: RoomRules, doInvert: boolean, isPseudoContent: boolean, bgFilter: string):
            BackgroundImage | Promise<BackgroundImage>;

        abstract save(key: string, img: BackgroundImage): void;
    }

    @DI.injectable(IBackgroundImageProcessor)
    class BackgroundImageProcessor implements IBackgroundImageProcessor
    {
        private readonly _images = new Map<string, BackgroundImage>();
        private readonly _imagePromises = new Map<string, Promise<BackgroundImage>>();
        private readonly _anchor: HTMLAnchorElement;
        private readonly _storageIsAccessable: boolean = true;
        private readonly _storagePrefix = "ml-image-";

        constructor(rootDoc: Document,
            private readonly _settingsManager: MidnightLizard.Settings.IBaseSettingsManager)
        {
            this._anchor = rootDoc.createElement("a");
            this._settingsManager.onSettingsChanged.addListener(this.onSettingsChanged, this);
            try
            {
                sessionStorage.getItem("test");
                let storageKey: string | null;
                for (let i = 0; storageKey = sessionStorage.key(i); i++)
                {
                    if (storageKey.startsWith(this._storagePrefix))
                    {
                        const imageJson = sessionStorage.getItem(storageKey);
                        if (imageJson)
                        {
                            this._images.set(storageKey.substr(this._storagePrefix.length), JSON.parse(imageJson));
                        }
                    }
                }
            }
            catch { this._storageIsAccessable = false }
        }

        public save(key: string, img: BackgroundImage): void
        {
            this._images.set(key, img);
            if (this._storageIsAccessable)
            {
                sessionStorage.setItem(this._storagePrefix + key, JSON.stringify(img));
            }
        }

        public process(tag: HTMLElement | PseudoElement, index: number, url: string,
            size: string, roomRules: RoomRules, doInvert: boolean, isPseudoContent: boolean, bgFilter: string):
            BackgroundImage | Promise<BackgroundImage>
        {
            const blueFilter = this._settingsManager.currentSettings.blueFilter;
            let imageKey = [url, size, doInvert, bgFilter, blueFilter].join("-");
            roomRules.backgroundImageKeys = roomRules.backgroundImageKeys || [];
            roomRules.backgroundImageKeys[index] = imageKey;
            let prevImage = this._images.get(imageKey);
            if (prevImage)
            {
                return prevImage;
            }
            let prevPromise = this._imagePromises.get(imageKey);
            if (prevPromise)
            {
                roomRules.hasBackgroundImagePromises = true;
                return prevPromise;
            }

            return this.fetchNewImage(url, bgFilter, size, blueFilter, imageKey, roomRules);
        }

        private fetchNewImage(url: string, bgFilter: string, size: string, blueFilter: number, imageKey: string, roomRules: RoomRules)
        {
            url = this.getAbsoluteUrl(Util.trim(url.substr(3), "()'\""));
            let dataPromise = fetch(url, { cache: "force-cache" })
                .then(resp => resp.blob())
                .then(blob => new Promise<string>((resolve, reject) =>
                {
                    let rdr = new FileReader();
                    rdr.onload = (e) => resolve((e.target as FileReader).result as any);
                    rdr.readAsDataURL(blob);
                }))
                .then(dataUrl => new Promise<{
                    data: string;
                    width: number;
                    height: number;
                }>((resolve, reject) =>
                {
                    let img = new Image();
                    img.onload = () => resolve({ data: dataUrl, width: img.naturalWidth, height: img.naturalHeight });
                    img.onerror = () => reject(`Unable to load image ${url}`);
                    img.src = dataUrl;
                }));
            const bgFltr = bgFilter.replace(`var(--${FilterType.BlueFilter})`, `url(#${FilterType.BlueFilter})`);
            let result = Promise.all([dataPromise, size, bgFltr, blueFilter / 100]).then(([img, bgSize, fltr, blueFltr]) =>
            {
                let imgWidth = img.width + "px", imgHeight = img.height + "px";
                return new BackgroundImage(/^(auto\s?){1,2}$/i.test(bgSize) ? imgWidth + " " + imgHeight : bgSize,
                    "url(data:image/svg+xml," + encodeURIComponent(
                        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${img.width} ${img.height}" filter="${fltr}">` +
                        `<filter id="${FilterType.BlueFilter}"><feColorMatrix type="matrix" values="` +
                        `1 0 ${blueFltr} 0 0 0 1 0 0 0 0 0 ${1 - blueFltr} 0 0 0 0 0 1 0"/></filter>` +
                        `<image width="${imgWidth}" height="${imgHeight}" href="${img.data}"/></svg>`
                    ).replace(/\(/g, "%28").replace(/\)/g, "%29") + ")", BackgroundImageType.Image);
            });
            this._imagePromises.set(imageKey, result);
            roomRules.hasBackgroundImagePromises = true;
            return result;
        }

        private getAbsoluteUrl(relativeUrl: string): string
        {
            this._anchor.href = relativeUrl;
            return this._anchor.href;
        }

        private onSettingsChanged(response: (scheme: Settings.ColorScheme) => void, shift?: Colors.ComponentShift): void
        {
            this._images.clear();
            this._imagePromises.clear();
        }
    }
}