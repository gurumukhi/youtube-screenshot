// Send message to active tabs to reload configuration
async function sendReloadToTabs() {
  const tabs = await browser.tabs.query({});

  for (let tab of tabs) {
    try {
      await browser.tabs.sendMessage(tab.id, { cmd: "reloadConfiguration" });
    } catch {
      // Ignore
    }
  }
}

async function saveOptions(e) {
  e.preventDefault();

  await browser.storage.local.set({
    YouTubeScreenshotAddonisDebugModeOn: document.querySelector('input[name=debugMode]:checked') &&
    document.querySelector('input[name=debugMode]:checked').value === 'debugOn',
    screenshotAction: document.querySelector('select[name=action]').value,
    imageFormat: document.querySelector('select[name=format]').value,
  });

  sendReloadToTabs();
}

async function restoreOptions() {
  document.querySelector("select[name=action]").addEventListener("change", (event) => {
    document.querySelector('div#format').hidden =
    document.querySelector('option[value=clipboard]').selected;
  });

  let value = await browser.storage.local.get();
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
}

document.querySelector('input[value=debugOff]').checked = true; // Default behaviour
document.addEventListener('DOMContentLoaded', restoreOptions);
document.querySelector("#save").addEventListener("click", saveOptions);
