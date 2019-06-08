
import { ChromeApplicationInstaller } from "./ChromeApplicationInstaller";
import { ChromeStorageManager } from "./ChromeStorageManager";
import { ChromeCommandListener } from "./ChromeCommandListener";
import { ChromeApplicationSettings } from "./ChromeApplicationSettings";
import { ChromeSettingsBus } from "./ChromeSettingsBus";
import { ChromeTranslationAccessor } from "./ChromeTranslationAccessor";
import { ChromeBackgroundMessageBus } from "./ChromeBackgroundMessageBus";
import { BackgroundPageStarter } from "../BackgroundPage/BackgroundPageStarter";
import { ChromeZoomService } from "./ChromeZoomService";
import { ChromeUninstallUrlSetter } from "./ChromeUninstallUrlSetter";
import { FirefoxThemeProcessor } from "./FirefoxThemeProcessor";

new BackgroundPageStarter(
    ChromeApplicationInstaller,
    ChromeStorageManager,
    ChromeCommandListener,
    ChromeApplicationSettings,
    ChromeStorageManager,
    ChromeSettingsBus,
    ChromeZoomService,
    ChromeUninstallUrlSetter,
    ChromeTranslationAccessor,
    FirefoxThemeProcessor,
    ChromeBackgroundMessageBus
);