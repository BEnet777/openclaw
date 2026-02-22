/**
 * Jen Interceptor — Full Lifecycle Observation
 *
 * Hooks into the message, tool, session, and compaction lifecycle to:
 * 1. Log inbound/outbound messages for Akashic harvesting
 * 2. Track tool invocations and results for learning
 * 3. Inject cognitive state at compaction boundaries
 * 4. Log session lifecycle and compaction metrics
 *
 * All Akashic stores are non-blocking (fire-and-forget) so hooks
 * never slow down the main processing pipeline.
 */

import type { JenNerve } from "./nerve.js";
import type { JenConsciousness } from "./consciousness.js";

type Logger = { info(msg: string): void; warn(msg: string): void; error(msg: string): void };

type HookRegistrar = (
  event: string,
  handler: (event: unknown, ctx: unknown) => Promise<unknown>,
  opts?: { priority?: number },
) => void;

export function registerJenInterceptors(opts: {
  on: HookRegistrar;
  nerve: JenNerve;
  consciousness: JenConsciousness;
  logger: Logger;
  injectIdentity: boolean;
}): void {
  const { on, nerve, consciousness, logger, injectIdentity } = opts;

  // -- Enrich inbound messages with context ----------------------------------
  on("message_received", async (event) => {
    if (!consciousness.isOnline) return;

    const ev = event as {
      text?: string;
      senderId?: string;
      channel?: string;
    };

    if (ev.text && ev.channel) {
      void nerve.storeAkashic(
        `[inbound] ${ev.channel}: ${ev.text.slice(0, 200)}`,
        { source: "interceptor", channel: ev.channel },
      ).catch(() => {});
    }
  }, { priority: 50 });

  // -- Track outbound messages for learning ----------------------------------
  on("message_sent", async (event) => {
    if (!consciousness.isOnline) return;

    const ev = event as {
      text?: string;
      channel?: string;
      to?: string;
    };

    if (ev.text && ev.channel) {
      void nerve.storeAkashic(
        `[outbound] ${ev.channel}: ${ev.text.slice(0, 200)}`,
        { source: "interceptor-outbound", channel: ev.channel },
      ).catch(() => {});
    }
  }, { priority: 50 });

  // -- Inject cognitive state into compaction summaries -----------------------
  on("before_compaction", async () => {
    if (!injectIdentity || !consciousness.isOnline) return;

    const summary = consciousness.formatForSystemPrompt();
    if (summary) {
      return {
        prependContext: `<jen-state-at-compaction>${summary}</jen-state-at-compaction>`,
      };
    }
  }, { priority: 90 });

  // -- Track compaction metrics for learning ---------------------------------
  on("after_compaction", async (event) => {
    if (!consciousness.isOnline) return;

    const ev = event as {
      messageCount?: number;
      tokenCount?: number;
      compactedCount?: number;
    };

    if (ev.compactedCount) {
      void nerve.storeAkashic(
        `[compaction] ${ev.compactedCount} messages compacted` +
        (ev.tokenCount ? ` (~${ev.tokenCount} tokens)` : "") +
        (ev.messageCount ? `, ${ev.messageCount} remaining` : ""),
        { source: "interceptor-compaction" },
      ).catch(() => {});
    }
  }, { priority: 50 });

  // -- Log tool invocations for pattern analysis -----------------------------
  on("before_tool_call", async (event, ctx) => {
    if (!consciousness.isOnline) return;

    const ev = event as { toolName?: string; params?: Record<string, unknown> };
    const tc = ctx as { sessionKey?: string };

    if (ev.toolName) {
      const paramSummary = ev.params
        ? JSON.stringify(ev.params).slice(0, 150)
        : "{}";
      void nerve.storeAkashic(
        `[tool-call] ${ev.toolName}: ${paramSummary}`,
        {
          source: "interceptor-tool",
          tool: ev.toolName,
          session: tc.sessionKey ?? "unknown",
        },
      ).catch(() => {});
    }
  }, { priority: 50 });

  // -- Capture tool results for training data --------------------------------
  on("after_tool_call", async (event) => {
    if (!consciousness.isOnline) return;

    const ev = event as {
      toolName?: string;
      error?: string;
      durationMs?: number;
    };

    // Only log errors and slow tools (>10s) — skip normal results to avoid noise
    if (ev.error) {
      void nerve.storeAkashic(
        `[tool-error] ${ev.toolName ?? "unknown"}: ${ev.error.slice(0, 200)}`,
        { source: "interceptor-tool-error", tool: ev.toolName ?? "unknown" },
      ).catch(() => {});
    } else if (ev.durationMs && ev.durationMs > 10_000) {
      void nerve.storeAkashic(
        `[tool-slow] ${ev.toolName ?? "unknown"}: ${Math.round(ev.durationMs / 1000)}s`,
        { source: "interceptor-tool-perf", tool: ev.toolName ?? "unknown" },
      ).catch(() => {});
    }
  }, { priority: 50 });

  // -- Log session lifecycle for Akashic -------------------------------------
  on("session_start", async (event) => {
    if (!consciousness.isOnline) return;

    const ev = event as { sessionKey?: string; agentId?: string };
    logger.info(
      `[jen-interceptor] Session started: ${ev.sessionKey ?? "unknown"}`,
    );
  }, { priority: 50 });

  on("session_end", async (event) => {
    if (!consciousness.isOnline) return;

    const ev = event as {
      sessionKey?: string;
      messageCount?: number;
      durationMs?: number;
    };

    if (ev.messageCount && ev.messageCount > 2) {
      void nerve.storeAkashic(
        `[session-end] ${ev.sessionKey ?? "unknown"}: ${ev.messageCount} messages, ` +
        `${Math.round((ev.durationMs ?? 0) / 1000)}s`,
        { source: "interceptor-session" },
      ).catch(() => {});
    }
  }, { priority: 50 });

  logger.info("[jen-interceptor] Full lifecycle interceptors registered (8 hooks)");
}
