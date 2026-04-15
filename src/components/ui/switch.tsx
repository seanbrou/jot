import { cn } from "../../lib/utils";

export function Switch({
  className,
  checked,
  onCheckedChange,
  disabled,
  id,
}: {
  className?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      id={id}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 rounded-full border border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b35c2a]/35 disabled:pointer-events-none disabled:opacity-45",
        checked ? "bg-[#b35c2a]" : "bg-[#d4cec8]",
        className,
      )}
    >
      <span
        className={cn(
          "pointer-events-none block h-4 w-4 translate-x-0.5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out",
          checked && "translate-x-[18px]",
        )}
        aria-hidden
      />
    </button>
  );
}
