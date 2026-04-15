export function formatRelativeTime(input: string): string {
  const then = new Date(input).getTime();
  const diffMs = then - Date.now();
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  const intervals: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 1000 * 60 * 60 * 24 * 365],
    ["month", 1000 * 60 * 60 * 24 * 30],
    ["week", 1000 * 60 * 60 * 24 * 7],
    ["day", 1000 * 60 * 60 * 24],
    ["hour", 1000 * 60 * 60],
    ["minute", 1000 * 60],
  ];

  for (const [unit, size] of intervals) {
    if (Math.abs(diffMs) >= size) {
      return formatter.format(Math.round(diffMs / size), unit);
    }
  }

  return "just now";
}

export function formatDateTime(input: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(input));
}

export function summarizeNoteTitle(body: string, fallback = "Untitled note"): string {
  const firstLine = body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);

  if (!firstLine) {
    return fallback;
  }

  return firstLine.length > 72 ? `${firstLine.slice(0, 69)}...` : firstLine;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
