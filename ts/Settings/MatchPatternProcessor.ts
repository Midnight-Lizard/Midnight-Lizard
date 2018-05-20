/// <reference path="../DI/-DI.ts" />

namespace MidnightLizard.Settings
{
    const schemeSegment = "(\\*|http|https|file|ftp)";
    const hostSegment = "(\\*|(?:\\*\\.)?(?:[^/*]+))?";
    const pathSegment = "(.*)";
    const matchPatternRegExp = new RegExp(
        `^${schemeSegment}://${hostSegment}/${pathSegment}$`, "i"
    );

    export abstract class IMatchPatternProcessor
    {
        abstract validatePattern(pattern: string): string;
        abstract testUrl(pattern: string, url: string, invalidResult: boolean): boolean;
    }

    @DI.injectable(IMatchPatternProcessor)
    class MatchPatternProcessor implements IMatchPatternProcessor
    {
        constructor(protected readonly _i18n: MidnightLizard.i18n.ITranslationAccessor) { }

        public validatePattern(pattern: string): string
        {
            if (pattern === '' || pattern === "*" || pattern === "<all_urls>")
            {
                return "";
            }

            let match = matchPatternRegExp.exec(pattern);
            if (!match)
            {
                return this._i18n.getMessage("invalidMatchPattern", pattern);
            }

            let [, scheme, host, path] = match;
            if (scheme !== "file" && !host)
            {
                return this._i18n.getMessage("invalidMatchPatternHost", pattern);
            }

            return "";
        }

        public testUrl(pattern: string, url: string, invalidResult: boolean): boolean
        {
            if (this.validatePattern(pattern) === "")
            {
                const regexp = this.convertMatchPatternToRegExp(pattern);
                return regexp.test(url);
            }
            return invalidResult;
        }

        protected convertMatchPatternToRegExp(pattern: string)
        {
            const match = matchPatternRegExp.exec(pattern);
            if (match)
            {
                let [, scheme, host, path] = match;

                let regex = '^';

                if (scheme === '*')
                {
                    regex += '(http|https|file)';
                }
                else
                {
                    regex += scheme;
                }

                regex += '://';

                if (host && host === '*')
                {
                    regex += '[^/]*?';
                }
                else if (host)
                {
                    if (host.match(/^\*\./))
                    {
                        regex += '[^/]*?';
                        host = host.substring(2);
                    }
                    regex += host.replace(/[\[\](){}?+\^\$\\\.|\-]/g, "\\$&");
                }

                if (path)
                {
                    if (path === '*')
                    {
                        regex += '(/.*)?';
                    }
                    else if (path.charAt(0) !== '/')
                    {
                        regex += '/';
                        regex += path
                            .replace(/[\[\](){}?+\^\$\\\.|\-]/g, "\\$&")
                            .replace(/\*/g, '.*?');
                        regex += '/?';
                    }
                }
                else
                {
                    regex += '/?';
                }

                regex += '$';
                return new RegExp(regex, "i");
            }
            return /.*/;
        }
    }
}