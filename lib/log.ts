/**
 * Tiny logger wrapper. Lets us route diagnostics through one chokepoint so
 * empty `catch {}` blocks can be replaced with explicit "logged & swallowed"
 * calls without dragging in a heavy logging dependency.
 *
 * In production you can swap the impls for pino/winston/etc. — call sites
 * never need to change.
 */
type LogContext = Record<string, unknown>;

function fmt(ctx?: LogContext): string {
    if (!ctx || Object.keys(ctx).length === 0) return "";
    try {
        return " " + JSON.stringify(ctx);
    } catch {
        return " [unserializable context]";
    }
}

export const log = {
    debug(msg: string, ctx?: LogContext): void {
        if (process.env.NODE_ENV !== "production") {
            // eslint-disable-next-line no-console
            console.debug(`[debug] ${msg}${fmt(ctx)}`);
        }
    },
    info(msg: string, ctx?: LogContext): void {
        // eslint-disable-next-line no-console
        console.info(`[info] ${msg}${fmt(ctx)}`);
    },
    warn(msg: string, ctx?: LogContext): void {
        // eslint-disable-next-line no-console
        console.warn(`[warn] ${msg}${fmt(ctx)}`);
    },
    error(msg: string, ctx?: LogContext): void {
        // eslint-disable-next-line no-console
        console.error(`[error] ${msg}${fmt(ctx)}`);
    },
};

/** Convert an unknown caught value into a serializable shape. */
export function errCtx(e: unknown): LogContext {
    if (e instanceof Error) {
        return { name: e.name, message: e.message, stack: e.stack };
    }
    return { error: String(e) };
}
