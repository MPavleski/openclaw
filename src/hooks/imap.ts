/**
 * IMAP Hook Configuration
 *
 * Defaults, type definitions, and config resolution for the himalaya-based
 * IMAP email watcher integration.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  resolveDefaultAgentId,
  resolveAgentWorkspaceDir,
  resolveAgentDir,
  resolveAgentEffectiveModelPrimary,
} from "../agents/agent-scope.js";
import { DEFAULT_MODEL, DEFAULT_PROVIDER } from "../agents/defaults.js";
import { parseModelRef } from "../agents/model-selection.js";
import { runEmbeddedPiAgent } from "../agents/pi-embedded.js";
import { type OpenClawConfig, DEFAULT_GATEWAY_PORT, resolveGatewayPort } from "../config/config.js";
import { openBoundaryFileSync } from "../infra/boundary-file-read.js";
import { createSubsystemLogger } from "../logging/subsystem.js";
import { normalizeHooksPath } from "./gmail.js";

export const DEFAULT_IMAP_FOLDER = "INBOX";
export const DEFAULT_IMAP_POLL_INTERVAL_SECONDS = 20;
export const DEFAULT_IMAP_MAX_BYTES = 20_000;
export const DEFAULT_IMAP_QUERY = "not flag Seen";
export const MIN_IMAP_POLL_INTERVAL_SECONDS = 5;
const USER_OWNER_EMAIL_TIMEOUT_MS = 15_000;
const USER_OWNER_EMAIL_CACHE_TTL_MS = 5 * 60 * 1000;

const log = createSubsystemLogger("imap");

type OwnerEmailCacheEntry = {
  email?: string;
  timestamp: number;
};

let ownerEmailCache: OwnerEmailCacheEntry | null = null;

export type ImapHookOverrides = {
  account?: string;
  folder?: string;
  pollIntervalSeconds?: number;
  includeBody?: boolean;
  maxBytes?: number;
  markSeen?: boolean;
  hookUrl?: string;
  hookToken?: string;
  himalayaConfig?: string;
  query?: string;
  allowedSenders?: string[];
};

export type ImapHookRuntimeConfig = {
  account: string;
  folder: string;
  pollIntervalSeconds: number;
  includeBody: boolean;
  maxBytes: number;
  markSeen: boolean;
  hookUrl: string;
  hookToken: string;
  himalayaConfig?: string;
  query: string;
  allowedSenders: string[];
};

export function buildDefaultImapHookUrl(
  hooksPath?: string,
  port: number = DEFAULT_GATEWAY_PORT,
): string {
  const basePath = normalizeHooksPath(hooksPath);
  return `http://127.0.0.1:${port}${basePath}/imap`;
}

export async function resolveImapHookRuntimeConfig(
  cfg: OpenClawConfig,
  overrides: ImapHookOverrides,
): Promise<{ ok: true; value: ImapHookRuntimeConfig } | { ok: false; error: string }> {
  const hooks = cfg.hooks;
  const imap = hooks?.imap;
  const hookToken = overrides.hookToken ?? hooks?.token ?? "";
  if (!hookToken) {
    return { ok: false, error: "hooks.token missing (needed for imap hook)" };
  }

  const account = overrides.account ?? imap?.account ?? "";
  if (!account) {
    return { ok: false, error: "imap account required" };
  }

  const folder = overrides.folder ?? imap?.folder ?? DEFAULT_IMAP_FOLDER;

  const pollRaw = overrides.pollIntervalSeconds ?? imap?.pollIntervalSeconds;
  const pollIntervalSeconds =
    typeof pollRaw === "number" && Number.isFinite(pollRaw) && pollRaw > 0
      ? Math.max(MIN_IMAP_POLL_INTERVAL_SECONDS, Math.floor(pollRaw))
      : DEFAULT_IMAP_POLL_INTERVAL_SECONDS;

  const includeBody = overrides.includeBody ?? imap?.includeBody ?? true;

  const maxBytesRaw = overrides.maxBytes ?? imap?.maxBytes;
  const maxBytes =
    typeof maxBytesRaw === "number" && Number.isFinite(maxBytesRaw) && maxBytesRaw > 0
      ? Math.floor(maxBytesRaw)
      : DEFAULT_IMAP_MAX_BYTES;

  const markSeen = overrides.markSeen ?? imap?.markSeen ?? true;

  const hookUrl =
    overrides.hookUrl ??
    imap?.hookUrl ??
    buildDefaultImapHookUrl(hooks?.path, resolveGatewayPort(cfg));

  const himalayaConfig = overrides.himalayaConfig ?? imap?.himalayaConfig;
  const query = overrides.query ?? imap?.query ?? DEFAULT_IMAP_QUERY;

  const allowedSendersRaw = overrides.allowedSenders ?? imap?.allowedSenders ?? [];
  const allowedSenders = normalizeAllowedSenders(allowedSendersRaw);
  if (allowedSenders.length === 0) {
    return { ok: false, error: "hooks.imap.allowedSenders required" };
  }
  const ownerEmail = await resolveOwnerEmailFromUserProfile(cfg);
  const mergedAllowedSenders = mergeAllowedSenders(allowedSenders, ownerEmail);

  return {
    ok: true,
    value: {
      account,
      folder,
      pollIntervalSeconds,
      includeBody,
      maxBytes,
      markSeen,
      hookUrl,
      hookToken,
      himalayaConfig: himalayaConfig?.trim() || undefined,
      query,
      allowedSenders: mergedAllowedSenders,
    },
  };
}

function normalizeAllowedSenders(values: string[] | undefined): string[] {
  if (!Array.isArray(values)) {
    return [];
  }
  const normalized = values
    .flatMap((value) => (typeof value === "string" ? [value] : []))
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => value.toLowerCase());
  const valid = normalized.filter((value) => value.includes("@"));
  return Array.from(new Set(valid));
}

function mergeAllowedSenders(values: string[], ownerEmail?: string): string[] {
  if (!ownerEmail) {
    return values;
  }
  const normalizedOwner = ownerEmail.trim().toLowerCase();
  if (!normalizedOwner) {
    return values;
  }
  if (values.includes(normalizedOwner)) {
    return values;
  }
  return [...values, normalizedOwner];
}

async function resolveOwnerEmailFromUserProfile(cfg: OpenClawConfig): Promise<string | undefined> {
  const cached = ownerEmailCache;
  const now = Date.now();
  if (cached && now - cached.timestamp < USER_OWNER_EMAIL_CACHE_TTL_MS) {
    return cached.email;
  }

  const email = await extractOwnerEmailFromUserProfile(cfg);
  ownerEmailCache = { email, timestamp: now };
  return email;
}

async function extractOwnerEmailFromUserProfile(cfg: OpenClawConfig): Promise<string | undefined> {
  const userProfile = readUserProfile(cfg);
  if (!userProfile) {
    return undefined;
  }

  const userProfileSample = userProfile.length > 4000 ? userProfile.slice(0, 4000) : userProfile;
  const prompt = [
    "Read USER.md and extract the owner's primary email address if it is explicitly stated for the user.",
    "",
    "Rules:",
    "- Only return an email address if the file clearly states it is the user's own email.",
    "- If multiple emails appear, pick the user's primary email only.",
    '- If no user email is explicitly provided, respond with "NONE".',
    '- Output only the email address or "NONE".',
    "",
    "USER.md:",
    userProfileSample,
  ].join("\n");

  const agentId = resolveDefaultAgentId(cfg);
  const workspaceDir = resolveAgentWorkspaceDir(cfg, agentId);
  if (!workspaceDir) {
    return undefined;
  }
  const agentDir = resolveAgentDir(cfg, agentId);
  const modelRef = resolveAgentEffectiveModelPrimary(cfg, agentId);
  const parsed = modelRef ? parseModelRef(modelRef, DEFAULT_PROVIDER) : null;
  const provider = parsed?.provider ?? DEFAULT_PROVIDER;
  const model = parsed?.model ?? DEFAULT_MODEL;
  const sessionId = `imap-owner-email-${Date.now()}`;
  const sessionKey = "temp:imap-owner-email";
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "openclaw-owner-email-"));
  const sessionFile = path.join(tempDir, "session.jsonl");

  try {
    const result = await runEmbeddedPiAgent({
      sessionId,
      sessionKey,
      agentId,
      sessionFile,
      workspaceDir,
      agentDir,
      config: cfg,
      prompt,
      provider,
      model,
      timeoutMs: USER_OWNER_EMAIL_TIMEOUT_MS,
      runId: sessionId,
    });
    const response = extractEmailFromEmbeddedResult(result);
    if (response) {
      log.info("owner email extracted from USER.md");
    }
    return response;
  } catch (err) {
    log.warn(`owner email extraction failed: ${String(err)}`);
    return undefined;
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup failures
    }
  }
}

function readUserProfile(cfg: OpenClawConfig): string | undefined {
  const agentId = resolveDefaultAgentId(cfg);
  const workspaceDir = resolveAgentWorkspaceDir(cfg, agentId);
  if (!workspaceDir) {
    return undefined;
  }
  const userPath = path.join(workspaceDir, "USER.md");
  const opened = openBoundaryFileSync({
    absolutePath: userPath,
    rootPath: workspaceDir,
    boundaryLabel: "workspace root",
    maxBytes: 2 * 1024 * 1024,
  });
  if (!opened.ok) {
    return undefined;
  }
  try {
    return fs.readFileSync(opened.fd, "utf-8");
  } catch {
    return undefined;
  } finally {
    fs.closeSync(opened.fd);
  }
}

function extractEmailFromEmbeddedResult(result: {
  payloads?: Array<{ text?: string }>;
}): string | undefined {
  const payload = (result as { payloads?: Array<{ text?: string }> }).payloads?.[0]?.text;
  if (!payload) {
    return undefined;
  }
  const value = payload.trim().toLowerCase();
  if (!value || value === "none") {
    return undefined;
  }
  if (!value.includes("@")) {
    return undefined;
  }
  const match = value.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
  return match ? match[0].toLowerCase() : undefined;
}
