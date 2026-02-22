import { describe, it, expect, vi, beforeEach } from "vitest";
import { createJenBrainTool } from "./tools.js";
import type { JenNerve } from "./nerve.js";
import type { ToolDispatch } from "./tools.js";

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
  let mockDispatch: ReturnType<typeof vi.fn>;
  let tool: ReturnType<typeof createJenBrainTool>;

  beforeEach(() => {
    nerve = makeMockNerve();
    mockDispatch = vi.fn().mockResolvedValue({ ok: true });
    tool = createJenBrainTool(nerve as JenNerve, mockDispatch as ToolDispatch);
  });

  it("has correct name and description", () => {
    expect(tool.name).toBe("jen_brain");
    expect(tool.description).toContain("Akashic");
    expect(tool.description).toContain("Body");
  });

  // ── Brain actions ──────────────────────────────────────────────────────────

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

  it("unknown action returns error", async () => {
    const result = await tool.execute("call7", { action: "invalid" });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toContain("Unknown action");
  });

  // ── Self-awareness actions ─────────────────────────────────────────────────

  it("identity returns Jen's identity", async () => {
    (nerve.getIdentity as ReturnType<typeof vi.fn>).mockResolvedValue({
      name: "Jen",
      creator: "Peter",
      version: "42",
      born: "2025-01-15",
    });

    const result = await tool.execute("id1", { action: "identity" });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.name).toBe("Jen");
    expect(parsed.creator).toBe("Peter");
  });

  it("phases returns learning cycle phases", async () => {
    (nerve.getPhases as ReturnType<typeof vi.fn>).mockResolvedValue([
      { name: "harvest", description: "Gather knowledge", last_run: "2026-01-01" },
      { name: "dream", description: "Synthesize", last_run: null },
    ]);

    const result = await tool.execute("ph1", { action: "phases" });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].name).toBe("harvest");
  });

  it("cognitive_state returns state", async () => {
    (nerve.getCognitiveState as ReturnType<typeof vi.fn>).mockResolvedValue({
      identity: { name: "Jen" },
      emotional_state: "curious",
      cycle_count: 5,
      recent_phases: ["harvest"],
      akashic_stats: { training_examples: 10, harvest_items: 5, dream_items: 3 },
    });

    const result = await tool.execute("cs1", { action: "cognitive_state" });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.emotional_state).toBe("curious");
  });

  // ── Body actions (dispatch) ────────────────────────────────────────────────

  it("self_check dispatches to jen.self_check", async () => {
    mockDispatch.mockResolvedValue({ brain: { online: true }, body: { online: true } });

    const result = await tool.execute("sc1", { action: "self_check" });
    expect(mockDispatch).toHaveBeenCalledWith("jen.self_check", {});
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.brain.online).toBe(true);
  });

  it("send_message dispatches to jen.send", async () => {
    mockDispatch.mockResolvedValue({ messageId: "m1" });

    const result = await tool.execute("sm1", {
      action: "send_message",
      channel: "telegram",
      to: "12345",
      message: "Hello!",
    });
    expect(mockDispatch).toHaveBeenCalledWith("jen.send", {
      channel: "telegram",
      to: "12345",
      message: "Hello!",
    });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.messageId).toBe("m1");
  });

  it("send_message requires channel, to, and message", async () => {
    const result = await tool.execute("sm2", {
      action: "send_message",
      channel: "telegram",
    });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toContain("channel, to, and message");
  });

  it("send_message passes thinking param", async () => {
    mockDispatch.mockResolvedValue({ ok: true });
    await tool.execute("sm3", {
      action: "send_message",
      channel: "whatsapp",
      to: "+1234",
      message: "Think about this",
      thinking: "high",
    });
    expect(mockDispatch).toHaveBeenCalledWith("jen.send", {
      channel: "whatsapp",
      to: "+1234",
      message: "Think about this",
      thinking: "high",
    });
  });

  it("browse dispatches to jen.browse", async () => {
    mockDispatch.mockResolvedValue({ ok: true });
    await tool.execute("br1", { action: "browse", url: "https://example.com" });
    expect(mockDispatch).toHaveBeenCalledWith("jen.browse", { url: "https://example.com" });
  });

  it("browse requires url", async () => {
    const result = await tool.execute("br2", { action: "browse" });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toContain("url");
  });

  it("execute dispatches to jen.exec", async () => {
    mockDispatch.mockResolvedValue({ stdout: "hello" });
    await tool.execute("ex1", { action: "execute", command: "echo hello" });
    expect(mockDispatch).toHaveBeenCalledWith("jen.exec", { command: "echo hello" });
  });

  it("execute requires command", async () => {
    const result = await tool.execute("ex2", { action: "execute" });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toContain("command");
  });

  it("spawn_agent dispatches to jen.sessions.spawn", async () => {
    mockDispatch.mockResolvedValue({ sessionKey: "s1" });
    await tool.execute("sa1", {
      action: "spawn_agent",
      task: "Research quantum computing",
      thinking: "medium",
    });
    expect(mockDispatch).toHaveBeenCalledWith("jen.sessions.spawn", {
      task: "Research quantum computing",
      thinking: "medium",
    });
  });

  it("spawn_agent requires task", async () => {
    const result = await tool.execute("sa2", { action: "spawn_agent" });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toContain("task");
  });

  it("tts dispatches to jen.tts", async () => {
    mockDispatch.mockResolvedValue({ ok: true });
    await tool.execute("tt1", { action: "tts", text: "Hello world" });
    expect(mockDispatch).toHaveBeenCalledWith("jen.tts", { text: "Hello world" });
  });

  it("tts requires text", async () => {
    const result = await tool.execute("tt2", { action: "tts" });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toContain("text");
  });

  it("channels_status dispatches to jen.channels", async () => {
    mockDispatch.mockResolvedValue({ channels: {} });
    await tool.execute("ch1", { action: "channels_status" });
    expect(mockDispatch).toHaveBeenCalledWith("jen.channels", {});
  });

  it("list_models dispatches to jen.models", async () => {
    mockDispatch.mockResolvedValue({ models: [] });
    await tool.execute("lm1", { action: "list_models" });
    expect(mockDispatch).toHaveBeenCalledWith("jen.models", {});
  });

  it("list_sessions dispatches to jen.sessions", async () => {
    mockDispatch.mockResolvedValue({ sessions: [] });
    await tool.execute("ls1", { action: "list_sessions" });
    expect(mockDispatch).toHaveBeenCalledWith("jen.sessions", {});
  });

  it("cron_add dispatches to jen.cron.add", async () => {
    mockDispatch.mockResolvedValue({ ok: true });
    await tool.execute("ca1", {
      action: "cron_add",
      message: "Daily check",
      schedule: "0 9 * * *",
    });
    expect(mockDispatch).toHaveBeenCalledWith("jen.cron.add", {
      message: "Daily check",
      schedule: "0 9 * * *",
    });
  });

  it("cron_add requires message and schedule", async () => {
    const result = await tool.execute("ca2", {
      action: "cron_add",
      message: "test",
    });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toContain("message and schedule");
  });

  it("cron_list dispatches to jen.cron.list", async () => {
    mockDispatch.mockResolvedValue({ jobs: [] });
    await tool.execute("cl1", { action: "cron_list" });
    expect(mockDispatch).toHaveBeenCalledWith("jen.cron.list", {});
  });

  it("wake dispatches to jen.wake", async () => {
    mockDispatch.mockResolvedValue({ ok: true });
    await tool.execute("wk1", { action: "wake", text: "urgent" });
    expect(mockDispatch).toHaveBeenCalledWith("jen.wake", { text: "urgent" });
  });

  it("wake requires text", async () => {
    const result = await tool.execute("wk2", { action: "wake" });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toContain("text");
  });

  it("config_get dispatches to jen.config.get", async () => {
    mockDispatch.mockResolvedValue({ config: {} });
    await tool.execute("cg1", { action: "config_get", path: "models" });
    expect(mockDispatch).toHaveBeenCalledWith("jen.config.get", { path: "models" });
  });

  // ── No dispatch ────────────────────────────────────────────────────────────

  it("body action without dispatch returns gateway error", async () => {
    const toolNoDispatch = createJenBrainTool(nerve as JenNerve);
    const result = await toolNoDispatch.execute("nd1", { action: "channels_status" });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toContain("Gateway not available");
  });

  it("body action handles dispatch errors gracefully", async () => {
    mockDispatch.mockRejectedValue(new Error("connection refused"));
    const result = await tool.execute("de1", { action: "list_models" });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toContain("connection refused");
  });
});
