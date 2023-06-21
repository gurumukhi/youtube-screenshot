function saveOptions(e) {
    browser.storage.local.set({
        YouTubeScreenshotAddonisDebugModeOn: document.querySelector('input[value=debugOn]').checked,
        screenshotAction: document.querySelector('select[name=action]').value,
        imageFormat: document.querySelector('select[name=format]').value,
    });
    e.preventDefault();
}

function restoreOptions() {
    document.querySelector("select[name=action]").addEventListener("change", (event) => {
        console.log(event);
        document.querySelector('#format').hidden =
            document.querySelector('option[value=clipboard]').selected;
    });

    browser.storage.local.get().then((value) => {
        if (value.YouTubeScreenshotAddonisDebugModeOn) {
            document.querySelector('input[value=debugOn]').checked = true;
        } else {
            document.querySelector('input[value=debugOff]').checked = true;
        }

        if (value.screenshotAction === "clipboard") {
            document.querySelector('option[value=clipboard]').selected = true;
            document.querySelector('#format').hidden = true;
        }

        if (value.imageFormat === "png")
            document.querySelector('option[value=png]').selected = true;
    });
}

document.querySelector('input[value=debugOff]').checked = true; // Default behaviour
document.addEventListener('DOMContentLoaded', restoreOptions);
document.querySelector("#save").addEventListener("click", saveOptions);
