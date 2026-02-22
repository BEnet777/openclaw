/**
 * Jen Message Interceptor — Identity Infusion
 *
 * Hooks into the message lifecycle to:
 * 1. Enrich inbound messages with Jen's cognitive context
 * 2. Log outbound messages for learning
 * 3. Track conversation patterns for Akashic harvesting
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

    // Log inbound message metadata for pattern tracking (non-blocking)
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
      // Store conversation turn for future training data harvesting
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

  logger.info("[jen-interceptor] Message interceptors registered");
}
