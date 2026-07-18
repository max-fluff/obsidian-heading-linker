'use strict';

// Public API exposed as `app.plugins.plugins['heading-linker'].api`, so other plugins and
// DataviewJS can read the heading index. Mixed into the plugin prototype; methods run with
// the plugin as `this`.
//
// `api.linker` is the part the sibling linker plugins read: it says who we are, how we rank
// when two of us match the same word, and which spans of a text we claim. See
// shared/discover.js for how that is used.

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
        // Which half of the family we are. Prose linkers contest bare words with each other
        // and never with the sigil pair, so this is what keeps the precedence setting from
        // offering a choice between two plugins that can't collide.
        kind: 'prose',
        // Higher wins a contested word. A heading points into a file at an anchor, which is
        // a narrower answer than a whole note, so it outranks the glossary by default —
        // adjustable, and read from here by the other side rather than assumed. A getter,
        // so a change in settings is seen without rebuilding the api object.
        get precedence() { return plugin.settings.linkPrecedence; },
        // Spans of `text` we claim, with what each one resolves to. Protected ranges are
        // skipped, so the answer matches what we would actually decorate. The label and
        // target let whoever owns the span offer ours as a choice instead of dropping it.
        matches: (text) => plugin.findMatches(String(text || ''), null, { protect: true })
          .map((m) => ({ start: m.start, end: m.end, label: m.label, target: m.linktext })),
        // Open one of our targets. Ours to resolve — nobody else should have to know that a
        // heading link is a File#Heading.
        open: (target, sourcePath, newTab) => plugin.openTerm(target, sourcePath, newTab),
        // Show our own preview of one of our targets, anchored to someone else's element.
        // Used by the duplicate list, which lists candidates from every linker but must let
        // each one preview its own.
        hover: (target, event, targetEl, sourcePath, hoverParent) =>
          plugin.hoverTerm(event, targetEl, target, sourcePath, hoverParent),
        // What we would autocomplete for a typed word, for the linker that owns the popup.
        // The note is the line the reader sees under the name, already localised by us.
        suggest: (query) => suggestionsFor(plugin, String(query || '')),
        // Our link text for a target. The popup's owner writes it but never composes it.
        linkFor: (target, display, inTable) => plugin.wikiLink(target, display, inTable),
        // Redraw after the other side changes who ranks higher, so the setting takes effect
        // in both plugins at once instead of at the next rebuild.
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

  // Index-change subscription, used by the API and by anything that has to redraw when the
  // headings move. Returns an unsubscribe function.
  onIndexChange(cb) {
    if (typeof cb !== 'function') return () => {};
    this._indexListeners.add(cb);
    return () => this._indexListeners.delete(cb);
  },

  notifyIndexChange() {
    for (const cb of this._indexListeners) {
      try { cb(); } catch (e) { console.error('Heading Linker: index listener failed', e); }
    }
  },
};
