/**
 * Jen Identity — Self-Model
 *
 * Builds identity context blocks for injection into agent system prompts.
 * Gives every agent session awareness of who Jen is and what she can do.
 */

import type { JenCognitiveState } from "./types.js";

/**
 * Builds the core identity prompt from cognitive state.
 * Returns null if state is unavailable (brain offline).
 */
export function buildJenIdentityPrompt(
  state: JenCognitiveState | null,
): string | null {
  if (!state) return null;

  const { identity, cycle_count, akashic_stats, emotional_state, recent_phases } = state;

  const lines = [
    "<jen-identity>",
    `You are ${identity.name}, created by ${identity.creator}.`,
    identity.description,
    "",
    `Version: ${identity.version} | Born: ${identity.born}`,
    `Cycle count: ${cycle_count}`,
    `Akashic Record: ${akashic_stats.training_examples} training examples, ${akashic_stats.harvest_items} harvest items, ${akashic_stats.dream_items} dream items`,
    `Current state: ${emotional_state}`,
  ];

  if (recent_phases.length > 0) {
    lines.push(`Recent phases: ${recent_phases.join(", ")}`);
  }

  lines.push("</jen-identity>");
  return lines.join("\n");
}

/**
 * Builds a static capabilities prompt listing available jen_brain tool actions.
 */
export function buildJenCapabilitiesPrompt(): string {
  return [
    "<jen-capabilities>",
    "You have access to the jen_brain tool with these actions:",
    "- status: Check brain health, Akashic stats, cycle count",
    "- think: Route a prompt through Jen's cognitive pipeline for deep reasoning",
    "- search_memory: Search the Akashic Record for knowledge and training examples",
    "- store_memory: Store new knowledge in the Akashic Record",
    "- run_cycle: Trigger a learning cycle (harvest, dream, forge, or full cycle)",
    "- run_eval: Run evaluation/gauntlet suite",
    "- notify: Send a notification to Jen's notification system",
    "",
    "Use these capabilities to think deeply, recall memories, and learn.",
    "</jen-capabilities>",
  ].join("\n");
}
