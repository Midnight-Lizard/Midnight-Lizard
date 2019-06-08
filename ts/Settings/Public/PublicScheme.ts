import { ColorScheme } from "../ColorScheme";

export declare type PublicSchemeId = string;
export declare type PublisherId = string;

export interface PublicScheme
{
    /** Public scheme aggregate ID */
    readonly id: PublicSchemeId;
    /** Publisher ID */
    readonly pid: PublisherId;
    /** Public scheme aggregate generation */
    readonly gen: number;
    /** Color scheme */
    readonly cs: ColorScheme;
}