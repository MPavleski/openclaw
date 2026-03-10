---
name: drop-site-news
description: "Extract and summarize current reporting from Drop Site News (dropsitenews.com / Substack). Use when reading the Drop Site homepage or article pages, collecting recent stories, extracting full article text, and producing concise two-paragraph news summaries similar to the Zero Hedge skill. Best for: (1) homepage headline scans, (2) article-by-article summaries, (3) digests of the latest Drop Site reporting, and (4) filtering out navigation, donation prompts, archive links, podcasts, and duplicate teaser cards."
---

# Drop Site News

## Overview

Use this skill to gather the latest editorial stories from Drop Site News and turn them into short, clean summaries.

Default behavior: extract recent `/p/` article links from the homepage, fetch each article page, then write a **two-paragraph summary per article**. Prefer reported news features and analysis pieces. Skip site chrome, donation asks, share links, archive navigation, and duplicate teaser cards.

## Source Pattern

Drop Site News is a Substack publication.

Useful patterns:

- Homepage: `https://www.dropsitenews.com/`
- Article pages: `https://www.dropsitenews.com/p/<slug>`
- Most real stories live under `/p/`
- Homepage contains duplicate teaser cards for the same article across sections; dedupe by canonical article URL
- Homepage also contains navigation and non-story `/p/` links such as donation or utility pages; filter by content quality, not path alone

## Extraction Workflow

1. Load the homepage.
2. Collect candidate article cards from the main feed.
3. Keep links that point to `/p/` article pages.
4. Dedupe by full URL.
5. Exclude obvious non-news items unless the user asked for everything:
   - donation / support pages
   - ways-to-give / store / about / leaderboard / notes
   - podcast-only or video-first items when they are not article-led
6. By default, also skip `Drop Site Daily` roundup posts unless the user explicitly asks for roundups/newsletters.
7. For each kept article, fetch the article page and extract:
   - title
   - dek / teaser if present
   - author
   - publish time/date
   - main body text
8. Write a **two-paragraph summary** for each article:
   - Paragraph 1: what happened, who is involved, and the core claim/reporting
   - Paragraph 2: why it matters, what evidence/context the article adds, and any unresolved implications

## Homepage Collection

Prefer browser snapshots for discovery and `web_fetch` for article text.

### Browser discovery pattern

On the homepage, article cards appear as `article` preview blocks with title/teaser links inside them. In browser snapshots, expect structures like:

- `role: article` with names like `Post preview for <title>`
- nested title link
- nested teaser/dek link
- time / author metadata

Extraction heuristic:

- walk visible article preview blocks in order
- collect the title link URL
- use teaser link text as the dek when available
- dedupe repeated URLs across homepage sections

## Article Extraction

Prefer `web_fetch` on individual article pages because Substack article pages are readable and usually return the full text cleanly.

Expected page components:

- title at top
- hero image/caption
- article body paragraphs
- share/footer links near the bottom

Cleanup rules:

- remove donation/support prompts at the top
- remove image URLs/captions unless editorially important
- remove trailing `Share` links and footer/navigation text
- keep quotes, sourcing, and factual claims from the article body

## Filtering Rules

Keep by default:

- reported news articles
- investigations
- analysis pieces tied to current events
- exclusives/interviews with clear news value

Skip by default unless requested:

- `Drop Site Daily` roundup/newsletter posts
- archive/category repeats
- donation/support/subscribe prompts
- utility pages (`ways-to-give`, `about`, `leaderboard`, etc.)
- duplicate cards for the same story

If the homepage is dominated by one topic, do not force artificial topic diversity. Preserve the publication’s actual news mix.

## Two-Paragraph Summary Standard

For each article, produce:

- `Title:` original article title
- `URL:` canonical article URL
- `Summary:` exactly two paragraphs

Writing rules:

- be factual, compact, and neutral in tone
- do not copy long passages verbatim
- preserve attribution for exclusive claims (`Drop Site reports`, `the article cites`, `an Iranian official told Drop Site`, etc.)
- include uncertainty where the article itself is sourcing anonymous officials, claims, or contested accounts
- avoid meta filler like `this article discusses`

Template:

```text
Title: <title>
URL: <url>

<Paragraph 1: core facts, actors, key development>

<Paragraph 2: significance, evidence, context, open questions>
```

## Practical Notes

- Homepage order is useful; it reflects editorial prominence.
- Some headlines and teasers repeat in topic sections lower on the page; dedupe aggressively.
- Substack pages may include uppercase author names or relative timestamps on the homepage and fuller dates on article pages; prefer article-page metadata when available.
- If the user asks for a digest, limit to the top 5-10 unique stories unless they request more.
- If the article text is truncated or blocked, fall back to homepage title + teaser and say the summary is based on the available excerpt.

## Minimal Extraction Logic

Pseudo-flow:

```javascript
homepage = load("https://www.dropsitenews.com/")
candidates = collect visible article preview cards
articles = dedupe(
  candidates
    .map(card => ({
      title: card.title,
      url: card.url,
      dek: card.dek,
      meta: card.meta,
    }))
    .filter(x => x.url.includes('/p/'))
    .filter(x => !isUtilityPage(x.url, x.title))
    .filter(x => !isDropSiteDaily(x.title))
)

for (article of articles.slice(0, limit)) {
  page = fetch(article.url)
  body = extractReadableBody(page)
  summary = summarizeToTwoParagraphs(body, article)
}
```

Suggested utility filters:

```javascript
function isUtilityPage(url, title = "") {
  const s = `${url} ${title}`.toLowerCase();
  return [
    "/p/ways-to-give",
    "/about",
    "/leaderboard",
    "/notes",
    "donate",
    "support drop site",
  ].some((x) => s.includes(x));
}

function isDropSiteDaily(title = "") {
  return /drop site daily/i.test(title);
}
```

## Output Variants

### Latest stories list

Use when the user asks for the latest Drop Site news.

- Return 5-10 recent unique articles
- Two paragraphs per article

### Single-article brief

Use when the user gives one Drop Site URL.

- Fetch that page only
- Return one two-paragraph summary

### Topic-focused digest

Use when the user asks for a topic such as Iran, Gaza, Lebanon, Pakistan.

- Start from homepage or archive/topic pages if provided
- Keep only matching articles
- Return two paragraphs per matching article
