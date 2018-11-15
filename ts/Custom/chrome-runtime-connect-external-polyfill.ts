var connection: chrome.runtime.Port;

document.documentElement!.addEventListener("message-from-portal", e =>
{
    if (e instanceof CustomEvent && e.detail)
    {
        openConnection().postMessage(JSON.parse(e.detail));
    }
});

function openConnection(port?: any)
{
    if (!connection || port)
    {
        connection = chrome.runtime.connect({ name: 'portal' });
        connection.onMessage.addListener((msg, port) =>
        {
            document.documentElement!.dispatchEvent(
                new CustomEvent("message-from-extension", { detail: JSON.stringify(msg) }));
        });
        connection.onDisconnect.addListener(openConnection);
    }
    return connection;
}