function showNotification(message) {
  browser.notifications.create({
    type: "basic",
    title: "Youtube Screenshot",
    message: message,
  });
}

async function copyToClipboard(data) {
  let buffer = await data.arrayBuffer();
  await browser.clipboard.setImageData(buffer, "png");
  showNotification("Screenshot successfully copied to clipboard.");
}

browser.runtime.onMessage.addListener(async request => {
  try {
    if (request.cmd === "downloadFile") {
      await browser.downloads.download({
        url: URL.createObjectURL(request.data),
        filename: request.filename,
        saveAs: request.saveAs,
        conflictAction: "uniquify",
      });
    } else if (request.cmd === "copyToClipboard") {
      return copyToClipboard(request.data);
    } else if (request.cmd === "showProtectionError") {
      showNotification("Cannot screenshot DRM-protected content.");
    }

    // OK
    return {};
  } catch(e) {
    throw e;
  }
});
