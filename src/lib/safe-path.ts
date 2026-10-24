/**
 * Only allow redirects to paths on this site. Anything else (absolute URLs,
 * protocol-relative "//evil.example", backslash tricks) falls back.
 */
export function safeNextPath(value: string | null | undefined, fallback = "/today"): string {
  if (!value || typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (/[\r\n]/.test(value)) return fallback;
  return value;
}
