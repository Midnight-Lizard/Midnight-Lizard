/// <reference path="../DI/-DI.ts" />
/// <reference path="./ColorScheme.ts" />
/// <reference path="./IApplicationSettings.ts" />

namespace MidnightLizard.Settings
{
    const all = [BrowserName.Chrome, BrowserName.Firefox]
    const filter = ProcessingMode.Filter;
    const simple = ProcessingMode.Simplified;
    const complx = ProcessingMode.Complex;

    interface IRecommendation
    {
        browsers: BrowserName[],
        matchPattern: RegExp,
        mode: ProcessingMode | null
    }

    export abstract class IRecommendations
    {
        public abstract getRecommendedProcessingMode(url: string): ProcessingMode | null;
    }

    @DI.injectable(IRecommendations)
    class Recommendations implements IRecommendations
    {
        private readonly cache = new Map<string, ProcessingMode | null>();

        readonly recommendations: IRecommendation[] = [
            { browsers: all, mode: filter, matchPattern: /^https:\/\/(www.)?amazon.com\/.*$/i },
            { browsers: all, mode: filter, matchPattern: /^https:\/\/(www.)?yandex.ru\/.*$/i },
            { browsers: all, mode: simple, matchPattern: /^https:\/\/\w+.wikipedia.org\/.*$/i }
        ];

        constructor(app: MidnightLizard.Settings.IApplicationSettings)
        {
            this.recommendations = this.recommendations.filter(rec => rec.browsers.includes(app.browserName));
        }

        public getRecommendedProcessingMode(url: string): ProcessingMode | null
        {
            let recommandedMode = this.cache.get(url);
            if (recommandedMode === undefined)
            {
                const recommendation = this.recommendations.find(rec => rec.matchPattern.test(url));
                recommandedMode = recommendation ? recommendation.mode : null;
                this.cache.set(url, recommandedMode);
            }
            return recommandedMode;
        }
    }
}
