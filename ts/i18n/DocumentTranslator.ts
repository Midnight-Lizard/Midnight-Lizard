import { injectable } from "../Utils/DI";
import { ITranslationAccessor } from "./ITranslationAccessor";

export abstract class IDocumentTranslator
{
    public abstract translateDocument(doc: Document): void;
}

@injectable(IDocumentTranslator)
class DocumentTranslator implements IDocumentTranslator
{
    constructor(
        protected readonly _i18n: ITranslationAccessor)
    {
    }

    public translateDocument(doc: Document): void
    {
        for (const tag of Array.from(doc.querySelectorAll("[i18n]")))
        {
            const basis = tag.getAttribute("i18n")!;
            if (tag.hasAttribute("i18n-attr"))
            {
                for (const attr of tag.getAttribute("i18n-attr")!.split(","))
                {
                    const attrMsg = this._i18n.getMessage(`${basis}_@${attr}`);
                    if (attrMsg)
                    {
                        tag.setAttribute(attr, attrMsg);
                    }
                }
            }
            if (tag.hasAttribute("i18n-text"))
            {
                const txtNodeSuffix = tag.getAttribute("i18n-text")!;
                const textNode = Array.prototype.find.call(tag.childNodes, (node: Node) =>
                    node.nodeName === "#text" &&
                    node.textContent != null && node.textContent != undefined &&
                    node.textContent.trim() != "") as Text | null;
                const textMsg = this._i18n.getMessage(`${basis}_text_${txtNodeSuffix}`);
                if (textMsg)
                {
                    if (!textNode)
                    {
                        tag.appendChild(doc.createTextNode(textMsg));
                    }
                    else
                    {
                        textNode.textContent = textMsg;
                    }
                }
            }
            if (tag.hasAttribute("i18n-html"))
            {
                const htmlMsgSuffix = tag.getAttribute("i18n-html")!;
                const htmlMsg = this._i18n.getMessage(`${basis}_html_${htmlMsgSuffix}`);
                if (htmlMsg)
                {
                    tag.innerHTML = htmlMsg;
                }
            }
        }
    }
}