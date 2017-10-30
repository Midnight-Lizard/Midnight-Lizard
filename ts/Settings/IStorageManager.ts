namespace MidnightLizard.Settings
{
    export type StorageType = "local" | "sync";
    export abstract class IStorageManager
    {
        currentStorage?: StorageType;
        abstract set(obj: Object): Promise<null>;
        abstract get<T>(key: T | null): Promise<T>;
        abstract clear(): Promise<null>;
        abstract remove(key: string): Promise<null>;
        abstract toggleSync(value: boolean): Promise<null>;
        abstract getCurrentStorage(): Promise<StorageType>;
    }
}