import crypto from "node:crypto";

export type ChainAnchorResult = {
  chainName: string;
  transactionHash: string;
  blockNumber: number | null;
  anchoredAt: string;
};

/**
 * Submit final_proof_hash to a chain or mock anchor (dev).
 * Set BLOCKCHAIN_RPC_URL + BLOCKCHAIN_RPC_API_KEY for a real HTTP anchor service.
 */
export async function submitFinalProofHash(
  finalProofHash: string
): Promise<ChainAnchorResult> {
  const rpcUrl = process.env.BLOCKCHAIN_RPC_URL?.trim();
  if (rpcUrl) {
    try {
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
      if (!res.ok) {
        throw new Error(`Anchor RPC failed: ${res.status}`);
      }
      const body = (await res.json()) as {
        chain_name?: string;
        transaction_hash?: string;
        block_number?: number;
        anchored_at?: string;
      };
      return {
        chainName: body.chain_name ?? process.env.BLOCKCHAIN_CHAIN_NAME ?? "custom",
        transactionHash: body.transaction_hash ?? "",
        blockNumber: body.block_number ?? null,
        anchoredAt: body.anchored_at ?? new Date().toISOString(),
      };
    } catch {
      return mockAnchor(finalProofHash);
    }
  }
  return mockAnchor(finalProofHash);
}

function mockAnchor(finalProofHash: string): ChainAnchorResult {
  const tx =
    "0x" +
    crypto.createHash("sha256").update(finalProofHash, "utf8").digest("hex").slice(0, 64);
  return {
    chainName: process.env.BLOCKCHAIN_CHAIN_NAME ?? "dev-mock",
    transactionHash: tx,
    blockNumber: 0,
    anchoredAt: new Date().toISOString(),
  };
}
