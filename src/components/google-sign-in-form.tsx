import { GoogleSignInButton } from "./google-sign-in-button";

interface GoogleSignInFormProps {
  compact?: boolean;
}

export function GoogleSignInForm({ compact = false }: GoogleSignInFormProps) {
  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <div className={compact ? "space-y-1" : "space-y-1.5"}>
        <div className={compact ? "text-sm leading-6 text-[#6b6560]" : "text-[14px] leading-6 text-[#6b6560]"}>
          Sign in with Google to access your private notebooks and notes.
        </div>
      </div>

      <GoogleSignInButton compact={compact} />
    </div>
  );
}
