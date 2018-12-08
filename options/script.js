function saveOptions(e) {
    browser.storage.local.set({
        YouTubeScreenshotAddonisDebugModeOn: document.querySelector('input[name=debugMode]:checked') &&
                    document.querySelector('input[name=debugMode]:checked').value === 'debugOn'
    });
    e.preventDefault();
}

function restoreOptions() {
    var storageItem = browser.storage.local.get();
    storageItem.then((value) => {
        if (value.YouTubeScreenshotAddonisDebugModeOn) {
            document.querySelector('input[value=debugOn]').checked = true;
        } else {
            document.querySelector('input[value=debugOff]').checked = true;
        }
    });
}

document.querySelector('input[value=debugOff]').checked = true; // Default behaviour
document.addEventListener('DOMContentLoaded', restoreOptions);
document.querySelector("#save").addEventListener("click", saveOptions);