namespace MidnightLizard.Custom
{
    const classObserver = new MutationObserver(classObserverCallback),
        classObserverConfig: MutationObserverInit = { attributes: true, attributeFilter: ["class"] },
        app = document.getElementById("app-container");
    if (app)
    {
        classObserver.observe(app, classObserverConfig);
    }

    function classObserverCallback(mutations: MutationRecord[], observer: MutationObserver)
    {
        const view = document.querySelector(".widget-scene-canvas") as HTMLCanvasElement;
        if (view)
        {
            view.style.filter = "none";
        }
    }
}