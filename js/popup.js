var currentSiteSettings, defaultSettings;

function sendMessageToPage(msg, callBack)
{
    chrome.tabs.query({ active: true, currentWindow: true },
        tabs => chrome.tabs.sendMessage(tabs[0].id, msg, callBack));
}

function sendMessageToAllPages(msg, callBack)
{
    chrome.tabs.query({},
        tabs => tabs.forEach(tab => chrome.tabs.sendMessage(tab.id, msg, callBack)));
}

function onHueSelectedInPopup()
{
    this.style.cssText = this.options[this.selectedIndex].style.cssText;
}

function ignoreSelect(select)
{
    select.cbIgnore = true;
    for (i = 0; i < select.options.length; i++) {
        select.options[i].cbIgnore = true;
    }
}

function initDefaultSettingsPromise(version)
{
    defaultSettings = new Promise((resolve, reject) =>
        chrome.runtime.sendMessage({ action: "getDefaultSettings", version: version }, resolve));
}

function initPopupSettings(settings)
{
    if (settings)
    {
        initDefaultSettingsPromise(settings.settingsVersion);
        createTabControl();
        currentSiteSettings = settings;
        document.getElementById("version").href = "../ui/change-log.html?" + chrome.runtime.getManifest().version;
        let hostName = document.getElementById("hostName");
        hostName.innerText = settings.hostname;
        hostName.onclick = closePopup;
        observeSliderIcons();
        document.querySelector(".cb-input-range").onRoomRulesApplied = onRangeRoomRulesApplied;
        //document.querySelector(".cb-dialog-fotter").onRoomRulesApplied = onFooterRoomRulesApplied;
        document.getElementById("applyBtn").onclick = applyNewSettingsOnPage;
        document.getElementById("setAsDefaultBtn").onclick = setAsDefaultSettings;
        document.getElementById("forgetAllSitesBtn").onclick = forgetAllSitesSettings;
        let forgetThisSiteBtn = document.getElementById("forgetThisSiteBtn");
        forgetThisSiteBtn.onclick = forgetThisSiteSettings;
        forgetThisSiteBtn.onRoomRulesApplied = onButtonRoomRulesApplied;
        let colorSchemeSel = document.getElementById("colorScheme");
        ignoreSelect(colorSchemeSel);
        colorSchemeSel.cbIgnore = false;

        applySettingsOnPopup(settings);
        procDocument(document);
    }
    else {
        document.getElementById("dialogError").style.display = "block";
    }
    document.getElementById("closeBtn").onclick = closePopup;
    document.getElementById("isEnabled").onchange = applyGlobalSwitch;
}

function setAsDefaultSettings()
{
    chrome.runtime.sendMessage({ action: "setDafaultSettings", settings: getSettingsFromPopup() }, settings =>
    {
        initDefaultSettingsPromise(settings.settingsVersion);
        enableButtons(settings);
    });
}

function closePopup() {
    window.close();
}

function enableButtons(settings)
{
    document.getElementById("applyBtn").disabled =
        settingsAreEqual(settings, currentSiteSettings);
    Promise.all([settings, defaultSettings]).then(data=>
    {
        document.getElementById("setAsDefaultBtn").disabled =
            data[1].exist && settingsAreEqual(data[0], data[1]);
    });
}

function applySettingsOnPopup(settings) {
    Object.assign(currentSettings, settings);
    enableButtons(currentSettings);
    initCurSet();

    let colorSchemeSel = document.getElementById("colorScheme");
    colorSchemeSel.onchange = null;
    selectScheme(colorSchemeSel, settings);
    colorSchemeSel.onchange = onColorSchemeChanged;

    for(let setting in currentSettings)
    {
        let input = document.getElementById(setting);
        if(input)
        {
            setting != "isEnabled" && input.addEventListener("change", onSettingChanged);
            switch (input.type)
            {
                case "hidden":
                    input.value = currentSettings[setting];
                    break;

                case "checkbox":
                    input.checked = currentSettings[setting];
                    break;

                case "range":
                case "text":
                    input.value = currentSettings[setting];
                    input.oninput = onRangeChanged;
                    onRangeChanged({ target: input });
                    break;

                case "select-one":
                    input.value = currentSettings[setting];
                    ignoreSelect(input);
                    input.addEventListener("change", onHueSelectedInPopup);
                    onHueSelectedInPopup.apply(input);
                    break;

                default: break;
            }
        }
    }
}

function onSettingChanged()
{
    let settings = getSettingsFromPopup();
    applySettingsOnPopup(settings);
    document.documentElement.style.cssText = "";
    restoreAllColors(document);
    procDocument(document);
}

function onFooterRoomRulesApplied(tag, roomRules, nr)
{
    let props = Object.assign({}, nr);
    props.css = { fntColor: "--fotter-background-color" };
    let newRules =
    {
        color: { color: roomRules.backgroundColor && roomRules.backgroundColor.color ? roomRules.backgroundColor.color : "var(--alt-background-color)" }
    }
    applyRoomRules(document.documentElement, newRules, props, true);
}

function onButtonRoomRulesApplied(tag, roomRules, nr)
{
    let props = Object.assign({}, nr);
    props.css = { shdColor: "--icon-shadow-color" };
    let newRules = { textShadow: { value: roomRules.textShadow ? roomRules.textShadow.color.color : "black" } }
    applyRoomRules(tag.parentElement, newRules, props, true);
}

function onRangeRoomRulesApplied(tag, roomRules, nr)
{
    let currentStyle = document.defaultView.getComputedStyle(tag, "");
    let props = Object.assign({}, nr);
    props.css =
    {
        bgrColor: "--pseudo-background-color",
        brdColor: "--pseudo-border-color",
        fntColor: "--pseudo-color",
        shdColor: "--pseudo-text-shadow-color"
    };
    let textHueSelect = document.getElementById("textGrayHue");
    let textHueColor = textHueSelect.options[textHueSelect.selectedIndex].style.backgroundColor;
    let curSat = rgbToHsl(...Object.values(convertToRgbaColor(textHueColor))).s;
    let sDiff = Math.min(curSet.textGraySaturation, curSat > 0.5 ? 0.5 - curSat : 0),
        fntLightDiff = Math.abs(roomRules.color.light - roomRules.backgroundColor.light) / 1.4;
    let shadowColor = calcFrontColor(textHueColor, sDiff, fntLightDiff, roomRules.color.light, curSet.textLightnessLimit, curSet.textSaturationLimit, tag, "text-shadow");
    let newRules = 
    {
        backgroundColor: { color: currentStyle.backgroundColor },
        color: { color: currentStyle.color },
        borderColor: { color: currentStyle.borderColor },
        textShadow: { value: shadowColor.color }
    }
    applyRoomRules(document.documentElement, newRules, props, true);
}

function onColorSchemeChanged()
{
    if (this.value == "default")
    {
        chrome.runtime.sendMessage({ action: "getDefaultSettings" }, defaults =>
        {
            let defaultScheme = Object.assign(Object.assign({}, colorSchemes.dimmedDust), defaults);
            applySettingsOnPopup(defaultScheme);
            document.documentElement.style.cssText = "";
            restoreAllColors(document);
            procDocument(document);
        });
    }
    else
    {
        let selectedScheme;
        if (this.value == "custom")
        {
            selectedScheme = currentSiteSettings
        }
        else
        {
            selectedScheme = colorSchemes[this.value];
        }
        applySettingsOnPopup(selectedScheme);
        document.documentElement.style.cssText = "";
        restoreAllColors(document);
        procDocument(document);
        // var applyBtn = document.getElementById("applyBtn");
        // focusOnElement(applyBtn, [600,900,1200]);
    }
}

function focusOnElement(element, delays)
{
    setTimeout(x => x.focus(), delays[0], element);
    setTimeout(x => x.blur(), delays[1], element);
    setTimeout(x => x.focus(), delays[2], element);
}

function selectScheme(colorSchemeSel, settings)
{
    if(settings.isDefault)
    {
        colorSchemeSel.value = "default";
    }
    else if(!settings.runOnThisSite)
    {
        colorSchemeSel.value = "original";
    }
    else
    {
        //let curScheme = JSON.stringify(settings, (key, value) => excludeSettingsForCompare.indexOf(key) == -1 ? value : undefined);
        for(let scheme in colorSchemes)
        {
            //if(JSON.stringify(colorSchemes[scheme]) == curScheme)
            if(settingsAreEqual(colorSchemes[scheme], settings))
            {
                colorSchemeSel.value = scheme;
                return;
            }
        }
        colorSchemeSel.value = "custom";
    }
    
}

function getSettingsFromPopup() {

    let settings = {}, val;
    for(let setting of Array.prototype.slice.call(document.querySelectorAll(".setting")))
    {
        switch (setting.type)
        {
            case "hidden":
                val = setting.value;
                break;

            case "checkbox":
                val = setting.checked;
                break;

            default:
                val = setting.valueAsNumber ? setting.valueAsNumber : parseInt(setting.value);
                break;
        }
        settings[setting.id] = val;
    }
    return settings;
}

function forgetThisSiteSettings()
{
    sendMessageToPage({ action: "forgetSettings" });
    alert("Done. It will take effect after you refresh the page.");
}

function forgetAllSitesSettings()
{
    if(confirm("Are you sure? All the settings you have ever made will be deleted!"))
    {
        setSettingsVersion(guid().replace(/-/g, ""));
        alert("Done. It will take effect after you refresh the page.");
    }
}

function applyNewSettingsOnPage()
{
    sendMessageToPage({ action: "applyNewSettings", settings: getSettingsFromPopup() }, settings =>
    {
        currentSiteSettings = settings;
        enableButtons(currentSiteSettings);
        focusOnElement(document.getElementById("closeBtn"), [600,900,1200]);
    });
}

function applyGlobalSwitch()
{
    setIsEnabled(this.checked);
    currentSettings.isEnabled = this.checked;
    sendMessageToAllPages({ action: "applyNewSettings", settings: { isEnabled: this.checked } });
    setTimeout(() => {
        applySettingsOnPopup(currentSettings);
        restoreAllColors(document);
        procDocument(document);
    }, 1);
}