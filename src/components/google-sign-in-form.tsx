import { LockKeyhole } from "lucide-react";
import { GoogleSignInButton } from "./google-sign-in-button";

interface GoogleSignInFormProps {
  compact?: boolean;
}

export function GoogleSignInForm({ compact = false }: GoogleSignInFormProps) {
  return (
    <div className={compact ? "space-y-3" : "space-y-5"}>
      <div className={compact ? "space-y-1" : "space-y-2"}>
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#8c857f]">
          <LockKeyhole className="h-3.5 w-3.5" />
          Sign in
        </div>
        <div className={compact ? "text-sm leading-6 text-[#6b6560]" : "text-base leading-7 text-[#6b6560]"}>
          Sign in with Google to access your private notebooks and notes.
        </div>
      </div>

      <GoogleSignInButton compact={compact} />
    </div>
  );
}
