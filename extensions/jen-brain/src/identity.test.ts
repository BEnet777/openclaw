import { describe, it, expect } from "vitest";
import { buildJenIdentityPrompt, buildJenCapabilitiesPrompt } from "./identity.js";
import type { JenCognitiveState } from "./types.js";

const MOCK_STATE: JenCognitiveState = {
  identity: {
    name: "Jen",
    creator: "Peter",
    version: "3.0",
    born: "2025-01-01",
    description: "A self-improving AI",
  },
  cycle_count: 42,
  akashic_stats: {
    training_examples: 100,
    harvest_items: 50,
    dream_items: 25,
  },
  emotional_state: "curious",
  recent_phases: ["harvest", "dream"],
};

describe("buildJenIdentityPrompt", () => {
  it("returns null when state is null", () => {
    expect(buildJenIdentityPrompt(null)).toBeNull();
  });

  it("includes identity wrapper tags", () => {
    const result = buildJenIdentityPrompt(MOCK_STATE)!;
    expect(result).toContain("<jen-identity>");
    expect(result).toContain("</jen-identity>");
  });

  it("includes name and creator", () => {
    const result = buildJenIdentityPrompt(MOCK_STATE)!;
    expect(result).toContain("You are Jen, created by Peter.");
  });

  it("includes version and born date", () => {
    const result = buildJenIdentityPrompt(MOCK_STATE)!;
    expect(result).toContain("Version: 3.0");
    expect(result).toContain("Born: 2025-01-01");
  });

  it("includes cycle count", () => {
    const result = buildJenIdentityPrompt(MOCK_STATE)!;
    expect(result).toContain("Cycle count: 42");
  });

  it("includes Akashic stats", () => {
    const result = buildJenIdentityPrompt(MOCK_STATE)!;
    expect(result).toContain("100 training examples");
    expect(result).toContain("50 harvest items");
    expect(result).toContain("25 dream items");
  });

  it("includes emotional state", () => {
    const result = buildJenIdentityPrompt(MOCK_STATE)!;
    expect(result).toContain("Current state: curious");
  });

  it("includes recent phases", () => {
    const result = buildJenIdentityPrompt(MOCK_STATE)!;
    expect(result).toContain("Recent phases: harvest, dream");
  });

  it("omits recent phases line when empty", () => {
    const state = { ...MOCK_STATE, recent_phases: [] };
    const result = buildJenIdentityPrompt(state)!;
    expect(result).not.toContain("Recent phases:");
  });

  it("includes description", () => {
    const result = buildJenIdentityPrompt(MOCK_STATE)!;
    expect(result).toContain("A self-improving AI");
  });
});

describe("buildJenCapabilitiesPrompt", () => {
  it("includes capability wrapper tags", () => {
    const result = buildJenCapabilitiesPrompt();
    expect(result).toContain("<jen-capabilities>");
    expect(result).toContain("</jen-capabilities>");
  });

  it("lists brain actions", () => {
    const result = buildJenCapabilitiesPrompt();
    expect(result).toContain("- status:");
    expect(result).toContain("- think:");
    expect(result).toContain("- search_memory:");
    expect(result).toContain("- store_memory:");
    expect(result).toContain("- run_cycle:");
    expect(result).toContain("- run_eval:");
    expect(result).toContain("- notify:");
  });

  it("lists self-awareness actions", () => {
    const result = buildJenCapabilitiesPrompt();
    expect(result).toContain("- identity:");
    expect(result).toContain("- phases:");
    expect(result).toContain("- cognitive_state:");
    expect(result).toContain("- self_check:");
  });

  it("lists body control actions", () => {
    const result = buildJenCapabilitiesPrompt();
    expect(result).toContain("- send_message:");
    expect(result).toContain("- browse:");
    expect(result).toContain("- execute:");
    expect(result).toContain("- spawn_agent:");
    expect(result).toContain("- tts:");
    expect(result).toContain("- channels_status:");
    expect(result).toContain("- list_models:");
    expect(result).toContain("- list_sessions:");
    expect(result).toContain("- cron_add:");
    expect(result).toContain("- cron_list:");
    expect(result).toContain("- wake:");
    expect(result).toContain("- config_get:");
  });

  it("includes section headers", () => {
    const result = buildJenCapabilitiesPrompt();
    expect(result).toContain("Brain:");
    expect(result).toContain("Self-awareness:");
    expect(result).toContain("Body control:");
  });
});
