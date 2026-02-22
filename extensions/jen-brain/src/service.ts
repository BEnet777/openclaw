/**
 * Jen Brain Background Service
 *
 * Runs during the gateway lifecycle:
 * 1. Polls Jen's brain for cognitive state (consciousness module)
 * 2. Tracks brain online/offline transitions and logs to Akashic
 * 3. Periodically stores a health snapshot for the autonomy engine
 */

import type { JenConsciousness } from "./consciousness.js";
import type { JenNerve } from "./nerve.js";
import type { JenBrainConfig } from "./types.js";

type Logger = { info(msg: string): void; warn(msg: string): void; error(msg: string): void };

export function createJenBrainService(opts: {
  consciousness: JenConsciousness;
  nerve: JenNerve;
  config: JenBrainConfig;
  logger: Logger;
}) {
  const { consciousness, nerve, config, logger } = opts;

  let healthTimer: ReturnType<typeof setInterval> | null = null;
  let lastBrainState: boolean | null = null;

  async function checkBrainTransition(): Promise<void> {
    const wasOnline = lastBrainState;
    const isOnline = consciousness.isOnline;

    if (wasOnline !== null && wasOnline !== isOnline) {
      const transition = isOnline ? "came online" : "went offline";
      logger.info(`[jen-brain] Brain ${transition}`);

      // Log state transitions to Akashic when brain is reachable
      if (isOnline) {
        void nerve.storeAkashic(
          `[brain-transition] Brain came online`,
          { source: "service-health" },
        ).catch(() => {});
      }
    }

    lastBrainState = isOnline;
  }

  // Store a periodic health snapshot (every 5 polls)
  let pollCount = 0;
  async function maybeStoreHealthSnapshot(): Promise<void> {
    pollCount++;
    if (pollCount % 5 !== 0 || !consciousness.isOnline) return;

    const status = consciousness.status;
    if (!status) return;

    void nerve.storeAkashic(
      `[health-snapshot] ok=${status.ok}, training=${status.training_examples ?? 0}, ` +
      `harvest=${status.harvest_items ?? 0}, cycles=${status.cycle_runs ?? 0}`,
      { source: "service-health-snapshot" },
    ).catch(() => {});
  }

  return {
    id: "jen-brain",

    async start() {
      logger.info("[jen-brain] Service starting — cognitive state polling enabled");
      consciousness.startPolling(config.pollInterval);

      // Log initial connectivity after first poll settles
      setTimeout(() => {
        if (consciousness.isOnline) {
          logger.info("[jen-brain] Brain is online");
          const summary = consciousness.formatForSystemPrompt();
          if (summary) logger.info(`[jen-brain] ${summary}`);
        } else {
          logger.warn("[jen-brain] Brain is offline — will keep polling");
        }
        lastBrainState = consciousness.isOnline;
      }, 3_000);

      // Health observation: check brain transitions on each poll interval
      healthTimer = setInterval(async () => {
        await checkBrainTransition();
        await maybeStoreHealthSnapshot();
      }, config.pollInterval);
    },

    async stop() {
      consciousness.stopPolling();
      if (healthTimer) {
        clearInterval(healthTimer);
        healthTimer = null;
      }
      logger.info("[jen-brain] Service stopped");
    },
  };
}
