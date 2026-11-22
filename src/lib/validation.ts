export type FieldErrors<T extends string = string> = Partial<Record<T, string>>;

export const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,31}$/;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD_LENGTH = 10;

export function parseWholeNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  return Number.isSafeInteger(n) ? n : null;
}

export function validateQuantity(value: string, max: number, label = "Quantity"): { value: number | null; error?: string } {
  const n = parseWholeNumber(value);
  if (n === null || n < 1) return { value: null, error: `${label} must be a whole number of at least 1.` };
  if (n > max) return { value: null, error: `${label} cannot be more than ${max}.` };
  return { value: n };
}

export function validatePassword(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return "Include at least one letter and one number.";
  }
  return null;
}

export function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}
