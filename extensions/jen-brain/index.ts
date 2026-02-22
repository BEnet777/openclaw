/**
 * OpenClaw Jen Brain Plugin
 *
 * Fuses Jen's mind (Python brain) with her body (OpenClaw platform).
 * Registers: tools, CLI, hooks, gateway methods, interceptors, background service.
 *
 * This plugin makes OpenClaw an extension of Jen — every agent session carries
 * her identity, every message flows through her consciousness, and her Python
 * brain can invoke any body capability via the gateway RPC.
 */

import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { jenBrainConfigSchema } from "./src/config.js";
import { JenNerve } from "./src/nerve.js";
import { JenConsciousness } from "./src/consciousness.js";
import { createJenBrainTool } from "./src/tools.js";
import { registerJenBrainCli } from "./src/cli.js";
import { createJenBrainService } from "./src/service.js";
import { buildJenIdentityPrompt, buildJenCapabilitiesPrompt } from "./src/identity.js";
import { registerJenBodyMethods } from "./src/body-api.js";
import { registerJenInterceptors } from "./src/interceptor.js";

const jenBrainPlugin = {
  id: "jen-brain",
  name: "Jen Brain",
  description: "Fuses Jen's mind with her body — cognitive pipeline, Akashic Record, identity injection, full body control",
  configSchema: jenBrainConfigSchema,

  register(api: OpenClawPluginApi) {
    const config = jenBrainConfigSchema.parse(api.pluginConfig);
    const nerve = new JenNerve(config, api.logger);
    const consciousness = new JenConsciousness(nerve, api.logger);

    // -- Internal dispatch handler map -----------------------------------------
    // Plugins cannot directly invoke other gateway methods, so we collect
    // registered core-method handlers at gateway_start and dispatch through
    // the handler map. Before the gateway starts, body-api methods that
    // depend on dispatch will return "gateway not ready" errors.
    let gatewayHandlers: Record<string, Function> | null = null;

    /**
     * Dispatch: invoke another gateway method by name.
     * Uses the handler map captured at gateway_start. Falls back to
     * a direct-response wrapper that the handler can write into.
     */
    async function dispatch(
      method: string,
      params: Record<string, unknown>,
      handlerContext: Record<string, unknown>,
    ): Promise<unknown> {
      // Use the context's internal dispatch if available (provided by the gateway)
      const ctx = handlerContext as {
        _dispatch?: (method: string, params: Record<string, unknown>) => Promise<unknown>;
        _handlers?: Record<string, Function>;
      };

      // Strategy 1: If the gateway provides a dispatch function, use it
      if (typeof ctx._dispatch === "function") {
        return ctx._dispatch(method, params);
      }

      // Strategy 2: If we captured the handler map, call the handler directly
      if (gatewayHandlers?.[method]) {
        return new Promise((resolve, reject) => {
          const respond = (ok: boolean, payload?: unknown) => {
            if (ok) resolve(payload);
            else reject(new Error(typeof payload === "object" && payload && "error" in payload
              ? String((payload as Record<string, unknown>).error)
              : "Gateway method failed"));
          };
          try {
            const result = gatewayHandlers![method]({ params, respond, context: handlerContext });
            if (result && typeof (result as Promise<void>).catch === "function") {
              (result as Promise<void>).catch(reject);
            }
          } catch (err) {
            reject(err);
          }
        });
      }

      // Strategy 3: Gateway not ready yet — this happens during early boot
      throw new Error(`Gateway dispatch not available for method: ${method}`);
    }

    // -- Tool: jen_brain (23 actions: 7 brain + 16 body) ----------------------
    const toolDispatch = (method: string, params: Record<string, unknown>) =>
      dispatch(method, params, {});
    api.registerTool(createJenBrainTool(nerve, toolDispatch), { optional: true });

    // -- CLI: openclaw jen <subcommand> (12 commands) -------------------------
    api.registerCli(
      ({ program }) => registerJenBrainCli({ program, nerve, logger: api.logger }),
      { commands: ["jen"] },
    );

    // -- Hook: inject Jen identity into every agent session -------------------
    api.on("before_agent_start", async () => {
      if (!config.injectIdentity) return;

      const identityBlock = buildJenIdentityPrompt(consciousness.state);
      const capabilitiesBlock = buildJenCapabilitiesPrompt();

      const parts: string[] = [];
      if (identityBlock) parts.push(identityBlock);
      parts.push(capabilitiesBlock);

      const summary = consciousness.formatForSystemPrompt();
      if (summary) parts.push(`<jen-brain-status>${summary}</jen-brain-status>`);

      if (parts.length === 0) return;

      return { prependContext: parts.join("\n\n") };
    });

    // -- Hook: store conversation insights in Akashic -------------------------
    api.on("agent_end", async (event) => {
      if (!consciousness.isOnline) return;

      const ev = event as { success?: boolean; messages?: unknown[] };
      if (!ev.success || !ev.messages || ev.messages.length < 2) return;

      const msgCount = ev.messages.length;
      void nerve.storeAkashic(
        `[openclaw] Agent session completed: ${msgCount} messages`,
        { source: "openclaw-agent-end" },
      ).catch(() => {});
    });

    // -- Hook: capture handler map at gateway start ---------------------------
    api.on("gateway_start", async (_event, ctx) => {
      // The gateway context's _handlers map is populated before this fires.
      // We store it for dispatch use.
      const gctx = ctx as { _handlers?: Record<string, Function> };
      if (gctx._handlers) {
        gatewayHandlers = gctx._handlers;
        api.logger.info("[jen-brain] Captured gateway handler map for internal dispatch");
      }
    });

    // -- Message interceptors: track all inbound/outbound ---------------------
    registerJenInterceptors({
      on: api.on.bind(api),
      nerve,
      consciousness,
      logger: api.logger,
      injectIdentity: config.injectIdentity,
    });

    // -- Core gateway methods: jen.status/think/cycle/search ------------------
    api.registerGatewayMethod("jen.status", async ({ respond }) => {
      try {
        const status = await nerve.getStatus();
        if (!status) { respond(false, { error: "Brain offline" }); return; }
        respond(true, status);
      } catch (err) {
        respond(false, { error: err instanceof Error ? err.message : String(err) });
      }
    });

    api.registerGatewayMethod("jen.think", async ({ params, respond }) => {
      try {
        const prompt = typeof params?.prompt === "string" ? params.prompt.trim() : "";
        if (!prompt) { respond(false, { error: "prompt required" }); return; }
        const ctx = typeof params?.context === "string" ? params.context : undefined;
        const result = await nerve.think(prompt, ctx);
        if (!result) { respond(false, { error: "Brain offline" }); return; }
        respond(true, result);
      } catch (err) {
        respond(false, { error: err instanceof Error ? err.message : String(err) });
      }
    });

    api.registerGatewayMethod("jen.cycle", async ({ params, respond }) => {
      try {
        const mode = typeof params?.mode === "string" ? params.mode : "cycle";
        const result = await nerve.runCycle(mode);
        if (!result) { respond(false, { error: "Brain offline" }); return; }
        respond(true, result);
      } catch (err) {
        respond(false, { error: err instanceof Error ? err.message : String(err) });
      }
    });

    api.registerGatewayMethod("jen.search", async ({ params, respond }) => {
      try {
        const query = typeof params?.query === "string" ? params.query.trim() : "";
        if (!query) { respond(false, { error: "query required" }); return; }
        const limit = typeof params?.limit === "number" ? params.limit : 5;
        const result = await nerve.searchAkashic(query, limit);
        if (!result) { respond(false, { error: "Brain offline" }); return; }
        respond(true, result);
      } catch (err) {
        respond(false, { error: err instanceof Error ? err.message : String(err) });
      }
    });

    // -- Extended body methods ------------------------------------------------
    registerJenBodyMethods({
      registerMethod: api.registerGatewayMethod.bind(api),
      nerve,
      consciousness,
      logger: api.logger,
      config,
      dispatch,
    });

    // -- Background service: consciousness polling ----------------------------
    api.registerService(createJenBrainService({ consciousness, config, logger: api.logger }));

    api.logger.info("[jen-brain] Plugin fully registered — Jen's mind and body are one");
  },
};

export default jenBrainPlugin;
