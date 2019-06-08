import { ChromeApplicationSettings } from "./ChromeApplicationSettings";
import { ChromeStorageManager } from "./ChromeStorageManager";
import { ChromeSettingsBus } from "./ChromeSettingsBus";
import { ChromeCommandManager } from "./ChromeCommandManager";
import { ChromeTranslationAccessor } from "./ChromeTranslationAccessor";
import { ChromeContentMessageBus } from "./ChromeContentMessageBus";
import { ContentScriptStarter } from "../ContentScript/ContentScriptStarter";

new ContentScriptStarter(
    ChromeApplicationSettings,
    ChromeStorageManager,
    ChromeSettingsBus,
    ChromeCommandManager,
    ChromeTranslationAccessor,
    ChromeContentMessageBus);