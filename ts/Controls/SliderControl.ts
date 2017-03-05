namespace MidnightLizard.Controls.Slider
{
    let lastAttempt: number;

    export function initSliders(doc: Document)
    {
        for (let icon of Array.prototype.slice.call(doc.querySelectorAll(".ml-input-range-icon[for]")))
        {
            icon.onclick = onIconClick;
        }
    }

    function onIconClick(eventArgs: Event)
    {
        let target = eventArgs.currentTarget as Element;
        let slider = target.ownerDocument.getElementById(target.getAttribute("for") !) as HTMLInputElement;
        if (slider)
        {
            if (target.classList.contains("low"))
            {
                slider.stepDown();
            }
            else
            {
                slider.stepUp();
            }
            slider.dispatchEvent(new Event("input"));
            slider.dispatchEvent(new Event('change'));
            lastAttempt && clearTimeout(lastAttempt);
            lastAttempt = setTimeout((s: HTMLElement) => s.focus(), 300, slider);
        }
    }

    export function onRangeChanged(this: HTMLInputElement)
    {
        let host = this.parentElement!,
            relativeValue = (this.valueAsNumber - parseFloat(this.min)) / (parseFloat(this.max) - parseFloat(this.min)) * 100;
        host.style.setProperty("--input-value", this.value, "important");
        host.style.setProperty("--input-relative-value", `${relativeValue}`, "important");
        host.style.setProperty("--input-string", `'${this.value}'`, "important");
        host.style.setProperty("--input-percent", `${this.value}%`, "important");
        host.style.setProperty("--input-relative-percent", `${relativeValue}%`, "important");
    }
}