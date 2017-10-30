namespace MidnightLizard.Custom
{
    const classObserver = new MutationObserver(classObserverCallback),
        classObserverConfig: MutationObserverInit = { attributes: true, attributeFilter: ["class"] },
        appContainer = document.getElementById("app-container");
    if (appContainer)
    {
        classObserver.observe(appContainer, classObserverConfig);
    }

    function classObserverCallback(mutations: MutationRecord[], observer: MutationObserver)
    {
        const view = document.querySelector(".widget-scene-canvas") as HTMLCanvasElement;
        if (view)
        {
            view.style.removeProperty("filter");
            view.style.setProperty("--ml-timestamp", Date.now().toString(16));
        }
    }
}