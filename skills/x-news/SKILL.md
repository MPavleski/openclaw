---
name: x-news
description: "Extract and summarize current news from X/Twitter feeds by following links, reading source material, and filtering out shitposts and non-news. Use when scanning the X home timeline, Following feed, lists, profiles, or tweet URLs; collecting substantive posts; following linked articles, papers, release notes, repos, or threads; and producing concise two-paragraph summaries per retained news item in the same style as the Drop Site News and Hacker News skills. Best for: (1) tech/AI/robotics/current-product news from X, (2) story-by-story summaries that combine the source link with tweet context, (3) filtering out memes, jokes, vanity posts, and engagement bait, and (4) summarizing individual tweets, threads, or linked news items."
---

# X News

## Overview

Use this skill to extract actual news from X/Twitter and turn it into short, clean summaries. Organize retained items using agent judgment, not a clustering script.

Default behavior: use the OpenClaw `browser` tool to collect posts from the requested feed or account, filter aggressively for substantive news, follow external links when present, inspect quoted/context tweets when necessary, then write a **two-paragraph summary per retained news item**. Do not summarize the feed as vibes. Keep real developments; drop shitposts.

## Priority Lens

Treat X as especially useful for:

- **tech / AI / robotics news**
- startup and product launches
- open-source releases and repo-linked announcements
- model pricing, evals, benchmarks, and deployment notes
- fast-moving infra, security, API, and outage news

When operating on X feeds, bias toward retaining these categories over generic commentary.

## Source Pattern

Useful sources:

- Home timeline: `https://x.com/home`
- Following feed: `https://x.com/home` with **Following** selected
- List feeds
- Profile timelines
- Individual tweet URLs: `https://x.com/<handle>/status/<id>`

Relevant post types:

- standalone tweet with substantive factual content
- tweet linking to an external article, paper, repo, filing, blog, release page, or government source
- quote tweet adding material context
- thread starter followed by explanatory replies
- reposts only if the repost adds meaningful commentary

Non-news/noise types:

- memes, jokes, dunking, ragebait
- personal chatter/status updates
- vague opinions without a new fact
- market cheering / tribal slogans / one-line reactions
- pure self-promo without substance
- screenshot-only posts with no context

## Extraction Workflow

1. Open the requested feed, account, or tweet URL.
2. Collect enough posts to avoid cherry-picking. Default target for feeds: **at least 50 posts**.
3. For each candidate post, extract:
   - display name
   - handle
   - post URL
   - timestamp
   - main text
   - quoted-post text and URL if present
   - visible external links/domains if present
   - engagement signals if convenient
4. Score each post for news value.
5. Keep only substantive posts, but resolve quote/reply/repost context before deciding.
6. For each kept item:
   - fetch the linked source when an external URL exists
   - inspect the source tweet, parent tweet, quoted tweet, or thread when needed for missing context
   - if the visible post is short commentary, use the embedded/replied-to source tweet as the primary object of analysis
7. Dedupe near-identical posts about the same event.
8. Write a **two-paragraph summary per retained item**:
   - Paragraph 1: what happened according to the source material or primary tweet/thread
   - Paragraph 2: why it matters, what evidence/support exists, and how the X post(s) frame or validate it

## Browser Tool Policy

Use the OpenClaw `browser` tool as the primary collection path for X/Twitter.

Rules:

- prefer `browser` over `web_fetch` for X timeline discovery, tweet opening, tab switching, and thread/context inspection
- use the OpenClaw-managed browser profile when available; use an attached Chrome relay tab when that is the authenticated path
- use short browser interactions and incremental collection steps rather than one giant page script
- use `web_fetch` only for external linked articles/pages after they are discovered from X, not as the primary way to read X itself
- if the authenticated X session is unavailable, say so explicitly rather than pretending the feed was reviewed

## Collection Rules

Prefer the authenticated browser session for X discovery.

### Feed collection

For feeds or profile timelines:

- review at least 50 **unique** posts unless the user asked for a smaller sample
- preserve feed order during triage
- collect candidate posts before filtering
- use **slow incremental scrolling** instead of a fast jump
- scroll by about **0.7-0.9 viewport heights** per step
- wait **2-3 seconds** after each scroll for rendering and hydration
- maintain a set of seen `/status/` URLs because X virtualizes/recycles timeline DOM nodes
- stop after reaching the target sample or after 3-4 stagnant scroll steps with no new unique posts

### Single-post collection

For a specific tweet URL:

- open the tweet
- read the main post
- inspect quoted tweet if present
- inspect thread replies by the same author if they materially expand context
- follow any linked external source

## Filtering Rules

Keep a post only if at least one of these is true:

- announces or reports a concrete event, release, policy change, incident, benchmark, funding round, acquisition, outage, paper, launch, security issue, legal development, or market-moving claim
- links to primary or high-signal source material
- contains non-trivial specifics: numbers, dates, versions, jurisdictions, customer names, technical details, quoted statements, or evidence
- is first-hand reporting or a meaningful thread that explains a development
- is a quote tweet or reply that adds material factual context to the underlying source post
- is a short commentary post whose embedded/quoted/replied-to source post is itself substantive news

Prefer keeping a post when it concerns:

- AI model or agent releases
- devtools, infra, robotics, autonomy, or security
- open-source/software launches with repos/docs
- research claims that link to papers or project pages

Drop a post if most of these are true:

- mostly meme, joke, sarcasm, reaction, dunk, or vibe
- no new fact or verifiable claim
- generic cheerleading (`bullish`, `huge`, `we are so back`, `gm`, `lol`, `based`, `cooked`)
- personal life update or attention bait
- low-information promo for a product/event without concrete details
- duplicate reaction to a story already captured from a better source

Important: do **not** drop a culture-war-framed post, short reply, quote-post, or repost until the underlying source post is inspected. If the underlying source contains real news, keep the item and center the summary on that source event.

When uncertain, prefer resolving the source post before dropping low-information commentary.

## Link Following Rules

For retained posts, prefer external source material over tweet text alone.

Follow links to:

- company blogs
- release notes
- GitHub repos/issues/releases
- research papers or project pages
- government/regulator pages
- filings / court docs / press releases
- major newsroom articles when primary sources are unavailable
- docs, changelogs, benchmark pages, or demos

If a post has no external link but is still newsworthy:

- use the source tweet/thread itself as the primary source
- if the visible post is commentary on another tweet, summarize the underlying source tweet first and the commentary second
- cite uncertainty if the claim is unverified or thinly sourced

If multiple posts discuss the same event:

- keep the strongest one as the lead item
- use others only to corroborate, contextualize, or challenge it

## Deduplication and Grouping

Default unit of output: **one summary per retained news item**.

Use agent judgment to decide whether posts belong to the same story. Do not rely on any external clustering script or pre-baked grouping heuristic beyond the rules in this skill.

Group posts together only when they are clearly about the same underlying event and materially overlap:

- same linked article/repo/filing
- same product release or outage
- same named incident, policy, funding round, or announcement
- same company/entity and same event window

Do not over-cluster unrelated posts just because they share a broad topic like `AI` or `markets`.

## Two-Paragraph Summary Standard

For each retained item, produce:

- `Title:` short descriptive headline based on the event, not necessarily the tweet text
- `Primary URL:` external source if present, otherwise tweet URL
- `X:` lead tweet URL
- `Summary:` exactly two paragraphs

Writing rules:

- be factual, compact, and neutral in tone
- distinguish clearly between what the source says and what the tweet adds
- preserve attribution for claims and corrections
- mention corroboration when multiple posts support the same item
- avoid copying tweet text verbatim unless quoting a key line briefly
- avoid meta filler like `users discussed`

Template:

```text
Title: <headline>
Primary URL: <external-url-or-tweet-url>
X: <lead-tweet-url>

<Paragraph 1: core news, actors, facts, direct source material>

<Paragraph 2: significance, evidence, corroboration, caveats, X-specific context>
```

## Practical Notes

- Use **Following**, not **For you**, unless the user explicitly asks for algorithmic feed content.
- X is noisy by default; aggressive filtering is a feature, not a bug.
- If the sample is too small or auth is unavailable, say so explicitly.
- If collection stalls early, suspect scrolling that is too fast or a collector that only counts currently mounted DOM nodes.
- Prefer accumulating unique status URLs over tweet-node counts.
- A quote tweet can be newsworthy even if the original post is weak, but only when the quote adds real facts.
- Screenshots alone are weak evidence unless the source is identifiable and the content is legible and specific.
- If a feed is dominated by one theme, preserve that rather than inventing balance.

## Minimal Extraction Logic

Pseudo-flow:

```javascript
posts = collectPosts(feed, (minimum = 50));
kept = posts
  .filter((post) => hasNewsValue(post))
  .map((post) =>
    enrich(post, {
      source: post.url ? fetchLinkedSource(post) : null,
      thread: needsContext(post) ? fetchThread(post) : null,
      quote: post.quotedUrl ? fetchQuoted(post) : null,
    }),
  )
  .filter((post) => !isDuplicate(post));

for (item of kept.slice(0, limit)) {
  summary = summarizeToTwoParagraphs(item);
}
```

Suggested signal filters:

```javascript
function hasNewsValue(post) {
  const text = (post.text || "").toLowerCase();
  if (!text && !post.externalUrl) return false;
  if (/(^|\b)(gm|lol|lfg|based|bullish|bearish|huge|wow)(\b|$)/i.test(text) && text.length < 80)
    return false;
  if (emojiDensity(post.text) > 0.3) return false;
  return Boolean(
    post.externalUrl ||
    /\b(launch|release|outage|funding|acquire|policy|paper|benchmark|security|breach|law|court|files|announces?)\b/i.test(
      text,
    ) ||
    containsSpecificNumbersOrDates(text),
  );
}
```

## Output Variants

### Feed digest

Use when the user asks for the latest X/Twitter news.

- Review at least 50 posts when possible
- Return 5-10 retained news items
- Two paragraphs per item

### Single-post brief

Use when the user gives one tweet URL.

- Follow any linked source
- Read thread/quoted context if needed
- Return one two-paragraph summary

### Account or list digest

Use when the user asks for news from one account or list.

- Review a reasonable sample of recent posts
- Keep only substantive items
- Return two paragraphs per retained item
