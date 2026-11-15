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

const options = {
  YouTubeScreenshotAddonisDebugModeOn: {
    root: document.querySelector("fieldset#debug"),
    type: "boolean",
    default: false,
  },
  screenshotAction: {
    root: document.querySelector("fieldset#action"),
    type: "value",
    default: "file",
  },
  imageFormat: {
    root: document.querySelector("fieldset#format"),
    type: "value",
    default: "jpeg",
  },
  shortcutEnabled: {
    root: document.querySelector("fieldset#shortcut"),
    type: "boolean",
    default: true,
  },
  shortcutKey: {
    root: document.querySelector("fieldset#shortcutKey"),
    type: "key",
    default: "Shift",
  },
  blockKey: {
    root: document.querySelector("fieldset#blockKey"),
    type: "key",
    default: "p",
  },
  saveAsEnabled: {
    root: document.querySelector("fieldset#saveAs"),
    type: "boolean",
    default: false,
  }
};

const actionClipboardInput = options.screenshotAction.root.querySelector("input[value=clipboard]");
const formatPngInput = options.imageFormat.root.querySelector("input[value=png]");

// The picked key is kept in dataset.key (KeyboardEvent.key), the input only shows its name
function setKeyInput(input, key) {
  input.dataset.key = key;
  input.value = (key === "") ? "None" : (key === " ") ? "Space" : (key.length == 1) ? key.toUpperCase() : key;
}

document.querySelectorAll("input.keyInput").forEach((input) => {
  input.addEventListener("keydown", (e) => {
    // Tab still moves the focus out of the box
    if (e.key === "Tab")
      return;

    e.preventDefault();
    // Only the "hide key" box can be empty: the shortcut always needs a key
    const clearable = (input.id === "blockKeyInput");
    setKeyInput(input, (clearable && e.key === "Backspace") ? "" : e.key);
  });
});

async function saveOptions(e) {
  e.preventDefault();

  let selectedOptions = {};

  for (const [key, option] of Object.entries(options)) {
    if (option.type == "key") {
      selectedOptions[key] = option.root.querySelector("input").dataset.key;
    } else if (option.type == "boolean") {
      const selected = option.root.querySelector("input:checked");
      selectedOptions[key] = (selected.value == "on");
    } else {
      const selected = option.root.querySelector("input:checked");
      selectedOptions[key] = selected.value;
    }
  }

  await browser.storage.local.set(selectedOptions)
  await sendReloadToTabs();

  // In case the preferences are saved from popup, just close this window
  if (isPopup())
    window.close();
}

function handleAction() {
  if (actionClipboardInput.checked) {
    options.imageFormat.root.disabled = true;
    formatPngInput.checked = true;
  } else {
    options.imageFormat.root.disabled = false;
  }
}

async function restoreOptions() {
  document.querySelectorAll("fieldset#action input").forEach((input) => {
    input.addEventListener("change", handleAction);
  });

  const savedOptions = await browser.storage.local.get();

  for (const [key, option] of Object.entries(options)) {
    const value = savedOptions[key] ?? option.default;
    if (option.type == "key") {
      setKeyInput(option.root.querySelector("input"), value);
    } else if (option.type == "boolean") {
      option.root.querySelector(`input[value=${value ? "on" : "off"}]`).checked = true;
    } else {
      option.root.querySelector(`input[value=${value}]`).checked = true;
    }
  }

  handleAction();
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.querySelector("#save").addEventListener("click", saveOptions);
document.querySelector("#restore").addEventListener("click", async () => {
  await browser.storage.local.remove(Object.keys(options));
  restoreOptions();
  await sendReloadToTabs();
});
