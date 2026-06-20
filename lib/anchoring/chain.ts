export type ChainAnchorResult = {
  chainName: string;
  transactionHash: string;
  blockNumber: number | null;
  anchoredAt: string;
};

type AnchorRpcBody = {
  chain_name?: unknown;
  transaction_hash?: unknown;
  block_number?: unknown;
  anchored_at?: unknown;
};

function isObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object";
}

/**
 * Submit final_proof_hash to a chain anchor service.
 * Requires BLOCKCHAIN_RPC_URL (and optional BLOCKCHAIN_RPC_API_KEY).
 */
export async function submitFinalProofHash(finalProofHash: string): Promise<ChainAnchorResult> {
  const rpcUrl = process.env.BLOCKCHAIN_RPC_URL?.trim();
  if (!rpcUrl) {
    throw new Error("Missing BLOCKCHAIN_RPC_URL");
  }

  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.BLOCKCHAIN_RPC_API_KEY
        ? { Authorization: `Bearer ${process.env.BLOCKCHAIN_RPC_API_KEY}` }
        : {}),
    },
    body: JSON.stringify({ hash: finalProofHash }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Anchor RPC failed: ${res.status} ${text}`.trim());
  }

  let body: AnchorRpcBody;
  try {
    const parsed: unknown = text ? JSON.parse(text) : {};
    body = isObject(parsed) ? (parsed as AnchorRpcBody) : {};
  } catch {
    throw new Error("Anchor RPC returned invalid JSON");
  }

  const transactionHash = typeof body.transaction_hash === "string" ? body.transaction_hash : "";
  if (!transactionHash) {
    // A 200 with no tx hash means the anchor service didn't actually submit a
    // tx. Treat as failure so we don't record a fake confirmation.
    throw new Error("Anchor RPC returned no transaction_hash");
  }

  return {
    chainName:
      typeof body.chain_name === "string"
        ? body.chain_name
        : (process.env.BLOCKCHAIN_CHAIN_NAME ?? "custom"),
    transactionHash,
    blockNumber: typeof body.block_number === "number" ? body.block_number : null,
    anchoredAt: typeof body.anchored_at === "string" ? body.anchored_at : new Date().toISOString(),
  };
}
