/// <reference path="./QueryCommandManager.ts" />
/// <reference path="./CssStyleManager.ts" />
/// <reference path="./ExternalCssLoader.ts" />
/// <reference path="./EditableContentManager.ts" />

namespace MidnightLizard.PageScript
{
    new QueryCommandManager().overrideQueryCommandValue(document);
    new CssStyleManager().overrideCssStyleDeclaration(document);
    new ExternalCssLoader().beginExternalCssObservation(document);
    new EditableContentManager().beginEditableContentHandling(document);
}