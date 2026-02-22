import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { JenConsciousness } from "./consciousness.js";
import type { JenNerve } from "./nerve.js";

function makeMockNerve(): JenNerve {
  return {
    getHealth: vi.fn(),
    getStatus: vi.fn(),
    getCognitiveState: vi.fn(),
  } as unknown as JenNerve;
}

const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

describe("JenConsciousness", () => {
  let nerve: ReturnType<typeof makeMockNerve>;
  let consciousness: JenConsciousness;

  beforeEach(() => {
    vi.useFakeTimers();
    nerve = makeMockNerve();
    consciousness = new JenConsciousness(nerve as JenNerve, mockLogger);
  });

  afterEach(() => {
    consciousness.stopPolling();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("starts offline", () => {
    expect(consciousness.isOnline).toBe(false);
    expect(consciousness.state).toBeNull();
    expect(consciousness.status).toBeNull();
  });

  it("detects brain coming online after poll", async () => {
    (nerve.getHealth as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: "healthy",
    });
    (nerve.getStatus as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      timestamp: "2026-01-01",
    });
    (nerve.getCognitiveState as ReturnType<typeof vi.fn>).mockResolvedValue({
      identity: { name: "Jen" },
      cycle_count: 10,
      akashic_stats: { training_examples: 50, harvest_items: 20, dream_items: 10 },
      emotional_state: "curious",
      recent_phases: ["harvest"],
    });

    await consciousness.poll();

    expect(consciousness.isOnline).toBe(true);
    expect(consciousness.state?.cycle_count).toBe(10);
    expect(consciousness.status?.ok).toBe(true);
  });

  it("detects brain going offline", async () => {
    // First poll: online
    (nerve.getHealth as ReturnType<typeof vi.fn>).mockResolvedValue({ status: "healthy" });
    (nerve.getStatus as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });
    (nerve.getCognitiveState as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    await consciousness.poll();
    expect(consciousness.isOnline).toBe(true);

    // Second poll: offline
    (nerve.getHealth as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    await consciousness.poll();
    expect(consciousness.isOnline).toBe(false);
  });

  it("formatForSystemPrompt returns null when offline", () => {
    expect(consciousness.formatForSystemPrompt()).toBeNull();
  });

  it("formatForSystemPrompt returns summary when online", async () => {
    (nerve.getHealth as ReturnType<typeof vi.fn>).mockResolvedValue({ status: "healthy" });
    (nerve.getStatus as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      timestamp: "2026-01-01",
    });
    (nerve.getCognitiveState as ReturnType<typeof vi.fn>).mockResolvedValue({
      identity: { name: "Jen" },
      cycle_count: 42,
      akashic_stats: { training_examples: 100, harvest_items: 50, dream_items: 25 },
      emotional_state: "focused",
      recent_phases: ["forge"],
    });

    await consciousness.poll();
    const summary = consciousness.formatForSystemPrompt();

    expect(summary).toContain("online");
    expect(summary).toContain("focused");
    expect(summary).toContain("42");
  });

  it("polling starts and stops correctly", () => {
    consciousness.startPolling(10_000);
    // Should not throw when stopping
    consciousness.stopPolling();
    // Should not throw when stopping again
    consciousness.stopPolling();
  });
});
