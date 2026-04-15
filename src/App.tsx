import { CaptureWindow } from "./components/capture-window";
import { MainWindow } from "./components/main-window";
import { OatAppProvider } from "./hooks/use-oat-app";

function getWindowLabel() {
  if (typeof window === "undefined") {
    return "main";
  }

  const searchParams = new URLSearchParams(window.location.search);
  if (searchParams.get("capture") === "1") {
    return "capture";
  }

  const tauriWindowLabel = (window as typeof window & {
    __TAURI_INTERNALS__?: unknown;
    __TAURI_METADATA__?: { label?: string };
  }).__TAURI_METADATA__?.label;

  return tauriWindowLabel === "capture" ? "capture" : "main";
}

const windowLabel = getWindowLabel();

function App() {
  return (
    <OatAppProvider windowLabel={windowLabel}>
      {windowLabel === "capture" ? <CaptureWindow /> : <MainWindow />}
    </OatAppProvider>
  );
}

export default App;
