// CSS override (unchanged)
const style = document.createElement('style');
style.textContent = `
  .ytp-right-controls {
    display: flex !important;
    margin-left: auto !important;
  }

  .ytp-chrome-controls {
    display: flex !important;
    width: 100% !important;
    align-items: center !important;
  }

  .ytp-chrome-bottom {
    display: flex !important;
    justify-content: space-between !important;
  }
`;
document.head.appendChild(style);

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
  imageFormat: "image/jpeg",
  imageFormatExtension: "jpeg",
  shortcutEnabled: true,
  saveAsEnabled: false
};

// Constants
const SHORTS_CONTAINER = "ytd-reel-video-renderer";
const SHORTS_ACTIVE_ATTR = "is-active";

// Check if URL is a Shorts URL
function isShortsUrl() {
  return location.pathname.startsWith("/shorts");
}

function captureScreenshot() {
  logger("Capturing screenshot");

  const videos = document.querySelectorAll("video[src]");
  if (!videos.length) {
    logger("No video elements found");
    return;
  }

  const video = isShortsUrl() 
    ? [...videos].find(v => v.closest(`${SHORTS_CONTAINER}[${SHORTS_ACTIVE_ATTR}]`))
    : videos[0];

  if (!video) {
    logger("No suitable video element found");
    return;
  }

  if (video.mediaKeys) {
    browser.runtime.sendMessage({cmd: "showProtectionError"});
    return;
  }

  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);

  if (currentConfiguration.copyToClipboard) copyToClipboard(canvas);
  if (currentConfiguration.downloadFile) downloadFile(canvas, video);
}

function downloadFile(canvas, video) {
  canvas.toBlob(blob => {
    browser.runtime.sendMessage({
      cmd: "downloadFile",
      data: blob,
      filename: getFileName(video),
      saveAs: currentConfiguration.saveAsEnabled
    }).catch(e => logger(`Failed to download file: ${e.message}`));
  }, currentConfiguration.imageFormat);
}

function copyToClipboard(canvas) {
  logger("Copying to clipboard");
  canvas.toBlob(blob => {
    browser.runtime.sendMessage({cmd: "copyToClipboard", data: blob})
      .catch(e => logger(`Failed to copy to clipboard: ${e.message}`));
  }, "image/png");
}

function getFileName(video) {
  const totalSeconds = Math.floor(video.currentTime);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  const timeString = hours 
    ? `${hours}-${minutes.toString().padStart(2, '0')}-${seconds.toString().padStart(2, '0')}`
    : `0-${minutes}-${seconds.toString().padStart(2, '0')}`;

  return `${document.title} - ${timeString}.${currentConfiguration.imageFormatExtension}`;
}

function createButton(regularNotShorts) {
  const btn = document.createElement("button");
  const type = regularNotShorts ? "regular" : "shorts";
  
  btn.innerHTML = `
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="currentColor">
      <path d="M9 2L7 4H4C2.9 4 2 4.9 2 6v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3l-2-2H9zm3 16c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/>
    </svg>
  `;
  
  btn.classList.add(regularNotShorts ? "ytp-screenshot" : "ytd-screenshot");
  btn.setAttribute("aria-label", "Take screenshot");
  btn.setAttribute("title", "Take screenshot");
  btn.style.cursor = "pointer";
  btn.addEventListener("click", captureScreenshot);

  const svg = btn.querySelector("svg");
  
  if (regularNotShorts) {
    // Style for regular (non-Shorts) button
    btn.classList.add("ytp-button");
    btn.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      padding: 0;
      margin: 0 4px;
    `;
    svg.style.cssText = `
      width: 24px;
      height: 24px;
      pointer-events: none;
    `;
  } else {
    // Style for Shorts button
    btn.classList.add("yt-icon-button", "ytd-button-renderer", "style-scope");
    btn.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border: none;
      border-radius: 50%;
      background-color: transparent;
      color: white;
      cursor: pointer;
      padding: 0;
      margin: 0 4px;
      pointer-events: auto;
      transition: background-color 0.3s;
    `;
    btn.onmouseenter = () => {
      btn.style.backgroundColor = "rgba(255, 255, 255, 0.16)";
    };
    btn.onmouseleave = () => {
      btn.style.backgroundColor = "transparent";
    };
    svg.style.cssText = `
      width: 20px;
      height: 20px;
      pointer-events: none;
      color: inherit;
    `;
  }

  logger(`Created ${type} screenshot button`);
  return btn;
}

function addButtonToContainer(container, regularNotShorts) {
  const btnClass = regularNotShorts ? "ytp-screenshot" : "ytd-screenshot";
  
  // Remove existing button
  const existingBtn = container.querySelector(`button.${btnClass}`);
  if (existingBtn) existingBtn.remove();
  
  // Create and position new button
  const btn = createButton(regularNotShorts);
  
  if (regularNotShorts) {
    const subtitleButton = container.querySelector(".ytp-subtitles-button");
    subtitleButton ? subtitleButton.before(btn) : container.appendChild(btn);
  } else {
    const fullscreenButton = container.querySelector('#fullscreen-button-shape');
    fullscreenButton && fullscreenButton.parentNode 
      ? fullscreenButton.parentNode.insertBefore(btn, fullscreenButton)
      : container.appendChild(btn);
  }
}

// Observer logic
function setupObservers(regularCallback, shortsCallback) {
  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      if (!mutation.addedNodes) continue;
      
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== 1) continue; // Not element node
        
        // Regular player controls
        if (node.classList?.contains("ytp-right-controls")) {
          logger("Found regular controls");
          regularCallback(node);
        }
        // Shorts container
        else if (node.tagName === SHORTS_CONTAINER.toUpperCase()) {
          if (node.hasAttribute(SHORTS_ACTIVE_ATTR)) {
            logger("Found active shorts container");
            const controls = node.querySelector("ytd-shorts-player-controls");
            if (controls) shortsCallback(controls);
          }
          
          // Watch for active attribute changes
          new MutationObserver(muts => {
            for (const m of muts) {
              if (m.attributeName === SHORTS_ACTIVE_ATTR && 
                  node.hasAttribute(SHORTS_ACTIVE_ATTR)) {
                const controls = node.querySelector("ytd-shorts-player-controls");
                if (controls) shortsCallback(controls);
              }
            }
          }).observe(node, { attributes: true });
        }
      }
    }
  });

  // Initial setup
  const regularControls = document.querySelector(".ytp-right-controls");
  if (regularControls) regularCallback(regularControls);
  
  const activeShorts = document.querySelector(`${SHORTS_CONTAINER}[${SHORTS_ACTIVE_ATTR}]`);
  if (activeShorts) {
    const controls = activeShorts.querySelector("ytd-shorts-player-controls");
    if (controls) shortsCallback(controls);
  }

  observer.observe(document.body, { childList: true, subtree: true });
}

async function loadConfiguration() {
  const result = await browser.storage.local.get();
  
  if (result.YouTubeScreenshotAddonisDebugModeOn) {
    logger = logConsole;
    logger("Logger enabled");
  } else {
    logger = logNull;
  }
  
  // Update config
  currentConfiguration.shortcutEnabled = result.shortcutEnabled ?? true;
  currentConfiguration.saveAsEnabled = result.saveAsEnabled ?? false;
  
  // Action configuration
  if (result.screenshotAction === "clipboard") {
    currentConfiguration.downloadFile = false;
    currentConfiguration.copyToClipboard = true;
  } else if (result.screenshotAction === "both") {
    currentConfiguration.downloadFile = true;
    currentConfiguration.copyToClipboard = true;
  } else {
    currentConfiguration.downloadFile = true;
    currentConfiguration.copyToClipboard = false;
  }

  // Image format
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

// Initialization
console.log("Initializing Youtube Screenshot Addon");
loadConfiguration().then(() => {
  setupObservers(
    container => addButtonToContainer(container, true),
    container => addButtonToContainer(container, false)
  );
});

// Message handling
browser.runtime.onMessage.addListener(({ cmd }) => {
  if (cmd === "reloadConfiguration") {
    logger("Reloading configuration");
    loadConfiguration();
  }
  return Promise.resolve({});
});

document.addEventListener('keydown', e => {
  if (!currentConfiguration.shortcutEnabled) {
    logger("Shortcut is disabled");
    return;
  }

  const tag = e.target.tagName;
  if (e.target.isContentEditable || ["INPUT", "SELECT", "TEXTAREA"].includes(tag)) return;
  
  if (!e.shiftKey || (e.key !== 'a' && e.key !== 'A')) return;
  
  e.preventDefault();
  logger("Catching screenshot shortcut");
  
  const btn = document.querySelector("button.ytp-screenshot, button.ytd-screenshot");
  if (btn) {
    btn.click();
  }
});