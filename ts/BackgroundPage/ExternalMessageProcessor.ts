import { injectable } from "../Utils/DI";
import { IBackgroundMessageBus } from "./IBackgroundMessageBus";
import
{
    PublicSchemesChanged, MessageToBackgroundPage, MessageType, ErrorMessage
} from "../Settings/Messages";
import { IPublicSettingsManager } from "../Settings/Public/PublicSettingsManager";
import { PublicSchemeId } from "../Settings/Public/PublicScheme";

export abstract class IExternalMessageProcessor { }

@injectable(IExternalMessageProcessor)
export class ExternalMessageProcessor implements IExternalMessageProcessor
{
    constructor(
        private readonly messageBus: IBackgroundMessageBus,
        private readonly publicSettingsManager: IPublicSettingsManager)
    {
        messageBus.onMessage.addListener(this.processMessage, this);
        publicSettingsManager.onPublicSchemesChanged.addListener(this.notifyAboutChanges, this);
    }

    private notifyAboutChanges(publicSchemeIds?: PublicSchemeId[])
    {
        if (publicSchemeIds)
        {
            this.messageBus.broadcastMessage(
                new PublicSchemesChanged(publicSchemeIds), "portal");
        }
    }

    private async sendInstalledPublicSchemesBackTo(port: any)
    {
        this.messageBus.postMessage(port,
            new PublicSchemesChanged(
                await this.publicSettingsManager.getInstalledPublicSchemeIds()));
    }

    private async processMessage(msg?: { port: any, message: MessageToBackgroundPage })
    {
        if (msg)
        {
            const { port, message } = msg;
            try
            {
                switch (message.type)
                {
                    case MessageType.GetInstalledPublicSchemes:
                        await this.sendInstalledPublicSchemesBackTo(port);
                        break;

                    case MessageType.InstallPublicScheme:
                        await this.publicSettingsManager.installPublicScheme(message.publicScheme);
                        break;

                    case MessageType.UninstallPublicScheme:
                        await this.publicSettingsManager.uninstallPublicScheme(message.publicSchemeId);
                        break;

                    case MessageType.ApplyPublicScheme:
                        await this.publicSettingsManager.applyPublicScheme(message.publicSchemeId, message.hostName);
                        break;

                    case MessageType.SetPublicSchemeAsDefault:
                        await this.publicSettingsManager.setPublicSchemeAsDefault(message.publicSchemeId);
                        break;

                    default:
                        break;
                }
            }
            catch (error)
            {
                this.messageBus.postMessage(port,
                    new ErrorMessage("Midnight Lizard extension failed", {
                        message: error.message || error, stack: error.stack
                    }));
            }
        }
    }
}