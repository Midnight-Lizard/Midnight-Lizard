var excludeSettingsForSave = ["isEnabled", "exist", "hostname", "isDefault"];
var excludeSettingsForCompare = ["isEnabled", "exist", "hostname", "isDefault", "settingsVersion"];
var setAbrRegExp = /^.[^A-Z]?[^A-Z]?[^A-Z]?|[A-Z][^A-Z]?[^A-Z]?/g;

/**Сохраняет настройки в куках текущего сайта*/
function saveSettings(/**настройки для сохранения*/ settings, /**Сохранить как кеш настроек по умолчанию?*/ defaultCache)
{
    var x = defaultCache ? "MLD" : "ML";
    var t = defaultCache ? 1 : 49;

    for(let setting in settings)
    {
        if(excludeSettingsForSave.indexOf(setting) == -1)
        {
            setCBCookie(x + setting.match(setAbrRegExp).join("").toUpperCase(), settings[setting], t);
        }
    }
}

/**Читает настройки из куков текущего сайта*/
function getSettings(version, defaultCache)
{
    let val, settings = {}, x = defaultCache ? "MLD" : "ML";

    for(let setting in colorSchemes.original)
    {
        val = getCBCookie(x + setting.match(setAbrRegExp).join("").toUpperCase());
        if (val)
        {
            switch (typeof colorSchemes.original[setting])
            {
                case "boolean":  settings[setting] = val == "true";  break;
                case "number":   settings[setting] = parseInt(val);  break;
                default:         settings[setting] = val;            break;
            }
        }
        else
        {
            break;
        }
    }

    settings.exist = settings.settingsVersion == version;
    !settings.exist && delSettings(defaultCache);
    settings.settingsVersion = version;
    return settings;
}

function delSettings(defaultCache)
{
    let x = defaultCache ? "MLD" : "ML";

    for(let setting in colorSchemes.original)
    {
        val = delCBCookie(x + setting.match(setAbrRegExp).join("").toUpperCase());
    }
}

function delOldSettings()
{
    delCBCookieRegExp(/\b(cb_|cbd_|ml_|mld_)\w+(?==)/g);
}

function settingsAreEqual(first, second)
{
    for(let setting in first)
    {
        if(excludeSettingsForCompare.indexOf(setting) == -1)
        {
            if(first[setting] !== second[setting])
            {
                return false;
            }
        }
    }
    return true
}

function setIsEnabled(isEnabled)
{
    saveToStorage({ isEnabled : isEnabled });
}

function setSettingsVersion(version)
{
    saveToStorage({ settingsVersion : version });
}

function getStorage()
{
    return loadFromStorage(null);
}