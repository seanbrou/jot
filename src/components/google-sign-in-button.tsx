import { toast } from "sonner";
import { appSiteUrl, authClient } from "../lib/auth-client";
import { Button } from "./ui/button";

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export function GoogleSignInButton({
  compact = false,
}: {
  compact?: boolean;
}) {
  async function signInWithGoogle() {
    try {
      const callbackURL = appSiteUrl;
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL,
      });

      if (result?.error) {
        throw new Error(result.error.message ?? "Unable to sign in with Google.");
      }
    } catch (error) {
      toast.error(toErrorMessage(error));
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      className={compact ? "w-full justify-center rounded-2xl py-5 text-sm" : "w-full justify-center rounded-2xl py-6 text-base"}
      onClick={() => void signInWithGoogle()}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path
          d="M21.8 12.23c0-.77-.07-1.5-.2-2.2H12v4.17h5.49a4.7 4.7 0 0 1-2.04 3.08v2.56h3.3c1.93-1.78 3.05-4.4 3.05-7.61Z"
          fill="#4285F4"
        />
        <path
          d="M12 22c2.76 0 5.08-.91 6.77-2.46l-3.3-2.56c-.91.61-2.08.98-3.47.98-2.66 0-4.91-1.8-5.71-4.22H2.88v2.65A10 10 0 0 0 12 22Z"
          fill="#34A853"
        />
        <path
          d="M6.29 13.74A5.98 5.98 0 0 1 6 12c0-.61.1-1.2.29-1.74V7.61H2.88A10 10 0 0 0 2 12c0 1.61.39 3.14 1.08 4.39l3.21-2.65Z"
          fill="#FBBC05"
        />
        <path
          d="M12 6.04c1.5 0 2.85.52 3.91 1.53l2.93-2.93C17.07 2.98 14.75 2 12 2A10 10 0 0 0 3.08 7.61l3.21 2.65c.8-2.42 3.05-4.22 5.71-4.22Z"
          fill="#EA4335"
        />
      </svg>
      Continue with Google
    </Button>
  );
}
