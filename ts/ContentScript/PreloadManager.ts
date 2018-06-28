/// <reference path="../DI/-DI.ts" />
/// <reference path="../Settings/BaseSettingsManager.ts" />

namespace MidnightLizard.ContentScript
{
    export abstract class IPreloadManager { }

    const mlIsActiveAttribute = "ml-is-active";
    const mlIsActiveProperty = "--" + mlIsActiveAttribute;
    const mlBackgroundLightnessLimitProperty = "--ml-background-lightness-limit";

    @DI.injectable(IPreloadManager)
    class PreloadManager implements IPreloadManager
    {
        protected readonly _html: HTMLHtmlElement;
        constructor(doc: Document,
            protected readonly _settingsManager: MidnightLizard.Settings.IBaseSettingsManager,
            protected readonly _app: MidnightLizard.Settings.IApplicationSettings)
        {
            let localStorageIsAccessable = true;
            try
            {
                localStorage.getItem("test");
            }
            catch
            {
                localStorageIsAccessable = false;
            }
            this._html = doc.documentElement as HTMLHtmlElement;
            if (localStorageIsAccessable && !this._app.isInIncognitoMode)
            {
                this.applyCachedSettings();
                _settingsManager.onSettingsInitialized.addListener(
                    this.onSettingsInitialized, this, Events.EventHandlerPriority.After);
            }
        }

        protected applyCachedSettings()
        {
            if (localStorage.getItem(mlIsActiveProperty) === "true")
            {
                this._html.setAttribute(mlIsActiveAttribute, "");
                this._html.style.setProperty(mlBackgroundLightnessLimitProperty,
                    (localStorage.getItem(mlBackgroundLightnessLimitProperty) || 1).toString());
            }
        }

        protected onSettingsInitialized(shift?: Colors.ComponentShift): void
        {
            if (this._settingsManager.isActive)
            {
                this._html.setAttribute(mlIsActiveAttribute, "");
                this._html.style.setProperty(mlBackgroundLightnessLimitProperty,
                    shift!.Background.lightnessLimit.toString());
            }
            else
            {
                this._html.removeAttribute(mlIsActiveAttribute);
                this._html.style.removeProperty(mlBackgroundLightnessLimitProperty);
            }

            localStorage.setItem(mlIsActiveProperty, this._settingsManager.isActive ? "true" : "false");
            localStorage.setItem(mlBackgroundLightnessLimitProperty, shift!.Background.lightnessLimit.toString());
        }
    }
}