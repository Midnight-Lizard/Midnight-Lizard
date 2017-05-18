/// <reference path="../Settings/ColorScheme.ts" />

namespace MidnightLizard.Settings
{
    export class SettingsFile
    {
        description: "Midnight Lizard Color Scheme File";
        version: string | undefined;
        timestamp: Date | string | undefined;
        colorSchemes: ColorScheme[] | undefined;
    }
}