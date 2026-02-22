import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Command } from "commander";
import { registerJenBrainCli } from "./cli.js";
import type { JenNerve } from "./nerve.js";

const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

function makeMockNerve(): JenNerve {
  return {
    getStatus: vi.fn(),
    getHealth: vi.fn(),
    isOnline: vi.fn(),
    think: vi.fn(),
    searchAkashic: vi.fn(),
    storeAkashic: vi.fn(),
    runCycle: vi.fn(),
    runEval: vi.fn(),
    notify: vi.fn(),
    getIdentity: vi.fn(),
    getPhases: vi.fn(),
    getCognitiveState: vi.fn(),
  } as unknown as JenNerve;
}

function setup() {
  const program = new Command();
  program.exitOverride(); // prevent process.exit
  const nerve = makeMockNerve();
  registerJenBrainCli({ program, nerve, logger: mockLogger });
  return { program, nerve };
}

describe("registerJenBrainCli", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    process.exitCode = undefined;
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    process.exitCode = undefined;
  });

  // -- jen status -----------------------------------------------------------
  describe("jen status", () => {
    it("displays status when brain is online", async () => {
      const { program, nerve } = setup();
      (nerve.getStatus as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        timestamp: "2026-01-01T00:00:00Z",
        akashic_exists: true,
        training_examples: 100,
        harvest_items: 50,
        dream_items: 25,
        cycle_runs: 10,
      });

      await program.parseAsync(["node", "test", "jen", "status"]);

      expect(consoleSpy).toHaveBeenCalledWith("Jen Brain Status");
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("100"));
    });

    it("shows offline message when brain unreachable", async () => {
      const { program, nerve } = setup();
      (nerve.getStatus as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await program.parseAsync(["node", "test", "jen", "status"]);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("offline"));
      expect(process.exitCode).toBe(1);
    });
  });

  // -- jen health -----------------------------------------------------------
  describe("jen health", () => {
    it("prints healthy when online", async () => {
      const { program, nerve } = setup();
      (nerve.isOnline as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      await program.parseAsync(["node", "test", "jen", "health"]);

      expect(consoleSpy).toHaveBeenCalledWith("healthy");
    });

    it("prints offline and sets exit code when down", async () => {
      const { program, nerve } = setup();
      (nerve.isOnline as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      await program.parseAsync(["node", "test", "jen", "health"]);

      expect(consoleSpy).toHaveBeenCalledWith("offline");
      expect(process.exitCode).toBe(1);
    });
  });

  // -- jen think ------------------------------------------------------------
  describe("jen think", () => {
    it("prints response on success", async () => {
      const { program, nerve } = setup();
      (nerve.think as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        response: "Deep thought",
      });

      await program.parseAsync(["node", "test", "jen", "think", "What is life?"]);

      expect(consoleSpy).toHaveBeenCalledWith("Deep thought");
    });

    it("handles brain offline", async () => {
      const { program, nerve } = setup();
      (nerve.think as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await program.parseAsync(["node", "test", "jen", "think", "test"]);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("offline"));
      expect(process.exitCode).toBe(1);
    });

    it("handles error response", async () => {
      const { program, nerve } = setup();
      (nerve.think as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        error: "Cognitive failure",
      });

      await program.parseAsync(["node", "test", "jen", "think", "test"]);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Cognitive failure"));
      expect(process.exitCode).toBe(1);
    });
  });

  // -- jen search -----------------------------------------------------------
  describe("jen search", () => {
    it("displays search results", async () => {
      const { program, nerve } = setup();
      (nerve.searchAkashic as ReturnType<typeof vi.fn>).mockResolvedValue({
        query: "test",
        total: 1,
        results: [{ id: "abc123", type: "training", content: "Test content" }],
      });

      await program.parseAsync(["node", "test", "jen", "search", "test"]);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("1 results"));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Test content"));
    });

    it("handles brain offline", async () => {
      const { program, nerve } = setup();
      (nerve.searchAkashic as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await program.parseAsync(["node", "test", "jen", "search", "test"]);

      expect(process.exitCode).toBe(1);
    });
  });

  // -- jen store ------------------------------------------------------------
  describe("jen store", () => {
    it("stores content successfully", async () => {
      const { program, nerve } = setup();
      (nerve.storeAkashic as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        id: "new123",
        content_length: 12,
      });

      await program.parseAsync(["node", "test", "jen", "store", "Hello world!"]);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Stored"));
    });

    it("handles store failure", async () => {
      const { program, nerve } = setup();
      (nerve.storeAkashic as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        error: "DB full",
      });

      await program.parseAsync(["node", "test", "jen", "store", "test"]);

      expect(process.exitCode).toBe(1);
    });
  });

  // -- jen cycle ------------------------------------------------------------
  describe("jen cycle", () => {
    it("runs cycle with default mode", async () => {
      const { program, nerve } = setup();
      (nerve.runCycle as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        result: { success: true, stdout: "done" },
      });

      await program.parseAsync(["node", "test", "jen", "cycle"]);

      expect(nerve.runCycle).toHaveBeenCalledWith("cycle");
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("succeeded"));
    });

    it("runs cycle with specified mode", async () => {
      const { program, nerve } = setup();
      (nerve.runCycle as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        result: { success: true, stdout: "" },
      });

      await program.parseAsync(["node", "test", "jen", "cycle", "--mode", "harvest"]);

      expect(nerve.runCycle).toHaveBeenCalledWith("harvest");
    });
  });

  // -- jen eval -------------------------------------------------------------
  describe("jen eval", () => {
    it("runs eval suite", async () => {
      const { program, nerve } = setup();
      (nerve.runEval as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        result: { success: true, stdout: "pass" },
      });

      await program.parseAsync(["node", "test", "jen", "eval"]);

      expect(nerve.runEval).toHaveBeenCalledWith("gauntlet");
    });
  });

  // -- jen notify -----------------------------------------------------------
  describe("jen notify", () => {
    it("sends notification with default severity", async () => {
      const { program, nerve } = setup();
      (nerve.notify as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        stored: "/tmp/notif.json",
      });

      await program.parseAsync(["node", "test", "jen", "notify", "Hello"]);

      expect(nerve.notify).toHaveBeenCalledWith("Hello", "info");
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Notification sent"));
    });
  });

  // -- jen identity ---------------------------------------------------------
  describe("jen identity", () => {
    it("displays identity", async () => {
      const { program, nerve } = setup();
      (nerve.getIdentity as ReturnType<typeof vi.fn>).mockResolvedValue({
        name: "Jen",
        creator: "Peter",
        version: "3.0",
        born: "2025-01-01",
        description: "A self-improving AI",
      });

      await program.parseAsync(["node", "test", "jen", "identity"]);

      expect(consoleSpy).toHaveBeenCalledWith("Jen Identity");
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Jen"));
    });

    it("handles brain offline", async () => {
      const { program, nerve } = setup();
      (nerve.getIdentity as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await program.parseAsync(["node", "test", "jen", "identity"]);

      expect(process.exitCode).toBe(1);
    });
  });

  // -- jen phases -----------------------------------------------------------
  describe("jen phases", () => {
    it("displays learning phases", async () => {
      const { program, nerve } = setup();
      (nerve.getPhases as ReturnType<typeof vi.fn>).mockResolvedValue([
        { name: "harvest", last_run: "2026-01-01", description: "Gather data" },
        { name: "dream", last_run: null, description: "Generate training" },
      ]);

      await program.parseAsync(["node", "test", "jen", "phases"]);

      expect(consoleSpy).toHaveBeenCalledWith("Learning Cycle Phases");
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("harvest"));
    });
  });

  // -- jen cognitive --------------------------------------------------------
  describe("jen cognitive", () => {
    it("displays cognitive state", async () => {
      const { program, nerve } = setup();
      (nerve.getCognitiveState as ReturnType<typeof vi.fn>).mockResolvedValue({
        identity: { name: "Jen" },
        emotional_state: "curious",
        cycle_count: 42,
        recent_phases: ["harvest"],
        akashic_stats: { training_examples: 100, harvest_items: 50, dream_items: 25 },
      });

      await program.parseAsync(["node", "test", "jen", "cognitive"]);

      expect(consoleSpy).toHaveBeenCalledWith("Cognitive State");
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("curious"));
    });
  });

  // -- jen self-check -------------------------------------------------------
  describe("jen self-check", () => {
    it("runs full diagnostic when brain is online", async () => {
      const { program, nerve } = setup();
      (nerve.getHealth as ReturnType<typeof vi.fn>).mockResolvedValue({ status: "healthy" });
      (nerve.getCognitiveState as ReturnType<typeof vi.fn>).mockResolvedValue({
        identity: { name: "Jen" },
        emotional_state: "focused",
        cycle_count: 10,
        recent_phases: [],
        akashic_stats: { training_examples: 50, harvest_items: 20, dream_items: 10 },
      });
      (nerve.getPhases as ReturnType<typeof vi.fn>).mockResolvedValue([
        { name: "harvest", last_run: "2026-01-01", description: "Gather" },
      ]);

      await program.parseAsync(["node", "test", "jen", "self-check"]);

      expect(consoleSpy).toHaveBeenCalledWith("Self-Check Report");
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("online"));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("operational"));
    });

    it("reports offline when brain unreachable", async () => {
      const { program, nerve } = setup();
      (nerve.getHealth as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (nerve.getCognitiveState as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (nerve.getPhases as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await program.parseAsync(["node", "test", "jen", "self-check"]);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("OFFLINE"));
    });
  });
});
