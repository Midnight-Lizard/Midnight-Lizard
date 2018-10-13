/// <reference path="../DI/-DI.ts" />
/// <reference path="../Settings/BaseSettingsManager.ts" />

namespace MidnightLizard.ContentScript
{
    export abstract class IPreloadManager { }

    const mlIsActiveAttribute = "ml-is-active";
    const mlIsActiveProperty = "--" + mlIsActiveAttribute;
    const mlBackgroundLightnessLimitProperty = "--ml-background-lightness-limit";
    const mlPpreloadFilterProperty = "--ml-preload-filter";

    @DI.injectable(IPreloadManager)
    class PreloadManager implements IPreloadManager
    {
        protected readonly _html: HTMLHtmlElement;
        constructor(doc: Document,
            private readonly _module: MidnightLizard.Settings.CurrentExtensionModule,
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
                _settingsManager.onSettingsChanged.addListener(
                    this.onSettingsChanged, this, Events.EventHandlerPriority.After);
            }
        }

        private applyCachedSettings()
        {
            if (localStorage.getItem(mlIsActiveProperty) === "true")
            {
                this._html.setAttribute(mlIsActiveAttribute, "");
                if (this._module.name === Settings.ExtensionModule.PopupWindow)
                {
                    this._html.style.setProperty(mlPpreloadFilterProperty,
                        localStorage.getItem(mlPpreloadFilterProperty) || "none");
                }
                else
                {
                    const bgLight = localStorage.getItem(mlBackgroundLightnessLimitProperty);
                    this._html.style.setProperty(mlBackgroundLightnessLimitProperty,
                        bgLight === null ? "1" : bgLight);
                }
            }
        }

        private applyActualSettings(shift: Colors.ComponentShift)
        {
            if (this._settingsManager.isActive)
            {
                this._html.setAttribute(mlIsActiveAttribute, "");
                if (this._module.name === Settings.ExtensionModule.PopupWindow)
                {
                    const textFilter = this._html.mlComputedStyle!.getPropertyValue("--ml-text-filter");
                    this._html.style.setProperty(mlPpreloadFilterProperty, textFilter);
                    localStorage.setItem(mlPpreloadFilterProperty, textFilter);
                }
                else
                {
                    const bgLight = shift!.Background.lightnessLimit.toString();
                    this._html.style.setProperty(mlBackgroundLightnessLimitProperty, bgLight);
                    localStorage.setItem(mlBackgroundLightnessLimitProperty, bgLight);
                }
            }
            else
            {
                this._html.removeAttribute(mlIsActiveAttribute);
                this._html.style.removeProperty(mlBackgroundLightnessLimitProperty);
                this._html.style.removeProperty(mlPpreloadFilterProperty);
            }
            localStorage.setItem(mlIsActiveProperty, this._settingsManager.isActive ? "true" : "false");
        }

        protected onSettingsInitialized(shift?: Colors.ComponentShift): void
        {
            this.applyActualSettings(shift!);
        }

        protected onSettingsChanged(resp: any, shift?: Colors.ComponentShift): void
        {
            this.applyActualSettings(shift!);
        }
    }
}