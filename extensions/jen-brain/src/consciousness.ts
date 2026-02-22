/**
 * Jen Consciousness — Cognitive State Bridge
 *
 * Maintains a cached view of Jen's cognitive state via periodic polling.
 * Formats state summaries for LLM system prompt injection.
 */

import type { JenCognitiveState, JenStatus } from "./types.js";
import type { JenNerve } from "./nerve.js";

type Logger = { info(msg: string): void; warn(msg: string): void; error(msg: string): void };

export class JenConsciousness {
  private timer: ReturnType<typeof setInterval> | null = null;
  private cachedState: JenCognitiveState | null = null;
  private cachedStatus: JenStatus | null = null;
  private online = false;

  constructor(
    private readonly nerve: JenNerve,
    private readonly logger?: Logger,
  ) {}

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  get isOnline(): boolean {
    return this.online;
  }

  get state(): JenCognitiveState | null {
    return this.cachedState;
  }

  get status(): JenStatus | null {
    return this.cachedStatus;
  }

  /**
   * One-line summary suitable for system prompt context.
   */
  formatForSystemPrompt(): string | null {
    if (!this.online || !this.cachedStatus) {
      return null;
    }

    const parts: string[] = [];

    if (this.cachedState) {
      const s = this.cachedState;
      parts.push(`Jen Brain: online | state: ${s.emotional_state} | cycles: ${s.cycle_count}`);
      parts.push(
        `Akashic: ${s.akashic_stats.training_examples} examples, ${s.akashic_stats.harvest_items} harvested, ${s.akashic_stats.dream_items} dreamed`,
      );
    } else {
      parts.push("Jen Brain: online (cognitive state unavailable)");
    }

    return parts.join(" | ");
  }

  // ---------------------------------------------------------------------------
  // Polling
  // ---------------------------------------------------------------------------

  startPolling(intervalMs: number): void {
    if (this.timer) return;

    // Immediate first poll
    void this.poll();

    this.timer = setInterval(() => void this.poll(), intervalMs);
    this.logger?.info(`[jen-consciousness] Polling started (${intervalMs}ms interval)`);
  }

  stopPolling(): void {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
    this.logger?.info("[jen-consciousness] Polling stopped");
  }

  async poll(): Promise<void> {
    const wasOnline = this.online;

    const health = await this.nerve.getHealth();
    this.online = health !== null;

    if (!this.online) {
      if (wasOnline) {
        this.logger?.warn("[jen-consciousness] Brain went offline");
      }
      return;
    }

    if (!wasOnline) {
      this.logger?.info("[jen-consciousness] Brain came online");
    }

    // Fetch status + cognitive state in parallel
    const [statusResult, cogResult] = await Promise.all([
      this.nerve.getStatus(),
      this.nerve.getCognitiveState(),
    ]);

    if (statusResult) this.cachedStatus = statusResult;
    if (cogResult) this.cachedState = cogResult;
  }
}
