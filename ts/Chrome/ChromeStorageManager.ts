/// <reference path="./ChromePromise.ts" />
/// <reference path="../DI/-DI.ts" />
/// <reference path="../Settings/IStorageManager.ts" />


namespace Chrome
{
    @MidnightLizard.DI.injectable(MidnightLizard.Settings.IStorageManager)
    class ChromeStorageManager implements MidnightLizard.Settings.IStorageManager
    {
        currentStorage?: MidnightLizard.Settings.StorageType;

        constructor(readonly chromePromise: Chrome.ChromePromise)
        {
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

        remove(key: string): Promise<null>
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
            }
            return this.chromePromise.storage.local.set({ sync: value });
        }

        protected async transferStorage(from: MidnightLizard.Settings.StorageType, to: MidnightLizard.Settings.StorageType)
        {
            const newStorageContent = await this.chromePromise.storage[to].get(null);
            if (!newStorageContent || Object.keys(newStorageContent).length === 0)
            {
                this.chromePromise.storage[to].set(
                    await this.chromePromise.storage[from].get(null));
            }
        }

        getCurrentStorage(): Promise<MidnightLizard.Settings.StorageType>
        {
            if (this.currentStorage)
            {
                return Promise.resolve(this.currentStorage);
            }
            else
            {
                return this.chromePromise.storage.local.get({ sync: true })
                    .then(x => this.currentStorage = x.sync ? "sync" : "local");
            }
        }
    }
}