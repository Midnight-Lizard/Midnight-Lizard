function saveToStorage(obj)
{
    chrome.storage.local.set(obj);
}

function loadFromStorage(key)
{
    return chromePromise.storage.local.get(key);
}