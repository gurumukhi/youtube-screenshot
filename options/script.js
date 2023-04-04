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

function handleSettingsChange(item, field, getValue) {
  item.addEventListener("change",
    async () => {
      let value = {};
      value[field] = getValue();
      await browser.storage.local.set(value);
      sendReloadToTabs();
  });
}

async function restoreOptions() {
  let value = await browser.storage.local.get();

  // Debug
  const debugCheckbox = document.querySelector("input[name=debugMode]");
  debugCheckbox.checked = value.YouTubeScreenshotAddonisDebugModeOn;
  handleSettingsChange(debugCheckbox, "YouTubeScreenshotAddonisDebugModeOn", () => {
    return document.querySelector('input[name=debugMode]').checked;
  });

  // Button action
  const clipboardOption = document.querySelector("option[value=clipboard]");
  const formatDiv = document.querySelector("#format");
  if (value.screenshotAction === "clipboard") {
    clipboardOption.selected = true;
    formatDiv.hidden = true;
  }

  const actionSelect = document.querySelector("select[name=action]");
  actionSelect.addEventListener("change",
    async () => {
      formatDiv.hidden = clipboardOption.selected;

      await browser.storage.local.set({
        screenshotAction: actionSelect.value
      });

      sendReloadToTabs();
  });

  // Image format
  if (value.imageFormat === "png")
    document.querySelector("option[value=png]").selected = true;

  const formatSelect = document.querySelector("select[name=format]");
  handleSettingsChange(
    formatSelect,
    "imageFormat",
    () => { return formatSelect.value; }
  );
}

document.addEventListener('DOMContentLoaded', restoreOptions);
