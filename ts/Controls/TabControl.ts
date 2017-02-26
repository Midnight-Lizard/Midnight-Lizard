namespace MidnightLizard.Controls.Tab
{
    export function initTabControl(doc: Document)
    {
        let tabs = Array.prototype.slice.call(doc.getElementsByClassName("ml-tab-item"));
        for (let tab of tabs)
        {
            tab.onclick = openTab;
            if (tab.hasAttribute("selected"))
            {
                tab.click();
            }
        }
    }

    function openTab(eventArgs: Event)
    {
        let target = eventArgs.currentTarget as Element;
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
        doc.getElementById(target.getAttribute("content") !) !.style.display = "table-cell";
        target.classList.add("active");
    }
}