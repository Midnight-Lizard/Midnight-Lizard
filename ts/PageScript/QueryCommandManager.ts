namespace MidnightLizard.PageScript
{
    export class QueryCommandManager
    {
        public overrideQueryCommandValue(doc: Document)
        {
            if (!doc.originalQueryCommandValue)
            {
                doc.originalQueryCommandValue = doc.queryCommandValue.bind(doc);
                doc.queryCommandValue = this.queryCommandValue.bind(this, doc);
            }
        }

        protected queryCommandValue(doc: Document, command: string)
        {
            if (command === "foreColor" || command === "backColor")
            {
                let selection = doc.defaultView!.getSelection();
                if (selection)
                {
                    let range = selection.getRangeAt(0);
                    if (range && range.commonAncestorContainer)
                    {
                        let curPosElement: HTMLElement | null = range.commonAncestorContainer instanceof HTMLElement
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
            return doc.originalQueryCommandValue(command);
        }
    }
}