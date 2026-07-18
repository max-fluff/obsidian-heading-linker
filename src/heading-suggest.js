'use strict';

const { EditorSuggest } = require('obsidian');
const { t } = require('./shared/i18n');
const { inTableCell } = require('./shared/markdown');
const { mergeSuggestions } = require('./shared/prose/suggest');

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
      if (!byLink.has(c.linktext)) byLink.set(c.linktext, { linktext: c.linktext, label: c.label, fileBase: c.fileBase, kind: 'form' });
    }
  }

  // 'prefix' matches: the typed text starts a heading or one of its aliases.
  for (const term of plugin.terms || []) {
    if (byLink.has(term.linktext) || term.fileBase === ownFile) continue;
    let form = null;
    if (term.label.toLowerCase().startsWith(qLower)) form = term.label;
    else if (term.aliases) form = term.aliases.find((a) => a.toLowerCase().startsWith(qLower));
    if (form) byLink.set(term.linktext, { linktext: term.linktext, label: term.label, fileBase: term.fileBase, kind: 'prefix', matchedForm: form });
  }

  const items = [...byLink.values()];
  const rank = (it) => (it.kind === 'form' ? 0 : 1);
  items.sort((a, b) => rank(a) - rank(b) || a.label.length - b.label.length || a.linktext.localeCompare(b.linktext));
  return items.slice(0, 8);
}

// The line under a candidate's name in the popup. Shared by our own rendering and by the
// shape we hand a sibling linker, so a heading reads the same whoever's popup it lands in.
function noteFor(item) {
  if (item.kind === 'form') return t('suggest.inflection', { file: item.fileBase });
  if (item.matchedForm && item.matchedForm.toLowerCase() !== item.label.toLowerCase()) {
    return t('suggest.alias', { form: item.matchedForm, file: item.fileBase });
  }
  return item.fileBase;
}

// Our candidates in the shape a sibling linker consumes: no internals, and `display` says
// what the inserted link should read — null meaning "keep whatever the reader typed", which
// is what a 'form' match is for.
function suggestionsFor(plugin, query) {
  const active = plugin.app.workspace.getActiveFile();
  const own = active ? plugin.currentFileBase(active.path) : null;
  return collectSuggestions(plugin, query, own).map((it) => ({
    label: it.label,
    note: noteFor(it),
    target: it.linktext,
    display: it.kind === 'form' ? null : (it.matchedForm || it.label),
  }));
}

// Inline autocomplete: while typing in an in-scope note, offer to insert a link to a
// heading. Two kinds of candidate:
//   - 'form'   — the typed word is an inflection of a heading (same engine as the
//                highlighter); inserts [[File#Heading|typed word]], keeping the wording.
//   - 'prefix' — the typed text starts a heading; completes to [[File#Heading|Heading]].
// EditorSuggest predates the plugin's minAppVersion, so callers feature-detect first.
class HeadingSuggest extends EditorSuggest {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
  }

  onTrigger(cursor, editor, file) {
    const plugin = this.plugin;
    if (!plugin.settings.linkSuggest) return null;
    if (!file || !plugin.inScope(file.path)) return null;

    const line = editor.getLine(cursor.line);
    // Only complete at the end of a word — not while the cursor sits inside one.
    if (/[\p{L}\p{Nd}]/u.test(line[cursor.ch] || '')) return null;
    const m = line.slice(0, cursor.ch).match(/[\p{L}\p{Nd}]+$/u);
    if (!m) return null;
    const query = m[0];
    if (query.length < Math.max(1, plugin.settings.suggestMinChars || 1)) return null;

    // A word glued to a sigil belongs to another suggester (a tag, math), not prose — yield.
    const before = line[cursor.ch - query.length - 1] || '';
    if (before && (plugin.settings.suggestSkipAfter || '').includes(before)) return null;

    // Skip code/links/frontmatter/urls/headings — the same ranges the linker protects.
    const off = editor.posToOffset(cursor);
    if (plugin.isProtectedAt(editor.getValue(), off)) return null;

    // Having nothing to offer must not take the popup slot. Obsidian hands the popup to the
    // first suggester whose onTrigger returns a context and never asks the rest, so claiming
    // every word would silence a sibling linker that does know this one. The candidates are
    // built here rather than in getSuggestions so the answer is known before we claim.
    const items = this.merged(query);
    if (!items.length) return null;
    this.cached = { query, items };

    return { start: { line: cursor.line, ch: cursor.ch - query.length }, end: cursor, query };
  }

  // Our candidates plus every sibling linker's, in one list. See shared/prose/suggest.js.
  merged(query) {
    return mergeSuggestions(this.plugin, query, collectSuggestions(this.plugin, query, this.ownFileBase()));
  }

  // The note being typed in, when it is itself a heading source — its own headings are
  // never offered, the same exclusion the highlighter makes.
  ownFileBase() {
    const active = this.plugin.app.workspace.getActiveFile();
    return active ? this.plugin.currentFileBase(active.path) : null;
  }

  getSuggestions(context) {
    // onTrigger already built these to decide whether to trigger at all; recompute only if
    // something moved on between the two calls.
    if (this.cached && this.cached.query === context.query) return this.cached.items;
    return this.merged(context.query);
  }

  renderSuggestion(item, el) {
    el.addClass('heading-suggestion');
    // A sibling's candidate is drawn exactly like our own. The reader is choosing a
    // destination, not a plugin — the same reason the collision modal carries no plugin
    // names either.
    el.createSpan({ cls: 'heading-suggestion-title', text: item.label });
    // The source file both explains the target and tells apart same-named headings;
    // an alias match also shows which wording matched.
    const note = item.insert ? item.note : noteFor(item);
    if (note) el.createSpan({ cls: 'heading-suggestion-note', text: note });
  }

  selectSuggestion(item) {
    const ctx = this.context;
    if (!ctx) return;
    const editor = ctx.editor;
    const inTable = inTableCell(editor.getValue(), editor.posToOffset(ctx.start));
    // A sibling's candidate is written by the sibling: only it knows whether its target is
    // a term title, a File#Heading or something else again.
    // 'form' keeps the typed wording; 'prefix' uses the matched wording (heading or alias).
    const link = item.insert
      ? item.insert(item.display == null ? ctx.query : item.display, inTable)
      : this.plugin.wikiLink(item.linktext, item.kind === 'form' ? ctx.query : (item.matchedForm || item.label), inTable);
    if (!link) return;
    editor.replaceRange(link, ctx.start, ctx.end);
    editor.setCursor(editor.offsetToPos(editor.posToOffset(ctx.start) + link.length));
  }
}

const suggestAvailable = () => typeof EditorSuggest === 'function';

module.exports = { HeadingSuggest, suggestAvailable, collectSuggestions, suggestionsFor };
