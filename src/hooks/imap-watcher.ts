/**
 * IMAP Watcher Service
 *
 * Poll-based email watcher using himalaya CLI. Periodically lists unseen
 * envelopes, fetches new messages, and delivers them to the gateway hooks
 * endpoint. Runs in-process (no child process) alongside the gateway.
 */

import { hasBinary } from "../agents/skills.js";
import type { OpenClawConfig } from "../config/config.js";
import { createSubsystemLogger } from "../logging/subsystem.js";
import { listEnvelopes, markEnvelopeSeen, readMessage } from "./imap-himalaya.js";
import { type ImapHookRuntimeConfig, resolveImapHookRuntimeConfig } from "./imap.js";

const log = createSubsystemLogger("imap-watcher");

/**
 * Maximum number of envelope IDs to keep in the seen set before pruning.
 * Prevents unbounded memory growth on high-volume mailboxes.
 */
const MAX_SEEN_IDS = 2000;
const ENVELOPE_PAGE_SIZE = 50;

let pollTimer: ReturnType<typeof setTimeout> | null = null;
let shuttingDown = false;
let currentConfig: ImapHookRuntimeConfig | null = null;
let seenIds = new Set<string>();

function isHimalayaAvailable(): boolean {
  return hasBinary("himalaya");
}

export type ImapWatcherStartResult = {
  started: boolean;
  reason?: string;
};

/**
 * Start the IMAP watcher service.
 * Called by the gateway if hooks.imap is configured.
 */
export async function startImapWatcher(cfg: OpenClawConfig): Promise<ImapWatcherStartResult> {
  if (!cfg.hooks?.enabled) {
    return { started: false, reason: "hooks not enabled" };
  }

  if (!cfg.hooks?.imap?.account) {
    return { started: false, reason: "no imap account configured" };
  }

  if (!isHimalayaAvailable()) {
    return { started: false, reason: "himalaya binary not found" };
  }

  const resolved = resolveImapHookRuntimeConfig(cfg, {});
  if (!resolved.ok) {
    return { started: false, reason: resolved.error };
  }

  const runtimeConfig = resolved.value;
  currentConfig = runtimeConfig;
  shuttingDown = false;
  seenIds = new Set();

  // Schedule the first poll immediately.
  schedulePoll(runtimeConfig, 0);

  log.info(
    `imap watcher started for ${runtimeConfig.account} (poll every ${runtimeConfig.pollIntervalSeconds}s)`,
  );

  return { started: true };
}

/**
 * Stop the IMAP watcher service.
 */
export async function stopImapWatcher(): Promise<void> {
  shuttingDown = true;

  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }

  currentConfig = null;
  log.info("imap watcher stopped");
}

/**
 * Check if the IMAP watcher is running.
 */
export function isImapWatcherRunning(): boolean {
  return currentConfig !== null && !shuttingDown;
}

// -- internal --

function schedulePoll(cfg: ImapHookRuntimeConfig, delayMs: number) {
  if (shuttingDown) {
    return;
  }
  pollTimer = setTimeout(() => {
    void runPollCycle(cfg);
  }, delayMs);
}

async function runPollCycle(cfg: ImapHookRuntimeConfig): Promise<void> {
  if (shuttingDown || !currentConfig) {
    return;
  }

  try {
    const envelopes = await listEnvelopes({
      account: cfg.account,
      folder: cfg.folder,
      query: cfg.query,
      pageSize: ENVELOPE_PAGE_SIZE,
      config: cfg.himalayaConfig,
    });

    const newEnvelopes = envelopes.filter((e) => e.id && !seenIds.has(e.id));

    for (const envelope of newEnvelopes) {
      if (shuttingDown) {
        break;
      }

      try {
        await processEnvelope(cfg, envelope);
        seenIds.add(envelope.id);
      } catch (err) {
        log.error(`failed to process envelope ${envelope.id}: ${String(err)}`);
      }
    }

    pruneSeenIds();
  } catch (err) {
    log.error(`poll cycle failed: ${String(err)}`);
  }

  // Schedule next poll.
  schedulePoll(cfg, cfg.pollIntervalSeconds * 1000);
}

async function processEnvelope(
  cfg: ImapHookRuntimeConfig,
  envelope: { id: string; from: string; subject: string; date: string },
): Promise<void> {
  let body = "";
  let snippet = "";

  if (cfg.includeBody) {
    try {
      // Read without marking seen (we'll mark explicitly if markSeen is true).
      const message = await readMessage({
        account: cfg.account,
        id: envelope.id,
        folder: cfg.folder,
        config: cfg.himalayaConfig,
        preview: true,
      });
      body = truncateBody(message.body, cfg.maxBytes);
      snippet = message.body.slice(0, 200);
    } catch (err) {
      log.warn(`failed to read message ${envelope.id}: ${String(err)}`);
    }
  }

  const payload = {
    messages: [
      {
        id: envelope.id,
        from: envelope.from,
        subject: envelope.subject,
        date: envelope.date,
        snippet,
        body,
      },
    ],
  };

  await deliverToHook(cfg, payload);

  if (cfg.markSeen) {
    try {
      await markEnvelopeSeen({
        account: cfg.account,
        id: envelope.id,
        folder: cfg.folder,
        config: cfg.himalayaConfig,
      });
    } catch (err) {
      log.warn(`failed to mark envelope ${envelope.id} as seen: ${String(err)}`);
    }
  }
}

async function deliverToHook(cfg: ImapHookRuntimeConfig, payload: unknown): Promise<void> {
  const response = await fetch(cfg.hookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.hookToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    log.warn(`hook delivery failed (${response.status}): ${text.slice(0, 200)}`);
  }
}

function truncateBody(body: string, maxBytes: number): string {
  if (Buffer.byteLength(body, "utf-8") <= maxBytes) {
    return body;
  }
  // Truncate to approximate byte limit (safe for multi-byte chars).
  const buf = Buffer.from(body, "utf-8");
  return buf.subarray(0, maxBytes).toString("utf-8");
}

function pruneSeenIds(): void {
  if (seenIds.size <= MAX_SEEN_IDS) {
    return;
  }
  // Drop oldest entries (Set iterates in insertion order).
  const excess = seenIds.size - MAX_SEEN_IDS;
  let dropped = 0;
  for (const id of seenIds) {
    if (dropped >= excess) {
      break;
    }
    seenIds.delete(id);
    dropped += 1;
  }
}
