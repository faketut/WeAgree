/**
 * Tiny logger.
 *
 * - Production: one JSON object per line on stdout (Vercel / Cloud Run ingest
 *   this natively). No dep needed.
 * - Development: human-readable single line.
 *
 * The shape is API-compatible with pino — swap to `pino()` later without
 * touching call sites if/when richer features (child loggers, transports) are
 * worth the dep.
 */
type LogContext = Record<string, unknown>;
type Level = "debug" | "info" | "warn" | "error";

const isProd = process.env.NODE_ENV === "production";

function emit(level: Level, msg: string, ctx?: LogContext): void {
    if (level === "debug" && isProd) return;

    if (isProd) {
        const record = { level, msg, time: new Date().toISOString(), ...ctx };
        // eslint-disable-next-line no-console
        const sink = level === "error" ? console.error : console.log;
        try {
            // eslint-disable-next-line no-console
            sink(JSON.stringify(record));
        } catch {
            // eslint-disable-next-line no-console
            sink(JSON.stringify({ level, msg, time: record.time, _unserializable_ctx: true }));
        }
        return;
    }

    let suffix = "";
    if (ctx && Object.keys(ctx).length > 0) {
        try {
            suffix = " " + JSON.stringify(ctx);
        } catch {
            suffix = " [unserializable context]";
        }
    }
    const sink =
        // eslint-disable-next-line no-console
        level === "error" ? console.error : level === "warn" ? console.warn : console.info;
    // eslint-disable-next-line no-console
    sink(`[${level}] ${msg}${suffix}`);
}

export const log = {
    debug(msg: string, ctx?: LogContext): void {
        emit("debug", msg, ctx);
    },
    info(msg: string, ctx?: LogContext): void {
        emit("info", msg, ctx);
    },
    warn(msg: string, ctx?: LogContext): void {
        emit("warn", msg, ctx);
    },
    error(msg: string, ctx?: LogContext): void {
        emit("error", msg, ctx);
    },
};

/** Convert an unknown caught value into a serializable shape. */
export function errCtx(e: unknown): LogContext {
    if (e instanceof Error) {
        return { name: e.name, message: e.message, stack: e.stack };
    }
    return { error: String(e) };
}
