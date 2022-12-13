browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.cmd === "copyToClipboard") {
    message.data.arrayBuffer()
      .then((data) => {
          browser.clipboard.setImageData(data, "png")
          .then(() => {
            sendResponse();

            browser.notifications.create({
              type: "basic",
              title: "Youtube Screenshot",
              message: "Screenshot successfully copied to clipboard.",
            });
          })
        .catch((e) => sendResponse(e));
      })
      .catch((e) => sendResponse(e));

    return true;
  }
  if (message.cmd === "encryptionError") {
    message.data.arrayBuffer()
      .then((data) => {
            browser.notifications.create({
              type: "basic",
              title: "Youtube Screenshot",
              message: "Cannot screenshot DRM-protected content.",
            });
      })
      .catch((e) => sendResponse(e));

    return true;
  }
});
