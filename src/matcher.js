'use strict';

const { splitLines } = require('./shared/markdown');
const { createMatcher } = require('./shared/prose/matcher');

// Term index + matching engine. Mixed into the plugin prototype; the scan itself lives in
// shared/prose/matcher.js. A term has two faces the rest of the plugin keeps distinct:
//   label    — the heading text, what the reader sees as the link caption;
//   linktext — "Basename#Heading", what Obsidian resolves the link against.
// Identity, dedup and collisions are keyed on linktext: the same heading text in two
// different files is two different terms and surfaces as an ambiguous match.
const core = createMatcher({
  idOf: (c) => c.linktext,
  selfIdOf: (c) => c.fileBase,
  fieldsOf: (c) => ({ linktext: c.linktext, label: c.label }),
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
        const labelEntry = this.formEntry(label);
        if (!labelEntry) continue;

        const linktext = `${base}#${label}`;
        if (linktexts.has(linktext)) continue; // duplicate heading in the same file
        linktexts.add(linktext);
        const aliases = (aliasMap && aliasMap.get(label)) || [];
        // aliases ride on the term so the autocomplete can prefix-match them too.
        terms.push({ linktext, label, fileBase: base, path: file.path, aliases });

        // The heading text, plus any `%% alias: … %%` wordings, all matched to the same
        // link. Smart case is decided per form (an acronym alias like "CNS" stays cased).
        const forms = [labelEntry];
        for (const a of aliases) {
          if (a.toLowerCase() === label.toLowerCase() || a.trim().length < minTermLength) continue;
          const entry = this.formEntry(a);
          if (entry) forms.push(entry);
        }
        for (const f of forms) {
          const matcher = Object.assign({ linktext, label, fileBase: base }, f);
          for (const k of f.words[0].keys) {
            if (!byKey.has(k)) byKey.set(k, []);
            byKey.get(k).push(matcher);
          }
        }
      }
    }
    this.index = { byKey, termCount: linktexts.size };
    this.terms = terms;
    // Bumped so the usage/candidate caches drop results scanned against the old headings.
    this.indexVersion = (this.indexVersion || 0) + 1;
    // Notified here rather than by the callers, so every rebuild reaches api subscribers.
    // It used to be fired only from scheduleRebuild, which meant a rebuild triggered
    // straight from the settings tab or the "Rebuild index" button changed the index
    // without telling anyone — the glossary linker had it right.
    this.notifyIndexChange();
  },

  // Base (dictionary) form of a word: the first claiming language that has one wins, else
  // the lowercased word. Same rule the glossary linker uses to collapse inflected forms.
  lemmaFor(word) {
    for (const lang of this.activeLanguages || []) {
      if (lang.match(word) && lang.lemma) return lang.lemma(word);
    }
    return String(word || '').toLowerCase();
  },
});
