---
name: x-following-news
description: "Extract meaningful current news from the authenticated X (Twitter) Following feed by following links, reading source material, and filtering out shitposts, memes, engagement bait, vanity posts, and low-signal chatter. Use when reviewing at least 50 posts from the Following tab, especially to surface tech, AI, robotics, product, infrastructure, research, and startup news from followed accounts; follow linked articles/papers/repos/releases; and produce concise two-paragraph summaries per item in the same style as the Drop Site News and Hacker News skills."
---

# X Following News

Use this skill to turn the authenticated **Following** feed on X into a clean list of actual news items.

Default behavior: review at least 50 posts from the Following tab, filter aggressively for signal, follow linked sources where available, inspect tweet/thread context when needed, dedupe repeated reports, and produce a **two-paragraph summary per retained news item**.

## Priority Lens

Treat the X Following feed as the **primary source for tech / AI / robotics / startup / product / tooling news**.

Prioritize posts about:

- AI model releases, pricing, inference economics, evals, benchmarks
- coding agents, developer tools, infra, open-source launches, repos, releases
- robotics, drones, autonomy, defense tech, lab demos with real technical substance
- product launches, platform changes, API updates, outages, security incidents
- research papers, project pages, demos, benchmark results, hardware/software systems work

Also retain major geopolitical, macro, policy, or market items when they are genuinely substantive, but the feed should lean toward **tech/AI/robotics signal** by default.

## Workflow

1. Open `https://x.com/home` and switch to **Following**.
2. Treat collection and summarization as separate phases.
3. Collect **at least 50 unique posts** in feed order using **short, chunked collection steps** rather than one long browser-side loop.
4. After each collection step, persist cumulative results to a local checkpoint JSON file in the workspace, for example `workspace/tmp/x-following-collector.json`.
5. For each captured post, store at minimum:
   - author display name
   - handle
   - post URL / id
   - timestamp
   - text
   - quoted-post text/URL if present
   - external links/domains if present
6. Resume from the checkpoint if the run is interrupted; do not restart from zero unless the checkpoint is invalid.
7. After 50+ posts are collected, run a **candidate-first triage pass**:
   - rank likely high-signal posts from tweet text, linked domains, and visible specificity
   - shortlist roughly 12-15 candidates before opening lots of links
8. Resolve context before filtering shortlisted candidates:
   - if the post is a reply, inspect the parent/source tweet first
   - if the post is a quote tweet, inspect the quoted/source tweet first
   - if the post is a repost with commentary, treat the embedded/source tweet as primary and the commentary as secondary context
9. Filter aggressively, but only after context resolution:
   - **Keep** posts with concrete facts, real developments, useful links, first-hand evidence, or source tweets that contain them.
   - **Drop** memes, shitposts, vague takes, market cheering, vanity posts, ragebait, and low-information self-promo **only when the underlying source tweet is also low-signal**.
10. For each kept post:

- fetch the linked article/page/repo/paper/release when present
- inspect the source tweet, parent tweet, quoted tweet, or thread context when necessary to understand the claim

11. Merge obvious duplicates about the same event.
12. Produce 5-10 retained items by default, each with:

- headline
- primary URL
- lead tweet URL
- exactly two summary paragraphs

## Filtering Heuristics

Treat a post as **meaningful** when at least one applies:

- Announces or reports a launch, release, outage, policy change, security issue, benchmark, paper, acquisition, funding event, legal development, incident, or product update.
- Links to primary material: company blog, repo, paper, SEC filing, court document, press release, release notes, government page.
- Contains non-trivial specifics: dates, metrics, versions, names, prices, jurisdictions, technical details, or direct quotes.
- Provides first-hand evidence or a useful explanatory thread.
- Adds material context in a quote tweet or reply to a source tweet that is itself substantive.
- Is a short commentary post whose embedded/quoted/replied-to source tweet contains substantive news.

Treat a post as **high-priority tech signal** when it includes any of:

- GitHub / GitLab / Hugging Face / arXiv / project page / docs link
- benchmark numbers, latency, pricing, token economics, eval results
- release/version notes for AI/dev tools/products
- demos of robotics/autonomy systems with technical detail
- specific implementation details, architecture notes, or reproducible claims

Treat a post as **noise / shitpost** when most apply:

- Pure joke, meme, one-line dunk, ragebait, or vague sarcasm.
- Generic `huge`, `bullish`, `we are so back`, `gm`, `lol`, `based`, `cooked` without facts.
- Pure self-promo without concrete news.
- Recycled opinion without a new fact.
- Duplicate repost of the same claim already captured elsewhere.
- Context-free screenshot or clip with no reliable sourcing.

Important: do **not** drop a short reply, quote-post, repost, or culture-war-framed post until you inspect the underlying source tweet. If the source tweet contains real news, retain the item and summarize the source event first.

When uncertain, prefer resolving the source tweet before dropping the post.

## Link Following

For each retained post, prefer the external source over the tweet text alone.

Follow links to:

- article pages
- release notes
- research/project pages
- GitHub repos/releases/issues
- filings / court docs / regulator pages
- company blogs or incident pages
- product docs or benchmark pages

If there is no external link but the tweet/thread is still substantive:

- treat the source tweet/thread as the primary source
- if the visible post is a reply/quote/repost, summarize the embedded or parent tweet first and the commentary second
- surface uncertainty if the claim is weakly sourced or contested

## Deduplication Rules

Merge posts only when they are clearly the same underlying event:

- same source URL
- same company/product and same specific announcement
- same named incident/outage/policy/release within the same window

Do not over-cluster broad-topic chatter.

## Output Format

Use this structure for each retained item:

```text
Title: <headline>
Primary URL: <external-url-or-tweet-url>
X: <lead-tweet-url>

<Paragraph 1: what happened, who is involved, what the source says>

<Paragraph 2: why it matters, what the feed/thread adds, corroboration, caveats>
```

Writing rules:

- factual, compact, neutral
- exactly two paragraphs per retained item
- distinguish source facts from poster interpretation
- preserve attribution
- mention corroboration or disagreement only when it materially changes interpretation

## Dropped Noise Summary

If the user asks for a full feed briefing, append a short dropped-noise section such as:

- memes / jokes: n
- vague takes / cheering: n
- self-promo without news: n
- duplicate reactions: n

Do not let the dropped-noise section dominate the answer.

## Collection Method

Prefer an authenticated browser session. If auth is missing or the Following tab cannot be reached, say so explicitly instead of pretending to have reviewed the feed.

### Reliability Rules

- Prefer the browser tool as the primary collection path.
- Never rely on one long browser-side loop to collect 50+ posts.
- Never rely on one giant `evaluate()` call for the whole collection run.
- Keep each browser transaction short enough to complete comfortably; as a working rule, target roughly **5-7 seconds max per evaluate call**, including any wait after scrolling.
- Persist cumulative seen-post state after every collection step.
- Maintain two layers of checkpointing when possible:
  1. an in-page `window` accumulator for fast incremental collection during the active browser run
  2. a local JSON checkpoint in the workspace for resume-after-interruption behavior
- Resume from checkpoint after interruption; do not restart from zero unless the checkpoint is invalid.
- If a browser step succeeds repeatedly, it is acceptable to increase scroll distance moderately while keeping the same short timeout budget.
- If the browser-wrapper path degrades, first reduce step size or adjust scroll distance before changing transport layers.
- Treat collection, triage, context resolution, and summarization as distinct phases.

### Checkpoint Format

Use a local checkpoint file such as `workspace/tmp/x-following-collector.json` with a structure like:

```json
{
  "startedAt": "2026-03-10T09:30:00Z",
  "target": 50,
  "scrollSteps": 12,
  "stagnantSteps": 1,
  "seen": {
    "https://x.com/example/status/123": {
      "author": "Example Author",
      "handle": "@example",
      "timestamp": "2026-03-10T09:25:00Z",
      "text": "...",
      "quoted": [],
      "externalLinks": []
    }
  }
}
```

Exact field names may vary, but the collector must preserve enough data to resume without re-scanning the entire feed.

### Slow-scroll collection pattern

Use a **slow-scroll, accumulate-unique-links** approach:

- start from the top of the Following feed
- confirm **Following** is selected before collection begins
- load the existing checkpoint if present
- initialize an in-page accumulator if needed, for example `window.__ocSeen = {}`
- collect only the currently visible posts into the cumulative seen set
- persist the checkpoint
- begin with scroll steps of roughly **0.7-0.9 viewport heights**
- wait **2-3 seconds** after each scroll for new posts to render
- if collection remains stable, increase scroll size gradually up to roughly **1.6-2.2 viewport heights** while keeping calls short
- repeat in short steps until either:
  - at least 50 unique posts are collected, or
  - 3-4 consecutive scroll steps produce no new unique posts

Do **not** use a single fast jump to the bottom. Do **not** count only currently mounted DOM nodes. X recycles timeline nodes, so the collector must maintain a persistent set of seen post URLs.

Suggested chunked collection logic:

```javascript
window.__ocSeen ||= loadCheckpoint();
for (let i = 0; i < maxSteps; i++) {
  collectVisibleTweetsInto(window.__ocSeen); // keyed by status URL
  saveCheckpoint(window.__ocSeen);
  window.scrollBy(0, window.innerHeight * stepSize);
  await sleep(2200);
}
```

### Fallback Order

If the preferred browser-tool path degrades, use this order:

1. browser tool with short chunked collection calls
2. browser tool again with a smaller step size, shorter evaluate payload, or adjusted scroll distance
3. stop and report failure if the browser tool cannot reliably access the authenticated Following feed

Use a lower-level transport only when explicitly requested by the user or when the skill is later revised to bless a proven alternative path.

If structured post data already exists, process it with the same filtering and summarization rules. The minimum bar for a credible digest remains **50 reviewed unique posts** unless the user requests a smaller sample.
