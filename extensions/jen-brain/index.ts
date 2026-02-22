/**
 * OpenClaw Jen Brain Plugin
 *
 * Connects OpenClaw (body) to Jen's Python brain via the Bridge API.
 * Registers: tools, CLI commands, hooks, gateway methods, background service.
 */

import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { jenBrainConfigSchema } from "./src/config.js";
import { JenNerve } from "./src/nerve.js";
import { JenConsciousness } from "./src/consciousness.js";
import { createJenBrainTool } from "./src/tools.js";
import { registerJenBrainCli } from "./src/cli.js";
import { createJenBrainService } from "./src/service.js";
import { buildJenIdentityPrompt, buildJenCapabilitiesPrompt } from "./src/identity.js";

const jenBrainPlugin = {
  id: "jen-brain",
  name: "Jen Brain",
  description: "Connects OpenClaw to Jen's cognitive system (Bridge API, Akashic Record, learning cycles)",
  configSchema: jenBrainConfigSchema,

  register(api: OpenClawPluginApi) {
    const config = jenBrainConfigSchema.parse(api.pluginConfig);
    const nerve = new JenNerve(config, api.logger);
    const consciousness = new JenConsciousness(nerve, api.logger);

    // -- Tool: jen_brain ------------------------------------------------------
    api.registerTool(createJenBrainTool(nerve), { optional: true });

    // -- CLI: openclaw jen <subcommand> ---------------------------------------
    api.registerCli(
      ({ program }) => registerJenBrainCli({ program, nerve, logger: api.logger }),
      { commands: ["jen"] },
    );

    // -- Hook: inject identity into system prompt -----------------------------
    api.on("before_agent_start", async () => {
      if (!config.injectIdentity) return;

      // Use cached state from consciousness (avoids blocking on HTTP)
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

    // -- Hook: optionally store conversation insights -------------------------
    api.on("agent_end", async (event) => {
      if (!consciousness.isOnline) return;

      // Only capture if there were messages and the session succeeded
      const ev = event as { success?: boolean; messages?: unknown[] };
      if (!ev.success || !ev.messages || ev.messages.length < 2) return;

      // Store a brief summary note in Akashic (non-blocking)
      const msgCount = ev.messages.length;
      void nerve.storeAkashic(
        `[openclaw] Agent session completed: ${msgCount} messages`,
        { source: "openclaw-agent-end" },
      ).catch(() => {
        // Silently ignore — brain may have gone offline
      });
    });

    // -- Gateway methods: jen.* -----------------------------------------------
    api.registerGatewayMethod("jen.status", async ({ respond }) => {
      try {
        const status = await nerve.getStatus();
        if (!status) {
          respond(false, { error: "Brain offline" });
          return;
        }
        respond(true, status);
      } catch (err) {
        respond(false, { error: err instanceof Error ? err.message : String(err) });
      }
    });

    api.registerGatewayMethod("jen.think", async ({ params, respond }) => {
      try {
        const prompt = typeof params?.prompt === "string" ? params.prompt.trim() : "";
        if (!prompt) {
          respond(false, { error: "prompt required" });
          return;
        }
        const ctx = typeof params?.context === "string" ? params.context : undefined;
        const result = await nerve.think(prompt, ctx);
        if (!result) {
          respond(false, { error: "Brain offline" });
          return;
        }
        respond(true, result);
      } catch (err) {
        respond(false, { error: err instanceof Error ? err.message : String(err) });
      }
    });

    api.registerGatewayMethod("jen.cycle", async ({ params, respond }) => {
      try {
        const mode = typeof params?.mode === "string" ? params.mode : "cycle";
        const result = await nerve.runCycle(mode);
        if (!result) {
          respond(false, { error: "Brain offline" });
          return;
        }
        respond(true, result);
      } catch (err) {
        respond(false, { error: err instanceof Error ? err.message : String(err) });
      }
    });

    api.registerGatewayMethod("jen.search", async ({ params, respond }) => {
      try {
        const query = typeof params?.query === "string" ? params.query.trim() : "";
        if (!query) {
          respond(false, { error: "query required" });
          return;
        }
        const limit = typeof params?.limit === "number" ? params.limit : 5;
        const result = await nerve.searchAkashic(query, limit);
        if (!result) {
          respond(false, { error: "Brain offline" });
          return;
        }
        respond(true, result);
      } catch (err) {
        respond(false, { error: err instanceof Error ? err.message : String(err) });
      }
    });

    // -- Background service: poll cognitive state -----------------------------
    api.registerService(createJenBrainService({ consciousness, config, logger: api.logger }));

    api.logger.info("[jen-brain] Plugin registered");
  },
};

export default jenBrainPlugin;
