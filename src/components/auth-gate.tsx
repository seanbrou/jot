import { LockKeyhole, Sparkles } from "lucide-react";
import { GoogleSignInForm } from "./google-sign-in-form";

export function AuthGate() {
  return (
    <div className="flex h-full min-h-[32rem] items-center justify-center px-6 py-10">
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] border border-[#e8e2dc] bg-white p-8 shadow-[0_24px_60px_rgba(45,42,39,0.07)]">
          <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#8c857f]">
            <Sparkles className="h-3.5 w-3.5" />
            Private knowledge
          </div>
          <h2 className="font-headline text-4xl font-bold tracking-tight text-[#2d2a27]">
            Sign in to open your notebooks.
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-7 text-[#6b6560]">
            Oat keeps every note tied to your account. Once you sign in, quick capture,
            search, AI routing, and your board all stay private to you.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.4rem] bg-[#f7f4f0] p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8c857f]">
                Quick capture
              </div>
              <div className="mt-2 text-sm leading-6 text-[#6b6560]">
                Press <span className="font-semibold text-[#2d2a27]">Alt + N</span> anywhere
                and file a thought into your account.
              </div>
            </div>
            <div className="rounded-[1.4rem] bg-[#f7f4f0] p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8c857f]">
                AI sorting
              </div>
              <div className="mt-2 text-sm leading-6 text-[#6b6560]">
                New notes are routed into the best existing notebook and stay searchable.
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-[#e8e2dc] bg-white p-8 shadow-[0_24px_60px_rgba(45,42,39,0.07)]">
          <div className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#8c857f]">
            <LockKeyhole className="h-3.5 w-3.5" />
            Google sign-in
          </div>
          <GoogleSignInForm />
        </div>
      </div>
    </div>
  );
}
