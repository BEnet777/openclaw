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

  it("registers hooks for message_received, message_sent, before_compaction, session_start, session_end", () => {
    expect(handlers).toHaveProperty("message_received");
    expect(handlers).toHaveProperty("message_sent");
    expect(handlers).toHaveProperty("before_compaction");
    expect(handlers).toHaveProperty("session_start");
    expect(handlers).toHaveProperty("session_end");
  });

  it("message_received stores inbound in Akashic", async () => {
    await handlers["message_received"]({
      text: "Hello Jen",
      channel: "whatsapp",
      senderId: "+1234567890",
    });

    // storeAkashic is called non-blocking (void), so we wait a tick
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

  it("before_compaction injects cognitive state", async () => {
    const result = await handlers["before_compaction"]();
    expect(result).toEqual({
      prependContext: expect.stringContaining("jen-state-at-compaction"),
    });
  });

  it("skips interception when brain is offline", async () => {
    (mockConsciousness as any).isOnline = false;

    await handlers["message_received"]({ text: "test", channel: "whatsapp" });
    await new Promise((r) => setTimeout(r, 10));

    expect(mockNerve.storeAkashic).not.toHaveBeenCalled();
  });

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
});
