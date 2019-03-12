/// <reference path="../DI/-DI.ts" />
/// <reference path="./ColorScheme.ts" />
/// <reference path="./IApplicationSettings.ts" />

namespace MidnightLizard.Settings
{
    const chrom = [BrowserName.Chrome];
    const firfx = [BrowserName.Firefox];
    const allbr = [BrowserName.Chrome, BrowserName.Firefox]
    const filter = ProcessingMode.Filter;
    const simple = ProcessingMode.Simplified;
    const complx = ProcessingMode.Complex;
    const _none_ = null;

    const enum Platform
    {
        mobile,
        desktop
    }
    const allpf = [Platform.desktop, Platform.mobile];

    interface IRecommendation
    {
        browsers: BrowserName[],
        platforms: Platform[],
        matchPattern: RegExp,
        mode: ProcessingMode | null
    }

    export abstract class IRecommendations
    {
        public abstract getRecommendedProcessingMode(...urls: string[]): ProcessingMode | null | undefined;
    }

    @DI.injectable(IRecommendations)
    class Recommendations implements IRecommendations
    {
        private readonly cache = new Map<string, ProcessingMode | null>();

        readonly recommendations: IRecommendation[] = [
            { browsers: allbr, platforms: allpf, mode: _none_, matchPattern: /^https:\/\/(www.)?yandex.ru\/\?stream_channel.*$/i },
            { browsers: allbr, platforms: allpf, mode: _none_, matchPattern: /^https:\/\/(www.)?yastatic.net\/.*$/i },

            { browsers: allbr, platforms: allpf, mode: complx, matchPattern: /^https:\/\/web.whatsapp.com\/$/i },
            { browsers: allbr, platforms: allpf, mode: complx, matchPattern: /^https:\/\/(www.)?yandex.ru\/portal\/video.*$/i },
            { browsers: allbr, platforms: allpf, mode: complx, matchPattern: /^https:\/\/(www.)?yandex.ru\/images\/*$/i },

            { browsers: allbr, platforms: allpf, mode: simple, matchPattern: /^https:\/\/\w+.wikipedia.org\/.*$/i },

            { browsers: allbr, platforms: allpf, mode: filter, matchPattern: /^https:\/\/(www.)?amazon.com\/.*$/i },
            { browsers: allbr, platforms: allpf, mode: filter, matchPattern: /^https:\/\/(www.)?twitter.com\/.*$/i },
            { browsers: allbr, platforms: allpf, mode: filter, matchPattern: /^https:\/\/\w+.slack.com\/.*$/i },
            { browsers: allbr, platforms: allpf, mode: filter, matchPattern: /^https:\/\/(www.)?yandex.ru\/.*$/i },

            { browsers: chrom, platforms: allpf, mode: filter, matchPattern: /^https:\/\/(www.)?facebook.com\/.*$/i },
        ];

        constructor(app: MidnightLizard.Settings.IApplicationSettings)
        {
            const currentPlatform = app.isMobile ? Platform.mobile : Platform.desktop;
            this.recommendations = this.recommendations.filter(rec =>
                rec.browsers.includes(app.browserName) &&
                rec.platforms.includes(currentPlatform));
        }

        public getRecommendedProcessingMode(...urls: string[]): ProcessingMode | null | undefined
        {
            let recommandedMode: ProcessingMode | null | undefined = undefined;
            for (const url of new Set(urls))
            {
                recommandedMode = this.cache.get(url);
                if (recommandedMode === undefined)
                {
                    const recommendation = this.recommendations.find(rec => rec.matchPattern.test(url));
                    if (recommendation)
                    {
                        recommandedMode = recommendation.mode;
                        this.cache.set(url, recommandedMode);
                    }
                }
                if (recommandedMode !== undefined)
                {
                    break;
                }
            }
            return recommandedMode;
        }
    }
}
