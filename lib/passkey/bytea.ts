/** Decode Supabase/Postgres bytea into a Node Buffer. */
type BufferLike = { type: "Buffer"; data: number[] };

function isBufferLike(v: unknown): v is BufferLike {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return o.type === "Buffer" && Array.isArray(o.data);
}

/**
 * Decode a Postgres `bytea` field as it can be returned by supabase-js across
 * runtimes (Node Buffer, Uint8Array, hex-encoded `\\x...` string, base64
 * string, or a JSON `{type:"Buffer",data:[...]}` shape).
 *
 * Throws on unrecognized shapes rather than returning an empty buffer — a
 * silently-empty key would otherwise feed into signature/passkey verifiers and
 * surface as a confusing downstream error.
 */
export function decodeByteaField(v: unknown): Buffer {
  if (Buffer.isBuffer(v)) return v;
  if (v instanceof Uint8Array) return Buffer.from(v);
  if (isBufferLike(v)) return Buffer.from(v.data);
  if (typeof v === "string") {
    if (v.startsWith("\\x")) return Buffer.from(v.slice(2), "hex");
    // Some runtimes serialize bytea as JSON: {"type":"Buffer","data":[...]}
    if (v.startsWith("{") && v.includes('"data"')) {
      try {
        const parsed: unknown = JSON.parse(v);
        if (isBufferLike(parsed)) return Buffer.from(parsed.data);
      } catch {
        // fall through
      }
    }
    return Buffer.from(v, "base64");
  }
  throw new Error("decodeByteaField: unrecognized bytea representation");
}
