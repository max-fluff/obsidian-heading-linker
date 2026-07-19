'use strict';

// Public API exposed as `app.plugins.plugins['heading-linker'].api`, so other plugins and
// DataviewJS can read the heading index. Mixed into the plugin prototype. `api.linker` is
// the provider contract the sibling linkers read (consumed in shared/discover.js).

const { createProseProvider, aliasHit } = require('./shared/prose/provider');
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

      // Heading matches in arbitrary text, skipping protected ranges.
      findMatches: (text) => this.findMatches(String(text || ''), null, { protect: true }),

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
};
