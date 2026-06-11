#!/usr/bin/env python3
"""Regenerate FAQPage JSON-LD from the visible FAQ markup, so schema and
visible copy can never drift. Visible copy is the source of truth.

Usage: python3 tools/geo/sync-faq-schema.py [paths...]
Defaults to every index.html under compare/ when no paths are given.
Reports each file changed; exits 0 always (idempotent).
"""
import json, re, sys, glob, html as h

FAQ_BLOCK = re.compile(r'<summary class="faq-question">(.*?)</summary>\s*<p class="faq-answer">(.*?)</p>', re.S)
LD_BLOCK = re.compile(r'(<script type="application/ld\+json">\s*)(\{.*?\})(\s*</script>)', re.S)

def flatten(fragment: str) -> str:
    """Strip tags, unescape entities, collapse whitespace."""
    text = re.sub(r'<[^>]+>', '', fragment)
    return re.sub(r'\s+', ' ', h.unescape(text)).strip()

def sync(path: str) -> bool:
    src = open(path).read()
    faqs = [(flatten(q), flatten(a)) for q, a in FAQ_BLOCK.findall(src)]
    if not faqs:
        return False

    changed = False

    def repl(m):
        nonlocal changed
        try:
            data = json.loads(m.group(2))
        except json.JSONDecodeError:
            return m.group(0)
        if data.get('@type') != 'FAQPage':
            return m.group(0)
        entity = [
            {"@type": "Question", "name": q,
             "acceptedAnswer": {"@type": "Answer", "text": a}}
            for q, a in faqs
        ]
        if data.get('mainEntity') == entity:
            return m.group(0)
        changed = True
        data['mainEntity'] = entity
        body = json.dumps(data, indent=4, ensure_ascii=False)
        body = '\n'.join('    ' + line for line in body.splitlines()).strip()
        return m.group(1) + body + m.group(3)

    out = LD_BLOCK.sub(repl, src)
    if changed:
        open(path, 'w').write(out)
    return changed

paths = sys.argv[1:] or sorted(glob.glob('compare/**/index.html', recursive=True))
touched = [p for p in paths if sync(p)]
for p in touched:
    print(f"synced {p}")
print(f"{len(touched)} file(s) updated, {len(paths)} scanned")
