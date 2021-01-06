import { PublicSchemeId, PublicScheme } from "./PublicScheme";
import { ColorSchemeId } from "../ColorSchemes";
import { ArgumentedEvent } from "../../Events/Event";
import { BaseSettingsManager } from "../BaseSettingsManager";
import { ArgumentedEventDispatcher } from "../../Events/EventDispatcher";
import { IApplicationSettings } from "../IApplicationSettings";
import { IStorageManager } from "../IStorageManager";
import { ISettingsBus } from "../ISettingsBus";
import { IMatchPatternProcessor } from "../MatchPatternProcessor";
import { IRecommendations } from "../Recommendations";
import { injectable } from "../../Utils/DI";
import { ITranslationAccessor } from "../../i18n/ITranslationAccessor";

declare type PublicSchemesStorage = { publicSchemeIds: PublicSchemeId[] };

export abstract class IPublicSettingsManager
{
    public abstract installPublicScheme(publicScheme: PublicScheme): Promise<void>;
    public abstract uninstallPublicScheme(publicSchemeId: PublicSchemeId): Promise<void>;
    public abstract uninstallPublicSchemeByColorSchemeId(colorSchemeId: ColorSchemeId): Promise<void>;
    public abstract getInstalledPublicSchemeIds(): Promise<PublicSchemeId[]>;
    public abstract getInstalledPublicColorSchemeIds(): Promise<ColorSchemeId[]>;
    public abstract get onPublicSchemesChanged(): ArgumentedEvent<PublicSchemeId[]>;

    public abstract applyPublicScheme(publicSchemeId: PublicSchemeId, hostName: string): Promise<void>;
    public abstract setPublicSchemeAsDefault(publicSchemeId: PublicSchemeId): Promise<void>;
}

@injectable(IPublicSettingsManager)
class PublicSettingsManager extends BaseSettingsManager implements IPublicSettingsManager
{
    private _onPublicSchemesChanged = new ArgumentedEventDispatcher<PublicSchemeId[]>();
    public get onPublicSchemesChanged()
    {
        return this._onPublicSchemesChanged.event;
    }

    constructor(rootDocument: Document,
        app: IApplicationSettings,
        storageManager: IStorageManager,
        settingsBus: ISettingsBus,
        matchPatternProcessor: IMatchPatternProcessor,
        i18n: ITranslationAccessor,
        rec: IRecommendations)
    {
        super(rootDocument, app, storageManager, settingsBus, matchPatternProcessor, i18n, rec);
        this.isInit = true
        storageManager.onStorageChanged.addListener(this.onStorageChanged, this);
    }

    public initDefaultColorSchemes() { }

    protected initCurrentSettings() { }

    public async uninstallPublicSchemeByColorSchemeId(colorSchemeId: ColorSchemeId)
    {
        const storage: PublicSchemesStorage = { publicSchemeIds: await this.getInstalledPublicSchemeIds() };
        if (storage.publicSchemeIds.length > 0)
        {
            const installedPublicSchemes = Object.values(await this.getInstalledPublicSchemes(storage));

            const publicScheme = installedPublicSchemes.find(x => x.cs.colorSchemeId === colorSchemeId);
            if (publicScheme)
            {
                let existingPublicSchemeIdIndex = storage.publicSchemeIds.findIndex(id => id === publicScheme.id);
                if (existingPublicSchemeIdIndex > -1)
                {
                    storage.publicSchemeIds.splice(existingPublicSchemeIdIndex, 1);
                }
                await this._storageManager.set(storage);
            }
        }
    }

    public async uninstallPublicScheme(publicSchemeId: PublicSchemeId)
    {
        const key = `ps:${publicSchemeId}`;
        const publicScheme = (await this._storageManager.get({ [key]: null as any as PublicScheme }))[key];
        if (publicScheme)
        {
            await this.deleteUserColorScheme(publicScheme.cs.colorSchemeId)
            await this._storageManager.remove(key);

            const storage: PublicSchemesStorage = { publicSchemeIds: await this.getInstalledPublicSchemeIds() };
            let existingPublicSchemeIdIndex = storage.publicSchemeIds.findIndex(id => id === publicSchemeId);
            if (existingPublicSchemeIdIndex > -1)
            {
                storage.publicSchemeIds.splice(existingPublicSchemeIdIndex, 1);
            }
            await this._storageManager.set(storage);
        }
    }

    public async applyPublicScheme(publicSchemeId: PublicSchemeId, hostName: string)
    {
        const key = `ps:${publicSchemeId}`;
        const publicScheme = (await this._storageManager.get({ [key]: null as any as PublicScheme }))[key];
        if (publicScheme)
        {
            await this._storageManager.set({
                [`ws:${hostName}`]: {
                    colorSchemeId: publicScheme.cs.colorSchemeId,
                    runOnThisSite: true
                }
            });
        }
        else
        {
            throw new Error("Color scheme cannot be found");
        }
    }

    public async setPublicSchemeAsDefault(publicSchemeId: PublicSchemeId)
    {
        const key = `ps:${publicSchemeId}`;
        const publicScheme = (await this._storageManager.get({ [key]: null as any as PublicScheme }))[key];
        if (publicScheme)
        {
            await this.getDefaultSettings(false);
            this._defaultSettings = Object.assign(this._defaultSettings, publicScheme.cs);
            await this._storageManager.set(this._defaultSettings);
        }
        else
        {
            throw new Error("Color scheme cannot be found");
        }
    }

    public async installPublicScheme(publicScheme: PublicScheme): Promise<void>
    {
        this.applyBackwardCompatibility(publicScheme.cs);
        await this.saveUserColorScheme(publicScheme.cs);

        const storage: PublicSchemesStorage = { publicSchemeIds: await this.getInstalledPublicSchemeIds() };

        const existingPublicSchemes = await this.getInstalledPublicSchemes(storage);

        const overlappingSchemes = Object.entries(existingPublicSchemes)
            .filter(([key, value]) => value.cs.colorSchemeId === publicScheme.cs.colorSchemeId);

        if (overlappingSchemes.length > 0)
        {
            const overlappingIds = overlappingSchemes.map(([key, value]) => value.id);
            storage.publicSchemeIds = storage.publicSchemeIds.filter(id => !overlappingIds.includes(id));

            await this._storageManager.remove(overlappingSchemes.map(([key, _]) => key));
        }

        if (!storage.publicSchemeIds.find(id => id === publicScheme.id))
        {
            storage.publicSchemeIds.push(publicScheme.id);
        }
        (storage as any)[`ps:${publicScheme.id}`] = publicScheme;
        await this._storageManager.set(storage);
    }

    public async getInstalledPublicColorSchemeIds(): Promise<ColorSchemeId[]>
    {
        const storage: PublicSchemesStorage = { publicSchemeIds: await this.getInstalledPublicSchemeIds() };

        const existingPublicSchemes = await this.getInstalledPublicSchemes(storage);

        return Object.values(existingPublicSchemes).map(x => x.cs.colorSchemeId);
    }

    private getInstalledPublicSchemes(storage: PublicSchemesStorage)
    {
        return this._storageManager.get(
            storage.publicSchemeIds.reduce((all, id) =>
            {
                all[`ps:${id}`] = { colorScheme: {} } as any;
                return all;
            }, {} as { [key: string]: PublicScheme }));
    }

    public async getInstalledPublicSchemeIds()
    {
        return (await this._storageManager.get<PublicSchemesStorage>({ publicSchemeIds: [] })).publicSchemeIds;
    }

    private async onStorageChanged(changes: any)
    {
        const key: keyof PublicSchemesStorage = 'publicSchemeIds';
        if (key in changes)
        {
            this._onPublicSchemesChanged.raise(await this.getInstalledPublicSchemeIds());
        }
    }
}