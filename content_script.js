var loggingEnabled = false;
var copyToClipboardEnabled = false;

// Image format
var imageFormat = "image/jpeg";
var imageFormatExtension = "jpeg";

// Take screenshot
captureScreenshot = function () {
  logger("Capturing screenshot");
  var canvas = document.createElement("canvas");
  var video = document.querySelector("video");
  if (video.mediaKeys != null) {
    console.log("drm protected 1");
    browser.runtime.sendMessage({cmd: "protectionError"});
    return;
  }
  var ctx = canvas.getContext("2d");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
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

addButtonOnYoutubePlayer = function (controlsDiv) {
  // Check if button already present
  let previousBtn = document.querySelector("button.ytp-screenshot");
  if (previousBtn) {
    logger("Removing previous screenshot button");
    previousBtn.remove();
  }

  logger("Adding screenshot button");
  let btn = document.createElement("button");
  let t = document.createTextNode("Screenshot");
  btn.classList.add("ytp-time-display");
  btn.classList.add("ytp-button");
  btn.classList.add("ytp-screenshot");
  btn.style.width = "auto";
  btn.appendChild(t);
  controlsDiv.insertBefore(btn, controlsDiv.firstChild);

  logger("Adding button event listener");
  btn.removeEventListener("click", captureScreenshot);
  btn.addEventListener("click", captureScreenshot);
};

function waitForYoutubeControls(callback) {
  const controlsClass = "ytp-right-controls";

  const controlsDiv = document.querySelector(`.${controlsClass}`);
  if (controlsDiv) {
    callback(controlsDiv);
    return;
  }

  // Controls are not yet ready, wait for them
  logger("Wait for Youtube controls");

  let observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      if (!mutation.addedNodes)
        return;

      for (let element of mutation.addedNodes) {
        if (element.classList.contains(controlsClass)) {
          observer.disconnect();
          logger("Found Youtube controls");
          callback(element);
        }
      }
    })
  })

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

  waitForYoutubeControls(controlsDiv => {
    addButtonOnYoutubePlayer(controlsDiv);
  });
});
