import { ArgumentedEvent } from "../Events/Event";
import { ColorScheme } from "./ColorScheme";

export type StorageType = "local" | "sync";
type ArgEvent<TRequestArgs> = ArgumentedEvent<TRequestArgs>;
export enum StorageLimits
{
    QUOTA_BYTES = 'QUOTA_BYTES',
    QUOTA_BYTES_PER_ITEM = 'QUOTA_BYTES_PER_ITEM',
    MAX_ITEMS = 'MAX_ITEMS',
    MAX_WRITE_OPERATIONS_PER_HOUR = 'MAX_WRITE_OPERATIONS_PER_HOUR',
    MAX_WRITE_OPERATIONS_PER_MINUTE = 'MAX_WRITE_OPERATIONS_PER_MINUTE'
}

export abstract class IStorageManager
{
    abstract set(obj: Object): Promise<null>;
    abstract get<T>(key: T | null): Promise<T>;
    abstract clear(): Promise<null>;
    abstract remove(key: string | string[]): Promise<null>;
    abstract toggleSync(value: boolean): Promise<null>;
    abstract getCurrentStorage(): Promise<StorageType>;
    abstract get onStorageChanged(): ArgEvent<Partial<ColorScheme>>;
}