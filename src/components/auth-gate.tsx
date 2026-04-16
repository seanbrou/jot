import { Sparkles } from "lucide-react";
import { GoogleSignInForm } from "./google-sign-in-form";

export function AuthGate() {
  return (
    <div className="flex h-full min-h-[24rem] items-center justify-center px-6 py-10">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="rounded-2xl border border-[#e8e2dc] bg-white p-8 shadow-[0_8px_32px_rgba(45,42,39,0.06)]">
          {/* Brand */}
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#b35c2a]/10">
              <Sparkles className="h-5 w-5 text-[#b35c2a]" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-[#2d2a27]">
                Welcome to Jot
              </h2>
              <p className="text-[13px] text-[#8c857f]">
                Sign in to access your notes
              </p>
            </div>
          </div>

          {/* Sign in */}
          <GoogleSignInForm />

          {/* Features */}
          <div className="mt-6 space-y-3 border-t border-[#f0ece8] pt-5">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f7f4f0] text-[10px] font-bold text-[#b35c2a]">
                1
              </div>
              <div>
                <div className="text-[13px] font-medium text-[#2d2a27]">AI auto-filing</div>
                <div className="text-[12px] text-[#8c857f]">
                  Notes are sorted into the right notebook automatically
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f7f4f0] text-[10px] font-bold text-[#b35c2a]">
                2
              </div>
              <div>
                <div className="text-[13px] font-medium text-[#2d2a27]">Quick capture</div>
                <div className="text-[12px] text-[#8c857f]">
                  Press Alt + N anywhere to jot a thought
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f7f4f0] text-[10px] font-bold text-[#b35c2a]">
                3
              </div>
              <div>
                <div className="text-[13px] font-medium text-[#2d2a27]">Export anywhere</div>
                <div className="text-[12px] text-[#8c857f]">
                  Send notes to ChatGPT, Claude, Gemini, or Grok
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
