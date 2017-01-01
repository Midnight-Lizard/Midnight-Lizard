function createTabControl()
{
    let tabs = Array.prototype.slice.call(document.getElementsByClassName("cb-tab-item"));
    for(let tab of tabs)
    {
        tab.onclick = openTab;
        if(tab.hasAttribute("selected"))
        {
            tab.click();
        }
    }
}

function openTab(eventArgs)
{
    var i, tabContents, tabs;

    tabContents = Array.prototype.slice.call(document.getElementsByClassName("cb-tab-content"));
    for (let tabContent of tabContents)
    {
        tabContent.style.display = "none";
    }

    tabs = Array.prototype.slice.call(document.getElementsByClassName("cb-tab-item"));
    for (let tab of tabs)
    {
        tab.classList.remove("active");
    }

    document.getElementById(eventArgs.currentTarget.getAttribute("content")).style.display = "table-cell";
    eventArgs.currentTarget.classList.add("active");
}