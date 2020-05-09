import { BrowserName, IApplicationSettings } from "./IApplicationSettings";
import { ProcessingMode } from "./ColorScheme";
import { injectable } from "../Utils/DI";

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
    mode?: ProcessingMode | null,
    observe: boolean
}

export abstract class IRecommendations
{
    public abstract getRecommendedProcessingMode(...urls: string[]): ProcessingMode | null | undefined;
    public abstract shouldObserve(...urls: string[]): boolean;
}

@injectable(IRecommendations)
class Recommendations implements IRecommendations
{
    private readonly cache = new Map<string, ProcessingMode | null | undefined>();

    readonly recommendations: IRecommendation[] = [
        { browsers: allbr, platforms: allpf, mode: _none_, observe: false, matchPattern: /^https:\/\/(www.)?yandex.ru\/\?stream_channel.*$/i },
        { browsers: allbr, platforms: allpf, mode: _none_, observe: false, matchPattern: /^https:\/\/(www.)?yastatic.net\/.*$/i },

        { browsers: allbr, platforms: allpf, mode: complx, observe: true, matchPattern: /^https:\/\/web.whatsapp.com\/$/i },
        { browsers: allbr, platforms: allpf, mode: complx, observe: true, matchPattern: /^https:\/\/(www.)?yandex.ru\/portal\/video.*$/i },
        { browsers: allbr, platforms: allpf, mode: complx, observe: true, matchPattern: /^https:\/\/(www.)?yandex.ru\/images\/*$/i },

        { browsers: allbr, platforms: allpf, mode: simple, observe: true, matchPattern: /^https:\/\/\w+.wikipedia.org\/.*$/i },

        { browsers: allbr, platforms: allpf, mode: filter, observe: false, matchPattern: /^https:\/\/(www.)?amazon.com\/.*$/i },
        { browsers: allbr, platforms: allpf, mode: filter, observe: false, matchPattern: /^https:\/\/(www.)?twitter.com\/.*$/i },
        { browsers: allbr, platforms: allpf, mode: filter, observe: false, matchPattern: /^https:\/\/\w+.slack.com\/.*$/i },
        { browsers: allbr, platforms: allpf, mode: filter, observe: false, matchPattern: /^https:\/\/(www.)?yandex.ru\/.*$/i },

        { browsers: chrom, platforms: allpf, mode: filter, observe: false, matchPattern: /^https:\/\/(www.)?facebook.com\/.*$/i },
        { browsers: allbr, platforms: allpf, observe: false, matchPattern: /^https:\/\/(www.)?facebook.com\/.*$/i },
    ];

    constructor(app: IApplicationSettings)
    {
        const currentPlatform = app.isMobile ? Platform.mobile : Platform.desktop;
        this.recommendations = this.recommendations.filter(rec =>
            rec.browsers.includes(app.browserName) &&
            rec.platforms.includes(currentPlatform));
    }

    public shouldObserve(...urls: string[]): boolean 
    {
        let shouldObserve: boolean | undefined = undefined;
        for (const url of new Set(urls))
        {
            if (shouldObserve === undefined)
            {
                const recommendation = this.recommendations.find(rec => rec.matchPattern.test(url));
                if (recommendation)
                {
                    shouldObserve = recommendation.observe;
                }
            }
            if (shouldObserve !== undefined)
            {
                break;
            }
        }
        return shouldObserve === undefined ? true : shouldObserve;
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
