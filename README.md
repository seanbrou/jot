# Oat

Oat is a quick-capture desktop notes app built with Tauri, React, Convex, Better Auth Google sign-in, and Vercel AI Gateway.

## Local development

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env`.
3. Provision a Convex deployment and set `VITE_CONVEX_URL`, `VITE_CONVEX_SITE_URL`, and `BETTER_AUTH_SECRET`.
4. Create Google OAuth credentials and set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in Convex.
5. Add `AI_GATEWAY_API_KEY` so Convex can classify notes through Vercel AI Gateway.
6. Run the frontend with `npm run dev` or the desktop app with `npm run tauri dev`.

## Product behavior

- Users must sign in before they can capture or view notes.
- `Alt+N` opens the quick-capture bubble. Signed-out users see a compact sign-in prompt there.
- Notes are stored in Convex and classified into existing notebooks with Vercel AI Gateway.
- Search matches notebook names, note titles, and note bodies.
