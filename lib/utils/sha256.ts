import crypto from "node:crypto";

/** Hex-encoded SHA-256 of a UTF-8 string or Buffer (Node, synchronous). */
export function sha256Hex(input: string | Buffer): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}
