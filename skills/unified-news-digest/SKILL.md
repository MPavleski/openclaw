---
name: unified-news-digest
description: "Aggregate and curate current news across the Drop Site News, Hacker News, Zero Hedge, and X/Twitter news skills. Use when producing a single merged news brief from all four sources, following hyperlinks when available, deduplicating overlapping stories across sources, balancing global news with tech/AI/robotics coverage sourced primarily from X/Twitter news and secondarily from Hacker News, writing the digest to workspace/news/YYYYMMDD_HH.md, and also rendering a formatted standalone HTML version via the markdown-html-report skill with latest.md and latest.html updated to the newest outputs. Best for: (1) daily or ad-hoc cross-source news digests, (2) merging the same story reported across sources, (3) preserving article/tweet/HN links for later reading, and (4) maintaining rolling latest Markdown and HTML digest files in the workspace."
---

# Unified News Digest

Use this skill to combine the four source-specific news skills into one curated digest.

Source skills:

- `drop-site-news`
- `hacker-news`
- `zerohedge`
- `x-news`

Default behavior: gather candidate items from all four sources using browser-first discovery, follow links to source material when available, summarize each retained item, merge duplicate/overlapping stories across sources, rank by importance and interest, then write a single digest markdown file in `workspace/news`, render a formatted standalone HTML version via the `markdown-html-report` skill, and update both `latest.md` and `latest.html` to point at the newest outputs.

Collection is mandatory for all four sources on every run. Do not silently skip a source because the first three produced enough material. Attempt collection from Drop Site News, Hacker News, Zero Hedge, and X/Twitter each time; if one source is unavailable, blocked, or yields no credible items, record that explicitly in a short collection note and continue.

## Output Contract

Always write the digest to:

- `news/YYYYMMDD_HH.md`
- `news/YYYYMMDD_HH.html`

Always update:

- `news/latest.md` → symlink to the newest markdown digest file
- `news/latest.html` → symlink to the newest HTML digest file

Use 24-hour local time in the workspace timezone.

Render the HTML version by applying the `markdown-html-report` skill to the just-written markdown digest. Use the same timestamp stem for both files so `20260314_05.md` and `20260314_05.html` are paired outputs of the same run.

## Target Mix and Count

Default target: **18-24 items** when source quality permits.  
Hard maximum: **30 items**.

Aim for this balance:

- **Global News:** 8-12 items
- **Tech / AI / Robotics News:** 8-12 items
  - **primary source: X / Twitter news**
  - **secondary source: Hacker News**
- **Interesting Reads from Hacker News:** 3-6 items

If one bucket is weak on a given run:

- backfill from the strongest remaining bucket
- but do not drop below **6 global-news items** unless sources are genuinely unavailable
- and do not omit the **Interesting Reads from Hacker News** section unless there are no worthy candidates

Do not stop at 10 merely because the top 10 are strong. Fill toward the target range when credible items exist.

## Browser Tool Policy

Use the OpenClaw `browser` tool as the default interactive collection path across the source skills, especially for homepage/feed discovery and link selection.

Rules:

- prefer browser-first collection for X/Twitter, Drop Site News, and Zero Hedge discovery
- use browser or `web_fetch` for Hacker News depending on whether interactive thread/navigation context is needed
- use `web_fetch` mainly for readable extraction of article pages after discovery
- if one source must fall back away from browser collection, say so in the digest when it materially affects confidence or coverage

## Workflow

1. Run or emulate the four source skills:
   - Drop Site homepage/article digest
   - Hacker News front page/item digest
   - Zero Hedge homepage/article digest
   - X/Twitter news digest
2. Confirm collection status for each source before drafting the digest:
   - `collected`: source reviewed and at least one credible candidate retained or rejected after inspection
   - `empty`: source reviewed but no credible candidates found
   - `degraded`: source partially reviewed due to access/rendering/rate-limit issues
   - `failed`: source could not be collected
3. Collect candidate items from each source with these fields when available:
   - title
   - source name
   - category bucket: `global-news`, `tech-ai-robotics`, or `interesting-read`
   - primary URL
   - secondary URL(s): HN item link, tweet URL, article link, repo link, etc.
   - short factual summary
   - why-it-matters context
   - timestamp or relative freshness
4. Follow hyperlinks whenever useful and available:
   - for HN, prefer linked article + HN item page
   - for X, prefer external source + lead tweet URL
   - for Drop Site and Zero Hedge, prefer the article page itself
5. Deduplicate and merge overlapping items across sources.
6. Rank retained items by a blend of:
   - objective importance
   - cross-source confirmation
   - novelty / timeliness
   - likely interest to the user
   - article quality for HN-only curiosities
7. Allocate items into the target buckets.
8. Produce a final curated list of **maximum 30 items**.
9. Write the digest markdown file.
10. Render the markdown into a formatted standalone HTML report by using the `markdown-html-report` skill.
11. Update `latest.md` and `latest.html` symlinks.

## Bucket Rules

### Global News

Include:

- wars, diplomacy, sanctions, security crises, elections, repression, international law
- macro, energy, trade, commodities, major labor or financial developments
- geopolitical or policy stories from Drop Site, Zero Hedge, and high-signal X items

Prefer cross-source or source-linked items when possible.

### Tech / AI / Robotics News

Use **X/Twitter news as the primary feeder** for this section.
Use **Hacker News as the secondary feeder** when X coverage is thin, duplicative, or lacks enough high-quality link-backed items.

Prioritize from X:

- AI model releases, pricing, inference economics, evals, benchmarks
- coding agents, devtools, infra, open-source launches, repos, releases
- robotics, drones, autonomy, defense tech, lab demos with technical detail
- product launches, API changes, outages, security incidents
- research papers, project pages, demos, hardware/software systems work

Use HN to supplement with:

- deeper linked article coverage
- technically substantive essays with current relevance
- strong discussion threads that add implementation, criticism, or context

For these items:

- prefer the linked article/repo/project page as `Primary`
- include the HN item URL as `HN` when relevant
- include the lead tweet URL as `X` when relevant
- summarize the underlying source first, then the platform context second

### Interesting Reads from Hacker News

Reserve a separate section for high-quality HN items that are not necessarily hard news but are especially worth reading.

Good candidates:

- computing history
- unusually strong technical essays
- thoughtful critiques or explainers
- distinctive demos / Show HN posts with real substance
- cultural essays with strong HN engagement and real intellectual value

Do not let this section crowd out the Global News or Tech / AI / Robotics sections.

## Deduplication Rules

Merge items when they are clearly the same underlying story, such as:

- same article URL or canonical landing page
- same company/product/release and same event window
- same geopolitical/macro event reported by multiple sources
- same paper, repo, funding round, incident, regulation, or public statement

When merging:

- keep one canonical headline
- preserve all useful source links
- note which sources carried the story
- combine factual detail conservatively; do not overstate agreement

Do **not** merge merely because topics are broad matches like `AI`, `markets`, or `Middle East`.

## Ranking Rules

Prefer this order:

1. High-importance world, policy, economic, security, or major-tech items with real source material
2. Cross-source items appearing in more than one feed
3. Tech / AI / robotics items from X with strong source links and meaningful discussion/support
4. Tech / AI / robotics items from HN with strong source links and meaningful discussion
5. High-quality single-source reporting from Drop Site or Zero Hedge with substantive claims
6. High-signal X items with primary links or first-hand evidence
7. Interesting HN feature essays and deep reads

Hacker News items can appear in both the tech bucket and the interesting-reads bucket, but the same item must not appear twice.

## Final Digest Structure

Write markdown in this structure:

```markdown
# Unified News Digest — YYYY-MM-DD HH:00

Generated from: Drop Site News, Hacker News, Zero Hedge, X/Twitter
Collection: Drop Site <status>; Hacker News <status>; Zero Hedge <status>; X/Twitter <status>
Collection notes: <very short note only if needed; otherwise omit>
Final curated items: N

## Top Global News

### 1. <headline>

- **Why it matters:** <one sentence>
- **Sources:** Drop Site | Zero Hedge | X | Hacker News
- **Links:** [Primary](...) · [HN](...) · [X](...) · [Alt](...)

<Paragraph 1: core facts>

<Paragraph 2: significance, context, caveats, why it matters>

## Tech / AI / Robotics News

### <headline>

- **Why it matters:** <one sentence>
- **Sources:** X | Hacker News
- **Links:** [Primary](...) · [X](...) · [HN](...) · [Alt](...)

<Paragraph 1>

<Paragraph 2>

## Interesting Reads from Hacker News

### <headline>

- **Why it matters:** <one sentence>
- **Sources:** Hacker News
- **Links:** [Primary](...) · [HN](...)

<Paragraph 1>

<Paragraph 2>
```

Requirements:

- maximum 30 total items across all sections
- target 18-24 items by default when credible material exists
- collect from all four sources on every run unless a source is genuinely unavailable
- include a single concise `Collection:` line covering all four sources
- include `Collection notes:` only when needed, and keep it terse
- exactly two paragraphs per item
- include source labels and hyperlinks when available
- use one canonical item per merged story
- preserve section balance: global + tech/AI/robotics + HN interesting reads

## Link Policy

For each item, preserve the best available links:

- `Primary`: best non-social source link
- `HN`: Hacker News item URL when relevant
- `X`: lead tweet URL when relevant
- `Alt`: secondary supporting article if useful

If no non-social source exists, use the best available platform URL and say the claim is platform-sourced.

## Writing Rules

- be concise, factual, and neutral
- avoid duplicative wording across items
- clearly distinguish verified reporting from commentary or reaction
- say when an item is based on a tweet/thread or a single-source article
- preserve uncertainty and attribution
- avoid filler intros and conclusions

## File Writing Rules

After generating the digest:

1. ensure `news/` exists in the workspace
2. write `news/YYYYMMDD_HH.md`
3. use the `markdown-html-report` skill to render `news/YYYYMMDD_HH.html` from that markdown file
4. replace `news/latest.md` with a symlink to the markdown filename
5. replace `news/latest.html` with a symlink to the HTML filename

Use relative symlink targets inside the `news/` directory, e.g.:

- `latest.md -> 20260310_10.md`
- `latest.html -> 20260310_10.html`

When invoking the HTML renderer, keep the document title aligned with the digest title, e.g. `Unified News Digest — YYYY-MM-DD HH:00`, and pass the local-date metadata when supported by the renderer.

If symlink creation is unavailable, overwrite `latest.md` and `latest.html` with the corresponding file contents as a fallback, but prefer real symlinks.

## Minimal Aggregation Logic

Pseudo-flow:

```javascript
items = [];
items.push(...collectDropSite());
items.push(...collectHackerNews());
items.push(...collectZeroHedge());
items.push(...collectXNews());

items = items.map(enrichLinksAndContext);
merged = mergeSameStory(items);
ranked = rankByImportanceAndInterest(merged);

buckets = allocate({
  global: ranked.filter(isGlobalNews).slice(0, 12),
  tech: ranked.filter(isTechAiRobotics).sort(preferXThenHN).slice(0, 12),
  reads: ranked.filter(isInterestingRead).slice(0, 6),
});

finalItems = balanceAndBackfill(buckets).slice(0, 30);

writeDigest(finalItems, (path = `news/${timestampHour}.md`));
renderHtmlFromMarkdown(`news/${timestampHour}.md`, `news/${timestampHour}.html`);
updateLatestSymlinks();
```

## Practical Notes

- Attempt all four sources every run before concluding coverage is sufficient.
- If one source is temporarily unavailable, continue with the others and note it in the short `Collection:` / `Collection notes:` header lines.
- Keep collection notes concise: one short clause per exception, no narrative process logs.
- If X yields too little data for a credible sample, include only clearly substantive X items and explicitly backfill from Hacker News for the tech bucket.
- Prefer fewer, better items over padding with junk, but still fill toward the target range when credible items exist.
- Use X proactively to populate the tech / AI / robotics bucket.
- Preserve several strong HN deep reads even when they are not breaking news.
- After the markdown digest is final, always render the paired HTML output in the same run so the Markdown and HTML versions stay in sync.
