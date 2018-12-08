var loggingEnabled = false;
var initCalled = false;

// Take screenshot
captureScreenshot = function () {
  logger('Capturing screenshot');
  var canvas = document.createElement('canvas');
  var video = document.querySelector('video');
  var ctx = canvas.getContext('2d');
  canvas.width = parseInt(video.style.width);
  canvas.height =  parseInt(video.style.height);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  downloadFile(canvas);
};

downloadFile = function(canvas) {
  var aClass = 'youtube-screenshot-a';
  var a = document.createElement('a');
  a.href = canvas.toDataURL('image/jpeg');
  a.download = getFileName();
  a.style.display = 'none';
  a.classList.add(aClass);
  document.body.appendChild(a);
  document.querySelector(`.${aClass}`).click();
  document.body.removeChild(a);
};

getFileName = function() {
  seconds = document.getElementsByClassName('video-stream')[0].currentTime;
  mins = (seconds/60);
  secs = (seconds%60);
  m = mins.toString();
  s = secs.toString();
  mm = m.substring(0,m.indexOf('.'));
  ss = s.substring(0,s.indexOf('.'));
  if (ss.length == 1) {
    ss = '0' + ss;
  }
  return `${window.document.title} - ${mm}:${ss}.png`;
};

addButtonOnYoutubePlayer = function () {
  logger('Adding screenshot button');
  var btn = document.createElement("button");
  var t = document.createTextNode("Screenshot");
  btn.classList.add('ytp-time-display');
  btn.classList.add('ytp-button');
  btn.classList.add('ytp-screenshot');
  btn.style.width='auto';
  btn.appendChild(t);
  var youtubeRightButtonsDiv = document.querySelector('.ytp-right-controls');
  youtubeRightButtonsDiv.insertBefore(btn, youtubeRightButtonsDiv.firstChild);
};

addEventListener = function() {
  logger('Adding button event listener');
  var youtubeScreenshotButton = document.querySelector('.ytp-screenshot');
  youtubeScreenshotButton.removeEventListener('click', captureScreenshot);
  youtubeScreenshotButton.addEventListener('click', captureScreenshot);
};

logger = function(message) {
  if (loggingEnabled) {
    console.log(`Youtube Screenshot Addon: ${message}`);
  }
};

init = function () {
  if (initCalled) {
    console.log('NOT SETTING');
    return;
  }

  console.log('SETTING');
  initCalled = true;
  // Initialization
  var storageItem = browser.storage.local.get();
  storageItem.then((result) => {
    if (result.YouTubeScreenshotAddonisDebugModeOn) {
      logger('Addon initializing!');
      loggingEnabled = true;
    }
    addButtonOnYoutubePlayer();
    addEventListener();
  });
};

init();