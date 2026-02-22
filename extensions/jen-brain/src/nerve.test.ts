import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { JenNerve } from "./nerve.js";
import type { JenBrainConfig } from "./types.js";

const BASE_CONFIG: JenBrainConfig = {
  bridgeUrl: "http://127.0.0.1:18888",
  chatUrl: "http://127.0.0.1:8900",
  pollInterval: 60_000,
  injectIdentity: true,
  token: "",
};

const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

describe("JenNerve", () => {
  let nerve: JenNerve;

  beforeEach(() => {
    vi.restoreAllMocks();
    nerve = new JenNerve(BASE_CONFIG, mockLogger);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -- getStatus --------------------------------------------------------------
  describe("getStatus", () => {
    it("returns status on success", async () => {
      const mockStatus = {
        ok: true,
        timestamp: "2026-01-01T00:00:00Z",
        jen_root: "/home/user/jen",
        v3_exists: true,
        akashic_exists: true,
        training_examples: 100,
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify(mockStatus), { status: 200 }),
      );

      const result = await nerve.getStatus();
      expect(result).toEqual(mockStatus);
    });

    it("returns null on network error", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("ECONNREFUSED"));

      const result = await nerve.getStatus();
      expect(result).toBeNull();
    });

    it("returns null on HTTP error", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response("Internal Server Error", { status: 500 }),
      );

      const result = await nerve.getStatus();
      expect(result).toBeNull();
    });
  });

  // -- getHealth --------------------------------------------------------------
  describe("getHealth", () => {
    it("returns health response", async () => {
      const mockHealth = { status: "healthy", timestamp: "2026-01-01T00:00:00Z" };
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify(mockHealth), { status: 200 }),
      );

      const result = await nerve.getHealth();
      expect(result).toEqual(mockHealth);
    });

    it("returns null when offline", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("ECONNREFUSED"));
      const result = await nerve.getHealth();
      expect(result).toBeNull();
    });
  });

  // -- isOnline ---------------------------------------------------------------
  describe("isOnline", () => {
    it("returns true when health check succeeds", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ status: "healthy" }), { status: 200 }),
      );
      expect(await nerve.isOnline()).toBe(true);
    });

    it("returns false when health check fails", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("ECONNREFUSED"));
      expect(await nerve.isOnline()).toBe(false);
    });
  });

  // -- searchAkashic ----------------------------------------------------------
  describe("searchAkashic", () => {
    it("sends correct request body", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(
          JSON.stringify({ query: "test", limit: 3, results: [], total: 0 }),
          { status: 200 },
        ),
      );

      await nerve.searchAkashic("test", 3);

      expect(fetchSpy).toHaveBeenCalledWith(
        "http://127.0.0.1:18888/akashic/search",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ query: "test", limit: 3 }),
        }),
      );
    });
  });

  // -- chatInfer --------------------------------------------------------------
  describe("chatInfer", () => {
    it("returns response from OpenAI-compatible endpoint", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(
          JSON.stringify({
            choices: [{ message: { content: "I think therefore I am" } }],
          }),
          { status: 200 },
        ),
      );

      const result = await nerve.chatInfer("What is life?");
      expect(result).toBe("I think therefore I am");
    });

    it("falls back to Ollama format", async () => {
      vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(new Response("", { status: 404 }))
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ message: { content: "Ollama response" } }),
            { status: 200 },
          ),
        );

      const result = await nerve.chatInfer("test");
      expect(result).toBe("Ollama response");
    });

    it("returns null when pipeline unavailable", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("ECONNREFUSED"));
      const result = await nerve.chatInfer("test");
      expect(result).toBeNull();
    });

    it("returns null when chatUrl is empty", async () => {
      const noChatNerve = new JenNerve({ ...BASE_CONFIG, chatUrl: "" }, mockLogger);
      const result = await noChatNerve.chatInfer("test");
      expect(result).toBeNull();
    });
  });

  // -- think ------------------------------------------------------------------
  describe("think", () => {
    it("uses chat pipeline when available", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(
          JSON.stringify({
            choices: [{ message: { content: "Deep thought from LLM" } }],
          }),
          { status: 200 },
        ),
      );

      const result = await nerve.think("What is life?", "philosophical context");
      expect(result?.ok).toBe(true);
      expect(result?.response).toBe("Deep thought from LLM");
    });

    it("falls back to bridge /think when chat pipeline unavailable", async () => {
      vi.spyOn(globalThis, "fetch")
        // chatInfer: v1/chat/completions fails
        .mockRejectedValueOnce(new Error("ECONNREFUSED"))
        // chatInfer: /api/chat fails
        .mockRejectedValueOnce(new Error("ECONNREFUSED"))
        // bridge /think succeeds
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ ok: true, response: "Bridge response" }),
            { status: 200 },
          ),
        );

      const result = await nerve.think("What is life?");
      expect(result?.ok).toBe(true);
      expect(result?.response).toBe("Bridge response");
    });
  });

  // -- Auth header ------------------------------------------------------------
  describe("auth", () => {
    it("includes Bearer token when configured", async () => {
      const authedNerve = new JenNerve({ ...BASE_CONFIG, token: "mytoken" }, mockLogger);

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ status: "healthy" }), { status: 200 }),
      );

      await authedNerve.getHealth();

      const headers = fetchSpy.mock.calls[0]?.[1]?.headers as Record<string, string>;
      expect(headers?.["Authorization"]).toBe("Bearer mytoken");
    });

    it("omits Authorization header when no token", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ status: "healthy" }), { status: 200 }),
      );

      await nerve.getHealth();

      const headers = fetchSpy.mock.calls[0]?.[1]?.headers as Record<string, string>;
      expect(headers?.["Authorization"]).toBeUndefined();
    });
  });

  // -- notify -----------------------------------------------------------------
  describe("notify", () => {
    it("sends notification with source=openclaw", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(
          JSON.stringify({ ok: true, stored: "/tmp/notif.json" }),
          { status: 200 },
        ),
      );

      await nerve.notify("hello", "warn");

      expect(fetchSpy).toHaveBeenCalledWith(
        "http://127.0.0.1:18888/notify",
        expect.objectContaining({
          body: JSON.stringify({ text: "hello", severity: "warn", source: "openclaw" }),
        }),
      );
    });
  });

  // -- runCycle ---------------------------------------------------------------
  describe("runCycle", () => {
    it("sends cycle request", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(
          JSON.stringify({ ok: true, result: { success: true, stdout: "done" } }),
          { status: 200 },
        ),
      );

      const result = await nerve.runCycle("harvest");
      expect(result?.ok).toBe(true);
    });
  });
});
