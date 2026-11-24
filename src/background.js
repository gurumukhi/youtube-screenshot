import sanitize from "sanitize-filename";

function showNotification(message) {
  browser.notifications.create({
    type: "basic",
    title: "Youtube Screenshot",
    message: message,
  });
}

async function copyToClipboard(data, format) {
  let buffer = await data.arrayBuffer();
  await browser.clipboard.setImageData(buffer, format.replace(/^image\//, ""));
  showNotification("Screenshot successfully copied to clipboard.");
}

function resolveFilename(filename) {
  filename = sanitize(filename, { replacement: '_' });
  return (filename == "") ? "screenshot" : filename;
}

// Firefox's own "uniquify" gives "name(1).jpeg": pick the free "name (1).jpeg" ourselves instead
async function isTaken(filename) {
  const escaped = filename.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const items = await browser.downloads.search({ filenameRegex: `[/\\\\]${escaped}$` });
  return items.some((item) => item.exists || item.state === "in_progress");
}

async function uniqueFilename(filename) {
  const dot = filename.lastIndexOf(".");
  const base = filename.slice(0, dot);
  const extension = filename.slice(dot);

  let candidate = filename;
  for (let n = 1; await isTaken(candidate); n++)
    candidate = `${base} (${n})${extension}`;
  return candidate;
}

// One download at a time, so two quick screenshots don't both pick the same free name
let downloadQueue = Promise.resolve();

function downloadUnique(request) {
  const run = async () => browser.downloads.download({
    url: URL.createObjectURL(request.data),
    filename: await uniqueFilename(resolveFilename(request.filename)),
    saveAs: request.saveAs,
    conflictAction: "uniquify",
  });
  const result = downloadQueue.then(run);
  downloadQueue = result.catch(() => {});
  return result;
}

browser.runtime.onMessage.addListener(async request => {
  try {
    if (request.cmd === "downloadFile") {
      await downloadUnique(request);
    } else if (request.cmd === "copyToClipboard") {
      return copyToClipboard(request.data, request.format);
    } else if (request.cmd === "showProtectionError") {
      showNotification("Cannot screenshot DRM-protected content.");
    }

    // OK
    return {};
  } catch(e) {
    throw e;
  }
});
