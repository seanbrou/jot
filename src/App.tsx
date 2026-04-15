import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { CaptureWindow } from "./components/capture-window";
import { MainWindow } from "./components/main-window";
import { OatAppProvider } from "./hooks/use-oat-app";

const windowLabel = getCurrentWebviewWindow().label;

function App() {
  return (
    <OatAppProvider windowLabel={windowLabel}>
      {windowLabel === "capture" ? <CaptureWindow /> : <MainWindow />}
    </OatAppProvider>
  );
}

export default App;
