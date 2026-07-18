'use strict';

const { Plugin, Notice, TFile, TFolder, debounce } = require('obsidian');
const { DEFAULT_SETTINGS, sanitizeFolder } = require('./constants');
const { splitLines, inTableCell } = require('./shared/markdown');
const { BUILTIN_LANGUAGES } = require('./shared/morphology/builtin-languages');
const { validateLanguage } = require('./shared/morphology/language-api');
const { HeadingLinkerSettingTab } = require('./settings-tab');
const matcher = require('./matcher');
const highlight = require('./highlight');
const materialize = require('./materialize');
const { HeadingSuggest, suggestAvailable } = require('./heading-suggest');
const { initI18n, t, plural } = require('./shared/i18n');

// Per-heading aliases from `%% alias: a, b %%` comments inside a heading's section.
// headings is metadataCache's headings array (with positions); returns Map<heading, [alias]>.
function parseHeadingAliases(text, headings) {
  const lines = text.split('\n');
  const map = new Map();
  for (let i = 0; i < headings.length; i++) {
    const start = headings[i].position.start.line + 1;
    const end = i + 1 < headings.length ? headings[i + 1].position.start.line : lines.length;
    const region = lines.slice(start, end).join('\n');
    const found = [];
    let c;
    const comment = /%%([\s\S]*?)%%/g;
    while ((c = comment.exec(region)) !== null) {
      const am = c[1].match(/^\s*alias(?:es)?\s*:\s*(.+)$/im);
      if (am) for (const a of am[1].split(',')) { const s = a.trim(); if (s) found.push(s); }
    }
    if (found.length) {
      const key = headings[i].heading;
      const set = map.get(key) || new Set();
      found.forEach((a) => set.add(a));
      map.set(key, set);
    }
  }
  return new Map([...map].map(([k, v]) => [k, [...v]]));
}

// Notice strings for setPathInList, per list and add/remove.
const NOTICE_KEYS = {
  glossarySources: { add: 'notice.sourceAdded', remove: 'notice.sourceRemoved' },
  excludeSources: { add: 'notice.ignoreAdded', remove: 'notice.ignoreRemoved' },
  excludeFolders: { add: 'notice.pathAddedExcluded', remove: 'notice.pathRemovedExcluded' },
  scopeFolders: { add: 'notice.pathAddedScope', remove: 'notice.pathRemovedScope' },
};

class HeadingLinkerPlugin extends Plugin {
  async onload() {
    initI18n({ en: require('./locales/en'), ru: require('./locales/ru') });

    const loaded = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, loaded);
    // Earlier builds stored a plain file list in `glossaryFiles`; fold it into the
    // files-or-folders `glossarySources` list.
    if (loaded && typeof loaded.glossaryFiles === 'string' && loaded.glossarySources === undefined) {
      this.settings.glossarySources = loaded.glossaryFiles;
    }

    this.languages = [];
    this.activeLanguages = [];
    this.languageErrors = [];
    this.index = { byKey: new Map(), termCount: 0 };
    this.keysCache = new Map();
    this.terms = [];
    // path -> JSON(headings + aliases) as of the last rebuild, so the 'changed' handler can
    // tell "this file's terms changed" from "some other line changed" and skip needless rebuilds.
    this.headingFingerprints = new Map();
    // path -> Map<heading, [alias]>, parsed from `%%` comments; filled lazily, invalidated
    // on change, so rebuildIndex never re-reads file bodies.
    this.aliasCache = new Map();

    await this.loadLanguages();
    this.rebuildIndex();
    this.scheduleRebuild = debounce(() => { this.rebuildIndex(); this.rerenderViews(); this.updateStatusBar(); }, 600, true);

    this.statusBarEl = this.addStatusBarItem();
    this.statusBarEl.addClass('mod-clickable');
    this.registerDomEvent(this.statusBarEl, 'click', () => this.materializeCurrent());
    this.updateStatusBarDebounced = debounce(() => this.updateStatusBar(), 400, true);
    this.registerEvent(this.app.workspace.on('file-open', () => this.updateStatusBarDebounced()));
    this.registerEvent(this.app.workspace.on('active-leaf-change', () => this.updateStatusBarDebounced()));

    this.app.workspace.onLayoutReady(async () => { await this.loadAliases(); this.updateStatusBar(); });

    this.registerEvent(this.app.metadataCache.on('changed', async (file) => {
      if (!this.isGlossaryFile(file)) return;
      await this.loadFileAliases(file);
      const next = this.fileFingerprint(file);
      if (this.headingFingerprints.get(file.path) === next) return;
      this.headingFingerprints.set(file.path, next);
      this.scheduleRebuild();
    }));
    // 'changed' doesn't fire on add/remove/rename; a glossary file appearing, vanishing
    // or being renamed changes the term set (its basename is half of every linktext).
    this.registerEvent(this.app.vault.on('create', (file) => {
      if (this.isGlossaryPath(file.path)) this.scheduleRebuild();
    }));
    this.registerEvent(this.app.vault.on('delete', (file) => {
      if (!this.isGlossaryPath(file.path)) return;
      this.headingFingerprints.delete(file.path);
      this.aliasCache.delete(file.path);
      this.scheduleRebuild();
    }));
    this.registerEvent(this.app.vault.on('rename', (file, oldPath) => {
      if (!this.isGlossaryPath(file.path) && !this.isGlossaryPath(oldPath)) return;
      this.headingFingerprints.delete(oldPath);
      this.aliasCache.delete(oldPath);
      this.scheduleRebuild();
    }));

    this.registerEvent(this.app.vault.on('modify', (file) => {
      if (file.extension !== 'md') return;
      if (this.settings.editingHighlight === 'onSave') this.refreshEditors();
      const active = this.app.workspace.getActiveFile();
      if (active && active.path === file.path) this.updateStatusBarDebounced();
    }));

    this.registerEvent(this.app.workspace.on('editor-menu', (menu, editor) => {
      const link = this.headingLinkAt(editor);
      if (this.settings.menuExclude && link) {
        this.addExclusionMenuItem(menu, this.labelOf(link.linktext), 'Heading: ');
      }
      if (this.settings.menuUnlink && link) {
        menu.addItem((i) => i.setTitle(t('menu.unlinkThisLink')).setIcon('unlink')
          .onClick(() => this.unlinkLinkAt(editor, link)));
      }
    }));

    this.registerEvent(this.app.workspace.on('file-menu', (menu, file, source) => {
      if (source === 'link-context-menu') return;
      const isFolder = file instanceof TFolder;
      if (!isFolder && !(file instanceof TFile && file.extension === 'md')) return;
      const path = file.path;
      const noun = isFolder ? t('noun.folder') : t('noun.file');
      const item = (title, icon, listKey, add) => menu.addItem((i) => i.setTitle(title).setIcon(icon)
        .onClick(() => this.setPathInList(listKey, path, add)));

      // Heading sources: add/remove (selected mode only), and ignore/unignore (always).
      if (this.settings.glossaryMode === 'selected') {
        if (this.pathListed('glossarySources', path)) item(t('menu.removeFromSources', { noun }), 'minus-circle', 'glossarySources', false);
        else item(t('menu.addToSources', { noun }), 'plus-circle', 'glossarySources', true);
      }
      if (this.pathListed('excludeSources', path)) item(t('menu.unignoreSource'), 'eye', 'excludeSources', false);
      else item(t('menu.ignoreSource', { noun }), 'eye-off', 'excludeSources', true);

      // Scope: always-excluded, and (in folders mode) include-in-scope.
      if (this.pathListed('excludeFolders', path)) item(t('menu.removeFromAlwaysExcluded'), 'rotate-ccw', 'excludeFolders', false);
      else item(t('menu.addToAlwaysExcluded', { noun }), 'ban', 'excludeFolders', true);
      if (this.settings.scopeMode === 'folders') {
        if (this.pathListed('scopeFolders', path)) item(t('menu.removeFromScope', { noun }), 'folder-minus', 'scopeFolders', false);
        else item(t('menu.includeInScope', { noun }), 'folder-plus', 'scopeFolders', true);
      }
    }));

    // defaultMod: true → previews honour the Page Preview modifier setting, same as real links.
    this.app.workspace.registerHoverLinkSource('heading-linker', { display: 'Heading Linker', defaultMod: true });

    this.registerMarkdownPostProcessor((el, ctx) => this.processReadingMode(el, ctx));
    this.registerEditingHighlight();

    this.addCommand({ id: 'link-current', name: t('cmd.linkThisNote'), callback: () => this.materializeCurrent() });
    this.addCommand({ id: 'link-selection', name: t('cmd.linkSelection'), editorCallback: (editor) => this.materializeSelection(editor) });
    this.addCommand({ id: 'link-scope', name: t('cmd.linkAllNotes'), callback: () => this.materializeScope() });
    this.addCommand({ id: 'unlink-current', name: t('cmd.unlinkThisNote'), callback: () => this.unlinkCurrent() });
    this.addCommand({ id: 'unlink-selection', name: t('cmd.unlinkSelection'), editorCallback: (editor) => this.unlinkSelection(editor) });
    this.addCommand({ id: 'unlink-scope', name: t('cmd.unlinkAllNotes'), callback: () => this.unlinkScope() });
    this.addCommand({ id: 'rebuild-index', name: t('cmd.rebuildIndex'), callback: () => { this.rebuildIndex(); new Notice(t('notice.indexRebuilt')); } });

    // Path-list toggles for the active note (the command-palette twin of the explorer menu).
    // Each is available only when it would change something, so add/remove never both show.
    this.addPathCommand('add-source', t('cmd.addSource'), 'glossarySources', true, (p) => this.settings.glossaryMode === 'selected' && !this.pathListed('glossarySources', p));
    this.addPathCommand('remove-source', t('cmd.removeSource'), 'glossarySources', false, (p) => this.pathListed('glossarySources', p));
    this.addPathCommand('ignore-source', t('cmd.ignoreSource'), 'excludeSources', true, (p) => !this.pathListed('excludeSources', p));
    this.addPathCommand('unignore-source', t('cmd.unignoreSource'), 'excludeSources', false, (p) => this.pathListed('excludeSources', p));
    this.addPathCommand('exclude-note', t('cmd.excludeNote'), 'excludeFolders', true, (p) => !this.pathListed('excludeFolders', p));
    this.addPathCommand('unexclude-note', t('cmd.unexcludeNote'), 'excludeFolders', false, (p) => this.pathListed('excludeFolders', p));
    this.addPathCommand('scope-note', t('cmd.scopeNote'), 'scopeFolders', true, (p) => this.settings.scopeMode === 'folders' && !this.pathListed('scopeFolders', p));
    this.addPathCommand('unscope-note', t('cmd.unscopeNote'), 'scopeFolders', false, (p) => this.settings.scopeMode === 'folders' && this.pathListed('scopeFolders', p));

    if (suggestAvailable()) this.registerEditorSuggest(new HeadingSuggest(this.app, this));

    this.addSettingTab(new HeadingLinkerSettingTab(this.app, this));
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async loadLanguages() {
    this.languages = [];
    this.languageErrors = [];
    const seen = new Set();
    for (const lang of BUILTIN_LANGUAGES) {
      const id = lang && lang.id;
      const error = validateLanguage(lang);
      if (error) { this.languageErrors.push({ id: id || '?', error }); continue; }
      if (seen.has(id)) { this.languageErrors.push({ id, error: `duplicate id "${id}"` }); continue; }
      seen.add(id);
      this.languages.push(lang);
    }
    this.sortLanguages();
    this.languageErrors.sort((a, b) => a.id.localeCompare(b.id));

    if (!Array.isArray(this.settings.enabledLanguages)) {
      const sys = (window.localStorage.getItem('language') || '').split('-')[0].toLowerCase();
      const wanted = new Set(['en']);
      if (sys && this.languages.some((l) => l.id === sys)) wanted.add(sys);
      this.settings.enabledLanguages = this.languages.filter((l) => wanted.has(l.id)).map((l) => l.id);
      await this.saveSettings();
    }
    this.refreshActiveLanguages();
  }

  sortLanguages() {
    const order = this.settings.languageOrder || [];
    const rank = (l) => { const i = order.indexOf(l.id); return i === -1 ? Infinity : i; };
    this.languages.sort((a, b) =>
      rank(a) - rank(b) || (b.priority || 0) - (a.priority || 0) || a.name.localeCompare(b.name));
  }

  moveLanguage(id, dir) {
    const ids = this.languages.map((l) => l.id);
    const i = ids.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    this.settings.languageOrder = ids;
    this.sortLanguages();
  }

  refreshActiveLanguages() {
    const enabled = new Set(this.settings.enabledLanguages || []);
    this.activeLanguages = this.languages.filter((l) => enabled.has(l.id));
    this.keysCache = new Map();
  }

  async updateStatusBar() {
    const el = this.statusBarEl;
    if (!el) return;
    const clear = () => { el.setText(''); el.removeAttribute('aria-label'); };
    if (!this.settings.statusBar) return clear();
    const file = this.app.workspace.getActiveFile();
    if (!file || file.extension !== 'md' || !this.inScope(file.path)) return clear();
    try {
      const text = await this.app.vault.cachedRead(file);
      const linktexts = new Set(this.findMatches(text, this.currentFileBase(file.path), { protect: true }).map((m) => m.linktext));
      if (this.settings.statusBarIncludeLinks) {
        const cache = this.app.metadataCache.getFileCache(file);
        for (const link of (cache && cache.links) || []) {
          const hash = link.link.indexOf('#');
          if (hash < 0) continue;
          const dest = this.app.metadataCache.getFirstLinkpathDest(link.link, file.path);
          if (dest && this.isGlossaryFile(dest)) linktexts.add(`${dest.basename}#${link.link.slice(hash + 1)}`);
        }
      }
      const n = linktexts.size;
      el.setText(plural('term', n));
      el.setAttribute('aria-label', t('statusBar.aria', { n }));
    } catch (e) {
      clear();
    }
  }

  // --- Glossary sources & headings ---

  // An entry matches a path when it is that path exactly (a file) or a folder prefix of
  // it — so a list of files-and-folders needs no per-entry type.
  underAny(path, entries) {
    return entries.some((e) => path === e || path.startsWith(e + '/'));
  }

  glossarySourceList() {
    return splitLines(this.settings.glossarySources).map(sanitizeFolder).filter(Boolean);
  }

  excludeSourceList() {
    return splitLines(this.settings.excludeSources).map(sanitizeFolder).filter(Boolean);
  }

  // Is `path` a heading source? Ignored paths lose first (even in vault mode); then in
  // 'vault' mode every note qualifies, in 'selected' mode only listed files/folders.
  isGlossaryPath(path) {
    if (this.underAny(path, this.excludeSourceList())) return false;
    if (this.settings.glossaryMode === 'vault') return true;
    return this.underAny(path, this.glossarySourceList());
  }

  isGlossaryFile(file) {
    return file && file.extension === 'md' && this.isGlossaryPath(file.path);
  }

  glossaryFilesList() {
    return this.app.vault.getMarkdownFiles().filter((f) => this.isGlossaryFile(f));
  }

  headingsOf(file) {
    const cache = this.app.metadataCache.getFileCache(file);
    const headings = cache && cache.headings;
    if (!Array.isArray(headings)) return [];
    return headings
      .filter((h) => typeof h.heading === 'string' && h.heading.trim())
      .map((h) => ({ text: h.heading, level: h.level }));
  }

  // Fingerprint of what defines a file's terms — its headings and their aliases. The
  // 'changed' handler compares against this to skip rebuilds on unrelated body edits.
  fileFingerprint(file) {
    const aliases = this.aliasCache.get(file.path);
    return JSON.stringify({ h: this.headingsOf(file), a: aliases ? [...aliases] : [] });
  }

  // Read and cache one glossary file's `%%` alias comments. The only place a body is
  // read; called on first index and when the file changes — never during a plain rebuild.
  async loadFileAliases(file) {
    if (!this.settings.headingAliases) { this.aliasCache.set(file.path, new Map()); return; }
    const cache = this.app.metadataCache.getFileCache(file);
    const headings = (cache && cache.headings) || [];
    if (!headings.length) { this.aliasCache.set(file.path, new Map()); return; }
    try {
      const text = await this.app.vault.cachedRead(file);
      this.aliasCache.set(file.path, parseHeadingAliases(text, headings));
    } catch (e) {
      this.aliasCache.set(file.path, new Map());
    }
  }

  // Fill the alias cache for glossary files (only unread ones unless forced), then rebuild.
  async loadAliases(force = false) {
    for (const file of this.glossaryFilesList()) {
      if (force || !this.aliasCache.has(file.path)) await this.loadFileAliases(file);
    }
    this.rebuildIndex();
  }

  // Basename of `path` when it is a glossary file, else null — the note's own headings
  // are skipped so a glossary file doesn't link to itself.
  currentFileBase(path) {
    if (!path || !this.isGlossaryPath(path)) return null;
    return path.split('/').pop().replace(/\.md$/, '');
  }

  // The heading text of a "Basename#Heading" linktext.
  labelOf(linktext) {
    const i = linktext.indexOf('#');
    return i >= 0 ? linktext.slice(i + 1) : linktext;
  }

  // Parse the inside of a [[...]] as a heading link, or null if it carries no #subpath.
  // Shared by the unlink scan and the cursor-hit lookup so both read links identically.
  parseHeadingInner(inner) {
    const pipe = inner.indexOf('|');
    const rawTarget = (pipe >= 0 ? inner.slice(0, pipe) : inner).replace(/\\$/, '').trim();
    const hash = rawTarget.indexOf('#');
    if (hash < 0) return null;
    const target = rawTarget.slice(0, hash).trim();
    const subpath = rawTarget.slice(hash + 1).trim();
    if (!target || !subpath) return null;
    const display = pipe >= 0 ? inner.slice(pipe + 1).trim() : subpath;
    if (!display) return null;
    return { target, subpath, display };
  }

  // --- Links ---

  // linktext is always "Basename#Heading", so the link always needs the alias form to
  // show the note's own word rather than Obsidian's "Basename > Heading" rendering.
  // Inside a Markdown table cell the alias pipe must be escaped or it splits the row.
  wikiLink(linktext, display, inTable) {
    return inTable ? `[[${linktext}\\|${display}]]` : `[[${linktext}|${display}]]`;
  }

  // Replace each match (sorted, non-overlapping) with a wikilink, right to left.
  applyLinks(text, matches) {
    const sorted = matches.slice().sort((a, b) => a.start - b.start);
    let out = text;
    for (let j = sorted.length - 1; j >= 0; j--) {
      const link = this.wikiLink(sorted[j].linktext, sorted[j].display, inTableCell(text, sorted[j].start));
      out = out.slice(0, sorted[j].start) + link + out.slice(sorted[j].end);
    }
    return { newText: out };
  }

  // Inverse of applyLinks: replace each heading-link span with its plain display text,
  // right to left. The display has no pipe, so a table cell survives without escaping.
  unlinkLinks(text, links) {
    const sorted = links.slice().sort((a, b) => a.start - b.start);
    let out = text;
    for (let j = sorted.length - 1; j >= 0; j--) {
      out = out.slice(0, sorted[j].start) + sorted[j].display + out.slice(sorted[j].end);
    }
    return { newText: out, count: sorted.length };
  }

  // The heading link the cursor or selection touches, else null. Spanning the selection
  // (not just a point) catches a link in a table cell, where a right-click selects the
  // cell text instead of placing a bare cursor.
  headingLinkAt(editor) {
    const head = editor.getCursor('head');
    const from = editor.getCursor('from');
    const to = editor.getCursor('to');
    const lineNo = head.line;
    const line = editor.getLine(lineNo);
    const selStart = from.line === lineNo ? from.ch : 0;
    const selEnd = to.line === lineNo ? to.ch : line.length;
    const re = /\[\[([^\]\n]+)\]\]/g;
    let m;
    while ((m = re.exec(line)) !== null) {
      const s = m.index;
      const e = m.index + m[0].length;
      if (selEnd < s || selStart > e) continue;
      const parsed = this.parseHeadingInner(m[1]);
      if (!parsed) continue;
      const sourcePath = this.app.workspace.getActiveFile() ? this.app.workspace.getActiveFile().path : '';
      const dest = this.app.metadataCache.getFirstLinkpathDest(parsed.target, sourcePath);
      if (dest && this.isGlossaryFile(dest)) return { linktext: `${dest.basename}#${parsed.subpath}`, display: parsed.display, targetFile: dest, line: lineNo, from: s, to: e };
    }
    return null;
  }

  unlinkLinkAt(editor, link) {
    editor.replaceRange(link.display, { line: link.line, ch: link.from }, { line: link.line, ch: link.to });
    new Notice(t('notice.unlinked'));
    this.updateStatusBar();
  }

  openTerm(linktext, sourcePath, newTab) {
    this.app.workspace.openLinkText(linktext, sourcePath || '', newTab);
  }

  hoverTerm(event, targetEl, linktext, sourcePath) {
    this.app.workspace.trigger('hover-link', {
      event, source: 'heading-linker', hoverParent: this, targetEl, linktext, sourcePath: sourcePath || '',
    });
  }

  // --- Scope ---

  inScope(path) {
    if (this.noteOptedOut(path)) return false;
    const covers = (entry) => { const e = sanitizeFolder(entry); return !!e && (path === e || path.startsWith(e + '/')); };
    if (splitLines(this.settings.excludeFolders).some(covers)) return false;
    if (this.settings.scopeMode === 'folders') return splitLines(this.settings.scopeFolders).some(covers);
    return true;
  }

  // A note can turn linking off for itself with a `heading-linker: false` (or off/no/ignore)
  // frontmatter property — the per-note escape hatch, without touching folder settings.
  noteOptedOut(path) {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) return false;
    const fm = this.app.metadataCache.getFileCache(file);
    const v = fm && fm.frontmatter && fm.frontmatter['heading-linker'];
    if (v === false) return true;
    return typeof v === 'string' && ['false', 'off', 'no', 'ignore', 'disabled'].includes(v.trim().toLowerCase());
  }

  getScopeFiles() {
    return this.app.vault.getMarkdownFiles().filter((f) => this.inScope(f.path));
  }

  pathListed(listKey, path) {
    const entry = sanitizeFolder(path);
    return !!entry && splitLines(this.settings[listKey]).some((l) => sanitizeFolder(l) === entry);
  }

  // A command that adds/removes the active note's path in a list, shown only when
  // `available(path)` holds — so the add and remove twins never appear together.
  addPathCommand(id, name, listKey, add, available) {
    this.addCommand({
      id,
      name,
      checkCallback: (checking) => {
        const f = this.app.workspace.getActiveFile();
        if (!f || f.extension !== 'md' || !available(f.path)) return false;
        if (!checking) this.setPathInList(listKey, f.path, add);
        return true;
      },
    });
  }

  async setPathInList(listKey, path, add) {
    const entry = sanitizeFolder(path);
    if (!entry || add === this.pathListed(listKey, path)) return;
    const lines = splitLines(this.settings[listKey]);
    this.settings[listKey] = (add ? [...lines, entry] : lines.filter((l) => sanitizeFolder(l) !== entry)).join('\n');
    await this.saveSettings();
    // Source lists change the term set (and may bring in files with aliases to read);
    // scope lists only change where links land.
    if (listKey === 'glossarySources' || listKey === 'excludeSources') await this.loadAliases();
    this.rerenderViews();
    this.updateStatusBar();
    new Notice(t(NOTICE_KEYS[listKey][add ? 'add' : 'remove'], { entry }));
  }

  // --- Rendering ---

  rerenderViews() {
    this.app.workspace.getLeavesOfType('markdown').forEach((leaf) => {
      const v = leaf.view;
      if (v && v.previewMode && typeof v.previewMode.rerender === 'function') v.previewMode.rerender(true);
    });
    this.refreshEditors();
  }

  refreshEditors() {
    if (!this.cmRefreshEffect) return;
    this.app.workspace.getLeavesOfType('markdown').forEach((leaf) => {
      const cm = leaf.view && leaf.view.editor && leaf.view.editor.cm;
      if (cm) cm.dispatch({ effects: this.cmRefreshEffect.of(null) });
    });
  }
}

Object.assign(HeadingLinkerPlugin.prototype, matcher, highlight, materialize);

module.exports = HeadingLinkerPlugin;
