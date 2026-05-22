/** Hex-encoded SHA-256 of a UTF-8 string using the browser SubtleCrypto API. */
export async function sha256HexBrowser(content: string): Promise<string> {
  const data = new TextEncoder().encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
