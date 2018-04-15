/// <reference path="QueryCommandManager.ts" />
/// <reference path="CssStyleManager.ts" />
/// <reference path="ExternalCssLoader.ts" />

namespace MidnightLizard.PageScript
{
    new QueryCommandManager().overrideQueryCommandValue(document);
    new CssStyleManager().overrideCssStyleDeclaration(document);
    new ExternalCssLoader().beginExternalCssObservation();
}