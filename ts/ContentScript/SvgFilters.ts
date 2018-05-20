/// <reference path="../DI/-DI.ts" />
/// <reference path="../Settings/BaseSettingsManager.ts" />
/// <reference path="../Settings/IApplicationSettings.ts" />
/// <reference path="../Colors/RgbaColor.ts" />

namespace MidnightLizard.ContentScript
{
    const svgNs = "http://www.w3.org/2000/svg", svgElementId = "midnight-lizard-filters";

    export abstract class ISvgFilters
    {
        public abstract createSvgFilters(doc: Document): void
        public abstract remodeSvgFilters(doc: Document): void
    }

    export enum FilterType
    {
        BlueFilter = "ml-blue-filter",
        PdfFilter = "pdf-bg-filter"
    }

    @DI.injectable(ISvgFilters)
    class SvgFilters implements ISvgFilters
    {
        constructor(
            protected readonly _app: MidnightLizard.Settings.IApplicationSettings,
            protected readonly _settingsManager: MidnightLizard.Settings.IBaseSettingsManager)
        {
        }

        public remodeSvgFilters(doc: Document): void
        {
            const svgFilters = doc.getElementById(svgElementId);
            svgFilters && svgFilters.remove();
        }

        public createSvgFilters(doc: Document): void
        {
            const svg = doc.createElementNS(svgNs, "svg");
            svg.id = svgElementId
            svg.mlIgnore = true;
            svg.style.height = "0px";
            svg.style.position = "absolute";
            svg.style.setProperty("--ml-ignore", "true");

            svg.appendChild(this.createBlueFilter(doc));

            svg.appendChild(this.createColorReplacementFilter(
                doc, FilterType.PdfFilter,
                new Colors.RgbaColor(240, 240, 240, 1),
                new Colors.RgbaColor(82, 86, 89, 1)));

            (this._app.browserName === Settings.BrowserName.Chrome
                ? doc.head || doc.documentElement
                : doc.documentElement).appendChild(svg);
        }

        private createBlueFilter(doc: Document)
        {
            const
                filter = doc.createElementNS(svgNs, "filter"),
                feColorMatrix = doc.createElementNS(svgNs, "feColorMatrix"),
                blueFltr = this._settingsManager.currentSettings.blueFilter / 100,
                redShiftMatrix = `1 0 ${blueFltr} 0 0 0 1 0 0 0 0 0 ${1 - blueFltr} 0 0 0 0 0 1 0`;

            filter.id = FilterType.BlueFilter;
            filter.setAttribute("color-interpolation-filters", "sRGB");
            filter.appendChild(feColorMatrix);

            feColorMatrix.setAttribute("type", "matrix");
            feColorMatrix.setAttribute("values", redShiftMatrix);

            return filter;
        }

        private createColorReplacementFilter(doc: Document,
            filterId: string,
            newColor: Colors.RgbaColor,
            ...originalColors: Colors.RgbaColor[])
        {
            const replaceColorFilter = doc.createElementNS(svgNs, "filter");
            replaceColorFilter.id = filterId;
            replaceColorFilter.setAttribute("color-interpolation-filters", "sRGB");

            const feComponentTransfer = doc.createElementNS(svgNs, "feComponentTransfer"),
                feFuncR = doc.createElementNS(svgNs, "feFuncR"),
                feFuncG = doc.createElementNS(svgNs, "feFuncG"),
                feFuncB = doc.createElementNS(svgNs, "feFuncB");
            feFuncR.setAttribute("type", "discrete");
            feFuncG.setAttribute("type", "discrete");
            feFuncB.setAttribute("type", "discrete");
            feFuncR.setAttribute("tableValues",
                this.convertColorsToComponentTransfer(...originalColors.map(x => x.red)));
            feFuncG.setAttribute("tableValues",
                this.convertColorsToComponentTransfer(...originalColors.map(x => x.green)));
            feFuncB.setAttribute("tableValues",
                this.convertColorsToComponentTransfer(...originalColors.map(x => x.blue)));
            feComponentTransfer.appendChild(feFuncR);
            feComponentTransfer.appendChild(feFuncG);
            feComponentTransfer.appendChild(feFuncB);
            replaceColorFilter.appendChild(feComponentTransfer);

            const cutColorMatrix = doc.createElementNS(svgNs, "feColorMatrix"),
                selectedColorLayer = "selectedColor";
            cutColorMatrix.setAttribute("result", selectedColorLayer);
            cutColorMatrix.setAttribute("type", "matrix");
            cutColorMatrix.setAttribute("values", `1 0 0 0 0
                                                   0 1 0 0 0
                                                   0 0 1 0 0
                                                   1 1 1 1 -3`);
            replaceColorFilter.appendChild(cutColorMatrix);

            const feFlood = doc.createElementNS(svgNs, "feFlood");
            feFlood.setAttribute("flood-color", newColor.toString());
            replaceColorFilter.appendChild(feFlood);

            const feCompositeSelectedColor = doc.createElementNS(svgNs, "feComposite");
            feCompositeSelectedColor.setAttribute("operator", "in");
            feCompositeSelectedColor.setAttribute("in2", selectedColorLayer);
            replaceColorFilter.appendChild(feCompositeSelectedColor);

            const feCompositeSourceGraphic = doc.createElementNS(svgNs, "feComposite");
            feCompositeSourceGraphic.setAttribute("operator", "over");
            feCompositeSourceGraphic.setAttribute("in2", "SourceGraphic");
            replaceColorFilter.appendChild(feCompositeSourceGraphic);

            return replaceColorFilter;
        }

        private convertColorsToComponentTransfer(...colorComponents: number[]): string
        {
            const transfer = Array.apply(null, Array(256)).map(Number.prototype.valueOf, 0);
            colorComponents.forEach(c => transfer[c] = 1);
            return transfer.join(" ");
        }
    }
}