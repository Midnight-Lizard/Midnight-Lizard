/// <reference path="../DI/-DI.ts" />
/// <reference path="./BackgroundImage.ts" />
/// <reference path="./Pseudos.ts" />
/// <reference path="../Settings/Messages.ts" />
/// <reference path="./IContentMessageBus.ts" />

namespace MidnightLizard.ContentScript
{
    export abstract class IBackgroundImageProcessor
    {
        abstract process(url: string, bgFilter: string, blueFilter: number, roomRules: RoomRules)
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
        private _imageSizeLimit: number = 0;
        private _hideBigImages: boolean = false;
        private _imageSizeLimitValue: number = -1;

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

        private calcImageSizeLimitValue()
        {
            this._imageSizeLimitValue = this._hideBigImages ? this._imageSizeLimit * 1024 : -1;
        }

        private onSettingsInitialized(): void
        {
            this._hideBigImages = this._settingsManager.currentSettings.hideBigBackgroundImages;
            this._imageSizeLimit = this._settingsManager.currentSettings.maxBackgroundImageSize;
            this.calcImageSizeLimitValue();
        }

        private onSettingsChanged(response: (scheme: Settings.ColorScheme) => void, shift?: Colors.ComponentShift): void
        {
            if (this._imageSizeLimit !== this._settingsManager.currentSettings.maxBackgroundImageSize ||
                this._hideBigImages !== this._settingsManager.currentSettings.hideBigBackgroundImages)
            {
                this._imagePromises.clear();
                this._imageResolvers.clear();
                this._imageRejectors.clear();
            }
            this._images.clear();
            this._imageSizeLimit = this._settingsManager.currentSettings.maxBackgroundImageSize;
            this._hideBigImages = this._settingsManager.currentSettings.hideBigBackgroundImages;
            this.calcImageSizeLimitValue();
        }

        private onImageFetchMessage(message?: Settings.LocalMessageToContent)
        {
            if (message)
            {
                switch (message.type)
                {
                    case Settings.MessageType.ImageFetchCompleted:
                        const resolve = this._imageResolvers.get(message.url + this._imageSizeLimit);
                        resolve && resolve(message.img);
                        break;

                    case Settings.MessageType.ImageFetchFailed:
                        const reject = this._imageRejectors.get(message.url + this._imageSizeLimit);
                        reject && reject(message.error);
                        this._imageRejectors.delete(message.url + this._imageSizeLimit);
                        this._imageResolvers.delete(message.url + this._imageSizeLimit);
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
            this._images.set(url + this._imageSizeLimit, img);
            this._imagePromises.delete(url + this._imageSizeLimit);
            if (this._storageIsAccessable && img.d.length < this._maxCacheSize)
            {
                try
                {
                    sessionStorage.setItem(this._storagePrefix + url + this._imageSizeLimit, JSON.stringify(img));
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

        public process(url: string, bgFilter: string, blueFilter: number, roomRules: RoomRules)
        {
            url = this.getAbsoluteUrl(Util.trim(url.substr(3), "()'\""));

            const bgFltr = bgFilter.replace(`var(--${FilterType.BlueFilter})`, `url(#${FilterType.BlueFilter})`);

            const prevImage = this._images.get(url + this._imageSizeLimit);
            if (prevImage)
            {
                return this.createBackgroundImage(prevImage, bgFltr, blueFilter);
            }

            roomRules.hasBackgroundImagePromises = true;
            let cachePromise = this._imagePromises.get(url + this._imageSizeLimit) || this.fetchNewImage(url);

            let result = Promise.all([url, cachePromise, bgFltr, blueFilter])
                .then(([_url, img, fltr, blueFltr]) =>
                {
                    this.save(_url, img);
                    return this.createBackgroundImage(img, fltr, blueFltr);
                });
            return result;
        }

        private fetchNewImage(url: string)
        {
            let cachePromise = new Promise<BackgroundImageCache>((resolve, reject) =>
            {
                this._imageResolvers.set(url + this._imageSizeLimit, resolve);
                this._imageRejectors.set(url + this._imageSizeLimit, reject);
                this._msgBus.postMessage(new Settings.FetchImage(url, this._imageSizeLimitValue));
            });
            this._imagePromises.set(url + this._imageSizeLimit, cachePromise);
            return cachePromise;
        }

        private createBackgroundImage(img: BackgroundImageCache, filters: string, blueFilter: number)
        {
            const svgImg =
                `<svg xmlns="http://www.w3.org/2000/svg" width="${img.w}" height="${img.h}" filter="${filters}">` +
                (blueFilter ?
                    `<filter id="${FilterType.BlueFilter}"><feColorMatrix type="matrix" values="` +
                    `1 0 ${blueFilter} 0 0 0 1 0 0 0 0 0 ${1 - blueFilter} 0 0 0 0 0 1 0"/></filter>` : "") +
                `<image width="${img.w}" height="${img.h}" href="${img.d}"/></svg>`;

            return new BackgroundImage(
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