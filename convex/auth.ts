import { createClient } from "@convex-dev/better-auth";
import { convex as convexPlugin, crossDomain } from "@convex-dev/better-auth/plugins";
import { componentsGeneric } from "convex/server";
import { betterAuth } from "better-auth";
import authConfig from "./auth.config";

const components = componentsGeneric();

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

const siteUrl = process.env.SITE_URL?.trim() || "https://tauri.localhost";

export const authComponent = createClient(components.betterAuth as any);

function getTrustedOrigins() {
  return Array.from(
    new Set(
      [
        "http://localhost:1420",
        "http://127.0.0.1:1420",
        siteUrl,
        "tauri://localhost",
        "https://tauri.localhost",
        process.env.APP_ORIGIN,
        process.env.APP_ORIGIN_FALLBACK,
      ].filter((value): value is string => Boolean(value)),
    ),
  );
}

export const createAuth = (ctx: Parameters<typeof authComponent.adapter>[0]) =>
  betterAuth({
    baseURL: requireEnv("CONVEX_SITE_URL"),
    secret: requireEnv("BETTER_AUTH_SECRET"),
    trustedOrigins: getTrustedOrigins(),
    emailAndPassword: {
      enabled: false,
    },
    socialProviders: {
      google: {
        clientId: requireEnv("GOOGLE_CLIENT_ID"),
        clientSecret: requireEnv("GOOGLE_CLIENT_SECRET"),
      },
    },
    database: authComponent.adapter(ctx),
    plugins: [
      crossDomain({ siteUrl }),
      convexPlugin({
        authConfig,
      }),
    ],
  });

export const { getAuthUser } = authComponent.clientApi();
