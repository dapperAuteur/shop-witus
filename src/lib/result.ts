// Server-action return contract (see STYLE_GUIDE): actions never throw to a
// client component; they return this discriminated union.
export type Result<T> = { ok: true; data: T } | { ok: false; error: string; code: string };

export const ok = <T>(data: T): Result<T> => ({ ok: true, data });
export const err = (error: string, code: string): { ok: false; error: string; code: string } => ({
  ok: false,
  error,
  code,
});
