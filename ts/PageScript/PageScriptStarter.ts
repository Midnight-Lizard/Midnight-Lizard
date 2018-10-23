/// <reference path="./QueryCommandManager.ts" />
/// <reference path="./ExternalCssLoader.ts" />
/// <reference path="./EditableContentManager.ts" />

namespace MidnightLizard.PageScript
{
    new EditableContentManager().beginEditableContentHandling(document);
    new ExternalCssLoader().beginExternalCssObservation(document);
    new QueryCommandManager().overrideQueryCommandValue(document);

    document.defaultView.postMessage({ type: "PageScriptLoaded" }, "*");
}