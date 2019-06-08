import { ArgumentedEventDispatcher } from "../Events/EventDispatcher";
import { injectable } from "../Utils/DI";
import { IStorageManager, StorageType } from "../Settings/IStorageManager";
import { IApplicationSettings } from "../Settings/IApplicationSettings";
import { ColorScheme } from "../Settings/ColorScheme";
import { ChromePromise } from "./ChromePromise";
import { ITranslationAccessor } from "../i18n/ITranslationAccessor";

const ArgEventDispatcher = ArgumentedEventDispatcher;

@injectable(IStorageManager)
export class ChromeStorageManager implements IStorageManager
{
    private currentStorage?: StorageType;

    constructor(readonly chromePromise: ChromePromise,
        protected readonly _app: IApplicationSettings,
        protected readonly _i18n: ITranslationAccessor)
    {
        chrome.storage.onChanged.addListener((changes, namespace) =>
        {
            if ("sync" in changes)
            {
                this.currentStorage = changes.sync.newValue ? "sync" : "local";
            }
            this._onStorageChanged.raise(changes);
        });
    }

    set(obj: Object)
    {
        return this.getCurrentStorage()
            .then(storage => this.chromePromise.storage[storage].set(obj));
    }

    get<T extends Object>(key: T | null)
    {
        return this.getCurrentStorage()
            .then(storage => this.chromePromise.storage[storage].get(key) as Promise<T>);
    }

    clear()
    {
        return this.getCurrentStorage()
            .then(storage => this.chromePromise.storage[storage].clear());
    }

    remove(key: string | string[]): Promise<null>
    {
        return this.getCurrentStorage()
            .then(storage => this.chromePromise.storage[storage].remove(key));
    }

    async toggleSync(value: boolean): Promise<null>
    {
        const newStorage = value ? "sync" : "local";
        const currStorage = await this.getCurrentStorage();
        if (newStorage !== currStorage)
        {
            await this.transferStorage(currStorage, newStorage);
            this.currentStorage = newStorage;
        }
        return this.chromePromise.storage.local.set({ sync: value });
    }

    protected async transferStorage(from: StorageType, to: StorageType)
    {
        const newStorageContent = await this.chromePromise.storage[to].get(null);
        if (!newStorageContent || Object.keys(newStorageContent).length === 0 ||
            confirm(this._i18n.getMessage(`${to}StorageOverrideConfirmationMessage`)))
        {
            this.chromePromise.storage[to].set(
                await this.chromePromise.storage[from].get(null));
        }
    }

    async getCurrentStorage(): Promise<StorageType>
    {
        if (this.currentStorage)
        {
            return this.currentStorage;
        }
        else
        {
            const state = await this.chromePromise.storage.local.get({ sync: !this._app.isDebug });
            this.currentStorage = state.sync ? "sync" : "local"
            return this.currentStorage;
        }
    }

    protected _onStorageChanged = new ArgEventDispatcher<Partial<ColorScheme>>();
    public get onStorageChanged()
    {
        return this._onStorageChanged.event;
    }
}