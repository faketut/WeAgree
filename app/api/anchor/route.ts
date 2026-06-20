import { NextResponse } from "next/server";
import { ethers } from "ethers";
import { timingSafeEqual } from "node:crypto";
import { rateLimit, rateLimitKey } from "@/lib/ratelimit";
import { getBaseUrlFromHeaders } from "@/lib/utils/baseUrl";

const ABI = ["function anchor(bytes32 finalProofHash) external"];

function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

function getBearerToken(req: Request): string | null {
  const h = req.headers.get("authorization") ?? "";
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1].trim() : null;
}

function timingSafeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export async function POST(req: Request) {
  // Auth: bearer token required. In production, fail closed when not configured.
  const expectedKey = process.env.BLOCKCHAIN_RPC_API_KEY?.trim();
  if (expectedKey) {
    const token = getBearerToken(req);
    if (!token || !timingSafeEq(token, expectedKey)) return jsonError(401, "Unauthorized");
  } else if (process.env.NODE_ENV === "production") {
    return jsonError(500, "Anchor endpoint not configured");
  }

  // Same-origin guard. Reject cross-origin POSTs when Origin is present.
  const origin = req.headers.get("origin");
  if (origin) {
    const expectedOrigin = getBaseUrlFromHeaders(req.headers, new URL(req.url).origin);
    try {
      const a = new URL(origin).host;
      const b = new URL(expectedOrigin).host;
      if (a !== b) return jsonError(403, "Cross-origin request blocked");
    } catch {
      return jsonError(400, "Invalid origin");
    }
  }

  // Per-token (or per-IP) rate limit to bound gas-burn abuse.
  const rlSubject =
    expectedKey ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "anon";
  const rl = await rateLimit(rateLimitKey("anchor", rlSubject), 60, 60);
  if (!rl.allowed) return jsonError(429, "Too many anchor requests");

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "Invalid JSON body");
  }

  const hash =
    body && typeof body === "object" && "hash" in body ? (body as { hash: unknown }).hash : null;
  if (typeof hash !== "string") return jsonError(400, "Missing hash");

  const hex = hash.toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(hex)) {
    return jsonError(400, "hash must be 64 hex chars (sha256)");
  }

  const chainName = process.env.BLOCKCHAIN_CHAIN_NAME?.trim() || "l2";
  const rpcUrl = process.env.BLOCKCHAIN_EVM_RPC_URL?.trim();
  const pk = process.env.BLOCKCHAIN_EVM_PRIVATE_KEY?.trim();
  const contractAddress = process.env.BLOCKCHAIN_EVM_CONTRACT_ADDRESS?.trim();

  if (!rpcUrl) return jsonError(500, "Missing BLOCKCHAIN_EVM_RPC_URL");
  if (!pk) return jsonError(500, "Missing BLOCKCHAIN_EVM_PRIVATE_KEY");
  if (!contractAddress) return jsonError(500, "Missing BLOCKCHAIN_EVM_CONTRACT_ADDRESS");

  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(pk, provider);
    const contract = new ethers.Contract(contractAddress, ABI, wallet);

    const bytes32 = ("0x" + hex) as `0x${string}`;
    const tx = await contract.anchor(bytes32);
    const receipt = await tx.wait(1);
    if (!receipt) return jsonError(502, "No receipt");

    const block = await provider.getBlock(receipt.blockNumber);
    const anchoredAt = block?.timestamp
      ? new Date(Number(block.timestamp) * 1000).toISOString()
      : new Date().toISOString();

    return NextResponse.json({
      chain_name: chainName,
      transaction_hash: receipt.hash,
      block_number: Number(receipt.blockNumber),
      anchored_at: anchoredAt,
    });
  } catch (e) {
    return jsonError(502, e instanceof Error ? e.message : "Anchor failed");
  }
}
