/// <reference path="../../DI/-DI.ts" />
/// <reference path="../IApplicationSettings.ts" />
/// <reference path="../IStorageManager.ts" />
/// <reference path="../MatchPatternProcessor.ts" />
/// <reference path="../../i18n/ITranslationAccessor.ts" />
/// <reference path="../BaseSettingsManager.ts" />
/// <reference path="./PublicScheme.ts" />

namespace MidnightLizard.Settings.Public
{
    declare type PublicSchemesStorage = { publicSchemeIds: PublicSchemeId[] };

    export abstract class IPublicSettingsManager
    {
        public abstract async installPublicScheme(publicScheme: Public.PublicScheme): Promise<void>;
        public abstract async uninstallPublicScheme(publicSchemeId: Public.PublicSchemeId): Promise<void>;
        public abstract async getInstalledPublicSchemeIds(): Promise<PublicSchemeId[]>;
        public abstract async getInstalledPublicColorSchemeIds(): Promise<Settings.ColorSchemeId[]>;
        public abstract get onPublicSchemesChanged(): MidnightLizard.Events.ArgumentedEvent<PublicSchemeId[]>;
    }

    @DI.injectable(IPublicSettingsManager)
    class PublicSettingsManager extends MidnightLizard.Settings.BaseSettingsManager implements IPublicSettingsManager
    {
        private _onPublicSchemesChanged = new MidnightLizard.Events.ArgumentedEventDispatcher<PublicSchemeId[]>();
        public get onPublicSchemesChanged()
        {
            return this._onPublicSchemesChanged.event;
        }

        constructor(rootDocument: Document,
            app: MidnightLizard.Settings.IApplicationSettings,
            storageManager: MidnightLizard.Settings.IStorageManager,
            settingsBus: MidnightLizard.Settings.ISettingsBus,
            matchPatternProcessor: MidnightLizard.Settings.IMatchPatternProcessor,
            i18n: MidnightLizard.i18n.ITranslationAccessor)
        {
            super(rootDocument, app, storageManager, settingsBus, matchPatternProcessor, i18n);
            this.isInit = true
            storageManager.onStorageChanged.addListener(this.onStorageChanged, this);
        }

        public initDefaultColorSchemes() { }

        protected initCurrentSettings() { }

        public async uninstallPublicScheme(publicSchemeId: Public.PublicSchemeId)
        {
            const key = `ps:${publicSchemeId}`;
            const publicScheme = (await this._storageManager.get({ [key]: null as any as Public.PublicScheme }))[key];
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
                }, {} as { [key: string]: Public.PublicScheme }));
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
}