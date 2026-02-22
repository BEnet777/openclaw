import { describe, it, expect } from "vitest";
import { parseJenBrainConfig, jenBrainConfigSchema } from "./config.js";

describe("parseJenBrainConfig", () => {
  it("returns defaults when no config provided", () => {
    const cfg = parseJenBrainConfig(undefined);
    expect(cfg.bridgeUrl).toBe("http://127.0.0.1:18888");
    expect(cfg.chatUrl).toBe("http://127.0.0.1:8900");
    expect(cfg.pollInterval).toBe(60_000);
    expect(cfg.injectIdentity).toBe(true);
    expect(cfg.token).toBe("");
  });

  it("returns defaults for empty object", () => {
    const cfg = parseJenBrainConfig({});
    expect(cfg.bridgeUrl).toBe("http://127.0.0.1:18888");
    expect(cfg.injectIdentity).toBe(true);
  });

  it("overrides string values", () => {
    const cfg = parseJenBrainConfig({
      bridgeUrl: "http://10.0.0.1:9999",
      token: "secret123",
    });
    expect(cfg.bridgeUrl).toBe("http://10.0.0.1:9999");
    expect(cfg.token).toBe("secret123");
    expect(cfg.chatUrl).toBe("http://127.0.0.1:8900");
  });

  it("overrides numeric values", () => {
    const cfg = parseJenBrainConfig({ pollInterval: 30_000 });
    expect(cfg.pollInterval).toBe(30_000);
  });

  it("parses string numbers", () => {
    const cfg = parseJenBrainConfig({ pollInterval: "15000" });
    expect(cfg.pollInterval).toBe(15_000);
  });

  it("clamps pollInterval minimum to 5000", () => {
    const cfg = parseJenBrainConfig({ pollInterval: 100 });
    expect(cfg.pollInterval).toBe(60_000); // fallback
  });

  it("overrides boolean values", () => {
    const cfg = parseJenBrainConfig({ injectIdentity: false });
    expect(cfg.injectIdentity).toBe(false);
  });

  it("ignores invalid types", () => {
    const cfg = parseJenBrainConfig({
      bridgeUrl: 123,
      pollInterval: "abc",
      injectIdentity: "yes",
    });
    expect(cfg.bridgeUrl).toBe("http://127.0.0.1:18888");
    expect(cfg.pollInterval).toBe(60_000);
    expect(cfg.injectIdentity).toBe(true);
  });
});

describe("jenBrainConfigSchema.parse", () => {
  it("handles null/undefined input", () => {
    const cfg = jenBrainConfigSchema.parse(null);
    expect(cfg.bridgeUrl).toBe("http://127.0.0.1:18888");
  });

  it("handles array input gracefully", () => {
    const cfg = jenBrainConfigSchema.parse([1, 2, 3]);
    expect(cfg.bridgeUrl).toBe("http://127.0.0.1:18888");
  });
});
