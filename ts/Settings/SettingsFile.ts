import { ColorScheme } from "./ColorScheme";

export interface SettingsFile
{
    description: "Midnight Lizard Color Scheme File";
    version: string | undefined;
    timestamp: Date | string | undefined;
    colorSchemes: ColorScheme[] | undefined;
}