'use strict';

const { splitLines } = require('./shared/markdown');

// Term index + matching engine. Mixed into the plugin prototype.
//
// A term is a heading inside a glossary file. It has two faces the rest of the
// plugin keeps distinct:
//   label    — the heading text, what the reader sees as the link caption;
//   linktext — "Basename#Heading", what Obsidian resolves the link against.
// Identity, dedup and collisions are keyed on linktext: the same heading text in
// two different files is two different terms and surfaces as an ambiguous match.
module.exports = {
  // Keys for a word: the union from every language that claims it (same-script
  // languages overlap); words no language claims fall back to the exact form.
  keysFor(word) {
    const cacheKey = word.toLowerCase();
    if (!this.keysCache) this.keysCache = new Map();
    const cached = this.keysCache.get(cacheKey);
    if (cached) return cached;

    const out = [];
    const seen = new Set();
    for (const lang of this.activeLanguages) {
      if (!lang.match(word)) continue;
      for (const k of lang.keys(word, this.settings.matchMode)) {
        if (!seen.has(k)) { seen.add(k); out.push(k); }
      }
    }
    if (!out.length) out.push(cacheKey);
    this.keysCache.set(cacheKey, out);
    return out;
  },

  tokenizeForm(form) {
    const words = [...form.matchAll(/[\p{L}\p{Nd}]+/gu)].map((m) => m[0]);
    return words.map((raw) => ({ raw, lower: raw.toLowerCase(), keys: this.keysFor(raw) }));
  },

  rebuildIndex() {
    // keysFor depends on languages + matchMode, so a rebuild must drop its cache.
    this.keysCache = new Map();
    const byKey = new Map();
    const linktexts = new Set();
    const terms = [];
    const minTermLength = Math.max(1, this.settings.minTermLength || 1);
    const excludeTerms = new Set(splitLines(this.settings.excludeTerms).map((s) => s.toLowerCase()));
    const levels = new Set(this.settings.headingLevels || [1, 2, 3, 4, 5, 6]);

    this.headingFingerprints = new Map();
    for (const file of this.glossaryFilesList()) {
      const headings = this.headingsOf(file);
      this.headingFingerprints.set(file.path, JSON.stringify(headings));
      const base = file.basename;
      for (const { text: label, level } of headings) {
        if (!levels.has(level)) continue;
        // A heading with these can't be put in a [[File#Heading|word]] target: '|' starts
        // the alias, '[' ']' break the wikilink, '#' '^' start another subpath/block ref.
        if (/[[\]|#^]/.test(label)) continue;
        if (excludeTerms.has(label.toLowerCase())) continue;
        if (label.trim().length < minTermLength) continue;
        const words = this.tokenizeForm(label);
        if (!words.length) continue;

        const linktext = `${base}#${label}`;
        if (linktexts.has(linktext)) continue; // duplicate heading in the same file
        linktexts.add(linktext);
        // Mostly-uppercase headings (acronyms like "IT", "NASA") match case-sensitively
        // under smart case, so "IT" doesn't link every "it".
        const cs = isAcronymish(label);
        terms.push({ linktext, label, fileBase: base, path: file.path });

        const matcher = { linktext, label, fileBase: base, words, wordCount: words.length, cs };
        for (const k of words[0].keys) {
          if (!byKey.has(k)) byKey.set(k, []);
          byKey.get(k).push(matcher);
        }
      }
    }
    this.index = { byKey, termCount: linktexts.size };
    this.terms = terms;
  },

  // Linktexts of every term whose heading matches `text`. Runs the same matcher as
  // highlighting, so collisions agree with what gets linked.
  termsMatchingText(text) {
    const out = new Set();
    for (const m of this.findMatches(text, null)) {
      out.add(m.linktext);
      if (m.alts) for (const a of m.alts) out.add(a);
    }
    return [...out];
  },

  // currentFile: basename of the note being scanned, when it is itself a glossary
  // file — its own headings are skipped so a glossary file doesn't link to itself.
  findMatches(text, currentFile, opts = {}) {
    const protect = opts.protect ? this.computeProtected(text) : null;
    const smartCase = this.settings.smartCase;
    const tokens = [...text.matchAll(/[\p{L}\p{Nd}]+/gu)]
      .map((m) => {
        const raw = m[0];
        return { raw, start: m.index, end: m.index + raw.length, keys: this.keysFor(raw) };
      });

    const results = [];
    let i = 0;
    while (i < tokens.length) {
      const tk = tokens[i];
      const cands = [];
      const seen = new Set();
      for (const k of tk.keys) {
        const bucket = this.index.byKey.get(k);
        if (!bucket) continue;
        for (const c of bucket) { if (!seen.has(c)) { seen.add(c); cands.push(c); } }
      }

      // Does candidate c fit at token i? Multi-word terms must be contiguous with
      // only spaces/hyphens between, and every word's keys must overlap.
      const fits = (c) => {
        const wc = c.wordCount;
        if (i + wc > tokens.length) return false;
        for (let k = 0; k < wc; k++) {
          const t2 = tokens[i + k];
          const w = c.words[k];
          if (k > 0) {
            const between = text.slice(tokens[i + k - 1].end, t2.start);
            if (/[^\s-]/.test(between)) return false;
          }
          const t2keys = k === 0 ? t2.keys : this.keysFor(t2.raw);
          if (!t2keys.some((kk) => w.keys.includes(kk))) return false;
        }
        // Smart case: an acronym heading only fits when the surface text matches its case.
        if (smartCase && c.cs && text.slice(tokens[i].start, tokens[i + wc - 1].end) !== c.label) return false;
        return true;
      };

      let matched = null;
      let sorted = null;
      if (cands.length) {
        sorted = cands.length > 1 ? cands.slice().sort((a, b) => b.wordCount - a.wordCount) : cands;
        for (const c of sorted) {
          if (fits(c)) { matched = { c, start: tokens[i].start, end: tokens[i + c.wordCount - 1].end, wc: c.wordCount }; break; }
        }
      }

      if (matched && matched.c.fileBase !== currentFile) {
        const inProtected = protect && this.overlapsProtected(protect, matched.start, matched.end);
        if (!inProtected) {
          // Other headings that match the same span (different linktext).
          let alts = null;
          if (sorted.length > 1) {
            const seenLink = new Set([matched.c.linktext]);
            for (const c of sorted) {
              if (c.wordCount !== matched.wc || seenLink.has(c.linktext)) continue;
              if (fits(c)) { seenLink.add(c.linktext); (alts || (alts = [])).push(c.linktext); }
            }
          }
          results.push({
            start: matched.start,
            end: matched.end,
            linktext: matched.c.linktext,
            label: matched.c.label,
            display: text.slice(matched.start, matched.end),
            alts,
          });
          i += matched.wc;
          continue;
        }
      }
      i++;
    }
    return results;
  },

  // Ranges in raw markdown that must not be linked: frontmatter, code, links, urls, headings.
  computeProtected(text) {
    const ranges = [];
    const push = (re) => { let m; while ((m = re.exec(text)) !== null) ranges.push([m.index, m.index + m[0].length]); };

    if (/^---\r?\n/.test(text)) {
      const end = text.indexOf('\n---', 3);
      if (end !== -1) ranges.push([0, end + 4]);
    }
    push(/```[\s\S]*?```/g);
    push(/~~~[\s\S]*?~~~/g);
    push(/`[^`\n]+`/g);
    push(/\[\[[^\]]*\]\]/g);
    push(/\[[^\]]*\]\([^)]*\)/g);
    push(/(?:https?:\/\/|www\.)\S+/g);
    if (this.settings.skipHeadings) push(/^[ \t]*#{1,6}[ \t].*$/gm);

    return ranges.sort((a, b) => a[0] - b[0]);
  },

  // Frontmatter and code (fenced or inline) — the spans where a [[...]] isn't a real link.
  // Unlike computeProtected it keeps wikilinks and headings, since unlink acts on links and a
  // link inside a heading is still real.
  codeFrontmatterRanges(text) {
    const ranges = [];
    const push = (re) => { let m; while ((m = re.exec(text)) !== null) ranges.push([m.index, m.index + m[0].length]); };
    if (/^---\r?\n/.test(text)) {
      const end = text.indexOf('\n---', 3);
      if (end !== -1) ranges.push([0, end + 4]);
    }
    push(/```[\s\S]*?```/g);
    push(/~~~[\s\S]*?~~~/g);
    push(/`[^`\n]+`/g);
    return ranges.sort((a, b) => a[0] - b[0]);
  },

  overlapsProtected(ranges, s, e) {
    for (const [rs, re] of ranges) {
      if (rs >= e) break;
      if (re > s) return true;
    }
    return false;
  },

  // Same spans as computeProtected, but tested at a single position so it stays
  // cheap on every keystroke — no whole-document scan with greedy [\s\S]*? regexes.
  isProtectedAt(text, pos) {
    if (/^---\r?\n/.test(text)) {
      const end = text.indexOf('\n---', 3);
      if (end !== -1 && pos <= end + 4) return true;
    }
    const lines = text.split('\n');
    let lineStart = 0, lineIdx = 0;
    for (; lineIdx < lines.length; lineIdx++) {
      if (pos <= lineStart + lines[lineIdx].length) break;
      lineStart += lines[lineIdx].length + 1; // + the '\n'
    }
    let fenced = false;
    for (let i = 0; i < lineIdx; i++) {
      const s = lines[i].trimStart();
      if (s.startsWith('```') || s.startsWith('~~~')) fenced = !fenced;
    }
    if (fenced) return true;
    const line = lines[lineIdx] || '';
    if (this.settings.skipHeadings && /^[ \t]*#{1,6}[ \t]/.test(line)) return true;
    const col = pos - lineStart;
    return inMatch(line, col, /`[^`\n]+`/g)
      || inMatch(line, col, /\[\[[^\]]*\]\]/g)
      || inMatch(line, col, /\[[^\]]*\]\([^)]*\)/g)
      || inMatch(line, col, /(?:https?:\/\/|www\.)\S+/g);
  },
};

function inMatch(line, col, re) {
  let m;
  while ((m = re.exec(line)) !== null) {
    if (col > m.index && col < m.index + m[0].length) return true;
  }
  return false;
}

// Mostly-uppercase (an acronym like "IT", "NASA", "TCP/IP") — >75% of its letters
// are uppercase. Used by smart case to demand an exact-case match.
function isAcronymish(label) {
  const letters = [...label].filter((ch) => /\p{L}/u.test(ch));
  if (letters.length < 2) return false;
  const upper = letters.filter((ch) => ch !== ch.toLowerCase() && ch === ch.toUpperCase()).length;
  return upper / letters.length > 0.75;
}
