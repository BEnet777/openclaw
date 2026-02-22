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
  token: "",
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
  },
};
