import { beforeEach, describe, expect, it } from "vitest";
import { _resetMemory, checkLimit } from "../../api/_lib/rateLimit";

describe("checkLimit (memoria)", () => {
  beforeEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.KV_REST_API_URL;
    _resetMemory();
  });
  const rules = [{ name: "t", max: 3, windowSec: 60 }];
  const now = 1_800_000_000_000;

  it("deja pasar hasta el máximo y después corta con retryAfter", async () => {
    for (let i = 0; i < 3; i++) expect((await checkLimit("1.2.3.4", rules, now)).ok).toBe(true);
    const r = await checkLimit("1.2.3.4", rules, now);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.retryAfter).toBeGreaterThan(0);
  });
  it("cada IP tiene su propio contador", async () => {
    for (let i = 0; i < 3; i++) await checkLimit("a", rules, now);
    expect((await checkLimit("b", rules, now)).ok).toBe(true);
  });
  it("la ventana siguiente vuelve a empezar", async () => {
    for (let i = 0; i < 4; i++) await checkLimit("c", rules, now);
    expect((await checkLimit("c", rules, now + 61_000)).ok).toBe(true);
  });
});
