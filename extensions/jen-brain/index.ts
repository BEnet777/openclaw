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

    // -- Tool: jen_brain (7 actions) ------------------------------------------
    api.registerTool(createJenBrainTool(nerve), { optional: true });

    // -- CLI: openclaw jen <subcommand> (8 commands) --------------------------
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

    // -- Extended body methods: jen.send/channels/agent/cron/browse/etc -------
    // These let Jen's Python SDK control the full body via gateway RPC
    registerJenBodyMethods({
      registerMethod: api.registerGatewayMethod.bind(api),
      nerve,
      consciousness,
      logger: api.logger,
      config,
      callGateway: async (method: string, params: Record<string, unknown>) => {
        // Use the plugin runtime to invoke other gateway methods internally
        const rt = api.runtime as { gateway?: { invoke(m: string, p: unknown): Promise<unknown> } };
        if (rt.gateway?.invoke) {
          return await rt.gateway.invoke(method, params);
        }
        throw new Error(`Gateway runtime not available for internal call: ${method}`);
      },
    });

    // -- Background service: consciousness polling ----------------------------
    api.registerService(createJenBrainService({ consciousness, config, logger: api.logger }));

    api.logger.info("[jen-brain] Plugin fully registered — Jen's mind and body are one");
  },
};

export default jenBrainPlugin;
