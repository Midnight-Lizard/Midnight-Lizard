/// <reference path="../DI/-DI.ts" />
/// <reference path="./BackgroundImage.ts" />
/// <reference path="./Pseudos.ts" />
/// <reference path="../Settings/Messages.ts" />
/// <reference path="./IContentMessageBus.ts" />

namespace MidnightLizard.ContentScript
{
    export abstract class IBackgroundImageProcessor
    {
        abstract process(url: string, bgFilter: string, size: string,
            blueFilter: number, roomRules: RoomRules, maxSize: number)
            : BackgroundImage | Promise<BackgroundImage>;
    }

    @DI.injectable(IBackgroundImageProcessor)
    class BackgroundImageProcessor implements IBackgroundImageProcessor
    {
        private readonly _images = new Map<string, BackgroundImageCache>();
        private readonly _imagePromises = new Map<string, Promise<BackgroundImageCache>>();
        private readonly _imageResolvers = new Map<string, (img: BackgroundImageCache) => void>();
        private readonly _imageRejectors = new Map<string, (error: string) => void>();
        private readonly _anchor: HTMLAnchorElement;
        private readonly _storagePrefix = "ml-image-";
        private readonly _maxCacheSize = 256 * 1024 * 2;
        private _storageIsAccessable: boolean = true;
        private _lastImageSizeLimit?: number;
        private _lastHideBigImages?: boolean;

        constructor(rootDoc: Document,
            private readonly _app: MidnightLizard.Settings.IApplicationSettings,
            private readonly _msgBus: MidnightLizard.ContentScript.IContentMessageBus,
            private readonly _settingsManager: MidnightLizard.Settings.IBaseSettingsManager)
        {
            this._anchor = rootDoc.createElement("a");
            _msgBus.onMessage.addListener(this.onImageFetchMessage, this);
            _settingsManager.onSettingsInitialized.addListener(this.onSettingsInitialized, this);
            _settingsManager.onSettingsChanged.addListener(this.onSettingsChanged, this, Events.EventHandlerPriority.High);
            try
            {
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

        private onSettingsInitialized(): void
        {
            this._lastHideBigImages = this._settingsManager.currentSettings.hideBigBackgroundImages;
            this._lastImageSizeLimit = this._settingsManager.currentSettings.maxBackgroundImageSize;
        }

        private onSettingsChanged(response: (scheme: Settings.ColorScheme) => void, shift?: Colors.ComponentShift): void
        {
            if (this._lastImageSizeLimit !== this._settingsManager.currentSettings.maxBackgroundImageSize ||
                this._lastHideBigImages !== this._settingsManager.currentSettings.hideBigBackgroundImages)
            {
                this._imagePromises.clear();
                this._imageResolvers.clear();
                this._imageRejectors.clear();
            }
            this._images.clear();
        }

        private onImageFetchMessage(message?: Settings.LocalMessageToContent)
        {
            if (message)
            {
                switch (message.type)
                {
                    case Settings.MessageType.ImageFetchCompleted:
                        const resolve = this._imageResolvers.get(message.url);
                        resolve && resolve(message.img);
                        break;

                    case Settings.MessageType.ImageFetchFailed:
                        const reject = this._imageRejectors.get(message.url);
                        reject && reject(message.error);
                        this._imageRejectors.delete(message.url);
                        this._imageResolvers.delete(message.url);
                        break;

                    case Settings.MessageType.ErrorMessage:
                        if (this._app.isDebug)
                        {
                            console.log(message);
                        }
                        break;

                    default:
                        break;
                }
            }
        }

        private save(url: string, img: BackgroundImageCache): void
        {
            this._images.set(url, img);
            this._imagePromises.delete(url);
            if (this._storageIsAccessable && img.d.length < this._maxCacheSize)
            {
                try
                {
                    sessionStorage.setItem(this._storagePrefix + url, JSON.stringify(img));
                }
                catch (ex)
                {
                    this._storageIsAccessable = false;
                    if (this._app.isDebug)
                    {
                        console.error(ex);
                    }
                }
            }
        }

        public process(url: string, bgFilter: string, bgSize: string,
            blueFilter: number, roomRules: RoomRules, maxSize: number)
        {
            url = this.getAbsoluteUrl(Util.trim(url.substr(3), "()'\""));

            const prevImage = this._images.get(url);
            if (prevImage)
            {
                return this.createBackgroundImage(prevImage, bgSize, bgFilter, blueFilter);
            }

            roomRules.hasBackgroundImagePromises = true;
            let cachePromise = this._imagePromises.get(url) || this.fetchNewImage(url, maxSize);

            const bgFltr = bgFilter.replace(`var(--${FilterType.BlueFilter})`, `url(#${FilterType.BlueFilter})`);
            let result = Promise.all([url, cachePromise, bgSize, bgFltr, blueFilter])
                .then(([_url, img, bgSize, fltr, blueFltr]) =>
                {
                    this.save(_url, img);
                    return this.createBackgroundImage(img, bgSize, fltr, blueFltr);
                });
            return result;
        }

        private fetchNewImage(url: string, maxSize: number)
        {
            let cachePromise = new Promise<BackgroundImageCache>((resolve, reject) =>
            {
                this._imageResolvers.set(url, resolve);
                this._imageRejectors.set(url, reject);
                this._msgBus.postMessage(new Settings.FetchImage(url, maxSize));
            });
            this._imagePromises.set(url, cachePromise);
            return cachePromise;
        }

        private createBackgroundImage(img: BackgroundImageCache, bgSize: string, filters: string, blueFilter: number)
        {
            let imgWidth = img.w + "px", imgHeight = img.h + "px";
            const svgImg =
                `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${img.w} ${img.h}" filter="${filters}">` +
                (blueFilter ?
                    `<filter id="${FilterType.BlueFilter}"><feColorMatrix type="matrix" values="` +
                    `1 0 ${blueFilter} 0 0 0 1 0 0 0 0 0 ${1 - blueFilter} 0 0 0 0 0 1 0"/></filter>` : "") +
                `<image width="${imgWidth}" height="${imgHeight}" href="${img.d}"/></svg>`;

            return new BackgroundImage(/^(auto\s?){1,2}$/i.test(bgSize) ? imgWidth + " " + imgHeight : bgSize,
                "url('data:image/svg+xml," + encodeURIComponent(svgImg)
                    .replace(/'/g, "%27").replace(/\(/g, "%28").replace(/\)/g, "%29") +
                "')", BackgroundImageType.Image);

            // // looks like with blob + objectUrl it works much slower
            // const blob = new Blob([svgImg], { type: 'image/svg+xml' });
            // const objectUrl = URL.createObjectURL(blob);
            // return new BackgroundImage(
            //     /^(auto\s?){1,2}$/i.test(bgSize) ? imgWidth + " " + imgHeight : bgSize,
            //     `url(${objectUrl})`, BackgroundImageType.Image);
        }

        private getAbsoluteUrl(relativeUrl: string): string
        {
            this._anchor.href = relativeUrl;
            return this._anchor.href;
        }
    }
}