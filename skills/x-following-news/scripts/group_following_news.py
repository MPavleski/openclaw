#!/usr/bin/env python3
import argparse
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path
from urllib.parse import urlparse

STOP = {
    'the','a','an','and','or','to','of','in','on','for','with','from','by','at','is','are','was','were','be','been','it','this','that','as','but','if','into','than','then','so','we','you','they','he','she','them','our','your','their','will','just','about','after','before','over','under','not','new'
}
NOISE_PATTERNS = [
    r'\bgm\b', r'\bgn\b', r'\blfg\b', r'\bbullish\b', r'\bbearish\b', r'\bwe are so back\b',
    r'\bit(?:\'|’)s over\b', r'\bbased\b', r'\bcooked\b', r'\blol\b', r'\blmao\b', r'\brofl\b',
    r'\bmeme\b', r'\bshitpost\b'
]
SIGNAL_PATTERNS = [
    r'\blaunch(?:ed)?\b', r'\brelease(?:d)?\b', r'\bannounc(?:e|ed|ement)\b', r'\bpaper\b',
    r'\bbenchmark\b', r'\bincident\b', r'\boutage\b', r'\bvulnerability\b', r'\bcve-\d{4}-\d+\b',
    r'\bfunding\b', r'\bacquisition\b', r'\bsec\b', r'\bfiling\b', r'\bpolicy\b', r'\bregulat',
    r'\bopen source\b', r'\bgithub\b', r'\brepo\b', r'\bpricing\b', r'\broadmap\b',
    r'\bapi\b', r'\bmodel\b', r'\bversion\b', r'\bv\d+(?:\.\d+)+\b'
]
PRIMARY_DOMAINS = {
    'github.com','arxiv.org','sec.gov','blog.google','openai.com','anthropic.com','techcrunch.com',
    'theverge.com','docs.github.com','cloudflarestatus.com','status.openai.com','substack.com'
}


def load_posts(path: Path):
    text = path.read_text(encoding='utf-8').strip()
    if not text:
        return []
    if text[0] == '[':
        return json.loads(text)
    posts = []
    for line in text.splitlines():
        line = line.strip()
        if line:
            posts.append(json.loads(line))
    return posts


def norm(s: str) -> str:
    return re.sub(r'\s+', ' ', (s or '').strip())


def tokens(*parts):
    text = ' '.join(norm(p).lower() for p in parts if p)
    words = re.findall(r'[a-z0-9][a-z0-9\-\.]{2,}', text)
    return {w for w in words if w not in STOP and not w.startswith('http')}


def domain(url: str) -> str | None:
    try:
        return urlparse(url).netloc.lower().removeprefix('www.') or None
    except Exception:
        return None


def score_post(post):
    text = norm(post.get('text', ''))
    quoted = norm(post.get('quoted_text', ''))
    doms = set(post.get('domains') or [])
    if not doms and post.get('url'):
        d = domain(post['url'])
        if d and d not in {'x.com', 'twitter.com'}:
            doms.add(d)

    score = 0
    reasons = []
    lowered = f'{text} {quoted}'.lower()

    if any(re.search(p, lowered) for p in SIGNAL_PATTERNS):
        score += 2
        reasons.append('contains news-like keywords')

    if re.search(r'\b\d{2,}\b', lowered):
        score += 1
        reasons.append('contains concrete numbers')

    if len(text) >= 180:
        score += 1
        reasons.append('contains substantial text')

    if doms:
        score += 2
        reasons.append('links to external source')

    if any(d in PRIMARY_DOMAINS or d.endswith('.gov') for d in doms):
        score += 2
        reasons.append('links to primary/high-signal domain')

    if any(re.search(p, lowered) for p in NOISE_PATTERNS):
        score -= 2
        reasons.append('contains low-signal language')

    short = len(text) < 40 and not doms
    if short:
        score -= 2
        reasons.append('very short without source link')

    emoji_heavy = len(re.findall(r'[\U0001F300-\U0001FAFF]', text)) >= 3
    if emoji_heavy:
        score -= 1
        reasons.append('emoji-heavy')

    keep = score >= 2
    return keep, score, reasons, sorted(doms)


def group_key(post):
    doms = [d for d in (post.get('domains') or []) if d not in {'x.com', 'twitter.com'}]
    if doms:
        return ('domain', sorted(doms)[0])
    toks = sorted(tokens(post.get('text', ''), post.get('quoted_text', '')))
    salient = [t for t in toks if len(t) > 4][:6]
    return ('kw', ' '.join(salient[:3]) if salient else post.get('handle', 'unknown'))


def headline(posts):
    cnt = Counter()
    for p in posts:
        cnt.update(tokens(p.get('text', ''), p.get('quoted_text', '')))
    words = [w for w, _ in cnt.most_common(5)]
    if not words:
        return 'Miscellaneous update'
    return ' / '.join(words[:3]).replace('-', ' ')


def summarize(posts):
    lead = max(posts, key=lambda p: (p['_score'], len(p.get('text', ''))))
    txt = norm(lead.get('text', ''))
    txt = re.sub(r'\s+', ' ', txt)
    if len(txt) > 220:
        txt = txt[:217].rstrip() + '...'
    return txt or 'See supporting posts.'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('input')
    ap.add_argument('--min-posts', type=int, default=50)
    args = ap.parse_args()

    posts = load_posts(Path(args.input))
    if len(posts) < args.min_posts:
        print(f'Insufficient sample: {len(posts)} posts provided, need at least {args.min_posts}.', file=sys.stderr)
        sys.exit(2)

    kept, dropped = [], []
    drop_reasons = Counter()

    for p in posts:
        keep, score, reasons, doms = score_post(p)
        p['_score'] = score
        p['domains'] = doms or p.get('domains') or []
        if keep:
            kept.append(p)
        else:
            dropped.append(p)
            reason = ' / '.join(sorted(set(reasons[:2]))) if reasons else 'low signal'
            drop_reasons[reason] += 1

    groups = defaultdict(list)
    for p in kept:
        groups[group_key(p)].append(p)

    ordered = sorted(groups.values(), key=lambda g: (-max(p['_score'] for p in g), -len(g), headline(g)))

    print('### Feed Brief')
    print(f'- Posts reviewed: {len(posts)}')
    print(f'- Posts kept: {len(kept)}')
    print(f'- Posts dropped: {len(dropped)}')
    themes = [headline(g) for g in ordered[:5]]
    print(f"- Main themes: {', '.join(themes) if themes else 'none'}")
    print()

    for idx, grp in enumerate(ordered, 1):
        h = headline(grp)
        print(f'### Group {idx} — {h}')
        print(f'- **Summary:** {summarize(grp)}')
        print(f'- **Why it matters:** Multiple posts in the feed point to the same substantive development.')
        print('- **Evidence:**')
        for p in sorted(grp, key=lambda x: (-x['_score'], x.get('handle', '')))[:5]:
            handle = p.get('handle', 'unknown')
            text = norm(p.get('text', ''))
            note = text[:120].rstrip() + ('...' if len(text) > 120 else '')
            print(f"  - @{handle} — {note} — {p.get('url', '')}")
        print()

    print('### Dropped as noise')
    for reason, n in drop_reasons.most_common(8):
        print(f'- {reason}: {n}')


if __name__ == '__main__':
    main()
