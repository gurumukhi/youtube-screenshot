var loggingEnabled = false;
var copyToClipboardEnabled = false;

// Image format
var imageFormat = "image/jpeg";
var imageFormatExtension = "jpeg";

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

  if (copyToClipboardEnabled)
    copyToClipboard(canvas);
  else
    downloadFile(canvas, video);
};

downloadFile = function (canvas, video) {
  var aClass = "youtube-screenshot-a";
  var a = document.createElement("a");
  a.href = canvas.toDataURL(imageFormat);
  a.download = getFileName(video);
  a.style.display = "none";
  a.classList.add(aClass);
  document.body.appendChild(a);
  document.querySelector(`.${aClass}`).click();
  document.body.removeChild(a);
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

getFileName = function (video) {
  seconds = video.currentTime;
  mins = seconds / 60;
  secs = seconds % 60;
  m = mins.toString();
  s = secs.toString();
  mm = m.substring(0, m.indexOf("."));
  ss = s.substring(0, s.indexOf("."));
  if (ss.length == 1) {
    ss = "0" + ss;
  }
  return `${window.document.title} - ${mm}:${ss}.${imageFormatExtension}`;
};

function addButtonOnRegularPlayer(container) {
  // Check if button already present
  let previousBtn = container.querySelector("button.ytp-screenshot");
  if (previousBtn) {
    logger("Removing previous regular screenshot button");
    previousBtn.remove();
  }

  logger("Adding regular screenshot button");
  let btn = document.createElement("button");
  let t = document.createTextNode("Screenshot");
  btn.classList.add("ytp-time-display");
  btn.classList.add("ytp-button");
  btn.classList.add("ytp-screenshot");
  btn.style.width = "auto";
  btn.appendChild(t);
  container.insertBefore(btn, container.firstChild);

  logger("Adding regular button event listener");
  btn.removeEventListener("click", captureScreenshot);
  btn.addEventListener("click", captureScreenshot);
};

function addButtonOnShortsPlayer(container) {
  // Check if button already present
  let previousBtn = container.querySelector("button.ytd-screenshot");
  if (previousBtn) {
    logger("Removing previous shorts screenshot button");
    previousBtn.remove();
  }

  let btn = document.createElement("button");
  let t = document.createTextNode("Screenshot");
  btn.classList.add("ytd-shorts-player-controls");
  btn.classList.add("ytd-screenshot");
  btn.style.color = getComputedStyle(container.querySelector("yt-icon")).color;
  btn.style.width = "auto";
  btn.style.border = "none";
  btn.style.cursor = "pointer";
  btn.style.background = "none";
  btn.appendChild(t);
  container.insertBefore(btn, container.querySelector("yt-icon-button").nextSibling);

  logger("Adding shorts button event listener");
  btn.removeEventListener("click", captureScreenshot);
  btn.addEventListener("click", captureScreenshot);
}

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

logger = function (message) {
  if (loggingEnabled) {
    console.log(`Youtube Screenshot Addon: ${message}`);
  }
};

// Initialization
console.log("Initializing Youtube Screenshot Addon");

var storageItem = browser.storage.local.get();
storageItem.then((result) => {
  if (result.YouTubeScreenshotAddonisDebugModeOn) {
    logger("Addon initializing!");
    loggingEnabled = true;
  }

  if (result.screenshotAction === "clipboard") {
    copyToClipboardEnabled = true;
  } else {
    if (result.imageFormat === "png") {
      imageFormat = "image/png";
      imageFormatExtension = "png";
    }

    logger(`Setting image format to: ${imageFormat}`);
  }

  waitForControls(
    (regularControls) => {
      addButtonOnRegularPlayer(regularControls);
    },
    (shortsControls) => {
      addButtonOnShortsPlayer(shortsControls);
    }
  );
});
