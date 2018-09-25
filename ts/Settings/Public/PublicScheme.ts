/// <reference path="../ColorScheme.ts" />
/// <reference path="./Publisher.ts" />

namespace MidnightLizard.Settings.Public
{
    export declare type PublicSchemeId = string;

    export interface PublicScheme
    {
        readonly id: PublicSchemeId;
        readonly publisher: Publisher;
        readonly generation: number;
        readonly colorScheme: ColorScheme;
    }
}