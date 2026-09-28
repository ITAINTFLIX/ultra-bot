/** Never log full passwords. Redact sensitive fields for logs / errors. */

/** Always fully redact — never echo any password characters. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function redactPassword(password?: string | null): string {
  return "[REDACTED]";
}

export function redactCredentials(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...obj };
  for (const key of Object.keys(out)) {
    const lower = key.toLowerCase();
    if (
      lower.includes("password") ||
      lower.includes("passwd") ||
      lower === "token" ||
      lower.includes("secret")
    ) {
      out[key] = "[REDACTED]";
    }
  }
  return out;
}
