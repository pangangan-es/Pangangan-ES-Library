/**
 * Make free text safe to embed in a PostgREST filter value. Characters that
 * carry meaning in filter syntax or ILIKE patterns are replaced with spaces.
 */
export function sanitizeSearch(input: string): string {
  return input.replace(/[%_,()*"'\\:.]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}
