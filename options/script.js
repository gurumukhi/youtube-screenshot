const debugOnInput = document.querySelector("input[value=debugOn]");
const actionClipboardInput = document.querySelector("input[value=actionClipboard]");
const formatFieldset = document.querySelector("fieldset#format");
const formatPngInput = document.querySelector("input[value=formatPng]");

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
    YouTubeScreenshotAddonisDebugModeOn: debugOnInput.checked,
    screenshotAction: actionClipboardInput.checked ? "clipboard" : "file",
    imageFormat: formatPngInput.checked ? "png" : "jpeg",
  });

  sendReloadToTabs();
}

function handleAction() {
  if (actionClipboardInput.checked) {
    formatFieldset.disabled = true;
    formatPngInput.checked = true;
  } else {
    formatFieldset.disabled = false;
  }
}

function restoreOptions() {
  document.querySelectorAll("fieldset#action input").forEach((input) => {
    input.addEventListener("change", handleAction);
  });

  browser.storage.local.get().then((value) => {
    if (value.YouTubeScreenshotAddonisDebugModeOn)
    debugOnInput.checked = true;
    else
    document.querySelector("input[value=debugOff]").checked = true;

    if (value.screenshotAction === "clipboard")
    actionClipboardInput.checked = true;
    else
    document.querySelector("input[value=actionFile]").checked = true;

    if (value.imageFormat === "png")
    formatPngInput.checked = true;
    else
    document.querySelector("input[value=formatJpeg]").checked = true;

    handleAction();
  });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.querySelector("#save").addEventListener("click", saveOptions);
