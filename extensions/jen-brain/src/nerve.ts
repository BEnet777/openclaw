/**
 * Jen Nerve — Central Nervous System
 *
 * HTTP client to the Jen Bridge API (port 18888) and Chat Pipeline (port 8900).
 * Uses native fetch with AbortController for timeouts.
 * Gracefully degrades when the brain is offline.
 */

import type {
  JenBrainConfig,
  JenStatus,
  JenHealthResponse,
  JenCycleResult,
  JenEvalResult,
  JenNotifyResult,
  AkashicSearchResult,
  AkashicStoreResult,
  JenThinkResult,
  JenCognitiveState,
  JenIdentityResponse,
  JenPhase,
} from "./types.js";

const DEFAULT_TIMEOUT = 30_000;
const TRAINING_TIMEOUT = 600_000;

type Logger = { info(msg: string): void; warn(msg: string): void; error(msg: string): void };

export class JenNerve {
  constructor(
    private readonly config: JenBrainConfig,
    private readonly logger?: Logger,
  ) {}

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  private headers(): Record<string, string> {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (this.config.token) {
      h["Authorization"] = `Bearer ${this.config.token}`;
    }
    return h;
  }

  private async request<T>(
    url: string,
    opts: { method?: string; body?: unknown; timeout?: number } = {},
  ): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
    const controller = new AbortController();
    const timeoutMs = opts.timeout ?? DEFAULT_TIMEOUT;
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        method: opts.method ?? "GET",
        headers: this.headers(),
        body: opts.body ? JSON.stringify(opts.body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return { ok: false, error: `HTTP ${res.status}: ${text}` };
      }

      const data = (await res.json()) as T;
      return { ok: true, data };
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof DOMException && err.name === "AbortError") {
        return { ok: false, error: `Timeout after ${timeoutMs}ms` };
      }
      const msg = err instanceof Error ? err.message : String(err);
      this.logger?.warn(`[jen-nerve] Request failed: ${msg}`);
      return { ok: false, error: msg };
    }
  }

  // ---------------------------------------------------------------------------
  // Bridge API (port 18888)
  // ---------------------------------------------------------------------------

  async getStatus(): Promise<JenStatus | null> {
    const r = await this.request<JenStatus>(`${this.config.bridgeUrl}/status`);
    return r.ok ? r.data : null;
  }

  async getHealth(): Promise<JenHealthResponse | null> {
    const r = await this.request<JenHealthResponse>(
      `${this.config.bridgeUrl}/health`,
      { timeout: 5_000 },
    );
    return r.ok ? r.data : null;
  }

  async runCycle(
    mode = "cycle",
    timeout = TRAINING_TIMEOUT,
  ): Promise<JenCycleResult | null> {
    const r = await this.request<JenCycleResult>(
      `${this.config.bridgeUrl}/cycle/run`,
      { method: "POST", body: { mode, timeout_s: Math.ceil(timeout / 1000) }, timeout },
    );
    return r.ok ? r.data : null;
  }

  async runEval(suite = "gauntlet"): Promise<JenEvalResult | null> {
    const r = await this.request<JenEvalResult>(
      `${this.config.bridgeUrl}/eval/run`,
      { method: "POST", body: { suite }, timeout: TRAINING_TIMEOUT },
    );
    return r.ok ? r.data : null;
  }

  async notify(
    text: string,
    severity = "info",
  ): Promise<JenNotifyResult | null> {
    const r = await this.request<JenNotifyResult>(
      `${this.config.bridgeUrl}/notify`,
      { method: "POST", body: { text, severity, source: "openclaw" } },
    );
    return r.ok ? r.data : null;
  }

  async searchAkashic(
    query: string,
    limit = 5,
  ): Promise<AkashicSearchResult | null> {
    const r = await this.request<AkashicSearchResult>(
      `${this.config.bridgeUrl}/akashic/search`,
      { method: "POST", body: { query, limit } },
    );
    return r.ok ? r.data : null;
  }

  async storeAkashic(
    content: string,
    metadata?: Record<string, unknown>,
  ): Promise<AkashicStoreResult | null> {
    const r = await this.request<AkashicStoreResult>(
      `${this.config.bridgeUrl}/akashic/store`,
      { method: "POST", body: { content, metadata } },
    );
    return r.ok ? r.data : null;
  }

  // ---------------------------------------------------------------------------
  // Chat Pipeline (port 8900) — inference routing
  // ---------------------------------------------------------------------------

  /**
   * Route a prompt through the chat pipeline for LLM inference.
   * Posts to chatUrl/v1/chat/completions (OpenAI-compatible) or chatUrl/api/chat (Ollama).
   * Returns the response text, or null if the pipeline is unavailable.
   */
  async chatInfer(
    prompt: string,
    systemPrompt?: string,
  ): Promise<string | null> {
    if (!this.config.chatUrl) return null;

    // Try OpenAI-compatible endpoint first
    const messages = [];
    if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
    messages.push({ role: "user", content: prompt });

    const r = await this.request<{
      choices?: Array<{ message?: { content?: string } }>;
      message?: { content?: string };
      response?: string;
    }>(
      `${this.config.chatUrl}/v1/chat/completions`,
      {
        method: "POST",
        body: { messages, stream: false },
        timeout: 120_000,
      },
    );

    if (r.ok) {
      // OpenAI format
      if (r.data.choices?.[0]?.message?.content) {
        return r.data.choices[0].message.content;
      }
      // Ollama format
      if (r.data.message?.content) {
        return r.data.message.content;
      }
      // Plain response
      if (r.data.response) {
        return r.data.response;
      }
    }

    // Fallback: try Ollama /api/chat endpoint
    const ollamaR = await this.request<{
      message?: { content?: string };
      response?: string;
    }>(
      `${this.config.chatUrl}/api/chat`,
      {
        method: "POST",
        body: {
          messages,
          stream: false,
        },
        timeout: 120_000,
      },
    );

    if (ollamaR.ok) {
      if (ollamaR.data.message?.content) return ollamaR.data.message.content;
      if (ollamaR.data.response) return ollamaR.data.response;
    }

    return null;
  }

  // ---------------------------------------------------------------------------
  // Extended body API (jen_body_api.py endpoints on same port)
  // ---------------------------------------------------------------------------

  /**
   * Think about a prompt. Tries the chat pipeline first for real inference,
   * falls back to the bridge /think endpoint (Akashic-augmented).
   */
  async think(
    prompt: string,
    context?: string,
  ): Promise<JenThinkResult | null> {
    // Try chat pipeline first for real LLM inference
    const inferResult = await this.chatInfer(
      prompt,
      context ? `Context: ${context}` : undefined,
    );
    if (inferResult) {
      return {
        ok: true,
        response: inferResult,
        context_used: context ? [context] : [],
      };
    }

    // Fall back to bridge /think (Akashic-augmented search)
    const r = await this.request<JenThinkResult>(
      `${this.config.bridgeUrl}/think`,
      { method: "POST", body: { prompt, context }, timeout: 120_000 },
    );
    return r.ok ? r.data : null;
  }

  async getCognitiveState(): Promise<JenCognitiveState | null> {
    const r = await this.request<JenCognitiveState>(
      `${this.config.bridgeUrl}/cognitive/state`,
    );
    return r.ok ? r.data : null;
  }

  async getIdentity(): Promise<JenIdentityResponse | null> {
    const r = await this.request<JenIdentityResponse>(
      `${this.config.bridgeUrl}/identity`,
    );
    return r.ok ? r.data : null;
  }

  async getPhases(): Promise<JenPhase[] | null> {
    const r = await this.request<JenPhase[]>(
      `${this.config.bridgeUrl}/phases`,
    );
    return r.ok ? r.data : null;
  }

  // ---------------------------------------------------------------------------
  // Connectivity check
  // ---------------------------------------------------------------------------

  async isOnline(): Promise<boolean> {
    const h = await this.getHealth();
    return h !== null;
  }
}
