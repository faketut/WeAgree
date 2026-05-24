/**
 * Discriminated-union helper for server action return shapes.
 *
 * Old shape (still used across most actions) returns `{ error: string }` or
 * `{ success: true, ... }`. New code should prefer `ActionResult<T>` so call
 * sites can `switch` exhaustively on `ok`.
 *
 * Migrating call sites is incremental — both shapes can coexist.
 */
export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

export function actionOk<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function actionError(error: string): ActionResult<never> {
  return { ok: false, error };
}
