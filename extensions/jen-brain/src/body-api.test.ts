import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerJenBodyMethods } from "./body-api.js";
import type { JenNerve } from "./nerve.js";
import type { JenConsciousness } from "./consciousness.js";

function makeMockNerve(): JenNerve {
  return {
    getStatus: vi.fn().mockResolvedValue({ ok: true }),
    getHealth: vi.fn().mockResolvedValue({ status: "ok" }),
    getCognitiveState: vi.fn().mockResolvedValue(null),
    storeAkashic: vi.fn().mockResolvedValue({ ok: true }),
    notify: vi.fn().mockResolvedValue({ ok: true }),
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
  let mockDispatch: ReturnType<typeof vi.fn>;
  let mockNerve: JenNerve;
  const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

  beforeEach(() => {
    handlers = {};
    mockDispatch = vi.fn();
    mockNerve = makeMockNerve();

    registerJenBodyMethods({
      registerMethod: (name, handler) => { handlers[name] = handler; },
      nerve: mockNerve,
      consciousness: makeMockConsciousness(),
      logger: mockLogger,
      config: { injectIdentity: true },
      dispatch: mockDispatch,
    });
  });

  it("registers 22 gateway methods", () => {
    const methodNames = Object.keys(handlers).sort();
    expect(methodNames).toEqual([
      "jen.agent",
      "jen.browse",
      "jen.channels",
      "jen.config.get",
      "jen.config.set",
      "jen.cron.add",
      "jen.cron.list",
      "jen.cron.remove",
      "jen.cron.run",
      "jen.exec",
      "jen.health",
      "jen.models",
      "jen.notify",
      "jen.self_check",
      "jen.send",
      "jen.sessions",
      "jen.sessions.history",
      "jen.sessions.send",
      "jen.sessions.spawn",
      "jen.store",
      "jen.tts",
      "jen.wake",
    ]);
  });

  it("jen.send calls dispatch send for direct messages", async () => {
    mockDispatch.mockResolvedValue({ messageId: "msg1" });
    const respond = vi.fn();

    await handlers["jen.send"]({
      params: { channel: "whatsapp", to: "+1234567890", message: "hello" },
      respond,
      context: {},
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      "send",
      expect.objectContaining({ to: "+1234567890", message: "hello", channel: "whatsapp" }),
      {},
    );
    expect(respond).toHaveBeenCalledWith(true, { messageId: "msg1" });
  });

  it("jen.send routes through agent when thinking is set", async () => {
    mockDispatch.mockResolvedValue({ text: "response" });
    const respond = vi.fn();

    await handlers["jen.send"]({
      params: { channel: "telegram", to: "123", message: "think about this", thinking: "medium" },
      respond,
      context: {},
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      "agent",
      expect.objectContaining({ message: "think about this", thinking: "medium", deliver: true }),
      {},
    );
    expect(respond).toHaveBeenCalledWith(true, expect.anything());
  });

  it("jen.send requires channel, to, and message", async () => {
    const respond = vi.fn();
    await handlers["jen.send"]({ params: { channel: "whatsapp" }, respond, context: {} });
    expect(respond).toHaveBeenCalledWith(false, expect.objectContaining({ error: expect.any(String) }));
  });

  it("jen.channels calls channels.status", async () => {
    mockDispatch.mockResolvedValue({ channels: {} });
    const respond = vi.fn();

    await handlers["jen.channels"]({ params: {}, respond, context: {} });

    expect(mockDispatch).toHaveBeenCalledWith("channels.status", { probe: false }, {});
    expect(respond).toHaveBeenCalledWith(true, { channels: {} });
  });

  it("jen.agent requires message", async () => {
    const respond = vi.fn();
    await handlers["jen.agent"]({ params: {}, respond, context: {} });
    expect(respond).toHaveBeenCalledWith(false, expect.objectContaining({ error: expect.any(String) }));
  });

  it("jen.cron.add requires message and schedule", async () => {
    const respond = vi.fn();
    await handlers["jen.cron.add"]({ params: { message: "test" }, respond, context: {} });
    expect(respond).toHaveBeenCalledWith(false, expect.objectContaining({ error: expect.any(String) }));
  });

  it("jen.wake requires text", async () => {
    const respond = vi.fn();
    await handlers["jen.wake"]({ params: {}, respond, context: {} });
    expect(respond).toHaveBeenCalledWith(false, expect.objectContaining({ error: expect.any(String) }));
  });

  it("jen.browse requires url", async () => {
    const respond = vi.fn();
    await handlers["jen.browse"]({ params: {}, respond, context: {} });
    expect(respond).toHaveBeenCalledWith(false, expect.objectContaining({ error: expect.any(String) }));
  });

  it("jen.self_check returns diagnostic report", async () => {
    const respond = vi.fn();
    mockDispatch.mockResolvedValue({ channels: {} });

    await handlers["jen.self_check"]({ params: {}, respond, context: {} });

    expect(respond).toHaveBeenCalledWith(true, expect.objectContaining({
      timestamp: expect.any(String),
      brain: expect.any(Object),
      body: expect.any(Object),
    }));
  });

  it("jen.store stores to Akashic Record", async () => {
    const respond = vi.fn();
    await handlers["jen.store"]({ params: { content: "test insight" }, respond, context: {} });
    expect(mockNerve.storeAkashic).toHaveBeenCalledWith("test insight", { source: "body-api" });
    expect(respond).toHaveBeenCalledWith(true, { ok: true });
  });

  it("jen.health returns combined brain+body report", async () => {
    mockDispatch.mockResolvedValue({ status: "ok" });
    const respond = vi.fn();

    await handlers["jen.health"]({ params: {}, respond, context: {} });

    expect(respond).toHaveBeenCalledWith(true, expect.objectContaining({
      brain: expect.objectContaining({ online: true }),
      body: expect.any(Object),
      consciousness: expect.any(Object),
    }));
  });

  it("jen.notify sends notification via nerve", async () => {
    const respond = vi.fn();
    await handlers["jen.notify"]({ params: { text: "alert!", severity: "warn" }, respond, context: {} });
    expect(mockNerve.notify).toHaveBeenCalledWith("alert!", "warn");
    expect(respond).toHaveBeenCalledWith(true, { ok: true });
  });

  it("jen.sessions.history requires sessionKey", async () => {
    const respond = vi.fn();
    await handlers["jen.sessions.history"]({ params: {}, respond, context: {} });
    expect(respond).toHaveBeenCalledWith(false, expect.objectContaining({ error: expect.any(String) }));
  });

  it("jen.sessions.spawn requires task", async () => {
    const respond = vi.fn();
    await handlers["jen.sessions.spawn"]({ params: {}, respond, context: {} });
    expect(respond).toHaveBeenCalledWith(false, expect.objectContaining({ error: expect.any(String) }));
  });

  it("jen.exec requires command", async () => {
    const respond = vi.fn();
    await handlers["jen.exec"]({ params: {}, respond, context: {} });
    expect(respond).toHaveBeenCalledWith(false, expect.objectContaining({ error: expect.any(String) }));
  });

  it("jen.config.get dispatches to config.get", async () => {
    mockDispatch.mockResolvedValue({ config: {} });
    const respond = vi.fn();

    await handlers["jen.config.get"]({ params: {}, respond, context: {} });

    expect(mockDispatch).toHaveBeenCalledWith("config.get", {}, {});
    expect(respond).toHaveBeenCalledWith(true, { config: {} });
  });
});
