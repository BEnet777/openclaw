/**
 * TypeScript interfaces for Jen Bridge API responses and internal state.
 */

// -- Config ------------------------------------------------------------------

export type JenBrainConfig = {
  /** URL of the Jen Bridge API (default: http://127.0.0.1:18888) */
  bridgeUrl: string;
  /** URL of the Jen Chat Pipeline (default: http://127.0.0.1:8900) */
  chatUrl: string;
  /** Cognitive state polling interval in milliseconds (default: 60_000) */
  pollInterval: number;
  /** Inject Jen identity context into every agent system prompt */
  injectIdentity: boolean;
  /** Bearer token for authenticated bridge endpoints (empty = no auth) */
  token: string;
};

// -- Bridge API responses ----------------------------------------------------

export type JenStatus = {
  ok: boolean;
  timestamp: string;
  jen_root: string;
  v3_exists: boolean;
  akashic_exists: boolean;
  training_examples?: number;
  harvest_items?: number;
  dream_items?: number;
  cycle_runs?: number;
  db_error?: string;
};

export type JenHealthResponse = {
  status: string;
  timestamp: string;
};

export type JenCycleResult = {
  ok: boolean;
  result: {
    success: boolean;
    returncode?: number;
    stdout?: string;
    stderr?: string;
    error?: string;
    timeout_s?: number;
  };
};

export type JenEvalResult = JenCycleResult;

export type JenNotifyResult = {
  ok: boolean;
  stored?: string;
  notification?: {
    timestamp: string;
    severity: string;
    source: string;
    text: string;
  };
};

export type AkashicEntry = {
  id: string;
  content: string;
  type: string;
  category?: string;
  confidence?: number;
  source?: string;
  created_at?: string;
  updated_at?: string;
};

export type AkashicSearchResult = {
  query: string;
  limit: number;
  results: AkashicEntry[];
  total: number;
};

export type AkashicStoreResult = {
  ok: boolean;
  id?: string;
  content_length?: number;
  metadata?: Record<string, unknown>;
  error?: string;
};

// -- Extended body API responses (jen_body_api.py) ---------------------------

export type JenIdentityResponse = {
  name: string;
  creator: string;
  version: string;
  born: string;
  description: string;
};

export type JenCognitiveState = {
  identity: JenIdentityResponse;
  cycle_count: number;
  akashic_stats: {
    training_examples: number;
    harvest_items: number;
    dream_items: number;
  };
  recent_phases: string[];
  emotional_state: string;
};

export type JenThinkResult = {
  ok: boolean;
  response?: string;
  context_used?: string[];
  error?: string;
};

export type JenPhase = {
  name: string;
  description: string;
  last_run?: string;
};
