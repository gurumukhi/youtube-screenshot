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

browser.runtime.onMessage.addListener(request => {
  if (request.cmd === "downloadFile") {
    browser.downloads.download({
      url: URL.createObjectURL(request.data),
      filename: request.filename,
      conflictAction: "uniquify"
    })
    .then(() => { return Promise.resolve({}); })
    .catch((e) => { return Promise.resolve(e); });
  } else if (request.cmd === "copyToClipboard") {
    copyToClipboard(request.data)
      .then(() => { return Promise.resolve({}); })
      .catch((e) => { return Promise.resolve(e); });
  } else if (request.cmd === "showProtectionError") {
    showNotification("Cannot screenshot DRM-protected content.");
    return Promise.resolve({});
  }
});
