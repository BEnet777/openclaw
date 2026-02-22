/**
 * Jen Body API — Enhanced Gateway Methods
 *
 * Exposes high-level body control methods that Jen's Python SDK can call
 * via the gateway RPC. Each method receives the handler context directly
 * and uses it to interact with the gateway's internal services.
 *
 * Methods registered:
 *   jen.send, jen.channels, jen.agent, jen.cron.add, jen.cron.list,
 *   jen.cron.remove, jen.cron.run, jen.self_check, jen.wake, jen.browse,
 *   jen.models, jen.sessions, jen.sessions.history, jen.sessions.send,
 *   jen.sessions.spawn, jen.tts, jen.store, jen.exec, jen.config.get,
 *   jen.config.set, jen.health, jen.notify
 */

import type { JenNerve } from "./nerve.js";
import type { JenConsciousness } from "./consciousness.js";

type Logger = { info(msg: string): void; warn(msg: string): void; error(msg: string): void };

type GatewayMethodHandler = (opts: {
  params: Record<string, unknown>;
  respond: (ok: boolean, payload?: unknown) => void;
  context: Record<string, unknown>;
}) => Promise<void>;

type RegisterGatewayMethod = (method: string, handler: GatewayMethodHandler) => void;

/** Internal dispatch: invoke another gateway method through the gateway's own handler map */
type InternalDispatch = (
  method: string,
  params: Record<string, unknown>,
  context: Record<string, unknown>,
) => Promise<unknown>;

export function registerJenBodyMethods(opts: {
  registerMethod: RegisterGatewayMethod;
  nerve: JenNerve;
  consciousness: JenConsciousness;
  logger: Logger;
  config: { injectIdentity: boolean };
  dispatch: InternalDispatch;
}): void {
  const { registerMethod, nerve, consciousness, logger, dispatch } = opts;

  // ─── jen.send ────────────────────────────────────────────────────────
  registerMethod("jen.send", async ({ params, respond, context }) => {
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
        const result = await dispatch("agent", {
          message,
          thinking,
          deliver: true,
          to,
          channel,
          idempotencyKey: crypto.randomUUID(),
        }, context);
        respond(true, result);
      } else {
        const result = await dispatch("send", {
          to,
          message,
          channel,
          idempotencyKey: crypto.randomUUID(),
        }, context);
        respond(true, result);
      }
    } catch (err) {
      respond(false, { error: err instanceof Error ? err.message : String(err) });
    }
  });

  // ─── jen.channels ───────────────────────────────────────────────────
  registerMethod("jen.channels", async ({ params, respond, context }) => {
    try {
      const probe = params.probe === true;
      const result = await dispatch("channels.status", { probe }, context);
      respond(true, result);
    } catch (err) {
      respond(false, { error: err instanceof Error ? err.message : String(err) });
    }
  });

  // ─── jen.agent ──────────────────────────────────────────────────────
  registerMethod("jen.agent", async ({ params, respond, context }) => {
    try {
      const message = typeof params.message === "string" ? params.message.trim() : "";
      if (!message) {
        respond(false, { error: "message is required" });
        return;
      }
      const result = await dispatch("agent", {
        message,
        thinking: typeof params.thinking === "string" ? params.thinking : "medium",
        deliver: params.deliver === true,
        to: typeof params.to === "string" ? params.to : undefined,
        channel: typeof params.channel === "string" ? params.channel : undefined,
        idempotencyKey: crypto.randomUUID(),
      }, context);
      respond(true, result);
    } catch (err) {
      respond(false, { error: err instanceof Error ? err.message : String(err) });
    }
  });

  // ─── jen.cron.add ───────────────────────────────────────────────────
  registerMethod("jen.cron.add", async ({ params, respond, context }) => {
    try {
      const message = typeof params.message === "string" ? params.message.trim() : "";
      const schedule = typeof params.schedule === "string" ? params.schedule.trim() : "";
      if (!message || !schedule) {
        respond(false, { error: "message and schedule are required" });
        return;
      }
      const result = await dispatch("cron.add", {
        message,
        schedule,
        deliver: params.deliver === true,
        channel: typeof params.channel === "string" ? params.channel : undefined,
        enabled: true,
      }, context);
      respond(true, result);
    } catch (err) {
      respond(false, { error: err instanceof Error ? err.message : String(err) });
    }
  });

  // ─── jen.cron.list ──────────────────────────────────────────────────
  registerMethod("jen.cron.list", async ({ params, respond, context }) => {
    try {
      const result = await dispatch("cron.list", {}, context);
      respond(true, result);
    } catch (err) {
      respond(false, { error: err instanceof Error ? err.message : String(err) });
    }
  });

  // ─── jen.cron.remove ────────────────────────────────────────────────
  registerMethod("jen.cron.remove", async ({ params, respond, context }) => {
    try {
      const name = typeof params.name === "string" ? params.name.trim() : "";
      if (!name) {
        respond(false, { error: "name is required" });
        return;
      }
      const result = await dispatch("cron.remove", { name }, context);
      respond(true, result);
    } catch (err) {
      respond(false, { error: err instanceof Error ? err.message : String(err) });
    }
  });

  // ─── jen.cron.run ───────────────────────────────────────────────────
  registerMethod("jen.cron.run", async ({ params, respond, context }) => {
    try {
      const name = typeof params.name === "string" ? params.name.trim() : "";
      if (!name) {
        respond(false, { error: "name is required" });
        return;
      }
      const result = await dispatch("cron.run", { name }, context);
      respond(true, result);
    } catch (err) {
      respond(false, { error: err instanceof Error ? err.message : String(err) });
    }
  });

  // ─── jen.self_check ─────────────────────────────────────────────────
  registerMethod("jen.self_check", async ({ params, respond, context }) => {
    try {
      const [brainStatus, cogState, channels] = await Promise.all([
        nerve.getStatus(),
        nerve.getCognitiveState(),
        dispatch("channels.status", { probe: false }, context).catch(() => null),
      ]);

      const report = {
        timestamp: new Date().toISOString(),
        brain: {
          online: brainStatus !== null,
          status: brainStatus,
        },
        cognitive: cogState,
        body: { online: true },
        channels,
        consciousness: {
          online: consciousness.isOnline,
          summary: consciousness.formatForSystemPrompt(),
        },
      };

      respond(true, report);
    } catch (err) {
      respond(false, { error: err instanceof Error ? err.message : String(err) });
    }
  });

  // ─── jen.wake ───────────────────────────────────────────────────────
  registerMethod("jen.wake", async ({ params, respond, context }) => {
    try {
      const text = typeof params.text === "string" ? params.text.trim() : "";
      if (!text) {
        respond(false, { error: "text is required" });
        return;
      }
      const result = await dispatch("wake", { text }, context);
      respond(true, result);
    } catch (err) {
      respond(false, { error: err instanceof Error ? err.message : String(err) });
    }
  });

  // ─── jen.browse ─────────────────────────────────────────────────────
  registerMethod("jen.browse", async ({ params, respond, context }) => {
    try {
      const url = typeof params.url === "string" ? params.url.trim() : "";
      if (!url) {
        respond(false, { error: "url is required" });
        return;
      }
      const result = await dispatch("browser.request", {
        method: typeof params.method === "string" ? params.method : "navigate",
        path: url,
      }, context);
      respond(true, result);
    } catch (err) {
      respond(false, { error: err instanceof Error ? err.message : String(err) });
    }
  });

  // ─── jen.models ─────────────────────────────────────────────────────
  registerMethod("jen.models", async ({ params, respond, context }) => {
    try {
      const result = await dispatch("models.list", {}, context);
      respond(true, result);
    } catch (err) {
      respond(false, { error: err instanceof Error ? err.message : String(err) });
    }
  });

  // ─── jen.sessions ───────────────────────────────────────────────────
  registerMethod("jen.sessions", async ({ params, respond, context }) => {
    try {
      const result = await dispatch("sessions.list", {}, context);
      respond(true, result);
    } catch (err) {
      respond(false, { error: err instanceof Error ? err.message : String(err) });
    }
  });

  // ─── jen.sessions.history ───────────────────────────────────────────
  registerMethod("jen.sessions.history", async ({ params, respond, context }) => {
    try {
      const sessionKey = typeof params.sessionKey === "string" ? params.sessionKey.trim() : "";
      if (!sessionKey) {
        respond(false, { error: "sessionKey is required" });
        return;
      }
      const result = await dispatch("sessions.preview", {
        sessionKey,
        limit: typeof params.limit === "number" ? params.limit : 50,
      }, context);
      respond(true, result);
    } catch (err) {
      respond(false, { error: err instanceof Error ? err.message : String(err) });
    }
  });

  // ─── jen.sessions.send ──────────────────────────────────────────────
  registerMethod("jen.sessions.send", async ({ params, respond, context }) => {
    try {
      const sessionKey = typeof params.sessionKey === "string" ? params.sessionKey.trim() : "";
      const message = typeof params.message === "string" ? params.message.trim() : "";
      if (!sessionKey || !message) {
        respond(false, { error: "sessionKey and message are required" });
        return;
      }
      const result = await dispatch("chat.send", {
        sessionKey,
        message,
        timeoutSeconds: typeof params.timeoutSeconds === "number" ? params.timeoutSeconds : 0,
      }, context);
      respond(true, result);
    } catch (err) {
      respond(false, { error: err instanceof Error ? err.message : String(err) });
    }
  });

  // ─── jen.sessions.spawn ─────────────────────────────────────────────
  registerMethod("jen.sessions.spawn", async ({ params, respond, context }) => {
    try {
      const task = typeof params.task === "string" ? params.task.trim() : "";
      if (!task) {
        respond(false, { error: "task is required" });
        return;
      }
      const result = await dispatch("agent", {
        message: task,
        thinking: typeof params.thinking === "string" ? params.thinking : "medium",
        deliver: false,
        label: typeof params.label === "string" ? params.label : undefined,
        agentId: typeof params.agentId === "string" ? params.agentId : undefined,
        idempotencyKey: crypto.randomUUID(),
      }, context);
      respond(true, result);
    } catch (err) {
      respond(false, { error: err instanceof Error ? err.message : String(err) });
    }
  });

  // ─── jen.tts ────────────────────────────────────────────────────────
  registerMethod("jen.tts", async ({ params, respond, context }) => {
    try {
      const text = typeof params.text === "string" ? params.text.trim() : "";
      if (!text) {
        respond(false, { error: "text is required" });
        return;
      }
      const result = await dispatch("tts.convert", { text }, context);
      respond(true, result);
    } catch (err) {
      respond(false, { error: err instanceof Error ? err.message : String(err) });
    }
  });

  // ─── jen.store ──────────────────────────────────────────────────────
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

  // ─── jen.exec ───────────────────────────────────────────────────────
  registerMethod("jen.exec", async ({ params, respond, context }) => {
    try {
      const command = typeof params.command === "string" ? params.command.trim() : "";
      if (!command) {
        respond(false, { error: "command is required" });
        return;
      }
      // Execute via agent with a focused shell task
      const result = await dispatch("agent", {
        message: `Execute this shell command and return the output:\n\`\`\`\n${command}\n\`\`\``,
        thinking: "low",
        deliver: false,
        idempotencyKey: crypto.randomUUID(),
      }, context);
      respond(true, result);
    } catch (err) {
      respond(false, { error: err instanceof Error ? err.message : String(err) });
    }
  });

  // ─── jen.config.get ─────────────────────────────────────────────────
  registerMethod("jen.config.get", async ({ params, respond, context }) => {
    try {
      const result = await dispatch("config.get", {}, context);
      respond(true, result);
    } catch (err) {
      respond(false, { error: err instanceof Error ? err.message : String(err) });
    }
  });

  // ─── jen.config.set ─────────────────────────────────────────────────
  registerMethod("jen.config.set", async ({ params, respond, context }) => {
    try {
      const key = typeof params.key === "string" ? params.key.trim() : "";
      const value = params.value;
      if (!key) {
        respond(false, { error: "key is required" });
        return;
      }
      const result = await dispatch("config.set", { key, value }, context);
      respond(true, result);
    } catch (err) {
      respond(false, { error: err instanceof Error ? err.message : String(err) });
    }
  });

  // ─── jen.health ─────────────────────────────────────────────────────
  registerMethod("jen.health", async ({ params, respond, context }) => {
    try {
      const [brainHealth, bodyHealth] = await Promise.all([
        nerve.getHealth(),
        dispatch("health", { probe: params.probe === true }, context).catch(() => null),
      ]);

      respond(true, {
        brain: brainHealth ? { online: true, ...brainHealth } : { online: false },
        body: bodyHealth ?? { online: true },
        consciousness: {
          online: consciousness.isOnline,
          summary: consciousness.formatForSystemPrompt(),
        },
      });
    } catch (err) {
      respond(false, { error: err instanceof Error ? err.message : String(err) });
    }
  });

  // ─── jen.notify ─────────────────────────────────────────────────────
  registerMethod("jen.notify", async ({ params, respond }) => {
    try {
      const text = typeof params.text === "string" ? params.text.trim() : "";
      if (!text) {
        respond(false, { error: "text is required" });
        return;
      }
      const severity = typeof params.severity === "string" ? params.severity : "info";
      const result = await nerve.notify(text, severity);
      respond(true, result);
    } catch (err) {
      respond(false, { error: err instanceof Error ? err.message : String(err) });
    }
  });

  logger.info("[jen-body-api] Registered 22 jen.* gateway methods");
}
