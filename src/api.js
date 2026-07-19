'use strict';

// Public API exposed as `app.plugins.plugins['heading-linker'].api`, so other plugins and
// DataviewJS can read the heading index. Mixed into the plugin prototype. `api.linker` is
// the provider contract the sibling linkers read (consumed in shared/discover.js).

const { LINKER_API } = require('./shared/discover');
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

      linker: {
        apiVersion: LINKER_API,
        id: 'heading-linker',
        displayName: 'Heading Linker',
        kind: 'prose',
        // A getter, so a settings change is seen without rebuilding the api object.
        get precedence() { return plugin.settings.linkPrecedence; },
        // Protected ranges are skipped, so the answer matches what we would decorate.
        matches: (text) => plugin.findMatches(String(text || ''), null, { protect: true })
          .map((m) => ({ start: m.start, end: m.end, label: m.label, target: m.linktext })),
        open: (target, sourcePath, newTab) => plugin.openTerm(target, sourcePath, newTab),
        // Our own preview of one of our targets, anchored to someone else's element.
        hover: (target, event, targetEl, sourcePath, hoverParent) =>
          plugin.hoverTerm(event, targetEl, target, sourcePath, hoverParent),
        suggest: (query) => suggestionsFor(plugin, String(query || '')),
        // The popup's owner writes our link text but never composes it.
        linkFor: (target, display, inTable) => plugin.wikiLink(target, display, inTable),
        refresh: () => plugin.rerenderViews(),
      },
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
