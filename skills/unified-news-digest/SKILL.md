---
name: unified-news-digest
description: "Aggregate and curate current news across the Drop Site News, Hacker News, Zero Hedge, and X/Twitter news skills. Use when producing a single merged news brief from all four sources, following hyperlinks when available, deduplicating overlapping stories across sources, balancing global news with tech/AI/robotics coverage sourced primarily from the X Following feed and secondarily from Hacker News, and writing the final digest to workspace/news/YYYYMMDD_HH.md with workspace/news/latest.md symlinked to the newest file. Best for: (1) daily or ad-hoc cross-source news digests, (2) merging the same story reported across sources, (3) preserving article/tweet/HN links for later reading, and (4) maintaining a rolling latest digest file in the workspace."
---

# Unified News Digest

Use this skill to combine the four source-specific news skills into one curated digest.

Source skills:

- `drop-site-news`
- `hacker-news`
- `zerohedge`
- `twitter-news` or `x-following-news`

Default behavior: gather candidate items from all four sources, follow links to source material when available, summarize each retained item, merge duplicate/overlapping stories across sources, rank by importance and interest, then write a single digest file in `workspace/news` and update `latest.md` to point at it.

## Output Contract

Always write the digest to:

- `news/YYYYMMDD_HH.md`

Always update:

- `news/latest.md` → symlink to the newest digest file

Use 24-hour local time in the workspace timezone.

## Target Mix and Count

Default target: **18-24 items** when source quality permits.  
Hard maximum: **30 items**.

Aim for this balance:

- **Global News:** 8-12 items
- **Tech / AI / Robotics News:** 8-12 items
  - **primary source: X Following / X news**
  - **secondary source: Hacker News**
- **Interesting Reads from Hacker News:** 3-6 items

If one bucket is weak on a given run:

- backfill from the strongest remaining bucket
- but do not drop below **6 global-news items** unless sources are genuinely unavailable
- and do not omit the **Interesting Reads from Hacker News** section unless there are no worthy candidates

Do not stop at 10 merely because the top 10 are strong. Fill toward the target range when credible items exist.

## Workflow

1. Run or emulate the four source skills:
   - Drop Site homepage/article digest
   - Hacker News front page/item digest
   - Zero Hedge homepage/article digest
   - X Following/news digest
2. Collect candidate items from each source with these fields when available:
   - title
   - source name
   - category bucket: `global-news`, `tech-ai-robotics`, or `interesting-read`
   - primary URL
   - secondary URL(s): HN item link, tweet URL, article link, repo link, etc.
   - short factual summary
   - why-it-matters context
   - timestamp or relative freshness
3. Follow hyperlinks whenever useful and available:
   - for HN, prefer linked article + HN item page
   - for X, prefer external source + lead tweet URL
   - for Drop Site and Zero Hedge, prefer the article page itself
4. Deduplicate and merge overlapping items across sources.
5. Rank retained items by a blend of:
   - objective importance
   - cross-source confirmation
   - novelty / timeliness
   - likely interest to the user
   - article quality for HN-only curiosities
6. Allocate items into the target buckets.
7. Produce a final curated list of **maximum 30 items**.
8. Write the digest markdown file.
9. Update `latest.md` symlink.

## Bucket Rules

### Global News

Include:

- wars, diplomacy, sanctions, security crises, elections, repression, international law
- macro, energy, trade, commodities, major labor or financial developments
- geopolitical or policy stories from Drop Site, Zero Hedge, and high-signal X items

Prefer cross-source or source-linked items when possible.

### Tech / AI / Robotics News

Use **X Following as the primary feeder** for this section.
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

Generated from: Drop Site News, Hacker News, Zero Hedge, X Following
Total reviewed sources: 4
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
3. replace `news/latest.md` with a symlink to that filename

Use relative symlink target inside the `news/` directory, e.g.:

- `latest.md -> 20260310_10.md`

If symlink creation is unavailable, overwrite `latest.md` with the same content as a fallback, but prefer a real symlink.

## Minimal Aggregation Logic

Pseudo-flow:

```javascript
items = [];
items.push(...collectDropSite());
items.push(...collectHackerNews());
items.push(...collectZeroHedge());
items.push(...collectXFollowing());

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
updateLatestSymlink();
```

## Practical Notes

- If one source is temporarily unavailable, continue with the others and say so at the top of the digest.
- If X yields too little data for a credible sample, include only clearly substantive X items and explicitly backfill from Hacker News for the tech bucket.
- Prefer fewer, better items over padding with junk, but still fill toward the target range when credible items exist.
- Use X proactively to populate the tech / AI / robotics bucket.
- Preserve several strong HN deep reads even when they are not breaking news.
