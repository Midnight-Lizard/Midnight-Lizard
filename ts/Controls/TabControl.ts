namespace MidnightLizard.Controls.Tab
{
    export function initTabControl(doc: Document, onTabOpened: (tab: string) => void)
    {
        const tabs = Array.prototype.slice.call(doc.getElementsByClassName("ml-tab-item"));
        const openTabBound = openTab.bind(null, onTabOpened);
        for (let tab of tabs)
        {
            tab.onclick = openTabBound;
            if (tab.hasAttribute("selected"))
            {
                tab.click();
            }
        }
    }

    function openTab(onTabOpened: (tab: string) => void, eventArgs: Event)
    {
        let target = eventArgs.currentTarget as HTMLElement;
        let doc = target.ownerDocument;

        let tabContents = Array.prototype.slice.call(doc.getElementsByClassName("ml-tab-content"));
        for (let tabContent of tabContents)
        {
            tabContent.style.display = "none";
        }

        let tabs = Array.prototype.slice.call(doc.getElementsByClassName("ml-tab-item"));
        for (let tab of tabs)
        {
            tab.classList.remove("active");
        }
        const content = target.getAttribute("content")!;
        doc.getElementById(content)!.style.display = "table-cell";
        target.classList.add("active");
        onTabOpened(content);
    }
}