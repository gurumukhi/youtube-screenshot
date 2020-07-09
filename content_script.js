var loggingEnabled = false;
var initCalled = false;

// Take screenshot
captureScreenshot = function () {
  logger("Capturing screenshot");
  var canvas = document.createElement("canvas");
  var video = document.querySelector("video");
  var ctx = canvas.getContext("2d");
  canvas.width = parseInt(video.style.width);
  canvas.height = parseInt(video.style.height);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  downloadFile(canvas);
};

downloadFile = function (canvas, copyToClipboard) {
  if (copyToClipboard) {
    canvas.toBlob((blob) => {
      console.log(blob);

      console.log("writing now png");
      navigator.clipboard
        .write([new ClipboardItem({ "image/png": blob })])
        .then(() => {
          console.log("write done");
          navigator.clipboard
            .read()
            .then((data) => console.log(data))
            .catch((e) => console.warn(e));
        })
        .catch((e) => console.warn(e));

      // console.log("checking permission");
      // navigator.permissions
      //   .query({ name: "clipboard-write" })
      //   .then((result) => {
      //     if (result.state == "granted" || result.state == "prompt") {
      //       console.log("writing now");
      //       navigator.clipboard
      //         .write([new ClipboardItem({ "image/jpeg": blob })])
      //         .then(() =>
      //           navigator.clipboard.read().then((data) => console.log(data))
      //         );
      //     } else {
      //       console.log("Clipboard permission issue");
      //     }
      //   })
      //   .catch((e) => console.warn(e));
    });
    // return;
  }
  var aClass = "youtube-screenshot-a";
  var a = document.createElement("a");
  a.href = canvas.toDataURL("image/jpeg");
  a.download = getFileName();
  a.style.display = "none";
  a.classList.add(aClass);
  document.body.appendChild(a);
  if (copyToClipboard) {
    console.log(a.href);
    // navigator.clipboard
    //   .write([new ClipboardItem({ "image/jpeg": a.href })])
    //   .then(() => navigator.clipboard.read().then((data) => console.log(data)));

    var img = document.createElement("img");
    img.src = a.href;

    var div = document.createElement("div");
    div.contentEditable = true;
    div.appendChild(img);
    document.body.appendChild(div);

    SelectText(div);

    //Execute copy Command
    //Note: This will ONLY work directly inside a click listenner
    console.log("selected");
    document.execCommand("copy");
    console.log("copied");
  } else {
    document.querySelector(`.${aClass}`).click();
  }
  document.body.removeChild(a);
};

//Cross-browser function to select content
function SelectText(element) {
  console.log("selecting");
  var doc = document;
  if (doc.body.createTextRange) {
    console.log("1");
    var range = document.body.createTextRange();
    range.moveToElementText(element);
    range.select();
  } else if (window.getSelection) {
    console.log("2");
    // debugger;
    try {
      var selection = window.getSelection();
      var range = document.createRange();
      range.selectNodeContents(element);
      console.log("2-8");
      selection.removeAllRanges();
      selection.addRange(range);
      console.log("2-9");
    } catch (e) {
      console.warn(e);
    }
  } else {
    console.log("3");
  }
}

getFileName = function () {
  seconds = document.getElementsByClassName("video-stream")[0].currentTime;
  mins = seconds / 60;
  secs = seconds % 60;
  m = mins.toString();
  s = secs.toString();
  mm = m.substring(0, m.indexOf("."));
  ss = s.substring(0, s.indexOf("."));
  if (ss.length == 1) {
    ss = "0" + ss;
  }
  return `${window.document.title} - ${mm}:${ss}.jpeg`;
};

addButtonOnYoutubePlayer = function () {
  logger("Adding screenshot button");
  var btn = document.createElement("button");
  var t = document.createTextNode("Screenshot");
  btn.classList.add("ytp-time-display");
  btn.classList.add("ytp-button");
  btn.classList.add("ytp-screenshot");
  btn.style.width = "auto";
  // btn.title =
  // "You can also press ctrl+e (or cmd+e) to copy screenshot to clipboard.";
  btn.appendChild(t);
  var youtubeRightButtonsDiv = document.querySelector(".ytp-right-controls");
  youtubeRightButtonsDiv.insertBefore(btn, youtubeRightButtonsDiv.firstChild);
};

addEventListener = function () {
  logger("Adding button event listener");
  var youtubeScreenshotButton = document.querySelector(".ytp-screenshot");
  youtubeScreenshotButton.removeEventListener("click", captureScreenshot);
  youtubeScreenshotButton.addEventListener("click", captureScreenshot);
};

logger = function (message) {
  if (loggingEnabled) {
    console.log(`Youtube Screenshot Addon: ${message}`);
  }
};

init = function () {
  if (initCalled) {
    console.log("NOT SETTING");
    return;
  }

  console.log("SETTING");
  initCalled = true;
  // Initialization
  var storageItem = browser.storage.local.get();
  storageItem.then((result) => {
    if (result.YouTubeScreenshotAddonisDebugModeOn) {
      logger("Addon initializing!");
      loggingEnabled = true;
    }
    addButtonOnYoutubePlayer();
    addEventListener();
  });
};

init();
