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
};

// Shorts container tag and active attribute
const shortsContainerTag = "ytd-reel-video-renderer";
const shortsContainerTagName = shortsContainerTag.toUpperCase();
const shortsContainerActiveAttribute = "is-active";

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
};

function downloadFile(canvas, video) {
  let a = document.createElement("a");
  a.href = canvas.toDataURL(`${currentConfiguration.imageFormat}`);
  a.download = getFileName(video);
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
};

function copyToClipboard(canvas) {
  logger("Copying to clipboard");

  canvas.toBlob((blob) => {
    // Send the data to background script as navigator.clipboard.write()
    // is not yet supported by default on Firefox
    browser.runtime.sendMessage({cmd: "copyToClipboard", data: blob})
      .then((e) => {
        if (e)
          logger(`Failed to copy to clipboad: ${e.message}`);
        else
          logger("Successfully copied to clipboard");
      });
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
  let t = document.createTextNode("Screenshot");

  if (regularNotShorts) {
    btn.classList.add("ytp-time-display");
    btn.classList.add("ytp-button");
  } else {
    btn.classList.add("ytd-shorts-player-controls");
    btn.style.color = getComputedStyle(container.querySelector("yt-icon")).color;

    btn.style.border = "none";
    btn.style.cursor = "pointer";
    btn.style.background = "none";

    // Ensure the pointer event are not disabled for our custom button
    btn.style.pointerEvents = "all";
  }

  btn.classList.add(btnClass);
  btn.style.width = "auto";
  btn.appendChild(t);

  if (regularNotShorts)
    container.insertBefore(btn, container.firstChild);
  else
    container.insertBefore(btn, container.querySelector("yt-icon-button").nextSibling);

  logger(`Adding ${type} button event listener`);
  btn.removeEventListener("click", captureScreenshot);
  btn.addEventListener("click", captureScreenshot);
};

function observeShortsContainer(element, shortsCallback) {
  logger("Observe shorts container");

  let observer = new MutationObserver((mutations) => {
    for (const mutation of mutations)
    {
      if (mutation.attributeName != shortsContainerActiveAttribute)
        continue;

      if (element.getAttribute(shortsContainerActiveAttribute) == null) {
        // No more the active container
        observer.disconnect();

        // Find the new active container
        const container = document.querySelector(`${shortsContainerTag}[${shortsContainerActiveAttribute}]`);
        if (!container) {
          logger("No more active shorts container");
          continue;
        }

        retrieveShortsControls(container, shortsCallback);
        break;
      }
    }
  });

  observer.observe(element, { attributes: true, childList: false, subtree: false });
}

function retrieveShortsControls(container, shortsCallback) {
  const controls = container.querySelector("ytd-shorts-player-controls");
  if (controls) {
    // Monitor container to catch when active one changes
    observeShortsContainer(container, shortsCallback);

    logger("Found shorts controls");
    shortsCallback(controls);
  }
}

function waitForControls(regularCallback, shortsCallback) {
  logger("Wait for controls");

  const regularControlsClass = "ytp-right-controls";

  const regularControls = document.querySelector(`.${regularControlsClass}`);
  if (regularControls)
    regularCallback(regularControls);

  const shortsContainer = document.querySelector(`${shortsContainerTag}[${shortsContainerActiveAttribute}]`);
  if (shortsContainer)
    retrieveShortsControls(shortsContainer, shortsCallback);

  // Monitor controls:
  // - wait for them to be added to document
  // - detect when switching from regular to shorts or vice versa
  logger("Monitor controls");

  let observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (!mutation.addedNodes)
        return;

      for (let element of mutation.addedNodes) {

        if (element.nodeType != Node.ELEMENT_NODE)
          continue;

        if (element.classList.contains(regularControlsClass)) {
          logger("Found regular controls");
          regularCallback(element);
          continue;
        }

        if ((element.tagName === shortsContainerTagName)
          && (element.getAttribute(shortsContainerActiveAttribute) != null)) {
            retrieveShortsControls(element, shortsCallback);
            break;
        }
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
