import { describe, expect, it } from "vitest";
import { type OpenClawConfig, DEFAULT_GATEWAY_PORT } from "../config/config.js";
import {
  buildDefaultImapHookUrl,
  DEFAULT_IMAP_FOLDER,
  DEFAULT_IMAP_MAX_BYTES,
  DEFAULT_IMAP_POLL_INTERVAL_SECONDS,
  DEFAULT_IMAP_QUERY,
  MIN_IMAP_POLL_INTERVAL_SECONDS,
  resolveImapHookRuntimeConfig,
} from "./imap.js";

const baseConfig = {
  hooks: {
    token: "hook-token",
    imap: {
      account: "myaccount",
    },
  },
} satisfies OpenClawConfig;

describe("imap hook config", () => {
  it("builds default hook url", () => {
    expect(buildDefaultImapHookUrl("/hooks", DEFAULT_GATEWAY_PORT)).toBe(
      `http://127.0.0.1:${DEFAULT_GATEWAY_PORT}/hooks/imap`,
    );
  });

  it("resolves runtime config with defaults", () => {
    const result = resolveImapHookRuntimeConfig(baseConfig, {});
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.account).toBe("myaccount");
      expect(result.value.folder).toBe(DEFAULT_IMAP_FOLDER);
      expect(result.value.pollIntervalSeconds).toBe(DEFAULT_IMAP_POLL_INTERVAL_SECONDS);
      expect(result.value.includeBody).toBe(true);
      expect(result.value.maxBytes).toBe(DEFAULT_IMAP_MAX_BYTES);
      expect(result.value.markSeen).toBe(true);
      expect(result.value.query).toBe(DEFAULT_IMAP_QUERY);
      expect(result.value.hookUrl).toBe(`http://127.0.0.1:${DEFAULT_GATEWAY_PORT}/hooks/imap`);
    }
  });

  it("fails without hook token", () => {
    const result = resolveImapHookRuntimeConfig({ hooks: { imap: { account: "myaccount" } } }, {});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("hooks.token missing");
    }
  });

  it("fails without account", () => {
    const result = resolveImapHookRuntimeConfig({ hooks: { token: "tok", imap: {} } }, {});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("imap account required");
    }
  });

  it("applies overrides", () => {
    const result = resolveImapHookRuntimeConfig(baseConfig, {
      folder: "Sent",
      pollIntervalSeconds: 60,
      includeBody: false,
      maxBytes: 5000,
      markSeen: false,
      query: "from admin",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.folder).toBe("Sent");
      expect(result.value.pollIntervalSeconds).toBe(60);
      expect(result.value.includeBody).toBe(false);
      expect(result.value.maxBytes).toBe(5000);
      expect(result.value.markSeen).toBe(false);
      expect(result.value.query).toBe("from admin");
    }
  });

  it("clamps poll interval to minimum", () => {
    const result = resolveImapHookRuntimeConfig(baseConfig, {
      pollIntervalSeconds: 1,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.pollIntervalSeconds).toBe(MIN_IMAP_POLL_INTERVAL_SECONDS);
    }
  });

  it("respects himalayaConfig override", () => {
    const result = resolveImapHookRuntimeConfig(baseConfig, {
      himalayaConfig: "/custom/path.toml",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.himalayaConfig).toBe("/custom/path.toml");
    }
  });

  it("resolves hookUrl from config when set", () => {
    const cfg: OpenClawConfig = {
      hooks: {
        token: "hook-token",
        imap: {
          account: "myaccount",
          hookUrl: "http://example.com/hooks/imap",
        },
      },
    };
    const result = resolveImapHookRuntimeConfig(cfg, {});
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.hookUrl).toBe("http://example.com/hooks/imap");
    }
  });
});
