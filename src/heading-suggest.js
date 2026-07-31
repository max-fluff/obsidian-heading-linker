'use strict';

const { t } = require('./shared/i18n');
const { createProseSuggest, suggestAvailable } = require('./shared/prose/editor-suggest');
const { suggestionsAllowed } = require('./shared/prose/suggest');

// The candidates for a typed word, ranked, or an empty list. Kept out of the class and free
// of editor state: onTrigger needs the answer before it can decide whether to claim the
// popup, and it is the piece worth testing on its own.
function collectSuggestions(plugin, query, ownFile) {
  const qLower = query.toLowerCase();
  const byLink = new Map();

  // 'form' matches: the typed word is an inflection of a single-word heading.
  const seenCand = new Set();
  for (const key of plugin.keysFor(query)) {
    const bucket = plugin.index.byKey.get(key);
    if (!bucket) continue;
    for (const c of bucket) {
      if (c.wordCount !== 1 || seenCand.has(c) || c.fileBase === ownFile) continue;
      seenCand.add(c);
      if (!byLink.has(c.linktext)) byLink.set(c.linktext, { linktext: c.linktext, label: c.label, fileBase: c.fileBase, crumbs: c.crumbs, kind: 'form' });
    }
  }

  // 'prefix' matches: the typed text starts a heading or one of its aliases.
  for (const term of plugin.terms || []) {
    if (byLink.has(term.linktext) || term.fileBase === ownFile) continue;
    let form = null;
    if (term.label.toLowerCase().startsWith(qLower)) form = term.label;
    else if (term.aliases) form = term.aliases.find((a) => a.toLowerCase().startsWith(qLower));
    if (form) byLink.set(term.linktext, { linktext: term.linktext, label: term.label, fileBase: term.fileBase, crumbs: term.crumbs, kind: 'prefix', matchedForm: form });
  }

  const items = [...byLink.values()];
  const rank = (it) => (it.kind === 'form' ? 0 : 1);
  items.sort((a, b) => rank(a) - rank(b) || a.label.length - b.label.length || a.linktext.localeCompare(b.linktext));
  return items.slice(0, 8);
}

// The file plus the enclosing headings, so a suggestion says where it sits — the same trail
// the ambiguity picker shows.
function locationOf(item) {
  return [item.fileBase, ...(item.crumbs || [])].join(' › ');
}

// The line under a candidate's name in the popup. Shared by our own rendering and by the
// shape we hand a sibling linker, so a heading reads the same whoever's popup it lands in.
function noteFor(item) {
  if (item.kind === 'form') return t('suggest.inflection', { file: locationOf(item) });
  if (item.matchedForm && item.matchedForm.toLowerCase() !== item.label.toLowerCase()) {
    return t('suggest.alias', { form: item.matchedForm, file: locationOf(item) });
  }
  return locationOf(item);
}

// Our candidates in the shape a sibling linker consumes: no internals, and `display` says
// what the inserted link should read — null meaning "keep whatever the reader typed", which
// is what a 'form' match is for.
function suggestionsFor(plugin, query, sourcePath) {
  if (!suggestionsAllowed(plugin, query, sourcePath)) return [];
  const active = plugin.app.workspace.getActiveFile();
  const own = active ? plugin.currentFileBase(active.path) : null;
  return collectSuggestions(plugin, query, own).map((it) => ({
    label: it.label,
    note: noteFor(it),
    target: it.linktext,
    display: it.kind === 'form' ? null : (it.matchedForm || it.label),
  }));
}

const HeadingSuggest = createProseSuggest({
  cls: 'heading',
  // A note's own headings are never offered inside it, the same exclusion the highlighter
  // makes; the matcher recognises them by the file's basename.
  ownId: (plugin) => {
    const active = plugin.app.workspace.getActiveFile();
    return active ? plugin.currentFileBase(active.path) : null;
  },
  collect: collectSuggestions,
  noteFor,
  labelOf: (it) => it.label,
  targetOf: (it) => it.linktext,
  // 'form' keeps the typed wording; 'prefix' uses the wording that matched, heading or alias.
  displayFor: (it, query) => (it.kind === 'form' ? query : (it.matchedForm || it.label)),
});

module.exports = { HeadingSuggest, suggestAvailable, collectSuggestions, suggestionsFor };
