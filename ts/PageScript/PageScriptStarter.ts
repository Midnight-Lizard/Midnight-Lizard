/// <reference path="QueryCommandManager.ts" />
/// <reference path="CssStyleManager.ts" />

namespace MidnightLizard.PageScript
{
    new QueryCommandManager().overrideQueryCommandValue(document);
    new CssStyleManager().overrideCssStyleDeclaration(document);
}