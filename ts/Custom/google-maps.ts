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
        if (document.documentElement!.getAttribute("ml-mode") === "complex")
        {
            const canvasArr = document.querySelectorAll(".widget-scene-canvas, .canvas-container > canvas") as any as HTMLCanvasElement[];
            if (canvasArr)
            {
                for (const canvas of canvasArr)
                {
                    canvas.style.removeProperty("filter");
                    canvas.style.setProperty("--ml-timestamp", Date.now().toString(16));
                }
            }
        }
        else
        {
            classObserver.disconnect();
        }
    }
}