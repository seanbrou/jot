const DEFAULT_APP_URL = "http://localhost:5173";

const appUrlInput = document.querySelector("#app-url");
const saveButton = document.querySelector("#save");
const status = document.querySelector("#status");

async function loadSettings() {
  const { appUrl } = await chrome.storage.sync.get({ appUrl: DEFAULT_APP_URL });
  appUrlInput.value = appUrl;
}

function setStatus(message) {
  status.textContent = message;
  window.clearTimeout(setStatus.timeoutId);
  setStatus.timeoutId = window.setTimeout(() => {
    status.textContent = "";
  }, 2200);
}

saveButton.addEventListener("click", async () => {
  const value = appUrlInput.value.trim().replace(/\/+$/, "");

  if (!value) {
    setStatus("Add a URL first.");
    appUrlInput.focus();
    return;
  }

  await chrome.storage.sync.set({ appUrl: value });
  setStatus("Saved.");
});

void loadSettings();
