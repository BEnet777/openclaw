/**
 * Jen Brain Agent Tool
 *
 * Registers a multi-action `jen_brain` tool that gives the agent access
 * to Jen's cognitive pipeline, Akashic Record, learning cycles, and more.
 *
 * Uses stringEnum for the action parameter (avoids Type.Union per CLAUDE.md).
 */

import { Type } from "@sinclair/typebox";
import { stringEnum } from "openclaw/plugin-sdk";
import type { JenNerve } from "./nerve.js";

const ACTIONS = [
  "status",
  "think",
  "search_memory",
  "store_memory",
  "run_cycle",
  "run_eval",
  "notify",
] as const;

type Action = (typeof ACTIONS)[number];

const JenBrainToolSchema = Type.Object({
  action: stringEnum(ACTIONS, {
    description:
      "Action to perform: status, think, search_memory, store_memory, run_cycle, run_eval, notify",
  }),
  prompt: Type.Optional(
    Type.String({ description: "Prompt for think action, or text for notify" }),
  ),
  query: Type.Optional(
    Type.String({ description: "Search query for search_memory" }),
  ),
  content: Type.Optional(
    Type.String({ description: "Content to store for store_memory" }),
  ),
  mode: Type.Optional(
    Type.String({ description: "Cycle mode: cycle, harvest, dream, forge" }),
  ),
  suite: Type.Optional(
    Type.String({ description: "Eval suite name (default: gauntlet)" }),
  ),
  severity: Type.Optional(
    Type.String({ description: "Notification severity: info, warn, error" }),
  ),
  limit: Type.Optional(
    Type.Number({ description: "Max results for search_memory (default: 5)" }),
  ),
  context: Type.Optional(
    Type.String({ description: "Additional context for think action" }),
  ),
});

export function createJenBrainTool(nerve: JenNerve) {
  return {
    name: "jen_brain",
    label: "Jen Brain",
    description:
      "Interface with Jen's brain: check status, think deeply, search/store memories in the Akashic Record, run learning cycles, and send notifications.",
    parameters: JenBrainToolSchema,

    async execute(
      _toolCallId: string,
      params: Record<string, unknown>,
    ) {
      const json = (payload: unknown) => ({
        content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
        details: payload,
      });

      const action = String(params.action || "").trim() as Action;

      try {
        switch (action) {
          case "status": {
            const status = await nerve.getStatus();
            if (!status) return json({ error: "Brain offline — cannot retrieve status" });
            return json({
              ok: status.ok,
              akashic: status.akashic_exists,
              training_examples: status.training_examples ?? 0,
              harvest_items: status.harvest_items ?? 0,
              dream_items: status.dream_items ?? 0,
              cycle_runs: status.cycle_runs ?? 0,
              timestamp: status.timestamp,
            });
          }

          case "think": {
            const prompt = String(params.prompt || "").trim();
            if (!prompt) return json({ error: "prompt is required for think action" });
            const ctx = typeof params.context === "string" ? params.context : undefined;
            const result = await nerve.think(prompt, ctx);
            if (!result) return json({ error: "Brain offline — cannot think" });
            return json(result);
          }

          case "search_memory": {
            const query = String(params.query || "").trim();
            if (!query) return json({ error: "query is required for search_memory" });
            const limit =
              typeof params.limit === "number" ? params.limit : 5;
            const result = await nerve.searchAkashic(query, limit);
            if (!result) return json({ error: "Brain offline — cannot search Akashic" });
            return json({
              query: result.query,
              total: result.total,
              results: result.results.map((r) => ({
                id: r.id,
                type: r.type,
                content:
                  r.content.length > 500
                    ? r.content.slice(0, 500) + "..."
                    : r.content,
                category: r.category,
                confidence: r.confidence,
              })),
            });
          }

          case "store_memory": {
            const content = String(params.content || "").trim();
            if (!content) return json({ error: "content is required for store_memory" });
            const result = await nerve.storeAkashic(content);
            if (!result) return json({ error: "Brain offline — cannot store in Akashic" });
            return json(result);
          }

          case "run_cycle": {
            const mode = String(params.mode || "cycle").trim();
            const result = await nerve.runCycle(mode);
            if (!result) return json({ error: "Brain offline — cannot run cycle" });
            return json({
              ok: result.ok,
              stdout_tail: result.result.stdout
                ? result.result.stdout.slice(-1000)
                : "",
              stderr_tail: result.result.stderr
                ? result.result.stderr.slice(-500)
                : "",
            });
          }

          case "run_eval": {
            const suite = String(params.suite || "gauntlet").trim();
            const result = await nerve.runEval(suite);
            if (!result) return json({ error: "Brain offline — cannot run eval" });
            return json({
              ok: result.ok,
              stdout_tail: result.result.stdout
                ? result.result.stdout.slice(-1000)
                : "",
            });
          }

          case "notify": {
            const text = String(params.prompt || "").trim();
            if (!text) return json({ error: "prompt (text) is required for notify" });
            const severity = String(params.severity || "info").trim();
            const result = await nerve.notify(text, severity);
            if (!result) return json({ error: "Brain offline — cannot send notification" });
            return json(result);
          }

          default:
            return json({
              error: `Unknown action: ${action}. Valid: ${ACTIONS.join(", ")}`,
            });
        }
      } catch (err) {
        return json({
          error: err instanceof Error ? err.message : String(err),
        });
      }
    },
  };
}
