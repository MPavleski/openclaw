---
name: zerohedge
description: "Extract and summarize current non-premium Zero Hedge stories (zerohedge.com) by following article links and reading full pages. Use when scanning the Zero Hedge homepage, collecting the latest editorial stories, fetching article text, and producing concise two-paragraph summaries per article in the same style as the Drop Site News and Hacker News skills. Best for: (1) homepage headline scans, (2) article-by-article summaries, (3) digests of the latest Zero Hedge editorial coverage, and (4) filtering out premium blocks, contributor/sponsored content, utility links, and duplicate promos unless explicitly requested."
---

# Zero Hedge

## Overview

Use this skill to gather the latest editorial stories from Zero Hedge and turn them into short, clean summaries.

Default behavior: use the OpenClaw `browser` tool to extract current non-premium editorial article links from the homepage, then use `web_fetch` on each article page and write a **two-paragraph summary per article**. Prefer main newsroom/editorial pieces. Skip premium blocks, contributor promotions, partner content, navigation, and duplicate teaser cards unless the user asks for them.

## Source Pattern

Useful pages:

- Homepage: `https://www.zerohedge.com/`
- Editorial article pages usually live under category paths such as:
  - `/markets/...`
  - `/geopolitical/...`
  - `/political/...`
  - `/economics/...`
  - `/commodities/...`
  - `/energy/...`
  - `/crypto/...`
  - `/precious-metals/...`
  - `/technology/...`
  - `/medical/...`
  - `/military/...`

Homepage content types commonly include:

- main editorial articles
- contributor articles
- partner/syndicated content
- premium or subscriber-only promos
- navigation and utility links

Treat only main editorial articles as the default source set unless the user asks for broader coverage.

## Extraction Workflow

1. Load the homepage.
2. Collect candidate article cards/headlines in visual order.
3. Keep links that resolve to standard article pages.
4. Dedupe by canonical article URL.
5. Exclude by default unless requested:
   - contributor articles
   - sponsored / partner content
   - premium-only promos
   - category landing pages and utility links
   - duplicate homepage promos for the same story
6. For each kept article, fetch the article page and extract:
   - title
   - category
   - author/byline if present
   - publish date/time if present
   - main body text
7. Write a **two-paragraph summary** for each article:
   - Paragraph 1: what happened, who is involved, and the core claim/reporting
   - Paragraph 2: why it matters, what evidence/context the article adds, and any unresolved implications

## Browser Tool Policy

Use the OpenClaw `browser` tool as the primary path for Zero Hedge homepage discovery.

Rules:

- prefer `browser` for homepage scanning, preserving visual order, and separating editorial articles from contributor, partner, premium, or utility blocks
- use `web_fetch` for individual article extraction after the article URL is known
- if browser rendering is unavailable or degraded, fall back to `web_fetch` for homepage extraction and note the reduced confidence
- do not rely on brittle exact class-name matching when a browser snapshot can reveal the visible structure directly

## Homepage Collection

Prefer browser snapshots for homepage discovery and `web_fetch` for article text.

Zero Hedge frontend class names can include hashed suffixes. Use prefix matching instead of exact class names when inspecting the homepage.

Stable patterns:

- main editorial article titles often use class prefixes like `Article_title`
- contributor blocks often use prefixes like `ContributorArticle`
- partner blocks may use prefixes like `NewsquawkArticle` or `TheMarketEarArticle`

Extraction heuristic:

- inspect headline/title elements in visual order
- include only elements matching the main editorial article pattern
- collect title and URL from the nested link
- dedupe repeated URLs across hero, feed, and lower-page sections

## Article Extraction

Prefer `web_fetch` on individual article pages because it usually returns readable full text without needing brittle DOM logic.

Extract when available:

- title
- byline / author
- publish date or relative time
- category from URL path or page metadata
- body paragraphs

Cleanup rules:

- remove subscription prompts, inline donation asks, promo blocks, and footer/navigation text
- keep quotes, figures, cited institutions, and factual claims
- remove repeated market tickers or embedded widget text unless editorially necessary
- if the article is truncated, blocked, or premium-only, fall back to the visible excerpt and say the summary is based on available material

## Filtering Rules

Keep by default:

- current editorial articles with reported developments, analysis tied to real events, or market-moving claims
- major macro, geopolitical, policy, commodities, rates, energy, or technology pieces with clear substantive content

Skip by default unless requested:

- contributor articles
- sponsored / partner content
- premium-only or subscriber-gated promos
- utility/navigation/category pages
- duplicate cards for the same story
- pure video/promotional embeds without article substance

If the homepage is dominated by one macro theme, preserve that. Do not force artificial topic diversity.

## Two-Paragraph Summary Standard

For each article, produce:

- `Title:` original article title
- `URL:` canonical article URL
- `Category:` category if clear
- `Summary:` exactly two paragraphs

Writing rules:

- be factual, compact, and neutral in tone even when the source framing is polemical
- preserve attribution for claims (`Zero Hedge says`, `the article cites`, `according to X`, etc.) when needed
- distinguish observed facts from speculation, predictions, or rhetorically framed claims
- avoid copying long passages verbatim
- avoid meta filler like `this article discusses`

Template:

```text
Title: <title>
URL: <url>
Category: <category>

<Paragraph 1: core facts, actors, key development>

<Paragraph 2: significance, evidence, context, open questions>
```

## Practical Notes

- Homepage order matters; it reflects current editorial prominence.
- Some stories may appear multiple times on the homepage; dedupe aggressively.
- Category is usually inferable from the first URL path segment.
- If the user asks for a digest, default to the top 5-10 unique editorial stories unless they request more.
- If the page extraction is noisy, prioritize article headline, subhead, and main body paragraphs over surrounding widgets and sidebars.

## Minimal Extraction Logic

Pseudo-flow:

```javascript
homepage = load("https://www.zerohedge.com/");
candidates = collectHeadlineBlocks(homepage);
articles = dedupe(
  candidates
    .filter((x) => isMainEditorial(x))
    .filter((x) => !isContributor(x))
    .filter((x) => !isPartner(x))
    .filter((x) => !isUtilityPage(x.url, x.title)),
);

for (article of articles.slice(0, limit)) {
  page = fetch(article.url);
  body = extractReadableBody(page);
  summary = summarizeToTwoParagraphs(body, article);
}
```

Suggested utility filters:

```javascript
function isContributor(x) {
  return /^ContributorArticle/i.test(x.className || "");
}

function isPartner(x) {
  return [/^NewsquawkArticle/i, /^TheMarketEarArticle/i].some((r) => r.test(x.className || ""));
}

function isUtilityPage(url = "", title = "") {
  const s = `${url} ${title}`.toLowerCase();
  return ["/premium", "/subscribe", "/about", "/advertise", "/podcasts", "/video"].some((x) =>
    s.includes(x),
  );
}
```

## Output Variants

### Latest stories digest

Use when the user asks for the latest Zero Hedge news.

- Return 5-10 recent unique editorial articles
- Two paragraphs per article

### Single-article brief

Use when the user gives one Zero Hedge URL.

- Fetch that page only
- Return one two-paragraph summary

### Topic-focused digest

Use when the user asks for a topic such as Fed, oil, gold, Russia, China, or AI.

- Start from homepage or provided URLs
- Keep only matching articles
- Return two paragraphs per matching article
