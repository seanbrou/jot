import React from "react";
import ReactDOM from "react-dom/client";
import { ConvexReactClient } from "convex/react";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import App from "./App";
import { SetupRequired } from "./components/setup-required";
import { Toaster } from "./components/ui/sonner";
import { authClient, convexDeploymentUrl, hasBackendConfig } from "./lib/auth-client";
import "./styles.css";

const convex = hasBackendConfig() ? new ConvexReactClient(convexDeploymentUrl) : null;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {convex ? (
      <ConvexBetterAuthProvider client={convex} authClient={authClient}>
        <App />
        <Toaster />
      </ConvexBetterAuthProvider>
    ) : (
      <SetupRequired />
    )}
  </React.StrictMode>,
);
