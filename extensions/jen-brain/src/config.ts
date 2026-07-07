/**
 * Config parsing for the Jen Brain plugin.
 * Reads plugin config with sensible defaults.
 */

import type { JenBrainConfig } from "./types.js";

const DEFAULTS: JenBrainConfig = {
  bridgeUrl: "http://127.0.0.1:18888",
  chatUrl: "http://127.0.0.1:8900",
  pollInterval: 60_000,
  injectIdentity: true,
  // Fall back to the shared bridge secret so the body authenticates without a
  // separate plugin-config entry (report §16.4). An explicit plugin `token`
  // still overrides. The gateway unit supplies JEN_BRIDGE_TOKEN.
  token: process.env.JEN_BRIDGE_TOKEN ?? "",
  inferTimeoutMs: 360_000,
};

export function parseJenBrainConfig(
  raw: Record<string, unknown> | undefined,
): JenBrainConfig {
  if (!raw || typeof raw !== "object") return { ...DEFAULTS };

  const str = (key: string, fallback: string): string => {
    const v = raw[key];
    return typeof v === "string" && v.trim() ? v.trim() : fallback;
  };

  const num = (key: string, fallback: number, min = 0): number => {
    const v = raw[key];
    if (typeof v === "number" && v >= min) return v;
    if (typeof v === "string") {
      const n = Number(v);
      if (!Number.isNaN(n) && n >= min) return n;
    }
    return fallback;
  };

  const bool = (key: string, fallback: boolean): boolean => {
    const v = raw[key];
    return typeof v === "boolean" ? v : fallback;
  };

  return {
    bridgeUrl: str("bridgeUrl", DEFAULTS.bridgeUrl),
    chatUrl: str("chatUrl", DEFAULTS.chatUrl),
    pollInterval: num("pollInterval", DEFAULTS.pollInterval, 5_000),
    injectIdentity: bool("injectIdentity", DEFAULTS.injectIdentity),
    token: str("token", DEFAULTS.token),
    inferTimeoutMs: num("inferTimeoutMs", DEFAULTS.inferTimeoutMs ?? 360_000, 1_000),
  };
}

export const jenBrainConfigSchema = {
  parse(value: unknown): JenBrainConfig {
    const raw =
      value && typeof value === "object" && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : {};
    return parseJenBrainConfig(raw);
  },
  uiHints: {
    bridgeUrl: { label: "Bridge API URL", placeholder: "http://127.0.0.1:18888" },
    chatUrl: { label: "Chat Pipeline URL", placeholder: "http://127.0.0.1:8900" },
    pollInterval: { label: "Poll Interval (ms)", advanced: true },
    injectIdentity: { label: "Inject Identity into Prompts" },
    token: { label: "Bridge Token", sensitive: true },
    inferTimeoutMs: { label: "Inference Timeout (ms)", advanced: true },
  },
};
