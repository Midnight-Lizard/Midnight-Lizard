import { injectable } from "../Utils/DI";
import { IApplicationSettings } from "../Settings/IApplicationSettings";
import { IBaseSettingsManager } from "../Settings/BaseSettingsManager";
import { RgbaColor } from "../Colors/RgbaColor";

export const colorOverlayLimit = 0.12;
const svgNs = "http://www.w3.org/2000/svg", svgElementId = "midnight-lizard-filters";

export abstract class ISvgFilters
{
    public abstract createSvgFilters(doc: Document, overlayBgColor: string, overlayTxtColor: string): void
    public abstract removeSvgFilters(doc: Document): void
}

export enum FilterType
{
    ContentFilter = "ml-content-filter",
    BlueFilter = "ml-blue-filter",
    PdfFilter = "pdf-bg-filter"
}

@injectable(ISvgFilters)
class SvgFilters implements ISvgFilters
{
    constructor(
        protected readonly _app: IApplicationSettings,
        protected readonly _settingsManager: IBaseSettingsManager)
    {
    }

    public removeSvgFilters(doc: Document): void
    {
        const svgFilters = doc.getElementById(svgElementId);
        svgFilters && svgFilters.remove();
    }

    public createSvgFilters(doc: Document, overlayBgColor: string, overlayTxtColor: string): void
    {
        const svg = doc.createElementNS(svgNs, "svg");
        svg.id = svgElementId
        svg.mlIgnore = true;
        svg.style.width = svg.style.height = "0";
        svg.style.position = "absolute";
        // svg.style.setProperty("--ml-ignore", "true");

        const filters = [
            this.createBlueFilter(doc),
            this.createContentFilter(doc, overlayBgColor, overlayTxtColor),
            this.createColorReplacementFilter(
                doc, FilterType.PdfFilter,
                new RgbaColor(240, 240, 240, 1),
                new RgbaColor(82, 86, 89, 1))
        ];

        for (const filter of filters) {
            filter.setAttribute("x","0");
            filter.setAttribute("y","0");
            filter.setAttribute("width","99999");
            filter.setAttribute("height","99999");
            svg.appendChild(filter);
        }

        // (this._app.browserName === BrowserName.Chrome
        //     ? doc.head || doc.documentElement!
        //     : doc.documentElement!).appendChild(svg);

        doc.documentElement!.appendChild(svg);
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

        if (blueFltr > 0)
        {
            filter.appendChild(feColorMatrix);
            feColorMatrix.setAttribute("type", "matrix");
            feColorMatrix.setAttribute("values", redShiftMatrix);
        }

        return filter;
    }

    private createContentFilter(doc: Document, overlayBgColor: string, overlayTxtColor: string)
    {
        const
            filter = doc.createElementNS(svgNs, "filter"),
            feColorMatrix = doc.createElementNS(svgNs, "feColorMatrix"),
            blueFltr = this._settingsManager.currentSettings.blueFilter / 100,
            redShiftMatrix = `1 0 ${blueFltr} 0 0 0 1 0 0 0 0 0 ${1 - blueFltr} 0 0 0 0 0 1 0`;

        filter.id = FilterType.ContentFilter;
        filter.setAttribute("color-interpolation-filters", "sRGB");

        let input = "SourceGraphic";
        input = this.addColorOverlay(overlayBgColor, doc, filter, input, "bg", this._settingsManager.shift.Background.hueGravity);
        input = this.addColorOverlay(overlayTxtColor, doc, filter, input, "txt", this._settingsManager.shift.Text.hueGravity);

        if (blueFltr > 0)
        {
            filter.appendChild(feColorMatrix);
            feColorMatrix.setAttribute("type", "matrix");
            feColorMatrix.setAttribute("values", redShiftMatrix);
            feColorMatrix.setAttribute("in", input);
        }

        return filter;
    }

    private addColorOverlay(overlayColor: string, doc: Document,
        filter: SVGFilterElement, input: string, layer: string, overlayIntensity: number)
    {
        let output = input;
        const overlayColorHsl = RgbaColor.toHslaColor(RgbaColor.parse(overlayColor));
        if (overlayColorHsl.saturation > colorOverlayLimit)
        {
            const isDark = overlayColorHsl.lightness < 0.5;
            const blendMode = isDark ? "lighten" : "darken";
            overlayColorHsl.lightness *= isDark ? 1.1 : 1;
            const
                feFlood = doc.createElementNS(svgNs, "feFlood"),
                feComposite = doc.createElementNS(svgNs, "feComposite"),
                feBlend = doc.createElementNS(svgNs, "feBlend");

            filter.appendChild(feFlood);
            feFlood.setAttribute("result", "flood_" + layer);
            feFlood.setAttribute("flood-color", overlayColorHsl.toString());
            feFlood.setAttribute("flood-opacity", (overlayIntensity / 2 + 0.5).toString());

            filter.appendChild(feComposite);
            feComposite.setAttribute("result", "flood_alpha_" + layer);
            feComposite.setAttribute("in", "flood_" + layer);
            feComposite.setAttribute("in2", "SourceAlpha");
            feComposite.setAttribute("operator", "in");

            filter.appendChild(feBlend);
            feBlend.setAttribute("result", "blend_" + layer);
            feBlend.setAttribute("in", "flood_alpha_" + layer);
            feBlend.setAttribute("in2", input);
            feBlend.setAttribute("mode", blendMode);

            output = "blend_" + layer;
        }
        return output;
    }

    private createColorReplacementFilter(doc: Document,
        filterId: string,
        newColor: RgbaColor,
        ...originalColors: RgbaColor[])
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
        colorComponents.forEach(c => transfer[Math.round(c)] = 1);
        return transfer.join(" ");
    }
}