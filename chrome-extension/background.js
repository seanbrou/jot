const DEFAULT_APP_URL = "http://localhost:5173";

async function getAppUrl() {
  const { appUrl } = await chrome.storage.sync.get({ appUrl: DEFAULT_APP_URL });
  return (appUrl || DEFAULT_APP_URL).trim().replace(/\/+$/, "");
}

async function openQuickCapture() {
  const appUrl = await getAppUrl();
  const popupUrl = `${appUrl}/?capture=1&source=chrome-extension`;

  await chrome.windows.create({
    url: popupUrl,
    type: "popup",
    width: 420,
    height: 320,
    focused: true,
  });
}

chrome.action.onClicked.addListener(() => {
  void openQuickCapture();
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "open-quick-capture") {
    void openQuickCapture();
  }
});

chrome.runtime.onInstalled.addListener(() => {
  void chrome.storage.sync.set({ appUrl: DEFAULT_APP_URL });
});
