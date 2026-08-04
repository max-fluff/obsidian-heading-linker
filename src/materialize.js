'use strict';

const { Notice } = require('obsidian');
const { splitLines, wordAt } = require('./shared/markdown');
const { MaterializePreviewModal, UnlinkPreviewModal, ChooseTermModal } = require('./modals');
const { candidatesFor } = require('./shared/discover');
const { t, plural } = require('./shared/i18n');

// Turning words into heading links and reverting them. Mixed into the plugin prototype.
module.exports = {
  collectMatches(text, currentFile) {
    const matches = this.findMatches(text, currentFile, { protect: true });
    if (!this.settings.linkFirstOnly) return matches;
    const seen = new Set();
    const out = [];
    for (const m of matches) {
      if (seen.has(m.linktext)) continue;
      seen.add(m.linktext);
      out.push(m);
    }
    return out;
  },

  openMaterializePreview(files, onApply) {
    new MaterializePreviewModal(this.app, files, this, onApply).open();
  },

  // Write each result, skipping notes edited since the preview was built.
  async writeScopeResults(results) {
    let total = 0;
    let skipped = 0;
    for (const r of results) {
      let written = false;
      await this.app.vault.process(r.file, (data) => {
        if (data !== r.original) return data;
        written = true;
        return r.newText;
      });
      if (written) total += r.count;
      else skipped++;
    }
    let msg = t('notice.scopeWritten', { files: plural('file', results.length - skipped), links: plural('link', total) });
    if (skipped) msg += t('notice.scopeSkipped', { n: skipped });
    new Notice(msg);
    this.updateStatusBar();
  },

  async materializeCurrent() {
    const file = this.app.workspace.getActiveFile();
    if (!file) { new Notice(t('notice.noActiveNote')); return; }
    const text = await this.app.vault.cachedRead(file);
    const matches = this.collectMatches(text, this.currentFileBase(file.path));
    if (!matches.length) { new Notice(t('notice.noMatches')); return; }
    this.openMaterializePreview([{ file, original: text, matches }], async (results) => {
      const r = results[0];
      let written = false;
      await this.app.vault.process(r.file, (data) => {
        if (data !== r.original) return data;
        written = true;
        return r.newText;
      });
      if (!written) { new Notice(t('notice.noteChanged')); return; }
      new Notice(t('notice.linksCreated', { links: plural('link', r.count) }));
      this.updateStatusBar();
    });
  },

  materializeSelection(editor) {
    const sel = editor.getSelection();
    if (!sel) { new Notice(t('notice.noSelection')); return; }
    const file = this.app.workspace.getActiveFile();
    const matches = this.collectMatches(sel, file ? this.currentFileBase(file.path) : null);
    if (!matches.length) { new Notice(t('notice.noMatches')); return; }
    this.openMaterializePreview([{ file: null, original: sel, matches, label: t('label.selection') }], (results) => {
      editor.replaceSelection(results[0].newText);
      new Notice(t('notice.linksCreated', { links: plural('link', results[0].count) }));
    });
  },

  async scanScopeMatches(compute) {
    const files = this.getScopeFiles();
    const out = [];
    const notice = new Notice(t('notice.scanning'), 0);
    try {
      for (let i = 0; i < files.length; i++) {
        if (i % 25 === 0) notice.setMessage(t('notice.scanningProgress', { current: i + 1, total: files.length }));
        const file = files[i];
        const text = await this.app.vault.cachedRead(file);
        const matches = compute(text, file);
        if (matches.length) out.push({ file, original: text, matches });
      }
    } finally {
      notice.hide();
    }
    return out;
  },

  async materializeScope() {
    const files = await this.scanScopeMatches((text, file) =>
      this.collectMatches(text, this.currentFileBase(file.path)));
    if (!files.length) { new Notice(t('notice.noMatches')); return; }
    this.openMaterializePreview(files, (results) => this.writeScopeResults(results));
  },

  // Heading links in `text` that unlink can revert: each resolves to a glossary file and
  // carries a #heading subpath (the links this plugin creates). Offsets are into `text`.
  findHeadingLinks(text, sourcePath) {
    const ranges = this.codeFrontmatterRanges(text);
    const re = /\[\[([^\]\n]+)\]\]/g;
    const out = [];
    let m;
    while ((m = re.exec(text)) !== null) {
      const start = m.index;
      const end = m.index + m[0].length;
      if (this.overlapsProtected(ranges, start, end)) continue;
      const parsed = this.parseHeadingInner(m[1]);
      if (!parsed) continue; // heading links carry a #subpath
      const dest = this.app.metadataCache.getFirstLinkpathDest(parsed.target, sourcePath || '');
      if (!dest || !this.isGlossaryFile(dest)) continue;
      out.push({ start, end, linktext: `${dest.basename}#${parsed.subpath}`, display: parsed.display, source: m[0] });
    }
    return out;
  },

  openUnlinkPreview(files, onApply) {
    new UnlinkPreviewModal(this.app, files, this, onApply).open();
  },

  async unlinkCurrent() {
    const file = this.app.workspace.getActiveFile();
    if (!file) { new Notice(t('notice.noActiveNote')); return; }
    const text = await this.app.vault.cachedRead(file);
    const links = this.findHeadingLinks(text, file.path);
    if (!links.length) { new Notice(t('notice.noHeadingLinks')); return; }
    this.openUnlinkPreview([{ file, original: text, matches: links }], (results) => this.writeScopeResults(results));
  },

  unlinkSelection(editor) {
    const sel = editor.getSelection();
    if (!sel) { new Notice(t('notice.noSelection')); return; }
    const file = this.app.workspace.getActiveFile();
    const links = this.findHeadingLinks(sel, file ? file.path : '');
    if (!links.length) { new Notice(t('notice.noHeadingLinks')); return; }
    this.openUnlinkPreview([{ file: null, original: sel, matches: links, label: t('label.selection') }], (results) => {
      editor.replaceSelection(results[0].newText);
      new Notice(t('notice.linksRemoved', { links: plural('link', results[0].count) }));
    });
  },

  async unlinkScope() {
    const files = await this.scanScopeMatches((text, file) => this.findHeadingLinks(text, file.path));
    if (!files.length) { new Notice(t('notice.noHeadingLinks')); return; }
    this.openUnlinkPreview(files, (results) => this.writeScopeResults(results));
  },

  // The highlighted (not yet linked) match under the cursor, with whatever the other
  // linkers would offer at the same spot, or null.
  //
  // It runs through ownSpans, so on a word several linkers know only the owner finds
  // anything here — which is what keeps one "Link…" item in the menu instead of one per
  // plugin. The others stay quiet and their readings ride along as candidates.
  matchAtCursor(editor) {
    const head = editor.getCursor('head');
    const line = editor.getLine(head.line);
    if (!line) return null;
    const activeFile = this.app.workspace.getActiveFile();
    const activePath = activeFile ? activeFile.path : '';
    const currentFile = this.currentFileBase(activePath);
    // 'menu' rather than 'editing': acting on a word is not drawing it, so a peer with its
    // highlighting switched off still owns its words here.
    const where = { path: activePath, surface: 'menu' };
    const matches = this.ownSpans(line, this.findMatches(line, currentFile, { protect: true }), where);
    const hit = matches.find((m) => head.ch >= m.start && head.ch <= m.end);
    if (!hit) return null;
    const foreign = candidatesFor(this.yieldedIn(line, where), hit.start, hit.end);
    return { match: hit, foreign, line: head.line };
  },

  // The match under the cursor as we see it, ownership aside — so null only when this word
  // means nothing to us at all.
  //
  // Used for excluding a word, and only for that. Excluding is a setting of *this* plugin:
  // it stops us matching the word and says nothing about what the sibling does. Gating it on
  // ownership hid it exactly where it is most wanted — on a word both linkers match, where
  // the loser is drawing nothing yet still matches, and the settings tab was the only way
  // left to tell it to stop.
  // The plain word under the cursor, whether or not the index knows it.
  rawWordAtCursor(editor) {
    const head = editor.getCursor('head');
    return wordAt(editor.getLine(head.line), head.ch);
  },

  wordAtCursor(editor) {
    const head = editor.getCursor('head');
    const line = editor.getLine(head.line);
    if (!line) return null;
    const currentFile = this.currentFileBase(this.app.workspace.getActiveFile() ? this.app.workspace.getActiveFile().path : '');
    const matches = this.findMatches(line, currentFile, { protect: true });
    return matches.find((m) => head.ch >= m.start && head.ch <= m.end) || null;
  },

  // Every reading of the match under the cursor: ours, our own same-named alternatives, and
  // the ones other linkers stood down on. What the menu offers to link or open.
  cursorCandidates(hit, sourcePath, newTab) {
    const own = [hit.match.linktext, ...(hit.match.alts || [])];
    const foreign = hit.foreign.map((c) => ({ ...c, open: () => c.open(sourcePath, newTab) }));
    return [...own, ...foreign];
  },

  chooseTerm(candidates, title, action, display) {
    const list = (candidates || []).filter(Boolean);
    // A lone candidate needs no dialog. It can still be another linker's, in which case it
    // opens itself rather than going through our own resolver.
    if (list.length <= 1) {
      const only = list[0];
      if (only && typeof only === 'object') return only.open();
      return action(only);
    }
    new ChooseTermModal(this.app, { title, terms: list, onChoose: action, display, plugin: this }).open();
  },


  isExcluded(listKey, value) {
    const v = value.toLowerCase();
    return splitLines(this.settings[listKey]).some((l) => l.toLowerCase() === v);
  },

  // A starred line carries the word's base form under the current match mode — a stem, a
  // stripped ending or the whole word — and stands for every form that reduces to it.
  exclusionLine(kind, value) {
    return kind === 'stem' ? `${this.keysFor(value)[0]}*` : value;
  },

  // The base of the starred line that silences this word, or null. Searched rather than
  // built: the line may have been written from a different form of the same word.
  stemLineSilencing(word) {
    const keys = this.keysFor(word);
    for (const line of splitLines(this.settings.excludeWords)) {
      if (!line.endsWith('*')) continue;
      const base = line.slice(0, -1);
      if (this.keysFor(base).some((k) => keys.includes(k))) return base;
    }
    return null;
  },

  async setExcluded(listKey, value, add) {
    const v = value.toLowerCase();
    const lines = splitLines(this.settings[listKey]);
    const has = lines.some((l) => l.toLowerCase() === v);
    if (add === has) { new Notice(t(add ? 'notice.alreadyExcluded' : 'notice.wasNotExcluded', { value })); return; }
    const stored = listKey === 'excludeWords' ? v : value;
    this.settings[listKey] = (add ? [...lines, stored] : lines.filter((l) => l.toLowerCase() !== v)).join('\n');
    await this.saveSettings();
    this.rebuildIndex();
    this.rerenderViews();
    this.updateStatusBar();
    const where = t(listKey === 'excludeWords' ? 'exclude.words' : 'exclude.terms');
    new Notice(t(add ? 'notice.addedToExcluded' : 'notice.removedFromExcluded', { value, where }));
  },

  // linkAs (optional) overrides which heading the occurrence links to — used when a
  // word matches several headings and the user picks an alternative from the menu.
  async materializeSingle(file, linktext, display, nearOffset, occurrence, linkAs) {
    let created = false;
    await this.app.vault.process(file, (text) => {
      const matches = this.findMatches(text, this.currentFileBase(file.path), { protect: true })
        .filter((m) => m.linktext === linktext && m.display === display);
      if (!matches.length) return text;
      let target = matches[0];
      if (occurrence != null && matches[occurrence]) {
        target = matches[occurrence];
      } else if (nearOffset != null) {
        target = matches.reduce((best, m) => (Math.abs(m.start - nearOffset) < Math.abs(best.start - nearOffset) ? m : best), matches[0]);
      }
      const chosen = (linkAs && linkAs !== target.linktext) ? { ...target, linktext: linkAs } : target;
      created = true;
      return this.applyLinks(text, [chosen]).newText;
    });
    if (!created) { new Notice(t('notice.occurrenceNotFound')); return; }
    new Notice(t('notice.linkCreatedSingle'));
    this.updateStatusBar();
  },

  async materializeTerm(file, linktext, linkAs) {
    let count = 0;
    await this.app.vault.process(file, (text) => {
      let matches = this.findMatches(text, this.currentFileBase(file.path), { protect: true })
        .filter((m) => m.linktext === linktext);
      if (!matches.length) return text;
      if (this.settings.linkFirstOnly) matches = matches.slice(0, 1);
      if (linkAs && linkAs !== linktext) matches = matches.map((m) => ({ ...m, linktext: linkAs }));
      count = matches.length;
      return this.applyLinks(text, matches).newText;
    });
    if (!count) { new Notice(t('notice.noOccurrences')); return; }
    new Notice(t('notice.linksCreated', { links: plural('link', count) }));
    this.updateStatusBar();
  },

  async materializeTermScope(linktext, linkAs) {
    const term = linkAs || linktext;
    const files = await this.scanScopeMatches((text, file) => {
      let matches = this.findMatches(text, this.currentFileBase(file.path), { protect: true })
        .filter((m) => m.linktext === linktext);
      if (this.settings.linkFirstOnly) matches = matches.slice(0, 1);
      // Heading already chosen → no per-occurrence picker in the preview.
      return matches.map((m) => ({ ...m, linktext: term, alts: null }));
    });
    if (!files.length) { new Notice(t('notice.noOccurrences')); return; }
    this.openMaterializePreview(files, (results) => this.writeScopeResults(results));
  },
};
