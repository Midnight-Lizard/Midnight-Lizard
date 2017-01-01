chrome.runtime.onMessage.addListener(
    (request, sender, sendResponse) =>
    {
        switch (request.action) {
            case "getDefaultSettings":
                let settings = getSettings(request.version);
                sendResponse(settings);
                setTimeout(saveSettings, 1, settings);
                break;

            case "setDafaultSettings":
                saveSettings(request.settings);
                sendResponse(request.settings);
                break;

            default:
                break;
        }
    });