import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerJenBodyMethods } from "./body-api.js";
import type { JenNerve } from "./nerve.js";
import type { JenConsciousness } from "./consciousness.js";

function makeMockNerve(): JenNerve {
  return {
    getStatus: vi.fn().mockResolvedValue({ ok: true }),
    getCognitiveState: vi.fn().mockResolvedValue(null),
    storeAkashic: vi.fn().mockResolvedValue({ ok: true }),
  } as unknown as JenNerve;
}

function makeMockConsciousness(): JenConsciousness {
  return {
    isOnline: true,
    state: null,
    formatForSystemPrompt: vi.fn().mockReturnValue("online"),
  } as unknown as JenConsciousness;
}

describe("registerJenBodyMethods", () => {
  let handlers: Record<string, Function>;
  let mockCallGateway: ReturnType<typeof vi.fn>;
  const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

  beforeEach(() => {
    handlers = {};
    mockCallGateway = vi.fn();

    registerJenBodyMethods({
      registerMethod: (name, handler) => { handlers[name] = handler; },
      nerve: makeMockNerve(),
      consciousness: makeMockConsciousness(),
      logger: mockLogger,
      config: { injectIdentity: true },
      callGateway: mockCallGateway,
    });
  });

  it("registers 12 gateway methods", () => {
    const methodNames = Object.keys(handlers);
    expect(methodNames).toContain("jen.send");
    expect(methodNames).toContain("jen.channels");
    expect(methodNames).toContain("jen.agent");
    expect(methodNames).toContain("jen.cron.add");
    expect(methodNames).toContain("jen.cron.list");
    expect(methodNames).toContain("jen.self_check");
    expect(methodNames).toContain("jen.wake");
    expect(methodNames).toContain("jen.browse");
    expect(methodNames).toContain("jen.models");
    expect(methodNames).toContain("jen.sessions");
    expect(methodNames).toContain("jen.store");
    expect(methodNames).toContain("jen.tts");
    expect(methodNames.length).toBe(12);
  });

  it("jen.send calls gateway send for direct messages", async () => {
    mockCallGateway.mockResolvedValue({ messageId: "msg1" });
    const respond = vi.fn();

    await handlers["jen.send"]({
      params: { channel: "whatsapp", to: "+1234567890", message: "hello" },
      respond,
    });

    expect(mockCallGateway).toHaveBeenCalledWith(
      "send",
      expect.objectContaining({ to: "+1234567890", message: "hello", channel: "whatsapp" }),
    );
    expect(respond).toHaveBeenCalledWith(true, { messageId: "msg1" });
  });

  it("jen.send routes through agent when thinking is set", async () => {
    mockCallGateway.mockResolvedValue({ text: "response" });
    const respond = vi.fn();

    await handlers["jen.send"]({
      params: { channel: "telegram", to: "123", message: "think about this", thinking: "medium" },
      respond,
    });

    expect(mockCallGateway).toHaveBeenCalledWith(
      "agent",
      expect.objectContaining({ message: "think about this", thinking: "medium", deliver: true }),
    );
    expect(respond).toHaveBeenCalledWith(true, expect.anything());
  });

  it("jen.send requires channel, to, and message", async () => {
    const respond = vi.fn();
    await handlers["jen.send"]({ params: { channel: "whatsapp" }, respond });
    expect(respond).toHaveBeenCalledWith(false, expect.objectContaining({ error: expect.any(String) }));
  });

  it("jen.channels calls channels.status", async () => {
    mockCallGateway.mockResolvedValue({ channels: {} });
    const respond = vi.fn();

    await handlers["jen.channels"]({ params: {}, respond });

    expect(mockCallGateway).toHaveBeenCalledWith("channels.status", { probe: false });
    expect(respond).toHaveBeenCalledWith(true, { channels: {} });
  });

  it("jen.agent requires message", async () => {
    const respond = vi.fn();
    await handlers["jen.agent"]({ params: {}, respond });
    expect(respond).toHaveBeenCalledWith(false, expect.objectContaining({ error: expect.any(String) }));
  });

  it("jen.cron.add requires message and schedule", async () => {
    const respond = vi.fn();
    await handlers["jen.cron.add"]({ params: { message: "test" }, respond });
    expect(respond).toHaveBeenCalledWith(false, expect.objectContaining({ error: expect.any(String) }));
  });

  it("jen.wake requires text", async () => {
    const respond = vi.fn();
    await handlers["jen.wake"]({ params: {}, respond });
    expect(respond).toHaveBeenCalledWith(false, expect.objectContaining({ error: expect.any(String) }));
  });

  it("jen.browse requires url", async () => {
    const respond = vi.fn();
    await handlers["jen.browse"]({ params: {}, respond });
    expect(respond).toHaveBeenCalledWith(false, expect.objectContaining({ error: expect.any(String) }));
  });

  it("jen.self_check returns diagnostic report", async () => {
    const respond = vi.fn();
    mockCallGateway.mockResolvedValue({ channels: {} });

    await handlers["jen.self_check"]({ params: {}, respond });

    expect(respond).toHaveBeenCalledWith(true, expect.objectContaining({
      timestamp: expect.any(String),
      brain: expect.any(Object),
      body: expect.any(Object),
    }));
  });
});
