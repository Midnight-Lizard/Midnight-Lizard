document.addEventListener('DOMContentLoaded',
function ()
{
	Object.assign(currentSettings, colorSchemes.dimmedDust);
    sendMessageToPage({ action: "getCurrentSettings" }, initPopupSettings);
});