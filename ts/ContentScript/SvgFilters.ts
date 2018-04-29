/// <reference path="../DI/-DI.ts" />
/// <reference path="../Settings/BaseSettingsManager.ts" />
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

            svg.appendChild(this.createBlueFilter(doc));

            if (doc.location && /.+\.pdf(#.*)?/i.test(doc.location.href))
            {
                svg.appendChild(this.createColorReplacementFilter(
                    doc, FilterType.PdfFilter,
                    new Colors.RgbaColor(82, 86, 89, 1),
                    new Colors.RgbaColor(240, 240, 240, 1)));
            }

            (doc.head || doc.documentElement).appendChild(svg);
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
            originalColor: Colors.RgbaColor,
            newColor: Colors.RgbaColor)
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
                this.convertColorToComponentTransfer(originalColor.red));
            feFuncG.setAttribute("tableValues",
                this.convertColorToComponentTransfer(originalColor.green));
            feFuncB.setAttribute("tableValues",
                this.convertColorToComponentTransfer(originalColor.blue));
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

        private convertColorToComponentTransfer(colorComponent: number): string
        {
            return "0 ".repeat(colorComponent) + "1 " + "0 ".repeat(255 - colorComponent);
        }
    }
}