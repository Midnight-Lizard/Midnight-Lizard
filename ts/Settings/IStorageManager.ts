namespace MidnightLizard.Settings
{
    export abstract class IStorageManager
    {
        abstract set(obj: Object): Promise<null>;
        abstract get<T>(key: T | null): Promise<T>;
        abstract clear(): Promise<null>;
    }
}