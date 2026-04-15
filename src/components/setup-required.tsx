export function SetupRequired() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#faf7f5] px-6 text-[#2d2a27]">
      <div className="w-full max-w-xl rounded-[2rem] border border-[#e8e2dc] bg-white p-8 shadow-[0_24px_60px_rgba(45,42,39,0.08)]">
        <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-[#8c857f]">
          Setup required
        </div>
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          Oat needs Convex before it can open.
        </h1>
        <p className="mt-3 text-sm leading-7 text-[#6b6560]">
          Add <code>VITE_CONVEX_URL</code> and <code>VITE_CONVEX_SITE_URL</code> to your
          local environment, then restart the app.
        </p>
        <div className="mt-6 rounded-2xl bg-[#f7f4f0] p-4 text-sm leading-7 text-[#6b6560]">
          <div>Required variables</div>
          <div>
            <code>VITE_CONVEX_URL=https://your-deployment.convex.cloud</code>
          </div>
          <div>
            <code>VITE_CONVEX_SITE_URL=https://your-deployment.convex.site</code>
          </div>
        </div>
      </div>
    </div>
  );
}
