// Logger is disabled by default
function logNull(message) {
  // Nothing
}

function logConsole(message) {
  console.log(`Youtube Screenshot Addon: ${message}`);
}

let logger = logNull;

let currentConfiguration = {
  downloadFile: true,
  copyToClipboard: false,

  // Image format
  imageFormat: "image/jpeg",
  imageFormatExtension: "jpeg",

  shortcutEnabled: true,
  saveAsEnabled: false,
};

// Take screenshot
captureScreenshot = function () {
  logger("Capturing screenshot");

  // Several <video> tags can be present in the document at the same time
  // Sometimes (e.g. Youtube Shorts), the first is not the one playing the current stream
  // Add "src" attribute filter however seems to do the trick
  let video = document.querySelector("video[src]");

  if (video.mediaKeys != null) {
    browser.runtime.sendMessage({cmd: "showProtectionError"});
    return;
  }

  let canvas = document.createElement("canvas");
  let ctx = canvas.getContext("2d");
  canvas.width = parseInt(video.videoWidth);
  canvas.height = parseInt(video.videoHeight);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  if (currentConfiguration.copyToClipboard)
    copyToClipboard(canvas);

  if (currentConfiguration.downloadFile)
    downloadFile(canvas, video);
}

function downloadFile(canvas, video) {
  canvas.toBlob((blob) => {
    browser.runtime.sendMessage({cmd: "downloadFile", data: blob, filename: getFileName(video), saveAs: currentConfiguration.saveAsEnabled})
      .then(() => logger("Successfully started download file"))
      .catch(e => logger(`Failed to download file: ${e.message}`))
    }, currentConfiguration.imageFormat);
}

function copyToClipboard(canvas) {
  logger("Copying to clipboard");

  canvas.toBlob((blob) => {
    // Send the data to background script as navigator.clipboard.write()
    // is not yet supported by default on Firefox
    browser.runtime.sendMessage({cmd: "copyToClipboard", data: blob})
      .then(() => logger("Successfully copied to clipboard"))
      .catch(e => logger(`Failed to copy to clipboad: ${e.message}`))
    }, "image/png");
}

function getFileName(video) {
  let timeString = "";
  const seconds = video.currentTime;
  let mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds - (mins * 60));

  let s = secs.toString();
  if (s.length == 1)
    s = "0" + s;

  if (mins >= 60) {
    const hours = Math.floor(mins / 60);
    mins -= (hours * 60);

    let m = mins.toString();
    if (m.length == 1)
      m = "0" + m;

    timeString = `${hours}-${m}-${s}`;
  } else {
    timeString += `0-`+`${mins}-${s}`;
  }

  return `${window.document.title} - ${timeString}.${currentConfiguration.imageFormatExtension}`;
};

function setShortsButtonStyle(btn) {
  btn.innerHTML = `
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="currentColor">
      <path d="M9 2L7 4H4C2.9 4 2 4.9 2 6v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3l-2-2H9zm3 16c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/>
    </svg>
  `;

  // Try to mimic YouTube shorts buttons
  btn.classList.add("yt-icon-button", "ytd-button-renderer", "style-scope");
  btn.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border: none;
    border-radius: 50%;
    flex-shrink: 0;
    color: white;
    cursor: pointer;
    padding: 0;
    margin: 0 4px;
    pointer-events: auto;
    backdrop-filter: blur(8px);
    background-color: rgba(0,0,0,0.3);
  `;
  btn.onmouseenter = () => {
    btn.style.backgroundColor = "rgba(40,40,40,0.6)";
  };
  btn.onmouseleave = () => {
    btn.style.backgroundColor = "rgba(0,0,0,0.3)";
  };

  const svg = btn.querySelector("svg");
  svg.style.cssText = `
    width: 20px;
    height: 20px;
    pointer-events: none;
    color: inherit;
  `;
}

function addButtonOnPlayer(container, regularNotShorts) {
  const btnClass = regularNotShorts ? "ytp-screenshot" : "ytd-screenshot";
  const type = regularNotShorts ? "regular" : "shorts";

  // Check if button already present
  let previousBtn = container.querySelector(`button.${btnClass}`);
  if (previousBtn) {
    logger(`Removing previous ${type} screenshot button`);
    previousBtn.remove();
  }

  logger(`Adding ${type} screenshot button`);
  let btn = document.createElement("button");
  btn.classList.add(btnClass);

  if (regularNotShorts) {
    btn.classList.add("ytp-time-display", "ytp-button");
    btn.style.width = "auto";

    const t = document.createTextNode("Screenshot");
    btn.appendChild(t);

    container.insertBefore(btn, container.firstChild);
  } else {
    setShortsButtonStyle(btn);
    container.appendChild(btn);
  }

  logger(`Adding ${type} button event listener`);
  btn.removeEventListener("click", captureScreenshot);
  btn.addEventListener("click", captureScreenshot);
};

function searchControls(element, regularCallback, shortsCallback) {
  const regularControlsSelector = "div.ytp-right-controls";
  const shortsControlsSelector = "ytd-shorts-player-controls";

  if (element !== document && element.matches(regularControlsSelector)) {
    logger("Found regular controls");
    regularCallback(element);
  } else {
    const regularControls = element.querySelector(regularControlsSelector);
    if (regularControls) {
      logger("Found regular controls");
      regularCallback(regularControls);
    }
  }

  if (element !== document && element.matches(shortsControlsSelector)) {
    logger("Found shorts controls");
    shortsCallback(element);
  } else {
    const shortsControls = element.querySelector(shortsControlsSelector);
    if (shortsControls) {
      logger("Found shorts controls");
      shortsCallback(shortsControls);
    }
  }
}

function waitForControls(regularCallback, shortsCallback) {
  logger("Wait for controls");

  searchControls(document, regularCallback, shortsCallback);

  // Monitor controls:
  // - wait for them to be added to document
  // - detect when switching from regular to shorts or vice versa
  logger("Monitor controls");

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (!mutation.addedNodes)
        return;

      for (let element of mutation.addedNodes) {
        if (element.nodeType != Node.ELEMENT_NODE)
          continue;

        searchControls(element, regularCallback, shortsCallback);
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

async function loadConfiguration() {
  logger("Load configuration");

  const result = await browser.storage.local.get();
  if (result.YouTubeScreenshotAddonisDebugModeOn) {
    logger = logConsole;
    logger("Logger enabled");
  } else {
    logger = logNull;
  }

  // Shortcut
  currentConfiguration.shortcutEnabled = result.shortcutEnabled ?? true;
  logger(`${currentConfiguration.shortcutEnabled ? "Enabling" : "Disabling"} screenshot shortcut`);

  // Save as
  currentConfiguration.saveAsEnabled = result.saveAsEnabled ?? false;
  logger(`${currentConfiguration.saveAsEnabled ? "Enabling" : "Disabling"} save as download`);

  // Button action and image format
  if (result.screenshotAction === "clipboard") {
    currentConfiguration.downloadFile = false;
    currentConfiguration.copyToClipboard = true;
  } else if (result.screenshotAction === "both") {
    currentConfiguration.downloadFile = true;
    currentConfiguration.copyToClipboard = true;
  } else {
    // screenshotAction === "file"
    currentConfiguration.downloadFile = true;
    currentConfiguration.copyToClipboard = false;
  }

  if (currentConfiguration.downloadFile) {
    if (result.imageFormat === "png") {
      currentConfiguration.imageFormat = "image/png";
      currentConfiguration.imageFormatExtension = "png";
    } else {
      currentConfiguration.imageFormat = "image/jpeg";
      currentConfiguration.imageFormatExtension = "jpeg";
    }

    logger(`Setting image format to: ${currentConfiguration.imageFormat}`);
  }
}

// Initialization (logger is not yet really initialized for the moment)
console.log("Initializing Youtube Screenshot Addon");

loadConfiguration().then(() => {
  waitForControls(
    (regularControls) => {
      addButtonOnPlayer(regularControls, true);
    },
    (shortsControls) => {
      addButtonOnPlayer(shortsControls, false);
    }
  );
});

// Handle messages
browser.runtime.onMessage.addListener(request => {
  logger("Received message from background script");

  if (request.cmd === "reloadConfiguration")
    loadConfiguration();

  return Promise.resolve({});
});

// Handle shortcut
document.addEventListener('keydown', e => {
  if (!currentConfiguration.shortcutEnabled) {
    logger("Shortcut is disabled");
    return;
  }

  const tagName = e.target.tagName;
  if (e.target.isContentEditable
      || (tagName === "INPUT")
      || (tagName === "SELECT")
      || (tagName === "TEXTAREA")) {
      return;
    }

  if (!e.shiftKey)
    return;

  if ((e.key === 'a') || (e.key === 'A')) {
    logger("Catching screenshot shortcut");

    // Simply search for the screenshot button and simulate click
    let btn = document.querySelector("button.ytp-screenshot")
              || document.querySelector("button.ytd-screenshot");

    if (btn) {
      btn.click();
      return;
    }
  }
});
