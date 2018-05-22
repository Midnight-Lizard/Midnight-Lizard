namespace MidnightLizard.Settings
{
    export type StorageType = "local" | "sync";
    type ArgEvent<TRequestArgs> = MidnightLizard.Events.ArgumentedEvent<TRequestArgs>;

    export abstract class IStorageManager
    {
        abstract currentStorage?: StorageType;
        abstract set(obj: Object): Promise<null>;
        abstract get<T>(key: T | null): Promise<T>;
        abstract clear(): Promise<null>;
        abstract remove(key: string): Promise<null>;
        abstract toggleSync(value: boolean): Promise<null>;
        abstract getCurrentStorage(): Promise<StorageType>;
        abstract get onStorageChanged(): ArgEvent<Partial<ColorScheme>>;
    }
}