interface ErrorLike {
  message?: unknown;
  code?: unknown;
  status?: unknown;
}

// Database error codes raised deliberately by our SQL functions carry a
// message written for staff, so those are shown as-is.
const FRIENDLY_CODES = new Set(["22023", "23514", "42501"]);

export function toMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (!error || typeof error !== "object") return fallback;
  const e = error as ErrorLike;
  const message = typeof e.message === "string" ? e.message : "";
  const code = typeof e.code === "string" ? e.code : "";

  if (/failed to fetch|networkerror|load failed|network request failed/i.test(message)) {
    return "Cannot reach the library server. Check your internet connection and try again.";
  }
  if (code === "23505") return "That already exists. Check for a duplicate and try again.";
  if (code === "23503") return "That record is used elsewhere. Archive or deactivate it instead of deleting it.";
  if (code === "42501" && /row-level security|permission denied/i.test(message)) {
    return "You do not have permission to do that.";
  }
  if (code && FRIENDLY_CODES.has(code) && message) return message;
  if (code === "PGRST301" || /jwt expired/i.test(message)) {
    return "Your session has expired. Please sign in again.";
  }
  return fallback;
}
