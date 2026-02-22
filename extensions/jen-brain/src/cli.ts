/**
 * Jen Brain CLI Commands
 *
 * Registers `openclaw jen <subcommand>` via the plugin CLI API.
 * Brain commands use the JenNerve HTTP client (bridge API on port 18888).
 */

import type { JenNerve } from "./nerve.js";

type Logger = { info(msg: string): void; warn(msg: string): void; error(msg: string): void };

export function registerJenBrainCli(opts: {
  program: import("commander").Command;
  nerve: JenNerve;
  logger: Logger;
}): void {
  const { program, nerve, logger } = opts;

  const jen = program
    .command("jen")
    .description("Jen Brain commands — interact with Jen's cognitive system");

  // -- jen status -------------------------------------------------------------
  jen
    .command("status")
    .description("Show Jen brain status and Akashic stats")
    .action(async () => {
      const status = await nerve.getStatus();
      if (!status) {
        console.log("Brain offline — bridge not reachable");
        process.exitCode = 1;
        return;
      }

      console.log("Jen Brain Status");
      console.log("================");
      console.log(`  OK:                ${status.ok}`);
      console.log(`  Timestamp:         ${status.timestamp}`);
      console.log(`  Akashic exists:    ${status.akashic_exists}`);
      console.log(`  Training examples: ${status.training_examples ?? "N/A"}`);
      console.log(`  Harvest items:     ${status.harvest_items ?? "N/A"}`);
      console.log(`  Dream items:       ${status.dream_items ?? "N/A"}`);
      console.log(`  Cycle runs:        ${status.cycle_runs ?? "N/A"}`);
      if (status.db_error) {
        console.log(`  DB error:          ${status.db_error}`);
      }
    });

  // -- jen health -------------------------------------------------------------
  jen
    .command("health")
    .description("Quick health check (exit 0 = healthy, 1 = offline)")
    .action(async () => {
      const online = await nerve.isOnline();
      if (online) {
        console.log("healthy");
      } else {
        console.log("offline");
        process.exitCode = 1;
      }
    });

  // -- jen think --------------------------------------------------------------
  jen
    .command("think")
    .description("Send a prompt to Jen's cognitive pipeline")
    .argument("<prompt>", "The prompt to think about")
    .option("--context <ctx>", "Additional context")
    .action(async (prompt: string, cmdOpts: { context?: string }) => {
      const result = await nerve.think(prompt, cmdOpts.context);
      if (!result) {
        console.log("Brain offline — cannot think");
        process.exitCode = 1;
        return;
      }
      if (result.error) {
        console.log(`Error: ${result.error}`);
        process.exitCode = 1;
        return;
      }
      console.log(result.response ?? "(no response)");
    });

  // -- jen search -------------------------------------------------------------
  jen
    .command("search")
    .description("Search the Akashic Record")
    .argument("<query>", "Search query")
    .option("--limit <n>", "Max results", "5")
    .action(async (query: string, cmdOpts: { limit: string }) => {
      const limit = Number(cmdOpts.limit) || 5;
      const result = await nerve.searchAkashic(query, limit);
      if (!result) {
        console.log("Brain offline — cannot search");
        process.exitCode = 1;
        return;
      }

      console.log(`Found ${result.total} results for "${result.query}":`);
      console.log("");
      for (const entry of result.results) {
        console.log(`  [${entry.type}] ${entry.id}`);
        const preview =
          entry.content.length > 120
            ? entry.content.slice(0, 120) + "..."
            : entry.content;
        console.log(`    ${preview}`);
        console.log("");
      }
    });

  // -- jen store --------------------------------------------------------------
  jen
    .command("store")
    .description("Store content in the Akashic Record")
    .argument("<content>", "Content to store")
    .action(async (content: string) => {
      const result = await nerve.storeAkashic(content);
      if (!result) {
        console.log("Brain offline — cannot store");
        process.exitCode = 1;
        return;
      }
      if (result.ok) {
        console.log(`Stored: ${result.id} (${result.content_length} chars)`);
      } else {
        console.log(`Error: ${result.error}`);
        process.exitCode = 1;
      }
    });

  // -- jen cycle --------------------------------------------------------------
  jen
    .command("cycle")
    .description("Run a Jen learning cycle")
    .option("--mode <mode>", "Cycle mode: cycle, harvest, dream, forge", "cycle")
    .action(async (cmdOpts: { mode: string }) => {
      logger.info(`[jen-cli] Running cycle: ${cmdOpts.mode}`);
      console.log(`Running ${cmdOpts.mode} cycle (this may take a while)...`);
      const result = await nerve.runCycle(cmdOpts.mode);
      if (!result) {
        console.log("Brain offline — cannot run cycle");
        process.exitCode = 1;
        return;
      }
      console.log(`Cycle ${result.ok ? "succeeded" : "failed"}`);
      if (result.result.stdout) {
        console.log(result.result.stdout.slice(-500));
      }
    });

  // -- jen eval ---------------------------------------------------------------
  jen
    .command("eval")
    .description("Run evaluation suite")
    .option("--suite <suite>", "Suite name", "gauntlet")
    .action(async (cmdOpts: { suite: string }) => {
      logger.info(`[jen-cli] Running eval: ${cmdOpts.suite}`);
      console.log(`Running eval suite: ${cmdOpts.suite}...`);
      const result = await nerve.runEval(cmdOpts.suite);
      if (!result) {
        console.log("Brain offline — cannot run eval");
        process.exitCode = 1;
        return;
      }
      console.log(`Eval ${result.ok ? "succeeded" : "failed"}`);
      if (result.result.stdout) {
        console.log(result.result.stdout.slice(-500));
      }
    });

  // -- jen notify -------------------------------------------------------------
  jen
    .command("notify")
    .description("Send a notification to Jen")
    .argument("<text>", "Notification text")
    .option("--severity <level>", "info, warn, or error", "info")
    .action(async (text: string, cmdOpts: { severity: string }) => {
      const result = await nerve.notify(text, cmdOpts.severity);
      if (!result) {
        console.log("Brain offline — cannot notify");
        process.exitCode = 1;
        return;
      }
      if (result.ok) {
        console.log(`Notification sent: ${result.stored}`);
      } else {
        console.log("Notification failed");
        process.exitCode = 1;
      }
    });

  // -- jen identity -----------------------------------------------------------
  jen
    .command("identity")
    .description("Show Jen's identity")
    .action(async () => {
      const id = await nerve.getIdentity();
      if (!id) {
        console.log("Brain offline — cannot retrieve identity");
        process.exitCode = 1;
        return;
      }
      console.log("Jen Identity");
      console.log("============");
      console.log(`  Name:        ${id.name}`);
      console.log(`  Creator:     ${id.creator}`);
      console.log(`  Version:     ${id.version}`);
      console.log(`  Born:        ${id.born}`);
      console.log(`  Description: ${id.description}`);
    });

  // -- jen phases -------------------------------------------------------------
  jen
    .command("phases")
    .description("Show learning cycle phases with last-run timestamps")
    .action(async () => {
      const phases = await nerve.getPhases();
      if (!phases) {
        console.log("Brain offline — cannot retrieve phases");
        process.exitCode = 1;
        return;
      }
      console.log("Learning Cycle Phases");
      console.log("=====================");
      for (const p of phases) {
        const lastRun = p.last_run ?? "never";
        console.log(`  ${p.name.padEnd(14)} ${lastRun.padEnd(22)} ${p.description}`);
      }
    });

  // -- jen cognitive ----------------------------------------------------------
  jen
    .command("cognitive")
    .description("Show current cognitive state")
    .action(async () => {
      const state = await nerve.getCognitiveState();
      if (!state) {
        console.log("Brain offline — cannot retrieve cognitive state");
        process.exitCode = 1;
        return;
      }
      console.log("Cognitive State");
      console.log("===============");
      console.log(`  Name:            ${state.identity.name}`);
      console.log(`  Emotional state: ${state.emotional_state}`);
      console.log(`  Cycle count:     ${state.cycle_count}`);
      console.log(`  Recent phases:   ${state.recent_phases.join(", ") || "none"}`);
      console.log("  Akashic stats:");
      console.log(`    Training:      ${state.akashic_stats.training_examples}`);
      console.log(`    Harvest:       ${state.akashic_stats.harvest_items}`);
      console.log(`    Dream:         ${state.akashic_stats.dream_items}`);
    });

  // -- jen self-check ---------------------------------------------------------
  jen
    .command("self-check")
    .description("Run a full self-diagnostic (brain + body)")
    .action(async () => {
      console.log("Running self-check...");
      const health = await nerve.getHealth();
      const state = await nerve.getCognitiveState();
      const phases = await nerve.getPhases();

      console.log("");
      console.log("Self-Check Report");
      console.log("=================");

      // Brain health
      if (health) {
        console.log(`  Brain:     online (${health.status})`);
      } else {
        console.log("  Brain:     OFFLINE");
      }

      // Cognitive state
      if (state) {
        console.log(`  Emotional: ${state.emotional_state}`);
        console.log(`  Cycles:    ${state.cycle_count}`);
        console.log(`  Akashic:   ${state.akashic_stats.training_examples} training, ${state.akashic_stats.harvest_items} harvest, ${state.akashic_stats.dream_items} dream`);
      } else {
        console.log("  Cognitive: unavailable");
      }

      // Phases
      if (phases && phases.length > 0) {
        const recentlyRun = phases.filter((p) => p.last_run).length;
        console.log(`  Phases:    ${recentlyRun}/${phases.length} have run at least once`);
      }

      // Summary
      const brainOk = health !== null;
      console.log("");
      console.log(brainOk
        ? "  Summary: Brain is operational"
        : "  Summary: Brain is OFFLINE — limited to body-only operations",
      );
    });
}
