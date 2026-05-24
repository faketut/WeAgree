import { rateLimit, rateLimitKey } from "./ratelimit";

const ORIGINAL_URL = process.env.UPSTASH_REDIS_REST_URL;
const ORIGINAL_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

afterEach(() => {
  if (ORIGINAL_URL === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
  else process.env.UPSTASH_REDIS_REST_URL = ORIGINAL_URL;
  if (ORIGINAL_TOKEN === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
  else process.env.UPSTASH_REDIS_REST_TOKEN = ORIGINAL_TOKEN;
});

describe("ratelimit", () => {
  it("rateLimitKey namespaces consistently", () => {
    expect(rateLimitKey("sign", "user-123")).toBe("rl:sign:user-123");
  });

  it("fails open (allowed) when backend env is not configured", async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    const r = await rateLimit("rl:test:none", 5, 60);
    expect(r.allowed).toBe(true);
    expect(r.limit).toBe(5);
    expect(r.remaining).toBe(5);
  });

  it("counts hits and rejects once over the limit", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://fake";
    process.env.UPSTASH_REDIS_REST_TOKEN = "tok";

    let counter = 0;
    const realFetch = global.fetch;
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      const isIncr = url.includes("/INCR/");
      if (isIncr) counter += 1;
      return {
        ok: true,
        status: 200,
        json: async () => ({ result: isIncr ? counter : 1 }),
      } as unknown as Response;
    }) as unknown as typeof fetch;

    try {
      const r1 = await rateLimit("rl:test:over", 2, 60);
      const r2 = await rateLimit("rl:test:over", 2, 60);
      const r3 = await rateLimit("rl:test:over", 2, 60);
      expect(r1.allowed).toBe(true);
      expect(r2.allowed).toBe(true);
      expect(r3.allowed).toBe(false);
    } finally {
      global.fetch = realFetch;
    }
  });

  it("fails open on backend error", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://fake";
    process.env.UPSTASH_REDIS_REST_TOKEN = "tok";
    const realFetch = global.fetch;
    global.fetch = jest.fn(
      async () =>
        ({
          ok: false,
          status: 500,
          json: async () => ({}),
        }) as unknown as Response
    ) as unknown as typeof fetch;
    try {
      const r = await rateLimit("rl:test:err", 5, 60);
      expect(r.allowed).toBe(true);
    } finally {
      global.fetch = realFetch;
    }
  });
});
