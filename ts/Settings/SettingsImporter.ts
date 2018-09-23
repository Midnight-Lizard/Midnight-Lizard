/// <reference path="../DI/-DI.ts" />
/// <reference path="../Settings/IApplicationSettings.ts" />
/// <reference path="../Settings/ColorScheme.ts" />
/// <reference path="../Settings/SettingsFile.ts" />
/// <reference path="../Utils/Guid.ts" />

namespace MidnightLizard.Settings
{
    export abstract class ISettingsImporter
    {
        abstract import(files: FileList): Promise<ColorScheme[]>[];
    }

    @DI.injectable(ISettingsImporter)
    class SettingsImporter implements ISettingsImporter
    {
        constructor(
            protected readonly _doc: Document,
            protected readonly _app: MidnightLizard.Settings.IApplicationSettings)
        {
        }

        public import(files: FileList): Promise<ColorScheme[]>[]
        {
            const filePromises = new Array<Promise<ColorScheme[]>>();

            for (let file of Array.from(files))
            {
                if (file.name && file.name.toLowerCase().endsWith(".json"))
                {
                    filePromises.push(
                        new Promise<{ fileText: string, fileName: string }>((resolve, reject) =>
                        {
                            let rdr = new FileReader();
                            (rdr as any).fileName = file.name;
                            rdr.onload = (e) => resolve({ fileText: (e.target as any).result, fileName: (e.target as any).fileName });
                            rdr.readAsText(file);
                        }).then<ColorScheme[] | never>(x =>
                        {
                            const colorSchemes = new Array<ColorScheme>();
                            const fileContent: SettingsFile = JSON.parse(x.fileText);
                            if (fileContent.version && fileContent.timestamp && fileContent.colorSchemes && Array.isArray(fileContent.colorSchemes))
                            {
                                for (let colorSchemeFromFile of fileContent.colorSchemes)
                                {
                                    const newColorScheme = Object.assign({}, ColorSchemes.dimmedDust);
                                    newColorScheme.colorSchemeId = Util.guid("") as ColorSchemeId;
                                    newColorScheme.colorSchemeName = "New imported color scheme";
                                    let propName: ColorSchemePropertyName;
                                    for (propName in newColorScheme)
                                    {
                                        if (excludeSettingsForExport.indexOf(propName) === -1 && colorSchemeFromFile[propName] !== undefined)
                                        {
                                            if (propName !== "scrollbarStyle" &&
                                                typeof (colorSchemeFromFile[propName]) !== typeof (newColorScheme[propName])
                                                ||
                                                propName === "scrollbarStyle" &&
                                                typeof (colorSchemeFromFile[propName]) !== "string" &&
                                                typeof (colorSchemeFromFile[propName]) !== "boolean")
                                            {
                                                return Promise.reject(`Color scheme [${colorSchemeFromFile.colorSchemeName
                                                    }] from file [${x.fileName}] has incorrect data type for property [${propName
                                                    }]. It should be [${typeof (newColorScheme[propName])}] but it is [${
                                                    typeof (colorSchemeFromFile[propName])}].`);
                                            }
                                            if (propName === "scrollbarStyle" && typeof (colorSchemeFromFile[propName]) !== "string")
                                            {
                                                newColorScheme[propName] = colorSchemeFromFile[propName] as any === "true" ? true : false;
                                            }
                                            else
                                            {
                                                newColorScheme[propName] = colorSchemeFromFile[propName];
                                            }
                                        }
                                    }
                                    colorSchemes.push(newColorScheme);
                                }
                                return colorSchemes;
                            }
                            else
                            {
                                return Promise.reject(`File [${x.fileName}] has wrong format. Only JSON files originally exported from [Midnight Lizard] can be imported.`);
                            }
                        }));
                }
                else
                {
                    filePromises.push(Promise.reject(`File [${file.name}] has wrong extension. Only JSON files originally exported from [Midnight Lizard] can be imported.`));
                }
            }

            return filePromises;
        }
    }
}