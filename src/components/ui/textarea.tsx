import * as React from "react";
import { cn } from "../../lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[112px] w-full rounded-2xl border border-[#d4cec8] bg-white px-3 py-3 text-sm leading-6 text-[#2d2a27] outline-none transition placeholder:text-[#b5aea8] focus:border-[#b35c2a] focus:ring-2 focus:ring-[#b35c2a]/10 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
});

Textarea.displayName = "Textarea";

export { Textarea };
