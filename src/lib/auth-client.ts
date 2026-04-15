import { convexClient, crossDomainClient } from "@convex-dev/better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const convexSiteUrl = import.meta.env.VITE_CONVEX_SITE_URL?.trim() ?? "";
export const convexDeploymentUrl = import.meta.env.VITE_CONVEX_URL?.trim() ?? "";
export const appSiteUrl = window.location.origin;

export function hasBackendConfig() {
  return Boolean(convexSiteUrl && convexDeploymentUrl);
}

export const authClient = createAuthClient({
  baseURL: convexSiteUrl || "https://placeholder.convex.site",
  plugins: [convexClient(), crossDomainClient()],
});
