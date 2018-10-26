/// <reference path="../DI/-DI.ts" />
/// <reference path="./DocumentZoomObserver.ts" />


namespace MidnightLizard.ContentScript
{
    const defaultDpi = 96;

    const dpiLevels = [72, 96, 120, 144, 192, 288, 384];

    export abstract class IResolutionService
    {
        abstract getDocumentResolution(doc: Document): number;
    }

    @DI.injectable(IResolutionService)
    class ResolutionService implements IResolutionService
    {
        constructor(
            private readonly _zoom: MidnightLizard.ContentScript.IDocumentZoomObserver)
        { }

        getDocumentResolution(doc: Document): number
        {
            let currentDpi = defaultDpi;
            for (const dpi of dpiLevels)
            {
                if (doc.defaultView.matchMedia(`(max-resolution: ${dpi}dpi)`).matches)
                {
                    currentDpi = dpi;
                    break;
                }
            }
            return currentDpi * this._zoom.CurrentZoom / defaultDpi
        }
    }
}