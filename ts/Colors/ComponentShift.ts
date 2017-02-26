namespace MidnightLizard.Colors
{
    /** Html element component */
    export enum Component
    {
        Background,
        Text,
        TextShadow,
        Border,
        Scrollbar$Hover,
        Scrollbar$Normal,
        Scrollbar$Active,
        Image,
        SvgElement,
        BackgroundImage
    }

    /**
     * ComponentShift
     */
    export class ComponentShift
    {
        Background: ColorShift;
        Text: ColorShift;
        TextShadow: ColorShift;
        Border: ColorShift;
        Scrollbar$Hover: ColorShift;
        Scrollbar$Normal: ColorShift;
        Scrollbar$Active: ColorShift;
        Image: ColorShift;
        SvgElement: ColorShift;
        BackgroundImage: ColorShift;
        constructor() { }
    }
}