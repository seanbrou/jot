import * as React from "react";
import { cn } from "../../lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-xl border border-[#d4cec8] bg-white px-3 py-2 text-sm text-[#2d2a27] outline-none transition placeholder:text-[#b5aea8] focus:border-[#b35c2a] focus:ring-2 focus:ring-[#b35c2a]/10 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";

export { Input };
