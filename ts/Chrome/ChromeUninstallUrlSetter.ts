/// <reference path="../DI/-DI.ts" />
/// <reference path="../BackgroundPage/IUninstallUrlSetter.ts" />

namespace Chrome
{
    @MidnightLizard.DI.injectable(MidnightLizard.BackgroundPage.IUninstallUrlSetter)
    class ChromeUninstallUrlSetter implements MidnightLizard.BackgroundPage.IUninstallUrlSetter
    {
        constructor()
        {
            chrome.runtime.setUninstallURL("https://docs.google.com/forms/d/e/1FAIpQLScgAQrFPepzACCRtK_05Yq5nPei4j9O-5fBBCXzrtP6_h5nUA/viewform");
        }
    }
}