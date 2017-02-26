/// <reference path="./ChromePromise.ts" />
/// <reference path="../DI/-DI.ts" />
/// <reference path="../Settings/IStorageManager.ts" />


namespace Chrome
{
    /**
     * ChromeStorage
     */
    @MidnightLizard.DI.injectable(MidnightLizard.Settings.IStorageManager)
    class ChromeStorageManager implements MidnightLizard.Settings.IStorageManager
    {
        constructor(readonly chromePromise: Chrome.ChromePromise)
        {
        }

        set(obj: Object)
        {
            return this.chromePromise.storage.local.set(obj);
        }

        get<T extends Object>(key: T)
        {
            return this.chromePromise.storage.local.get(key) as Promise<T>;
        }

        clear()
        {
            return this.chromePromise.storage.local.clear();
        }
    }
}