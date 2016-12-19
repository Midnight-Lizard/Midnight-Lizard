var lastAttempt;

function observeSliderIcons()
{
    for(let icon of Array.prototype.slice.call(document.querySelectorAll(".cb-input-range-icon[for]")))
    {
        icon.onclick = onIconClick;
    }
}

function onIconClick(eventArgs)
{
    let slider = document.getElementById(eventArgs.currentTarget.getAttribute("for"));
    if(slider)
    {
        if (eventArgs.currentTarget.classList.contains("low"))
        {
            slider.stepDown();
        }
        else
        {
            slider.stepUp();
        }
        let changeEvent = new Event('change'), inputEvent = new Event("input");
        slider.dispatchEvent(inputEvent);
        slider.dispatchEvent(changeEvent);
        lastAttempt && clearTimeout(lastAttempt);
        lastAttempt = setTimeout(s => s.focus(), 300, slider);
    }
}

function onRangeChanged(eventArgs)
{
    let ranger = eventArgs.target, host = ranger.parentElement, relativeValue = (ranger.value - ranger.min) / (ranger.max - ranger.min) * 100;
    host.style.setProperty("--input-value", ranger.value, "important");
    host.style.setProperty("--input-relative-value", relativeValue, "important");
    host.style.setProperty("--input-string", "'" + ranger.value + "'", "important");
    host.style.setProperty("--input-percent", "" + ranger.value + "%", "important");
    host.style.setProperty("--input-relative-percent", "" + relativeValue + "%", "important");
}