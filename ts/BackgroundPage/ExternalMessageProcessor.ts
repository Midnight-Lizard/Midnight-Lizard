/// <reference path="../DI/-DI.ts" />
/// <reference path="./IExternalMessageBus.ts" />
/// <reference path="../Settings/ExternalMessages.ts" />
/// <reference path="../Settings/Public/PublicSettingsManager.ts" />

namespace MidnightLizard.BackgroundPage
{
    export abstract class IExternalMessageProcessor { }

    @DI.injectable(IExternalMessageProcessor)
    class ExternalMessageProcessor implements IExternalMessageProcessor
    {
        constructor(
            private readonly externalMessageBus: MidnightLizard.BackgroundPage.IExternalMessageBus,
            private readonly publicSettingsManager: MidnightLizard.Settings.Public.IPublicSettingsManager)
        {
            externalMessageBus.onMessage.addListener(this.processMessage, this);
            externalMessageBus.onConnected.addListener(this.processNewConnection, this);
            publicSettingsManager.onPublicSchemesChanged.addListener(this.notifyAboutChanges, this);
        }

        private notifyAboutChanges(publicSchemeIds?: MidnightLizard.Settings.Public.PublicSchemeId[])
        {
            if (publicSchemeIds)
            {
                this.externalMessageBus.notifyPublicSchemesChanged(publicSchemeIds);
            }
        }

        private async processNewConnection(port: any)
        {
            this.externalMessageBus.sendCurrentPublicSchemes(port,
                await this.publicSettingsManager.getInstalledPublicSchemeIds());
        }

        private async processMessage(message?: Settings.IncommingExternalMessage)
        {
            if (message)
            {
                console.log(message);
                switch (message.type)
                {
                    case Settings.ExternalMessageType.InstallPublicScheme:
                        await this.publicSettingsManager.installPublicScheme(message.publicScheme);
                        break;

                    case Settings.ExternalMessageType.UninstallPublicScheme:
                        await this.publicSettingsManager.uninstallPublicScheme(message.publicSchemeId);
                        break;

                    default:
                        break;
                }
            }
        }
    }
}