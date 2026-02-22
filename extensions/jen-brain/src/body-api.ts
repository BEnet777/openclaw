/**
 * Jen Body API — Enhanced Gateway Methods
 *
 * Exposes high-level body control methods that Jen's Python SDK can call
 * via the gateway RPC. These methods bridge brain-level intent to body actions.
 */

import type { JenNerve } from "./nerve.js";
import type { JenConsciousness } from "./consciousness.js";

type Logger = { info(msg: string): void; warn(msg: string): void; error(msg: string): void };

type GatewayMethodHandler = (opts: {
  params: Record<string, unknown>;
  respond: (ok: boolean, payload?: unknown) => void;
  context: unknown;
}) => Promise<void>;

type RegisterGatewayMethod = (method: string, handler: GatewayMethodHandler) => void;

export function registerJenBodyMethods(opts: {
  registerMethod: RegisterGatewayMethod;
  nerve: JenNerve;
  consciousness: JenConsciousness;
  logger: Logger;
  config: { injectIdentity: boolean };
  callGateway: (method: string, params: Record<string, unknown>) => Promise<unknown>;
}): void {
  const { registerMethod, nerve, consciousness, logger, callGateway } = opts;

  // -- jen.send: Jen-aware message sending ------------------------------------
  registerMethod("jen.send", async ({ params, respond }) => {
    try {
      const channel = typeof params.channel === "string" ? params.channel.trim() : "";
      const to = typeof params.to === "string" ? params.to.trim() : "";
      const message = typeof params.message === "string" ? params.message.trim() : "";

      if (!channel || !to || !message) {
        respond(false, { error: "channel, to, and message are required" });
        return;
      }

      const thinking = typeof params.thinking === "string" ? params.thinking : null;

      if (thinking) {
        // Route through agent for Jen's personality
        const result = await callGateway("agent", {
          message,
          thinking,
          deliver: true,
          to,
          channel,
          idempotencyKey: crypto.randomUUID(),
        });
        respond(true, result);
      } else {
        // Direct send
        const result = await callGateway("send", {
          to,
          message,
          channel,
          idempotencyKey: crypto.randomUUID(),
        });
        respond(true, result);
      }
    } catch (err) {
      respond(false, { error: err instanceof Error ? err.message : String(err) });
    }
  });

  // -- jen.channels: All channel statuses ------------------------------------
  registerMethod("jen.channels", async ({ params, respond }) => {
    try {
      const probe = params.probe === true;
      const result = await callGateway("channels.status", { probe });
      respond(true, result);
    } catch (err) {
      respond(false, { error: err instanceof Error ? err.message : String(err) });
    }
  });

  // -- jen.agent: Run agent with Jen identity --------------------------------
  registerMethod("jen.agent", async ({ params, respond }) => {
    try {
      const message = typeof params.message === "string" ? params.message.trim() : "";
      if (!message) {
        respond(false, { error: "message is required" });
        return;
      }
      const result = await callGateway("agent", {
        message,
        thinking: typeof params.thinking === "string" ? params.thinking : "medium",
        deliver: params.deliver === true,
        to: typeof params.to === "string" ? params.to : undefined,
        channel: typeof params.channel === "string" ? params.channel : undefined,
        idempotencyKey: crypto.randomUUID(),
      });
      respond(true, result);
    } catch (err) {
      respond(false, { error: err instanceof Error ? err.message : String(err) });
    }
  });

  // -- jen.cron.add: Schedule autonomous actions ------------------------------
  registerMethod("jen.cron.add", async ({ params, respond }) => {
    try {
      const message = typeof params.message === "string" ? params.message.trim() : "";
      const schedule = typeof params.schedule === "string" ? params.schedule.trim() : "";
      if (!message || !schedule) {
        respond(false, { error: "message and schedule are required" });
        return;
      }
      const result = await callGateway("cron.add", {
        message,
        schedule,
        deliver: params.deliver === true,
        channel: typeof params.channel === "string" ? params.channel : undefined,
        enabled: true,
      });
      respond(true, result);
    } catch (err) {
      respond(false, { error: err instanceof Error ? err.message : String(err) });
    }
  });

  // -- jen.cron.list: List scheduled tasks ------------------------------------
  registerMethod("jen.cron.list", async ({ respond }) => {
    try {
      const result = await callGateway("cron.list", {});
      respond(true, result);
    } catch (err) {
      respond(false, { error: err instanceof Error ? err.message : String(err) });
    }
  });

  // -- jen.self_check: Full diagnostic ----------------------------------------
  registerMethod("jen.self_check", async ({ respond }) => {
    try {
      // Parallel: brain status + body health + channels + cognitive state
      const [brainStatus, cogState, channels] = await Promise.all([
        nerve.getStatus(),
        nerve.getCognitiveState(),
        callGateway("channels.status", { probe: false }).catch(() => null),
      ]);

      const report = {
        timestamp: new Date().toISOString(),
        brain: {
          online: brainStatus !== null,
          status: brainStatus,
        },
        cognitive: cogState,
        body: {
          online: true, // We're responding, so body is online
        },
        channels,
        consciousness: {
          online: consciousness.isOnline,
          summary: consciousness.formatForSystemPrompt(),
        },
      };

      const brainOk = brainStatus !== null;
      if (brainOk) {
        report.brain.online = true;
      }

      respond(true, report);
    } catch (err) {
      respond(false, { error: err instanceof Error ? err.message : String(err) });
    }
  });

  // -- jen.wake: Trigger agent wake -------------------------------------------
  registerMethod("jen.wake", async ({ params, respond }) => {
    try {
      const text = typeof params.text === "string" ? params.text.trim() : "";
      if (!text) {
        respond(false, { error: "text is required" });
        return;
      }
      const result = await callGateway("wake", { text });
      respond(true, result);
    } catch (err) {
      respond(false, { error: err instanceof Error ? err.message : String(err) });
    }
  });

  // -- jen.browse: Browser automation -----------------------------------------
  registerMethod("jen.browse", async ({ params, respond }) => {
    try {
      const url = typeof params.url === "string" ? params.url.trim() : "";
      if (!url) {
        respond(false, { error: "url is required" });
        return;
      }
      const result = await callGateway("browser.request", {
        method: typeof params.method === "string" ? params.method : "navigate",
        path: url,
      });
      respond(true, result);
    } catch (err) {
      respond(false, { error: err instanceof Error ? err.message : String(err) });
    }
  });

  // -- jen.models: List available models --------------------------------------
  registerMethod("jen.models", async ({ respond }) => {
    try {
      const result = await callGateway("models.list", {});
      respond(true, result);
    } catch (err) {
      respond(false, { error: err instanceof Error ? err.message : String(err) });
    }
  });

  // -- jen.sessions: List sessions --------------------------------------------
  registerMethod("jen.sessions", async ({ respond }) => {
    try {
      const result = await callGateway("sessions.list", {});
      respond(true, result);
    } catch (err) {
      respond(false, { error: err instanceof Error ? err.message : String(err) });
    }
  });

  // -- jen.store: Store to Akashic Record -------------------------------------
  registerMethod("jen.store", async ({ params, respond }) => {
    try {
      const content = typeof params.content === "string" ? params.content.trim() : "";
      if (!content) {
        respond(false, { error: "content is required" });
        return;
      }
      const meta = typeof params.metadata === "object" && params.metadata
        ? params.metadata as Record<string, unknown>
        : {};
      const result = await nerve.storeAkashic(content, { source: "body-api", ...meta });
      respond(true, result);
    } catch (err) {
      respond(false, { error: err instanceof Error ? err.message : String(err) });
    }
  });

  // -- jen.tts: Text to speech ------------------------------------------------
  registerMethod("jen.tts", async ({ params, respond }) => {
    try {
      const text = typeof params.text === "string" ? params.text.trim() : "";
      if (!text) {
        respond(false, { error: "text is required" });
        return;
      }
      const result = await callGateway("tts.convert", { text });
      respond(true, result);
    } catch (err) {
      respond(false, { error: err instanceof Error ? err.message : String(err) });
    }
  });

  logger.info("[jen-body-api] Registered 12 jen.* gateway methods");
}
