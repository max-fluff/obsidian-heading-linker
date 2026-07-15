'use strict';

const { EditorSuggest } = require('obsidian');
const { t } = require('./shared/i18n');
const { inTableCell } = require('./shared/markdown');

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

    return { start: { line: cursor.line, ch: cursor.ch - query.length }, end: cursor, query };
  }

  getSuggestions(context) {
    const plugin = this.plugin;
    const q = context.query;
    const qLower = q.toLowerCase();
    const byLink = new Map();
    // Never suggest linking a heading to itself from inside its own file.
    const active = plugin.app.workspace.getActiveFile();
    const ownFile = active ? plugin.currentFileBase(active.path) : null;

    // 'form' matches: the typed word is an inflection of a single-word heading.
    const seenCand = new Set();
    for (const key of plugin.keysFor(q)) {
      const bucket = plugin.index.byKey.get(key);
      if (!bucket) continue;
      for (const c of bucket) {
        if (c.wordCount !== 1 || seenCand.has(c) || c.fileBase === ownFile) continue;
        seenCand.add(c);
        if (!byLink.has(c.linktext)) byLink.set(c.linktext, { linktext: c.linktext, label: c.label, fileBase: c.fileBase, kind: 'form' });
      }
    }

    // 'prefix' matches: the typed text starts a heading.
    for (const term of plugin.terms || []) {
      if (byLink.has(term.linktext) || term.fileBase === ownFile) continue;
      if (term.label.toLowerCase().startsWith(qLower)) {
        byLink.set(term.linktext, { linktext: term.linktext, label: term.label, fileBase: term.fileBase, kind: 'prefix' });
      }
    }

    const items = [...byLink.values()];
    const rank = (it) => (it.kind === 'form' ? 0 : 1);
    items.sort((a, b) => rank(a) - rank(b) || a.label.length - b.label.length || a.linktext.localeCompare(b.linktext));
    return items.slice(0, 8);
  }

  renderSuggestion(item, el) {
    el.addClass('heading-suggestion');
    el.createSpan({ cls: 'heading-suggestion-title', text: item.label });
    // The source file both explains the target and tells apart same-named headings.
    el.createSpan({ cls: 'heading-suggestion-note', text: item.kind === 'form' ? t('suggest.inflection', { file: item.fileBase }) : item.fileBase });
  }

  selectSuggestion(item) {
    const ctx = this.context;
    if (!ctx) return;
    const editor = ctx.editor;
    // 'form' keeps the typed wording as the visible text; 'prefix' uses the heading text.
    const display = item.kind === 'form' ? ctx.query : item.label;
    const inTable = inTableCell(editor.getValue(), editor.posToOffset(ctx.start));
    const link = this.plugin.wikiLink(item.linktext, display, inTable);
    editor.replaceRange(link, ctx.start, ctx.end);
    editor.setCursor(editor.offsetToPos(editor.posToOffset(ctx.start) + link.length));
  }
}

const suggestAvailable = () => typeof EditorSuggest === 'function';

module.exports = { HeadingSuggest, suggestAvailable };
