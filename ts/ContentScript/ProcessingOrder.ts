namespace MidnightLizard.ContentScript
{
    export enum ProcessingOrder
    {
        viewColorTags,
        visColorTags,
        viewImageTags,
        viewLinks,
        viewBgImageTags,
        viewTransTags,
        visImageTags,
        visLinks,
        visTransTags,
        visBgImageTags,
        invisColorTags,
        invisImageTags,
        invisTransTags,
        invisLinks,
        invisBgImageTags
    }

    export const normalDelays = new Map<ProcessingOrder, number>([
        [ProcessingOrder.viewColorTags, 0],
        [ProcessingOrder.visColorTags, 1],
        [ProcessingOrder.viewImageTags, 5],
        [ProcessingOrder.viewLinks, 10],
        [ProcessingOrder.viewBgImageTags, 50],
        [ProcessingOrder.viewTransTags, 100],
        [ProcessingOrder.visImageTags, 175],
        [ProcessingOrder.visLinks, 250],
        [ProcessingOrder.visTransTags, 500],
        [ProcessingOrder.visBgImageTags, 750],
        [ProcessingOrder.invisColorTags, 1000],
        [ProcessingOrder.invisImageTags, 1250],
        [ProcessingOrder.invisTransTags, 1500],
        [ProcessingOrder.invisLinks, 2000],
        [ProcessingOrder.invisBgImageTags, 2500]
    ]);

    export const bigReCalculationDelays = new Map<ProcessingOrder, number>([
        [ProcessingOrder.viewColorTags, 0],
        [ProcessingOrder.visColorTags, 1],
        [ProcessingOrder.viewImageTags, 3],
        [ProcessingOrder.viewLinks, 5],
        [ProcessingOrder.viewBgImageTags, 10],
        [ProcessingOrder.viewTransTags, 20],
        [ProcessingOrder.visImageTags, 30],
        [ProcessingOrder.visLinks, 50],
        [ProcessingOrder.visTransTags, 75],
        [ProcessingOrder.visBgImageTags, 100],
        [ProcessingOrder.invisColorTags, 140],
        [ProcessingOrder.invisImageTags, 175],
        [ProcessingOrder.invisTransTags, 210],
        [ProcessingOrder.invisLinks, 250],
        [ProcessingOrder.invisBgImageTags, 300]
    ]);

    export const smallReCalculationDelays = new Map<ProcessingOrder, number>([
        [ProcessingOrder.viewColorTags, 0],
        [ProcessingOrder.visColorTags, 0],
        [ProcessingOrder.viewImageTags, 0],
        [ProcessingOrder.viewLinks, 0],
        [ProcessingOrder.viewBgImageTags, 0],
        [ProcessingOrder.viewTransTags, 0],
        [ProcessingOrder.visImageTags, 0],
        [ProcessingOrder.visLinks, 0],
        [ProcessingOrder.visTransTags, 0],
        [ProcessingOrder.visBgImageTags, 0],
        [ProcessingOrder.invisColorTags, 0],
        [ProcessingOrder.invisImageTags, 0],
        [ProcessingOrder.invisTransTags, 0],
        [ProcessingOrder.invisLinks, 0],
        [ProcessingOrder.invisBgImageTags, 0]
    ]);

    export const onCopyReCalculationDelays = new Map<ProcessingOrder, number>(bigReCalculationDelays);
    onCopyReCalculationDelays.set(ProcessingOrder.viewColorTags, 1);
}