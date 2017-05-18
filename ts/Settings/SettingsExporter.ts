/// <reference path="../DI/-DI.ts" />
/// <reference path="../Settings/IApplicationSettings.ts" />
/// <reference path="../Settings/ColorScheme.ts" />
/// <reference path="../Settings/SettingsFile.ts" />

namespace MidnightLizard.Settings
{
    export abstract class ISettingsExporter
    {
        abstract export(settings: ColorScheme): void;
    }

    @DI.injectable(ISettingsExporter)
    class SettingsExporter implements ISettingsExporter
    {
        constructor(
            protected readonly _doc: Document,
            protected readonly _app: MidnightLizard.Settings.IApplicationSettings)
        {
        }

        public export(settings: ColorScheme): void
        {
            const fileContentObject: SettingsFile =
                {
                    description: "Midnight Lizard Color Scheme File",
                    version: this._app.version,
                    timestamp: new Date(),
                    colorSchemes:
                    [
                        settings
                    ]
                };
            const fileContentText = JSON.stringify(fileContentObject, (propName, propVal) =>
                !propName || excludeSettingsForExport.indexOf(propName as ColorSchemePropertyName) === -1 || fileContentObject.hasOwnProperty(propName)
                    ? propVal
                    : undefined, 4);
            const fileLink = this._doc.createElement("a");
            fileLink.download = `${(settings.colorSchemeName || "midnight lizard color scheme").replace(/\W/gi, "-")}.json`;
            fileLink.href = `data:application/json;charset=utf-8,${encodeURIComponent(fileContentText)}`;
            this._doc.body.appendChild(fileLink);
            fileLink.click();
            fileLink.remove();
        }
    }
}