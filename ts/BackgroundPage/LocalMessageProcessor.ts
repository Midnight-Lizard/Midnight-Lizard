/// <reference path="../DI/-DI.ts" />
/// <reference path="./IBackgroundMessageBus.ts" />
/// <reference path="../Settings/Messages.ts" />
/// <reference path="./ImageFetcher.ts" />

namespace MidnightLizard.BackgroundPage
{
    export abstract class ILocalMessageProcessor { }

    @DI.injectable(ILocalMessageProcessor)
    class LocalMessageProcessor implements ILocalMessageProcessor
    {
        constructor(
            private readonly messageBus: MidnightLizard.BackgroundPage.IBackgroundMessageBus,
            private readonly fetcher: MidnightLizard.BackgroundPage.IImageFetcher)
        {
            messageBus.onMessage.addListener(this.processMessage, this);
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
                        case Settings.MessageType.FetchImage: {
                            try
                            {
                                const image = await this.fetcher.fetchImage(message.url, message.maxSize);
                                this.messageBus.postMessage(port,
                                    new Settings.ImageFetchCompleted(message.url, image));
                            }
                            catch (ex)
                            {
                                this.messageBus.postMessage(port,
                                    new Settings.ImageFetchFailed(message.url, ex.message || ex));
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
                        new MidnightLizard.Settings.ErrorMessage("Local message processing failed", {
                            message: error.message || error, stack: error.stack
                        }));
                }
            }
        }
    }
}