namespace MidnightLizard.PageScript
{
    export class QueryCommandManager
    {
        public overrideQueryCommandValue(doc: Document)
        {
            let anyDoc = doc as any;
            if (!anyDoc.originalQueryCommandValue)
            {
                anyDoc.originalQueryCommandValue = anyDoc.queryCommandValue.bind(anyDoc);
                anyDoc.queryCommandValue = this.queryCommandValue.bind(this, anyDoc);
            }
        }

        protected queryCommandValue(doc: Document, command: string)
        {
            if (command === "foreColor" || command === "backColor")
            {
                let selection = doc.defaultView.getSelection();
                if (selection)
                {
                    let range = selection.getRangeAt(0);
                    if (range && range.commonAncestorContainer)
                    {
                        let curPosElement: HTMLElement | null = range.commonAncestorContainer instanceof (doc.defaultView as any).HTMLElement
                            ? range.commonAncestorContainer as HTMLElement
                            : range.commonAncestorContainer.parentElement
                        if (curPosElement)
                        {
                            let result: string;
                            switch (command)
                            {
                                case "foreColor":
                                    if (result = curPosElement.style.getPropertyValue("--original-color"))
                                    {
                                        return result;
                                    }
                                    break;

                                case "backColor":
                                    if (result = curPosElement.style.getPropertyValue("--original-background-color"))
                                    {
                                        return result
                                    }
                                    break;

                                default:
                                    break;
                            }
                        }
                    }
                }
            }
            return (doc as any).originalQueryCommandValue!(command);
        }
    }
}