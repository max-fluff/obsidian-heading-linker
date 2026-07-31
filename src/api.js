'use strict';

// Public API exposed as `app.plugins.plugins['heading-linker'].api`, so other plugins and
// DataviewJS can read the heading index. Mixed into the plugin prototype. `api.linker` is
// the provider contract the sibling linkers read (consumed in shared/discover.js).

const { createProseProvider, aliasHit } = require('./shared/prose/provider');
const { createUsageCache } = require('./shared/prose/usage');
const { t } = require('./shared/i18n');
const { suggestionsFor } = require('./heading-suggest');

module.exports = {
  buildApi() {
    const plugin = this;
    return {
      version: this.manifest.version,

      // Every indexed heading: { linktext, label, fileBase, path, aliases }.
      getTerms: () => this.getTerms(),

      // Resolve a heading label or alias (case-insensitive) to its term, or null.
      resolveTerm: (name) => this.resolveTerm(name),

      // Morphology helpers (same engine the matcher uses).
      keysFor: (word) => this.keysFor(String(word || '')),
      lemmaFor: (word) => this.lemmaFor(String(word || '')),

      // Heading matches in arbitrary text, skipping protected ranges.
      findMatches: (text) => this.findMatches(String(text || ''), null, { protect: true }),

      // Per heading, how often it is used across in-scope notes (async). With
      // { includeLinks: true } also counts existing [[File#Heading]] links; { wholeVault:
      // true } scans every note regardless of scope. Headings with count 0 are unused.
      getUsageReport: (opts) => this.getUsageReport(opts),

      // Frequent in-scope words that are not yet a heading, worth defining (async):
      // { lemma, display, count, docFreq }, ordered by how many notes they appear in.
      collectCandidates: (opts) => this.collectCandidates(opts),

      // Subscribe to index rebuilds; returns an unsubscribe function.
      onChange: (cb) => this.onIndexChange(cb),

      linker: createProseProvider(plugin, {
        id: 'heading-linker',
        displayName: 'Heading Linker',
        spanOf: (m) => ({ start: m.start, end: m.end, label: m.label, target: m.linktext }),
        suggestionsFor,
        excludes: (text) => plugin.isExcluded(text),
        // The raw target reads "Guide#Spawn"; the reader wants the heading and the note it
        // sits in, since two files holding the same heading are what makes a span ambiguous.
        describe: (target, display) => {
          const term = (plugin.terms || []).find((x) => x.linktext === target);
          const label = term ? term.label : String(target).split('#').pop();
          const file = term ? term.fileBase : String(target).split('#')[0];
          const parts = [t('kind.heading'), aliasHit(plugin, term, label, display), file];
          return { title: label, note: parts.filter(Boolean).join(' · ') };
        },
      }),
    };
  },

  getTerms() {
    return (this.terms || []).map((t) => ({ linktext: t.linktext, label: t.label, fileBase: t.fileBase, path: t.path, aliases: (t.aliases || []).slice() }));
  },

  resolveTerm(name) {
    const q = String(name || '').toLowerCase();
    if (!q) return null;
    for (const t of this.terms || []) {
      if (t.label.toLowerCase() === q) return t;
      if ((t.aliases || []).some((a) => a.toLowerCase() === q)) return t;
    }
    return null;
  },

  // The notes a report scans: the whole vault, or just the linker's scope.
  reportFiles(opts) {
    return opts.wholeVault ? this.app.vault.getMarkdownFiles() : this.getScopeFiles();
  },

  // The heading-source file and raw heading text a wikilink's `#heading` subpath points at,
  // or null when it targets no heading in a source file. getFirstLinkpathDest resolves file
  // paths only, so the subpath must be sliced off first — the whole "File#Heading" would be
  // looked up as a file literally named that and never resolve.
  resolveHeadingLink(link, sourcePath) {
    const raw = String(link || '');
    const hash = raw.indexOf('#');
    if (hash < 0) return null;
    const heading = raw.slice(hash + 1).trim();
    if (!heading) return null;
    const pathPart = raw.slice(0, hash);
    const file = pathPart
      ? this.app.metadataCache.getFirstLinkpathDest(pathPart, sourcePath)
      : this.app.vault.getAbstractFileByPath(sourcePath);
    return file && this.isGlossaryFile(file) ? { file, heading } : null;
  },

  // A "Basename#Heading" linktext for an existing wikilink, filtered to indexed headings.
  linkToTerm(link, sourcePath, termSet) {
    const r = this.resolveHeadingLink(link, sourcePath);
    if (!r) return null;
    const linktext = `${r.file.basename}#${r.heading}`;
    return termSet.has(linktext) ? linktext : null;
  },

  // Read one note for the usage report: how often each heading is mentioned in it as plain
  // text, plus, with includeLinks, its direct [[File#Heading]] links. Cached per note.
  async usageInFile(file, includeLinks, termSet) {
    const here = new Map();
    try {
      const text = await this.app.vault.cachedRead(file);
      for (const m of this.findMatches(text, this.currentFileBase(file.path), { protect: true })) {
        here.set(m.linktext, (here.get(m.linktext) || 0) + 1);
      }
    } catch (e) { /* unreadable file: links below may still apply */ }
    if (includeLinks) {
      const cache = this.app.metadataCache.getFileCache(file);
      for (const link of (cache && cache.links) || []) {
        const lt = this.linkToTerm(link.link, file.path, termSet);
        if (lt) here.set(lt, (here.get(lt) || 0) + 1);
      }
    }
    return here;
  },

  async getUsageReport(opts = {}) {
    const counts = new Map();
    for (const term of this.terms || []) counts.set(term.linktext, { linktext: term.linktext, label: term.label, fileBase: term.fileBase, path: term.path, count: 0, files: [] });
    const files = this.reportFiles(opts);
    const termSet = new Set(counts.keys());
    if (!this.usageCache) this.usageCache = createUsageCache();
    const signature = `${this.indexVersion || 0}|${opts.includeLinks ? 'L' : ''}`;
    const results = await this.usageCache.run(files, signature, (file) => this.usageInFile(file, !!opts.includeLinks, termSet));
    for (const { file, value: here } of results) {
      for (const [linktext, n] of here) {
        const entry = counts.get(linktext);
        if (!entry) continue;
        entry.count += n;
        entry.files.push({ path: file.path, count: n });
      }
    }
    return [...counts.values()];
  },

  // Read one note for the candidate scan: how often each not-yet-a-heading lemma appears in
  // it, with the surface forms behind it. Cached per note.
  async candidatesInFile(file, minLen) {
    const here = new Map(); // lemma -> { forms: Map<surface, count>, total }
    let text;
    try { text = await this.app.vault.cachedRead(file); } catch (e) { return here; }
    const protect = this.computeProtected(text);
    for (const m of text.matchAll(/[\p{L}\p{Nd}]+/gu)) {
      const raw = m[0];
      if (/^\p{Nd}+$/u.test(raw)) continue;
      if (this.overlapsProtected(protect, m.index, m.index + raw.length)) continue;
      if (this.keysFor(raw).some((k) => this.index.byKey.has(k))) continue;
      const lemma = this.lemmaFor(raw);
      if (lemma.length < minLen) continue;
      let g = here.get(lemma);
      if (!g) { g = { forms: new Map(), total: 0 }; here.set(lemma, g); }
      g.forms.set(raw, (g.forms.get(raw) || 0) + 1);
      g.total++;
    }
    return here;
  },

  async collectCandidates(opts = {}) {
    const minLen = Math.max(1, this.settings.minTermLength || 1);
    const minNotes = Math.max(1, this.settings.candidateMinNotes || 1);
    const files = this.reportFiles(opts);
    if (!this.candidateCache) this.candidateCache = createUsageCache();
    // minLen changes what a note contributes, so it joins the index version in the key.
    const signature = `${this.indexVersion || 0}|${minLen}`;
    const results = await this.candidateCache.run(files, signature, (file) => this.candidatesInFile(file, minLen));

    const groups = new Map(); // lemma -> { forms: Map<surface, count>, total, docFreq }
    for (const { value: here } of results) {
      for (const [lemma, g] of here) {
        let all = groups.get(lemma);
        if (!all) { all = { forms: new Map(), total: 0, docFreq: 0 }; groups.set(lemma, all); }
        for (const [form, n] of g.forms) all.forms.set(form, (all.forms.get(form) || 0) + n);
        all.total += g.total;
        all.docFreq++;
      }
    }

    const out = [];
    for (const [lemma, g] of groups) {
      if (g.docFreq < minNotes) continue;
      let display = lemma, best = -1;
      for (const [form, n] of g.forms) if (n > best) { best = n; display = form; }
      out.push({ lemma, display, count: g.total, docFreq: g.docFreq });
    }
    out.sort((a, b) => b.docFreq - a.docFreq || b.count - a.count);
    return out.slice(0, 100);
  },
};
