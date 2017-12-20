/// <reference path="../DI/-DI.ts" />
/// <reference path="../BackgroundPage/IZoomService.ts" />

namespace Chrome
{
    @MidnightLizard.DI.injectable(MidnightLizard.BackgroundPage.IZoomService)
    class ChromeZoomService implements MidnightLizard.BackgroundPage.IZoomService
    {
        constructor(protected readonly _settingsBus: MidnightLizard.Settings.ISettingsBus)
        {
            chrome.tabs.onZoomChange.addListener(this.onZoomChanged.bind(this));
        }

        protected onZoomChanged(e: chrome.tabs.ZoomChangeInfo)
        {
            if (e.tabId)
            {
                this._settingsBus.setTabZoom(e.tabId, e.newZoomFactor)
            }
        }
    }
}