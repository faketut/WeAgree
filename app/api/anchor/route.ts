import { NextResponse } from "next/server";
import { ethers } from "ethers";

const ABI = ["function anchor(bytes32 finalProofHash) external"];

function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

function getBearerToken(req: Request): string | null {
  const h = req.headers.get("authorization") ?? "";
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1].trim() : null;
}

export async function POST(req: Request) {
  const expectedKey = process.env.BLOCKCHAIN_RPC_API_KEY?.trim();
  if (expectedKey) {
    const token = getBearerToken(req);
    if (!token || token !== expectedKey) return jsonError(401, "Unauthorized");
  }

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
