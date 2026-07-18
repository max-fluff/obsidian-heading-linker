'use strict';

const { splitLines } = require('./shared/markdown');
const { createMatcher } = require('./shared/prose/matcher');

// Term index + matching engine. Mixed into the plugin prototype.
//
// The scan itself lives in shared/prose/matcher.js — it is the same one the glossary linker
// runs, so a word means the same thing to both. What stays here is what is genuinely ours:
// a term is a heading inside a source file, and it has two faces the rest of the plugin
// keeps distinct:
//   label    — the heading text, what the reader sees as the link caption;
//   linktext — "Basename#Heading", what Obsidian resolves the link against.
// Identity, dedup and collisions are keyed on linktext: the same heading text in two
// different files is two different terms and surfaces as an ambiguous match.
const core = createMatcher({
  // Two different strings here, unlike the glossary: a heading is identified by its full
  // linktext, but "is this the note's own term?" is a question about the file it lives in.
  idOf: (c) => c.linktext,
  selfIdOf: (c) => c.fileBase,
  fieldsOf: (c) => ({ linktext: c.linktext, label: c.label }),
  // Smart case: an acronym-like form ("CNS", "TCP/IP") only matches text spelled the same
  // way, so "cns" in prose is left alone.
  caseFits: (plugin, c, surface) => !plugin.settings.smartCase || !c.cs || surface === c.caseText,
});

module.exports = Object.assign({}, core, {
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
      this.headingFingerprints.set(file.path, this.fileFingerprint(file));
      const base = file.basename;
      const aliasMap = this.aliasCache && this.aliasCache.get(file.path);
      for (const { text: label, level } of headings) {
        if (!levels.has(level)) continue;
        // A heading with these can't be put in a [[File#Heading|word]] target: '|' starts
        // the alias, '[' ']' break the wikilink, '#' '^' start another subpath/block ref.
        if (/[[\]|#^]/.test(label)) continue;
        if (excludeTerms.has(label.toLowerCase())) continue;
        if (label.trim().length < minTermLength) continue;
        const labelWords = this.tokenizeForm(label);
        if (!labelWords.length) continue;

        const linktext = `${base}#${label}`;
        if (linktexts.has(linktext)) continue; // duplicate heading in the same file
        linktexts.add(linktext);
        const aliases = (aliasMap && aliasMap.get(label)) || [];
        // aliases ride on the term so the autocomplete can prefix-match them too.
        terms.push({ linktext, label, fileBase: base, path: file.path, aliases });

        // The heading text, plus any `%% alias: … %%` wordings, all matched to the same
        // link. Smart case is decided per form (an acronym alias like "CNS" stays cased).
        const forms = [{ text: label, words: labelWords }];
        for (const a of aliases) {
          if (a.toLowerCase() === label.toLowerCase() || a.trim().length < minTermLength) continue;
          const w = this.tokenizeForm(a);
          if (w.length) forms.push({ text: a, words: w });
        }
        for (const f of forms) {
          // cs/caseText are per form, so an acronym alias like "CNS" is cased on its own spelling.
          const matcher = { linktext, label, fileBase: base, words: f.words, wordCount: f.words.length, cs: isAcronymish(f.text), caseText: f.text };
          for (const k of f.words[0].keys) {
            if (!byKey.has(k)) byKey.set(k, []);
            byKey.get(k).push(matcher);
          }
        }
      }
    }
    this.index = { byKey, termCount: linktexts.size };
    this.terms = terms;
    // Notified here rather than by the callers, so every rebuild reaches api subscribers.
    // It used to be fired only from scheduleRebuild, which meant a rebuild triggered
    // straight from the settings tab or the "Rebuild index" button changed the index
    // without telling anyone — the glossary linker had it right.
    this.notifyIndexChange();
  },
});

// Mostly-uppercase (an acronym like "IT", "NASA", "TCP/IP") — >75% of its letters
// are uppercase. Used by smart case to demand an exact-case match.
function isAcronymish(label) {
  const letters = [...label].filter((ch) => /\p{L}/u.test(ch));
  if (letters.length < 2) return false;
  const upper = letters.filter((ch) => ch !== ch.toLowerCase() && ch === ch.toUpperCase()).length;
  return upper / letters.length > 0.75;
}
