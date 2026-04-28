/** Decode Supabase/Postgres bytea into a Node Buffer. */
export function decodeByteaField(v: unknown): Buffer {
  if (Buffer.isBuffer(v)) return v;
  if (v instanceof Uint8Array) return Buffer.from(v);
  if (
    v &&
    typeof v === "object" &&
    (v as any).type === "Buffer" &&
    Array.isArray((v as any).data)
  ) {
    return Buffer.from((v as any).data);
  }
  if (typeof v === "string") {
    if (v.startsWith("\\x")) return Buffer.from(v.slice(2), "hex");
    // Some runtimes serialize bytea as JSON: {"type":"Buffer","data":[...]}
    if (v.startsWith("{") && v.includes("\"data\"")) {
      try {
        const parsed = JSON.parse(v) as any;
        if (parsed?.type === "Buffer" && Array.isArray(parsed.data)) {
          return Buffer.from(parsed.data);
        }
      } catch {
        // fall through
      }
    }
    return Buffer.from(v, "base64");
  }
  return Buffer.alloc(0);
}
