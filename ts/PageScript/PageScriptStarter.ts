/// <reference path="./QueryCommandManager.ts" />
/// <reference path="./CssStyleManager.ts" />
/// <reference path="./ExternalCssLoader.ts" />
/// <reference path="./EditableContentManager.ts" />

namespace MidnightLizard.PageScript
{
    new CssStyleManager().overrideCssStyleDeclaration(document);
    new EditableContentManager().beginEditableContentHandling(document);
    new ExternalCssLoader().beginExternalCssObservation(document);
    new QueryCommandManager().overrideQueryCommandValue(document);
}