export type ChainAnchorResult = {
  chainName: string;
  transactionHash: string;
  blockNumber: number | null;
  anchoredAt: string;
};

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

  let body: any;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = {};
  }

  return {
    chainName: body.chain_name ?? process.env.BLOCKCHAIN_CHAIN_NAME ?? "custom",
    transactionHash: body.transaction_hash ?? "",
    blockNumber: body.block_number ?? null,
    anchoredAt: body.anchored_at ?? new Date().toISOString(),
  };
}
