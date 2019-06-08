import { injectable } from "../Utils/DI";
import { IZoomService } from "../BackgroundPage/IZoomService";
import { ISettingsBus } from "../Settings/ISettingsBus";

@injectable(IZoomService)
export class ChromeZoomService implements IZoomService
{
    constructor(protected readonly _settingsBus: ISettingsBus)
    {
        chrome.tabs.onZoomChange.addListener(this.onZoomChanged.bind(this));
    }

    protected onZoomChanged(e: chrome.tabs.ZoomChangeInfo)
    {
        if (e.tabId)
        {
            this._settingsBus.setTabZoom(e.tabId, e.newZoomFactor)
                .catch(() => { });
        }
    }
}