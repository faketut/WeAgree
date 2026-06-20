import { submitFinalProofHash } from "./chain";

const ORIGINAL = {
  rpc: process.env.BLOCKCHAIN_RPC_URL,
  apiKey: process.env.BLOCKCHAIN_RPC_API_KEY,
  chainName: process.env.BLOCKCHAIN_CHAIN_NAME,
};

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  (global as { fetch: unknown }).fetch = fetchMock;
});

afterAll(() => {
  process.env.BLOCKCHAIN_RPC_URL = ORIGINAL.rpc;
  process.env.BLOCKCHAIN_RPC_API_KEY = ORIGINAL.apiKey;
  process.env.BLOCKCHAIN_CHAIN_NAME = ORIGINAL.chainName;
});

describe("submitFinalProofHash", () => {
  it("throws if BLOCKCHAIN_RPC_URL is unset", async () => {
    delete process.env.BLOCKCHAIN_RPC_URL;
    await expect(submitFinalProofHash("aa")).rejects.toThrow(/BLOCKCHAIN_RPC_URL/);
  });

  it("posts the hash and parses a successful JSON body", async () => {
    process.env.BLOCKCHAIN_RPC_URL = "https://anchor.example/api";
    process.env.BLOCKCHAIN_RPC_API_KEY = "secret";
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      text: () =>
        Promise.resolve(
          JSON.stringify({
            chain_name: "arbitrum-sepolia",
            transaction_hash: "0xabc",
            block_number: 42,
            anchored_at: "2024-01-01T00:00:00Z",
          })
        ),
    });

    const res = await submitFinalProofHash("deadbeef");

    expect(res).toEqual({
      chainName: "arbitrum-sepolia",
      transactionHash: "0xabc",
      blockNumber: 42,
      anchoredAt: "2024-01-01T00:00:00Z",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://anchor.example/api",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: "Bearer secret",
        }),
        body: JSON.stringify({ hash: "deadbeef" }),
      })
    );
  });

  it("throws on non-2xx responses", async () => {
    process.env.BLOCKCHAIN_RPC_URL = "https://anchor.example/api";
    delete process.env.BLOCKCHAIN_RPC_API_KEY;
    fetchMock.mockResolvedValue({
      ok: false,
      status: 503,
      text: () => Promise.resolve("upstream busy"),
    });
    await expect(submitFinalProofHash("aa")).rejects.toThrow(/503/);
  });

  it("throws when the body is not JSON", async () => {
    process.env.BLOCKCHAIN_RPC_URL = "https://anchor.example/api";
    process.env.BLOCKCHAIN_CHAIN_NAME = "custom-chain";
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve("not json"),
    });
    await expect(submitFinalProofHash("aa")).rejects.toThrow(/invalid JSON/i);
  });

  it("throws when the body has no transaction_hash", async () => {
    process.env.BLOCKCHAIN_RPC_URL = "https://anchor.example/api";
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify({ chain_name: "x" })),
    });
    await expect(submitFinalProofHash("aa")).rejects.toThrow(/transaction_hash/);
  });
});
