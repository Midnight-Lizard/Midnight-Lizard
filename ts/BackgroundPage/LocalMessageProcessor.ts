import { injectable } from "../Utils/DI";
import { IBackgroundMessageBus } from "./IBackgroundMessageBus";
import { IImageFetcher } from "./ImageFetcher";
import
{
    MessageToBackgroundPage, MessageType, ImageFetchCompleted,
    ImageFetchFailed, ErrorMessage
} from "../Settings/Messages";

export abstract class ILocalMessageProcessor { }

@injectable(ILocalMessageProcessor)
export class LocalMessageProcessor implements ILocalMessageProcessor
{
    constructor(
        private readonly messageBus: IBackgroundMessageBus,
        private readonly fetcher: IImageFetcher)
    {
        messageBus.onMessage.addListener(this.processMessage, this);
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
                    case MessageType.FetchImage: {
                        try
                        {
                            const image = await this.fetcher.fetchImage(message.url, message.maxSize);
                            this.messageBus.postMessage(port,
                                new ImageFetchCompleted(message.url, image));
                        }
                        catch (ex)
                        {
                            this.messageBus.postMessage(port,
                                new ImageFetchFailed(message.url, ex.message || ex));
                        }
                        break;
                    }

                    default:
                        break;
                }
            }
            catch (error)
            {
                this.messageBus.postMessage(port,
                    new ErrorMessage("Local message processing failed", {
                        message: error.message || error, stack: error.stack
                    }));
            }
        }
    }
}