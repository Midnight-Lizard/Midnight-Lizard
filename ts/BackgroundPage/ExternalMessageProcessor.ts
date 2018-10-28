/// <reference path="../DI/-DI.ts" />
/// <reference path="./IBackgroundMessageBus.ts" />
/// <reference path="../Settings/Messages.ts" />
/// <reference path="../Settings/Public/PublicSettingsManager.ts" />

namespace MidnightLizard.BackgroundPage
{
    export abstract class IExternalMessageProcessor { }

    @DI.injectable(IExternalMessageProcessor)
    class ExternalMessageProcessor implements IExternalMessageProcessor
    {
        constructor(
            private readonly messageBus: MidnightLizard.BackgroundPage.IBackgroundMessageBus,
            private readonly publicSettingsManager: MidnightLizard.Settings.Public.IPublicSettingsManager)
        {
            messageBus.onMessage.addListener(this.processMessage, this);
            publicSettingsManager.onPublicSchemesChanged.addListener(this.notifyAboutChanges, this);
        }

        private notifyAboutChanges(publicSchemeIds?: MidnightLizard.Settings.Public.PublicSchemeId[])
        {
            if (publicSchemeIds)
            {
                this.messageBus.broadcastMessage(
                    new MidnightLizard.Settings.PublicSchemesChanged(publicSchemeIds), "portal");
            }
        }

        private async sendInstalledPublicSchemesBackTo(port: any)
        {
            this.messageBus.postMessage(port,
                new MidnightLizard.Settings.PublicSchemesChanged(
                    await this.publicSettingsManager.getInstalledPublicSchemeIds()));
        }

        private async processMessage(msg?: { port: any, message: Settings.MessageToBackgroundPage })
        {
            if (msg)
            {
                const { port, message } = msg;
                try
                {
                    switch (message.type)
                    {
                        case Settings.MessageType.GetInstalledPublicSchemes:
                            await this.sendInstalledPublicSchemesBackTo(port);
                            break;

                        case Settings.MessageType.InstallPublicScheme:
                            await this.publicSettingsManager.installPublicScheme(message.publicScheme);
                            break;

                        case Settings.MessageType.UninstallPublicScheme:
                            await this.publicSettingsManager.uninstallPublicScheme(message.publicSchemeId);
                            break;

                        default:
                            break;
                    }
                }
                catch (error)
                {
                    this.messageBus.postMessage(port,
                        new MidnightLizard.Settings.ErrorMessage("Midnight Lizard extension failed", {
                            message: error.message || error, stack: error.stack
                        }));
                }
            }
        }
    }
}