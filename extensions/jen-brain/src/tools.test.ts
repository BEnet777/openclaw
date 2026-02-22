import { describe, it, expect, vi, beforeEach } from "vitest";
import { createJenBrainTool } from "./tools.js";
import type { JenNerve } from "./nerve.js";

function makeMockNerve(): JenNerve {
  return {
    getStatus: vi.fn(),
    getHealth: vi.fn(),
    think: vi.fn(),
    searchAkashic: vi.fn(),
    storeAkashic: vi.fn(),
    runCycle: vi.fn(),
    runEval: vi.fn(),
    notify: vi.fn(),
    isOnline: vi.fn(),
    getCognitiveState: vi.fn(),
    getIdentity: vi.fn(),
    getPhases: vi.fn(),
  } as unknown as JenNerve;
}

describe("jen_brain tool", () => {
  let nerve: ReturnType<typeof makeMockNerve>;
  let tool: ReturnType<typeof createJenBrainTool>;

  beforeEach(() => {
    nerve = makeMockNerve();
    tool = createJenBrainTool(nerve as JenNerve);
  });

  it("has correct name and description", () => {
    expect(tool.name).toBe("jen_brain");
    expect(tool.description).toContain("Akashic");
  });

  // -- status -----------------------------------------------------------------
  it("status action returns brain status", async () => {
    (nerve.getStatus as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      timestamp: "2026-01-01",
      akashic_exists: true,
      training_examples: 50,
      harvest_items: 20,
      dream_items: 10,
      cycle_runs: 5,
    });

    const result = await tool.execute("call1", { action: "status" });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.ok).toBe(true);
    expect(parsed.training_examples).toBe(50);
  });

  it("status action returns error when offline", async () => {
    (nerve.getStatus as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await tool.execute("call1", { action: "status" });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toContain("offline");
  });

  // -- think ------------------------------------------------------------------
  it("think action routes to nerve.think", async () => {
    (nerve.think as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      response: "Deep thought",
    });

    const result = await tool.execute("call2", {
      action: "think",
      prompt: "What is meaning?",
    });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.response).toBe("Deep thought");
    expect(nerve.think).toHaveBeenCalledWith("What is meaning?", undefined);
  });

  it("think action requires prompt", async () => {
    const result = await tool.execute("call2", { action: "think" });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toContain("prompt");
  });

  // -- search_memory ----------------------------------------------------------
  it("search_memory returns results", async () => {
    (nerve.searchAkashic as ReturnType<typeof vi.fn>).mockResolvedValue({
      query: "test",
      total: 1,
      results: [
        { id: "r1", content: "found it", type: "memory", confidence: 0.9 },
      ],
    });

    const result = await tool.execute("call3", {
      action: "search_memory",
      query: "test",
      limit: 3,
    });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.total).toBe(1);
    expect(parsed.results[0].id).toBe("r1");
  });

  // -- store_memory -----------------------------------------------------------
  it("store_memory stores content", async () => {
    (nerve.storeAkashic as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      id: "mem_123",
      content_length: 11,
    });

    const result = await tool.execute("call4", {
      action: "store_memory",
      content: "Hello world",
    });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.ok).toBe(true);
    expect(parsed.id).toBe("mem_123");
  });

  // -- run_cycle --------------------------------------------------------------
  it("run_cycle triggers cycle", async () => {
    (nerve.runCycle as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      result: { success: true, stdout: "cycle done" },
    });

    const result = await tool.execute("call5", {
      action: "run_cycle",
      mode: "harvest",
    });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.ok).toBe(true);
  });

  // -- notify -----------------------------------------------------------------
  it("notify sends notification", async () => {
    (nerve.notify as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      stored: "/tmp/notif.json",
    });

    const result = await tool.execute("call6", {
      action: "notify",
      prompt: "System update",
      severity: "warn",
    });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.ok).toBe(true);
  });

  // -- unknown action ---------------------------------------------------------
  it("unknown action returns error", async () => {
    const result = await tool.execute("call7", { action: "invalid" });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toContain("Unknown action");
  });
});
