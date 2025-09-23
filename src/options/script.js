const debugOnInput = document.querySelector("input[value=debugOn]");
const actionClipboardInput = document.querySelector("input[value=actionClipboard]");
const actionBothInput = document.querySelector("input[value=actionBoth]");
const formatFieldset = document.querySelector("fieldset#format");
const formatPngInput = document.querySelector("input[value=formatPng]");
const shortcutOffInput = document.querySelector("input[value=shortcutOff]");
const saveAsOnInput = document.querySelector("input[value=saveAsOn]");

function isPopup() {
  return (location.hash === '#popup');
}
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

  // Sceenshot action
  let screenshotAction = "file";
  if (actionClipboardInput.checked)
    screenshotAction = "clipboard";
  else if (actionBothInput.checked)
    screenshotAction = "both";

  await browser.storage.local.set({
    YouTubeScreenshotAddonisDebugModeOn: debugOnInput.checked,
    screenshotAction: screenshotAction,
    imageFormat: formatPngInput.checked ? "png" : "jpeg",
    shortcutEnabled: !shortcutOffInput.checked,
    saveAsEnabled: saveAsOnInput.checked,
  });

  await sendReloadToTabs();

  // In case the preferences are saved from popup,
  // just close this window
  if (isPopup())
    window.close();
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
    // Debug mode
    if (value.YouTubeScreenshotAddonisDebugModeOn)
      debugOnInput.checked = true;
    else
      document.querySelector("input[value=debugOff]").checked = true;

    // Screenshot action
    if (value.screenshotAction === "clipboard")
      actionClipboardInput.checked = true;
    else if (value.screenshotAction == "both")
      actionBothInput.checked = true;
    else
      document.querySelector("input[value=actionFile]").checked = true;

    // Image format
    if (value.imageFormat === "png")
      formatPngInput.checked = true;
    else
      document.querySelector("input[value=formatJpeg]").checked = true;

    // Shortcut
    if (value.shortcutEnabled === false)
      shortcutOffInput.checked = true
    else
      document.querySelector("input[value=shortcutOn]").checked = true;

    // Save as
    if (value.saveAsEnabled === true)
      saveAsOnInput.checked = true
    else
      document.querySelector("input[value=saveAsOff]").checked = true;

    handleAction();
  });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.querySelector("#save").addEventListener("click", saveOptions);

// Ensure padding for popup
if (isPopup()) {
  document.body.classList.add("popup");
}
