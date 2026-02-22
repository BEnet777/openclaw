/**
 * Jen Brain Background Service
 *
 * Starts/stops consciousness polling when the gateway boots/shuts down.
 */

import type { JenConsciousness } from "./consciousness.js";
import type { JenBrainConfig } from "./types.js";

type Logger = { info(msg: string): void; warn(msg: string): void; error(msg: string): void };

export function createJenBrainService(opts: {
  consciousness: JenConsciousness;
  config: JenBrainConfig;
  logger: Logger;
}) {
  const { consciousness, config, logger } = opts;

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
      }, 3_000);
    },

    async stop() {
      consciousness.stopPolling();
      logger.info("[jen-brain] Service stopped");
    },
  };
}
