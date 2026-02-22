import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createJenBrainService } from "./service.js";
import type { JenConsciousness } from "./consciousness.js";
import type { JenNerve } from "./nerve.js";
import type { JenBrainConfig } from "./types.js";

const BASE_CONFIG: JenBrainConfig = {
  bridgeUrl: "http://127.0.0.1:18888",
  chatUrl: "http://127.0.0.1:8900",
  pollInterval: 1_000,
  injectIdentity: true,
  token: "",
};

const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

function makeMockConsciousness(online = false) {
  return {
    isOnline: online,
    status: online
      ? {
          ok: true,
          training_examples: 100,
          harvest_items: 50,
          cycle_runs: 5,
        }
      : null,
    state: null,
    startPolling: vi.fn(),
    stopPolling: vi.fn(),
    formatForSystemPrompt: vi.fn().mockReturnValue(online ? "Brain online" : null),
  } as unknown as JenConsciousness;
}

function makeMockNerve() {
  return {
    storeAkashic: vi.fn().mockResolvedValue({ ok: true }),
  } as unknown as JenNerve;
}

describe("createJenBrainService", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns service with correct id", () => {
    const consciousness = makeMockConsciousness();
    const nerve = makeMockNerve();
    const svc = createJenBrainService({ consciousness, nerve, config: BASE_CONFIG, logger: mockLogger });
    expect(svc.id).toBe("jen-brain");
  });

  it("starts polling on start()", async () => {
    const consciousness = makeMockConsciousness();
    const nerve = makeMockNerve();
    const svc = createJenBrainService({ consciousness, nerve, config: BASE_CONFIG, logger: mockLogger });

    await svc.start();
    expect(consciousness.startPolling).toHaveBeenCalledWith(1_000);
  });

  it("stops polling on stop()", async () => {
    const consciousness = makeMockConsciousness();
    const nerve = makeMockNerve();
    const svc = createJenBrainService({ consciousness, nerve, config: BASE_CONFIG, logger: mockLogger });

    await svc.start();
    await svc.stop();
    expect(consciousness.stopPolling).toHaveBeenCalled();
  });

  it("logs brain online after initial delay", async () => {
    const consciousness = makeMockConsciousness(true);
    const nerve = makeMockNerve();
    const svc = createJenBrainService({ consciousness, nerve, config: BASE_CONFIG, logger: mockLogger });

    await svc.start();

    // Advance past the 3s initial check
    vi.advanceTimersByTime(3_100);

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining("Brain is online"),
    );
    await svc.stop();
  });

  it("logs brain offline warning after initial delay", async () => {
    const consciousness = makeMockConsciousness(false);
    const nerve = makeMockNerve();
    const svc = createJenBrainService({ consciousness, nerve, config: BASE_CONFIG, logger: mockLogger });

    await svc.start();
    vi.advanceTimersByTime(3_100);

    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining("Brain is offline"),
    );
    await svc.stop();
  });

  it("detects brain state transition online→offline", async () => {
    const consciousness = makeMockConsciousness(true) as unknown as {
      isOnline: boolean;
      status: unknown;
      startPolling: ReturnType<typeof vi.fn>;
      stopPolling: ReturnType<typeof vi.fn>;
      formatForSystemPrompt: ReturnType<typeof vi.fn>;
    };
    const nerve = makeMockNerve();
    const svc = createJenBrainService({
      consciousness: consciousness as unknown as JenConsciousness,
      nerve,
      config: BASE_CONFIG,
      logger: mockLogger,
    });

    await svc.start();
    // Set initial state
    vi.advanceTimersByTime(3_100);

    // Transition to offline
    (consciousness as { isOnline: boolean }).isOnline = false;
    await vi.advanceTimersByTimeAsync(BASE_CONFIG.pollInterval + 100);

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining("went offline"),
    );
    await svc.stop();
  });

  it("stores health snapshot every 5 polls when online", async () => {
    const consciousness = makeMockConsciousness(true) as unknown as {
      isOnline: boolean;
      status: { ok: boolean; training_examples: number; harvest_items: number; cycle_runs: number };
      startPolling: ReturnType<typeof vi.fn>;
      stopPolling: ReturnType<typeof vi.fn>;
      formatForSystemPrompt: ReturnType<typeof vi.fn>;
    };
    const nerve = makeMockNerve();
    const svc = createJenBrainService({
      consciousness: consciousness as unknown as JenConsciousness,
      nerve,
      config: BASE_CONFIG,
      logger: mockLogger,
    });

    await svc.start();
    // Set initial state
    vi.advanceTimersByTime(3_100);

    // Advance through 5 poll intervals
    for (let i = 0; i < 5; i++) {
      await vi.advanceTimersByTimeAsync(BASE_CONFIG.pollInterval + 10);
    }

    expect((nerve.storeAkashic as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(
      expect.stringContaining("[health-snapshot]"),
      expect.objectContaining({ source: "service-health-snapshot" }),
    );
    await svc.stop();
  });

  it("does not store health snapshot when offline", async () => {
    const consciousness = makeMockConsciousness(false);
    const nerve = makeMockNerve();
    const svc = createJenBrainService({ consciousness, nerve, config: BASE_CONFIG, logger: mockLogger });

    await svc.start();

    // Advance through 5 poll intervals
    for (let i = 0; i < 5; i++) {
      await vi.advanceTimersByTimeAsync(BASE_CONFIG.pollInterval + 10);
    }

    expect((nerve.storeAkashic as ReturnType<typeof vi.fn>)).not.toHaveBeenCalledWith(
      expect.stringContaining("[health-snapshot]"),
      expect.anything(),
    );
    await svc.stop();
  });

  it("cleans up timer on stop()", async () => {
    const consciousness = makeMockConsciousness();
    const nerve = makeMockNerve();
    const svc = createJenBrainService({ consciousness, nerve, config: BASE_CONFIG, logger: mockLogger });

    await svc.start();
    await svc.stop();

    // Double stop should not throw
    await svc.stop();
    expect(mockLogger.info).toHaveBeenCalledWith("[jen-brain] Service stopped");
  });
});
