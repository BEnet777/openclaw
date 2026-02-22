/**
 * Jen Brain Agent Tool
 *
 * Registers a multi-action `jen_brain` tool that gives the agent access
 * to Jen's cognitive pipeline, Akashic Record, learning cycles, body
 * control (messaging, browser, cron, sessions, TTS), and self-awareness.
 *
 * Brain actions (status, think, search, store, cycle, eval, notify) go
 * through the JenNerve HTTP client. Body actions (send_message, browse,
 * execute, spawn_agent, etc.) dispatch through the gateway handler map.
 *
 * Uses stringEnum for the action parameter (avoids Type.Union per CLAUDE.md).
 */

import { Type } from "@sinclair/typebox";
import { stringEnum } from "openclaw/plugin-sdk";
import type { JenNerve } from "./nerve.js";

// ── Actions ────────────────────────────────────────────────────────────────────

const BRAIN_ACTIONS = [
  "status",
  "think",
  "search_memory",
  "store_memory",
  "run_cycle",
  "run_eval",
  "notify",
] as const;

const BODY_ACTIONS = [
  "self_check",
  "identity",
  "phases",
  "cognitive_state",
  "send_message",
  "browse",
  "execute",
  "spawn_agent",
  "tts",
  "channels_status",
  "list_models",
  "list_sessions",
  "cron_add",
  "cron_list",
  "wake",
  "config_get",
] as const;

const ACTIONS = [...BRAIN_ACTIONS, ...BODY_ACTIONS] as const;
type Action = (typeof ACTIONS)[number];

export type ToolDispatch = (
  method: string,
  params: Record<string, unknown>,
) => Promise<unknown>;

// ── Schema ─────────────────────────────────────────────────────────────────────

const JenBrainToolSchema = Type.Object({
  action: stringEnum(ACTIONS, {
    description: [
      "Action to perform.",
      "Brain: status, think, search_memory, store_memory, run_cycle, run_eval, notify.",
      "Body: self_check, identity, phases, cognitive_state, send_message, browse,",
      "execute, spawn_agent, tts, channels_status, list_models, list_sessions,",
      "cron_add, cron_list, wake, config_get.",
    ].join(" "),
  }),
  // Brain params
  prompt: Type.Optional(
    Type.String({ description: "Prompt for think, or text for notify" }),
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
  // Body params
  channel: Type.Optional(
    Type.String({ description: "Channel for send_message (telegram, whatsapp, discord, etc.)" }),
  ),
  to: Type.Optional(
    Type.String({ description: "Recipient for send_message (phone, chat ID, etc.)" }),
  ),
  message: Type.Optional(
    Type.String({ description: "Message text for send_message or cron_add" }),
  ),
  thinking: Type.Optional(
    Type.String({ description: "Thinking level for send_message/spawn_agent: low, medium, high" }),
  ),
  url: Type.Optional(
    Type.String({ description: "URL for browse action" }),
  ),
  command: Type.Optional(
    Type.String({ description: "Shell command for execute action" }),
  ),
  task: Type.Optional(
    Type.String({ description: "Task description for spawn_agent" }),
  ),
  text: Type.Optional(
    Type.String({ description: "Text for tts or wake action" }),
  ),
  schedule: Type.Optional(
    Type.String({ description: "Cron expression for cron_add (e.g. '0 9 * * *')" }),
  ),
  path: Type.Optional(
    Type.String({ description: "Config path for config_get" }),
  ),
});

// ── Tool factory ───────────────────────────────────────────────────────────────

export function createJenBrainTool(nerve: JenNerve, dispatch?: ToolDispatch) {
  const json = (payload: unknown) => ({
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
    details: payload,
  });

  const noGateway = () => json({ error: "Gateway not available — body actions require a running gateway" });

  async function dispatchSafe(method: string, params: Record<string, unknown>) {
    if (!dispatch) return noGateway();
    try {
      const result = await dispatch(method, params);
      return json(result);
    } catch (err) {
      return json({ error: err instanceof Error ? err.message : String(err) });
    }
  }

  return {
    name: "jen_brain",
    label: "Jen Brain",
    description: [
      "Interface with Jen's mind and body.",
      "Brain: check status, think deeply, search/store memories in the Akashic Record, run learning cycles, notify.",
      "Body: send messages, browse URLs, execute commands, spawn agents, TTS, manage cron, check channels/models/sessions.",
    ].join(" "),
    parameters: JenBrainToolSchema,

    async execute(
      _toolCallId: string,
      params: Record<string, unknown>,
    ) {
      const action = String(params.action || "").trim() as Action;

      try {
        switch (action) {
          // ── Brain actions ──────────────────────────────────────────────

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
            const q = String(params.query || "").trim();
            if (!q) return json({ error: "query is required for search_memory" });
            const lim = typeof params.limit === "number" ? params.limit : 5;
            const result = await nerve.searchAkashic(q, lim);
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
            const c = String(params.content || "").trim();
            if (!c) return json({ error: "content is required for store_memory" });
            const result = await nerve.storeAkashic(c);
            if (!result) return json({ error: "Brain offline — cannot store in Akashic" });
            return json(result);
          }

          case "run_cycle": {
            const m = String(params.mode || "cycle").trim();
            const result = await nerve.runCycle(m);
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
            const s = String(params.suite || "gauntlet").trim();
            const result = await nerve.runEval(s);
            if (!result) return json({ error: "Brain offline — cannot run eval" });
            return json({
              ok: result.ok,
              stdout_tail: result.result.stdout
                ? result.result.stdout.slice(-1000)
                : "",
            });
          }

          case "notify": {
            const t = String(params.prompt || "").trim();
            if (!t) return json({ error: "prompt (text) is required for notify" });
            const sev = String(params.severity || "info").trim();
            const result = await nerve.notify(t, sev);
            if (!result) return json({ error: "Brain offline — cannot send notification" });
            return json(result);
          }

          // ── Self-awareness actions (nerve) ─────────────────────────────

          case "identity": {
            const id = await nerve.getIdentity();
            if (!id) return json({ error: "Brain offline — cannot retrieve identity" });
            return json(id);
          }

          case "phases": {
            const ph = await nerve.getPhases();
            if (!ph) return json({ error: "Brain offline — cannot retrieve phases" });
            return json(ph);
          }

          case "cognitive_state": {
            const cs = await nerve.getCognitiveState();
            if (!cs) return json({ error: "Brain offline — cannot retrieve cognitive state" });
            return json(cs);
          }

          // ── Body actions (dispatch through gateway) ────────────────────

          case "self_check":
            return dispatchSafe("jen.self_check", {});

          case "send_message": {
            const ch = String(params.channel || "").trim();
            const recipient = String(params.to || "").trim();
            const msg = String(params.message || "").trim();
            if (!ch || !recipient || !msg) {
              return json({ error: "channel, to, and message are required for send_message" });
            }
            const p: Record<string, unknown> = { channel: ch, to: recipient, message: msg };
            if (params.thinking) p.thinking = String(params.thinking);
            return dispatchSafe("jen.send", p);
          }

          case "browse": {
            const u = String(params.url || "").trim();
            if (!u) return json({ error: "url is required for browse" });
            return dispatchSafe("jen.browse", { url: u });
          }

          case "execute": {
            const cmd = String(params.command || "").trim();
            if (!cmd) return json({ error: "command is required for execute" });
            return dispatchSafe("jen.exec", { command: cmd });
          }

          case "spawn_agent": {
            const tsk = String(params.task || "").trim();
            if (!tsk) return json({ error: "task is required for spawn_agent" });
            const p: Record<string, unknown> = { task: tsk };
            if (params.thinking) p.thinking = String(params.thinking);
            return dispatchSafe("jen.sessions.spawn", p);
          }

          case "tts": {
            const txt = String(params.text || "").trim();
            if (!txt) return json({ error: "text is required for tts" });
            return dispatchSafe("jen.tts", { text: txt });
          }

          case "channels_status":
            return dispatchSafe("jen.channels", {});

          case "list_models":
            return dispatchSafe("jen.models", {});

          case "list_sessions":
            return dispatchSafe("jen.sessions", {});

          case "cron_add": {
            const cronMsg = String(params.message || "").trim();
            const cronSched = String(params.schedule || "").trim();
            if (!cronMsg || !cronSched) {
              return json({ error: "message and schedule are required for cron_add" });
            }
            return dispatchSafe("jen.cron.add", { message: cronMsg, schedule: cronSched });
          }

          case "cron_list":
            return dispatchSafe("jen.cron.list", {});

          case "wake": {
            const wt = String(params.text || "").trim();
            if (!wt) return json({ error: "text is required for wake" });
            return dispatchSafe("jen.wake", { text: wt });
          }

          case "config_get": {
            const p: Record<string, unknown> = {};
            if (params.path) p.path = String(params.path);
            return dispatchSafe("jen.config.get", p);
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
