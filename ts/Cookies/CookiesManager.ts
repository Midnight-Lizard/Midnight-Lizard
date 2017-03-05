/// <reference path="../DI/-DI.ts" />

namespace MidnightLizard.Cookies
{

    export abstract class ICookiesManager
    {
        abstract getCookie(name: string): string | null;
        abstract setCookie(name: string, value: any, exdays?: number): void;
        abstract deleteCookieByName(name: string): void;
        abstract deleteCookieByRegExp(regExp: RegExp): void;
    }
    /**
     * CookiesManager
     */
    @DI.injectable(ICookiesManager)
    class CookiesManager implements ICookiesManager
    {
        constructor(protected readonly _document: Document) { }

        getCookie(name: string): string | null
        {
            let i, x, y, arrCookies = this._document.cookie.split(";");
            for (i = 0; i < arrCookies.length; i++)
            {
                x = arrCookies[i].substr(0, arrCookies[i].indexOf("="));
                y = arrCookies[i].substr(arrCookies[i].indexOf("=") + 1);
                x = x.replace(/^\s+|\s+$/g, "");
                if (x == name)
                {
                    return unescape(y);
                }
            }
            return null;
        }

        setCookie(name: string, value: any, exdays = 1): void
        {
            if (value !== undefined)
            {
                let date = new Date();
                date.setTime(date.getTime() + (exdays * 24 * 60 * 60 * 1000));
                let record = escape(value) + ";expires=" + date.toUTCString() + ";domain=" + this._document.location.hostname + ";path=/";
                this._document.cookie = name + "=" + record;
            }
        }

        deleteCookieByName(name: string): void
        {
            this.setCookie(name, '', 0);
        }

        deleteCookieByRegExp(regExp: RegExp): void
        {
            let forDelete = this._document.cookie.match(regExp);
            forDelete && forDelete.forEach(cn => this.deleteCookieByName(cn));
        }
    }
    declare function escape(str: any): string;
    declare function unescape(str: any): string;
}