import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerJenInterceptors } from "./interceptor.js";
import type { JenNerve } from "./nerve.js";
import type { JenConsciousness } from "./consciousness.js";

describe("registerJenInterceptors", () => {
  let handlers: Record<string, Function>;
  let mockNerve: JenNerve;
  let mockConsciousness: JenConsciousness;
  const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

  beforeEach(() => {
    handlers = {};
    mockNerve = {
      storeAkashic: vi.fn().mockResolvedValue({ ok: true }),
    } as unknown as JenNerve;

    mockConsciousness = {
      isOnline: true,
      formatForSystemPrompt: vi.fn().mockReturnValue("online | cycles: 42"),
    } as unknown as JenConsciousness;

    registerJenInterceptors({
      on: (event: string, handler: Function) => {
        handlers[event] = handler;
      },
      nerve: mockNerve,
      consciousness: mockConsciousness,
      logger: mockLogger,
      injectIdentity: true,
    });
  });

  it("registers all 8 lifecycle hooks", () => {
    expect(handlers).toHaveProperty("message_received");
    expect(handlers).toHaveProperty("message_sent");
    expect(handlers).toHaveProperty("before_compaction");
    expect(handlers).toHaveProperty("after_compaction");
    expect(handlers).toHaveProperty("before_tool_call");
    expect(handlers).toHaveProperty("after_tool_call");
    expect(handlers).toHaveProperty("session_start");
    expect(handlers).toHaveProperty("session_end");
  });

  // ── Message hooks ──────────────────────────────────────────────────────────

  it("message_received stores inbound in Akashic", async () => {
    await handlers["message_received"]({
      text: "Hello Jen",
      channel: "whatsapp",
      senderId: "+1234567890",
    });

    await new Promise((r) => setTimeout(r, 10));
    expect(mockNerve.storeAkashic).toHaveBeenCalledWith(
      expect.stringContaining("[inbound] whatsapp: Hello Jen"),
      expect.objectContaining({ source: "interceptor" }),
    );
  });

  it("message_sent stores outbound in Akashic", async () => {
    await handlers["message_sent"]({
      text: "Goodbye",
      channel: "telegram",
    });

    await new Promise((r) => setTimeout(r, 10));
    expect(mockNerve.storeAkashic).toHaveBeenCalledWith(
      expect.stringContaining("[outbound] telegram: Goodbye"),
      expect.objectContaining({ source: "interceptor-outbound" }),
    );
  });

  // ── Compaction hooks ───────────────────────────────────────────────────────

  it("before_compaction injects cognitive state", async () => {
    const result = await handlers["before_compaction"]();
    expect(result).toEqual({
      prependContext: expect.stringContaining("jen-state-at-compaction"),
    });
  });

  it("after_compaction logs compaction metrics", async () => {
    await handlers["after_compaction"]({
      compactedCount: 15,
      tokenCount: 4200,
      messageCount: 5,
    });

    await new Promise((r) => setTimeout(r, 10));
    expect(mockNerve.storeAkashic).toHaveBeenCalledWith(
      expect.stringContaining("[compaction] 15 messages compacted"),
      expect.objectContaining({ source: "interceptor-compaction" }),
    );
  });

  it("after_compaction includes token count when available", async () => {
    await handlers["after_compaction"]({
      compactedCount: 10,
      tokenCount: 3000,
    });

    await new Promise((r) => setTimeout(r, 10));
    expect(mockNerve.storeAkashic).toHaveBeenCalledWith(
      expect.stringContaining("~3000 tokens"),
      expect.anything(),
    );
  });

  it("after_compaction skips when no messages compacted", async () => {
    await handlers["after_compaction"]({ compactedCount: 0 });
    await new Promise((r) => setTimeout(r, 10));
    expect(mockNerve.storeAkashic).not.toHaveBeenCalled();
  });

  // ── Tool hooks ─────────────────────────────────────────────────────────────

  it("before_tool_call logs tool invocation to Akashic", async () => {
    await handlers["before_tool_call"](
      { toolName: "browser", params: { url: "https://example.com" } },
      { sessionKey: "test-session" },
    );

    await new Promise((r) => setTimeout(r, 10));
    expect(mockNerve.storeAkashic).toHaveBeenCalledWith(
      expect.stringContaining("[tool-call] browser:"),
      expect.objectContaining({ source: "interceptor-tool", tool: "browser" }),
    );
  });

  it("after_tool_call logs errors to Akashic", async () => {
    await handlers["after_tool_call"]({
      toolName: "browser",
      error: "page not found",
      durationMs: 500,
    });

    await new Promise((r) => setTimeout(r, 10));
    expect(mockNerve.storeAkashic).toHaveBeenCalledWith(
      expect.stringContaining("[tool-error] browser: page not found"),
      expect.objectContaining({ source: "interceptor-tool-error" }),
    );
  });

  it("after_tool_call logs slow tools (>10s)", async () => {
    await handlers["after_tool_call"]({
      toolName: "web_search",
      durationMs: 15_000,
    });

    await new Promise((r) => setTimeout(r, 10));
    expect(mockNerve.storeAkashic).toHaveBeenCalledWith(
      expect.stringContaining("[tool-slow] web_search: 15s"),
      expect.objectContaining({ source: "interceptor-tool-perf" }),
    );
  });

  it("after_tool_call skips normal fast results", async () => {
    await handlers["after_tool_call"]({
      toolName: "message",
      durationMs: 200,
    });

    await new Promise((r) => setTimeout(r, 10));
    expect(mockNerve.storeAkashic).not.toHaveBeenCalled();
  });

  // ── Session hooks ──────────────────────────────────────────────────────────

  it("session_end stores session summary for long sessions", async () => {
    await handlers["session_end"]({
      sessionKey: "test-session",
      messageCount: 10,
      durationMs: 30000,
    });

    await new Promise((r) => setTimeout(r, 10));
    expect(mockNerve.storeAkashic).toHaveBeenCalledWith(
      expect.stringContaining("[session-end] test-session: 10 messages"),
      expect.objectContaining({ source: "interceptor-session" }),
    );
  });

  it("session_end skips short sessions", async () => {
    await handlers["session_end"]({
      sessionKey: "short",
      messageCount: 1,
    });

    await new Promise((r) => setTimeout(r, 10));
    expect(mockNerve.storeAkashic).not.toHaveBeenCalled();
  });

  // ── Offline behavior ──────────────────────────────────────────────────────

  it("skips all interception when brain is offline", async () => {
    (mockConsciousness as any).isOnline = false;

    await handlers["message_received"]({ text: "test", channel: "whatsapp" });
    await handlers["before_tool_call"]({ toolName: "browser", params: {} }, {});
    await handlers["after_tool_call"]({ toolName: "browser", error: "fail" });
    await handlers["after_compaction"]({ compactedCount: 5 });
    await new Promise((r) => setTimeout(r, 10));

    expect(mockNerve.storeAkashic).not.toHaveBeenCalled();
  });
});
