namespace MidnightLizard.ContentScript
{
    export enum ProcessingOrder
    {
        viewColorTags,
        visColorTags,
        viewLinks,
        viewImageTags,
        viewTransTags,
        visLinks,
        visTransTags,
        visImageTags,
        invisColorTags,
        invisTransTags,
        invisLinks,
        invisImageTags,
        delayedInvisTags
    }

    export const normalDelays = new Map<ProcessingOrder, number>([
        [ProcessingOrder.viewColorTags, 0],
        [ProcessingOrder.visColorTags, 1],
        [ProcessingOrder.viewLinks, 10],
        [ProcessingOrder.viewImageTags, 50],
        [ProcessingOrder.viewTransTags, 100],
        [ProcessingOrder.visLinks, 250],
        [ProcessingOrder.visTransTags, 500],
        [ProcessingOrder.visImageTags, 750],
        [ProcessingOrder.invisColorTags, 1000],
        [ProcessingOrder.invisTransTags, 1500],
        [ProcessingOrder.invisLinks, 2000],
        [ProcessingOrder.invisImageTags, 2500],
        [ProcessingOrder.delayedInvisTags, 3000]
    ]);

    export const bigReCalculationDelays = new Map<ProcessingOrder, number>([
        [ProcessingOrder.viewColorTags, 0],
        [ProcessingOrder.visColorTags, 1],
        [ProcessingOrder.viewLinks, 5],
        [ProcessingOrder.viewImageTags, 10],
        [ProcessingOrder.viewTransTags, 20],
        [ProcessingOrder.visLinks, 50],
        [ProcessingOrder.visTransTags, 75],
        [ProcessingOrder.visImageTags, 100],
        [ProcessingOrder.invisColorTags, 150],
        [ProcessingOrder.invisTransTags, 200],
        [ProcessingOrder.invisLinks, 250],
        [ProcessingOrder.invisImageTags, 300],
        [ProcessingOrder.delayedInvisTags, 350]
    ]);

    export const smallReCalculationDelays = new Map<ProcessingOrder, number>([
        [ProcessingOrder.viewColorTags, 0],
        [ProcessingOrder.visColorTags, 0],
        [ProcessingOrder.viewLinks, 0],
        [ProcessingOrder.viewImageTags, 0],
        [ProcessingOrder.viewTransTags, 0],
        [ProcessingOrder.visLinks, 0],
        [ProcessingOrder.visTransTags, 0],
        [ProcessingOrder.visImageTags, 0],
        [ProcessingOrder.invisColorTags, 0],
        [ProcessingOrder.invisTransTags, 0],
        [ProcessingOrder.invisLinks, 0],
        [ProcessingOrder.invisImageTags, 0],
        [ProcessingOrder.delayedInvisTags, 0]
    ]);

    export const onCopyReCalculationDelays = new Map<ProcessingOrder, number>(bigReCalculationDelays);
    onCopyReCalculationDelays.set(ProcessingOrder.viewColorTags, 1);
}