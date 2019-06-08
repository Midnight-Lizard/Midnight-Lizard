import { ChromeApplicationSettings } from "./ChromeApplicationSettings";
import { ChromeStorageManager } from "./ChromeStorageManager";
import { ChromeSettingsBus } from "./ChromeSettingsBus";
import { ChromeCommandManager } from "./ChromeCommandManager";
import { ChromeTranslationAccessor } from "./ChromeTranslationAccessor";
import { ChromeContentMessageBus } from "./ChromeContentMessageBus";
import { PopupStarter } from "../Popup/PopupStarter";

new PopupStarter(
    ChromeApplicationSettings,
    ChromeStorageManager,
    ChromeSettingsBus,
    ChromeCommandManager,
    ChromeTranslationAccessor,
    ChromeContentMessageBus);