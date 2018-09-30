/// <reference path="./ChromePromise.ts" />
/// <reference path="../DI/-DI.ts" />
/// <reference path="../Settings/IStorageManager.ts" />
/// <reference path="../Settings/IApplicationSettings.ts" />
/// <reference path="../i18n/ITranslationAccessor.ts" />
/// <reference path="../Events/-Events.ts" />

namespace Chrome
{
    type ArgEvent<TRequestArgs> = MidnightLizard.Events.ArgumentedEvent<TRequestArgs>;
    const ArgEventDispatcher = MidnightLizard.Events.ArgumentedEventDispatcher;

    @MidnightLizard.DI.injectable(MidnightLizard.Settings.IStorageManager)
    class ChromeStorageManager implements MidnightLizard.Settings.IStorageManager
    {
        private currentStorage?: MidnightLizard.Settings.StorageType;

        constructor(readonly chromePromise: Chrome.ChromePromise,
            protected readonly _app: MidnightLizard.Settings.IApplicationSettings,
            protected readonly _i18n: MidnightLizard.i18n.ITranslationAccessor)
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

        protected async transferStorage(from: MidnightLizard.Settings.StorageType, to: MidnightLizard.Settings.StorageType)
        {
            const newStorageContent = await this.chromePromise.storage[to].get(null);
            if (!newStorageContent || Object.keys(newStorageContent).length === 0 ||
                confirm(this._i18n.getMessage(`${to}StorageOverrideConfirmationMessage`)))
            {
                this.chromePromise.storage[to].set(
                    await this.chromePromise.storage[from].get(null));
            }
        }

        async getCurrentStorage(): Promise<MidnightLizard.Settings.StorageType>
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

        protected _onStorageChanged = new ArgEventDispatcher<Partial<MidnightLizard.Settings.ColorScheme>>();
        public get onStorageChanged()
        {
            return this._onStorageChanged.event;
        }
    }
}