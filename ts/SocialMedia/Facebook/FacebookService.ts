/// <reference path="../../DI/-DI.ts" />
/// <reference path="../../Events/-Events.ts" />

namespace MidnightLizard.SocialMedia.Facebook
{
    const dom = Events.HtmlEvent;
    const ArgEventDispatcher = MidnightLizard.Events.ArgumentedEventDispatcher;
    type ArgEvent<TArgs> = MidnightLizard.Events.ArgumentedEvent<TArgs>;

    export abstract class IFacebookService
    {
        abstract getFanCount(): Promise<number>;
        abstract get onInitialized(): ArgEvent<void>;
    }

    @DI.injectable(IFacebookService)
    class FacebookService implements IFacebookService
    {
        protected _onInitialized = new ArgEventDispatcher<void>();
        public get onInitialized()
        {
            return this._onInitialized.event;
        }

        constructor(protected readonly _doc: Document)
        {
            setTimeout(() => this.injectSdk(), 1000);
        }

        protected injectSdk(): void
        {
            (this._doc.defaultView as any).fbAsyncInit = () =>
            {
                FB.init({
                    appId: '271115283358654',
                    xfbml: false,
                    status: false,
                    version: 'v2.9'
                });
                this._onInitialized.raise();
                (FB as any).AppEvents.logPageView();
            };
            if (!this._doc.getElementById("fbsdk"))
            {
                const fbsdk = this._doc.createElement("script");
                fbsdk.id = "fbsdk";
                fbsdk.src = "https://connect.facebook.net/en_US/sdk.js";
                this._doc.head.appendChild(fbsdk);
            }
        }

        getFanCount(): Promise<number>
        {
            return new Promise((resolve, reject) =>
                FB.api('/1911954022366166', 'get',
                    {
                        "fields": "fan_count", "access_token": "271115283358654|D5dhMdeLRzL1wuaqPHu5EYYh2f8"
                    },
                    (page) =>
                    {
                        if (page && !page.error)
                        {
                            resolve(page.fan_count);
                        }
                        else
                        {
                            reject(page || page.error);
                        }
                    }
                ));
        }

    }
}