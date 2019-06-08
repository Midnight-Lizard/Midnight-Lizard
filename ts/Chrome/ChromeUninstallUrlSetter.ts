import { injectable } from "../Utils/DI";
import { IUninstallUrlSetter } from "../BackgroundPage/IUninstallUrlSetter";

@injectable(IUninstallUrlSetter)
export class ChromeUninstallUrlSetter implements IUninstallUrlSetter
{
    constructor()
    {
        chrome.runtime
            .setUninstallURL("https://docs.google.com/forms/d/e/1FAIpQLScgAQrFPepzACCRtK_05Yq5nPei4j9O-5fBBCXzrtP6_h5nUA/viewform");
    }
}