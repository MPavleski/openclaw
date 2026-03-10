---
name: hacker-news
description: "Extract and summarize current stories from Hacker News (news.ycombinator.com). Use when reading the HN front page, newest page, or item comment threads; collecting top stories; fetching linked articles; and producing concise two-paragraph summaries similar to the Drop Site news skill. Best for: (1) front-page scans, (2) story-by-story summaries that combine the linked article with HN discussion, (3) digests of the top HN stories, and (4) filtering out jobs, duplicate links, and low-signal threads unless explicitly requested."
---

# Hacker News

## Overview

Use this skill to gather the current top stories from Hacker News and turn them into short, clean summaries.

Default behavior: use the OpenClaw `browser` tool or `web_fetch` to extract recent story links from `news.ycombinator.com`, follow each story to its linked article and HN comments page, then write a **two-paragraph summary per story**. Prefer browser when navigation or thread context matters, and `web_fetch` when the page structure is simple and readable. Prefer standard front-page stories with clear news or technical substance. Skip jobs, repeated links, dead pages, and low-signal threads unless the user asks for them.

## Source Pattern

Useful pages:

- Front page: `https://news.ycombinator.com/`
- Newest: `https://news.ycombinator.com/newest`
- Best: `https://news.ycombinator.com/best`
- Item thread: `https://news.ycombinator.com/item?id=<id>`

Typical story-card fields on listing pages:

- rank
- title
- outbound URL or local HN item URL
- score
- author
- age
- comment count
- item id

Important content types:

- standard external-link stories
- `Ask HN` text/discussion posts
- `Show HN` launch/demo posts
- job postings

Treat these differently. By default, include standard stories plus notable `Ask HN` or `Show HN` posts with clear substance; skip jobs unless requested.

## Extraction Workflow

1. Load the requested listing page, or the front page by default.
2. Collect visible story rows in order.
3. Extract for each row:
   - title
   - HN item id
   - HN comments URL
   - outbound URL if present
   - domain if shown
   - score
   - author
   - age
   - comment count
   - rank
4. Dedupe by HN item id. If needed, also dedupe by outbound URL.
5. Exclude by default unless requested:
   - job posts
   - obvious duplicates of the same outbound story
   - empty/dead links with no useful discussion
   - extremely low-signal threads
6. For each kept story:
   - fetch the linked article when there is an external URL
   - fetch the HN item page to inspect the thread
7. Write a **two-paragraph summary** for each story:
   - Paragraph 1: what the linked story or HN post is about
   - Paragraph 2: why it matters on HN, what the discussion focused on, and any notable skepticism, praise, or technical context

## Browser Tool Policy

Prefer the OpenClaw `browser` tool for interactive navigation and link discovery when working across Hacker News listing pages, item threads, and linked articles.

Rules:

- use `browser` when the task benefits from preserving on-page order, opening several HN items, or inspecting discussion context interactively
- use `web_fetch` for lightweight readable extraction of HN listing pages, item pages, or linked articles when the content is already known and browser interactivity is unnecessary
- prefer `browser` first if there is any ambiguity about page structure, ranking order, or thread navigation
- do not pretend browser access happened if it did not; fall back explicitly to `web_fetch`

## Listing Page Collection

Use `web_fetch` for Hacker News listing pages when the structure is straightforward. Prefer `browser` if ordering, navigation, or thread inspection becomes ambiguous.

Extraction heuristic:

- walk story rows in order
- keep the displayed title as the story title
- resolve the item id from the comments link or item URL
- capture score/comments metadata from the subtext row beneath each title
- preserve rank order for digests

Practical rules:

- `Ask HN:` and `Show HN:` are first-class stories, not noise
- `Launch HN:` is usually a startup/product launch post; keep only if the user wants launches or startup/news mix
- `jobs` links and hiring posts are skipped by default
- if a story links back to HN itself, treat the HN thread as primary

## Linked-Article Extraction

For standard stories with external URLs, prefer `web_fetch` on the outbound link.

Extract when available:

- headline
- publisher/domain
- publish date/time if available
- main body text
- key claims, numbers, releases, benchmarks, or announcements

Cleanup rules:

- strip cookie banners, nav, newsletter popups, and footer boilerplate
- keep factual claims, quotes, release details, and technical specifics
- if the article is inaccessible or heavily truncated, fall back to the HN title + snippet from the thread metadata and say the summary is based on available material

## HN Thread Extraction

Always inspect the HN item page when the user wants a summary or digest.

Extract when available:

- story title
- total points
- author
- age
- total comment count
- top comments or dominant themes

Comment-reading rules:

- read enough comments to identify the main discussion themes; do not try to summarize every subthread
- prioritize highly visible comments near the top and repeated themes across the thread
- capture disagreement, corrections, benchmarks, implementation details, or credibility concerns when they materially change interpretation
- ignore banter, one-liners, and shallow praise unless the thread is mostly lightweight
- if comments are sparse, say discussion was limited

## Filtering Rules

Keep by default:

- front-page stories with substantive linked reporting or technical content
- notable `Ask HN` threads with strong discussion value
- notable `Show HN` posts with meaningful product/technical details
- major releases, papers, incidents, benchmarks, tools, or policy stories discussed on HN

Skip by default unless requested:

- job posts
- duplicate submissions of the same link
- dead links with no meaningful thread
- low-comment or low-information items when better stories are available
- purely playful/off-topic items unless the user wants the actual front-page mix

If the front page is dominated by one theme, preserve that. Do not force artificial diversity.

## Two-Paragraph Summary Standard

For each story, produce:

- `Title:` displayed HN title
- `URL:` outbound URL if external, otherwise HN item URL
- `HN:` item URL
- `Summary:` exactly two paragraphs

Writing rules:

- be factual, compact, and neutral in tone
- distinguish clearly between what the linked article says and what HN commenters say
- preserve attribution for claims and corrections
- mention rank, score, and comment count when it helps explain prominence
- avoid copying long passages verbatim
- avoid meta filler like `this post is about`

Template:

```text
Title: <title>
URL: <external-url-or-item-url>
HN: <item-url>

<Paragraph 1: core content of the linked article or HN post>

<Paragraph 2: why HN cares, what the thread emphasized, contested, praised, or corrected>
```

## Practical Notes

- Front-page rank matters; preserve it when making a digest.
- Hacker News often surfaces the same theme across adjacent stories; summarize each story separately but note overlap when useful.
- For external links, the linked article is the primary source; HN comments provide reaction and context, not replacement reporting.
- For `Ask HN` and `Show HN`, the HN post itself is the primary source.
- If the user asks for a digest, default to the top 5-10 stories unless they request more.
- If the user asks for `newest`, expect lower-signal threads and less stable ranking.

## Minimal Extraction Logic

Pseudo-flow:

```javascript
listing = fetch("https://news.ycombinator.com/");
stories = collectStoryRows(listing)
  .map((row) => ({
    rank: row.rank,
    title: row.title,
    itemId: row.itemId,
    itemUrl: `https://news.ycombinator.com/item?id=${row.itemId}`,
    url: row.url,
    domain: row.domain,
    score: row.score,
    author: row.author,
    age: row.age,
    comments: row.comments,
  }))
  .filter((x) => !isJob(x))
  .filter((x) => !isLowSignal(x));

for (story of stories.slice(0, limit)) {
  article = story.url ? fetch(story.url) : null;
  thread = fetch(story.itemUrl);
  summary = summarizeToTwoParagraphs(article, thread, story);
}
```

Suggested utility filters:

```javascript
function isJob(story) {
  const s = `${story.title} ${story.url || ""} ${story.domain || ""}`.toLowerCase();
  return (
    s.includes("who is hiring") ||
    (s.includes("job") && (story.domain || "").includes("ycombinator.com"))
  );
}

function isLowSignal(story) {
  return (
    (story.comments === 0 || story.comments === "discuss") && (!story.score || story.score < 10)
  );
}
```

## Output Variants

### Top stories digest

Use when the user asks for the latest HN stories.

- Return 5-10 current stories
- Two paragraphs per story
- Preserve rank order

### Single-story brief

Use when the user gives one HN item URL or asks about one front-page story.

- Fetch the linked article and HN thread
- Return one two-paragraph summary

### Thread-focused brief

Use when the user mostly wants HN reaction.

- Read the item page first
- Keep paragraph 1 on the post/article itself
- Make paragraph 2 more comment-focused

### Ask HN / Show HN digest

Use when the user asks specifically for these categories.

- Treat the HN post as the main source
- Summarize the prompt/product first, then the thread reaction
