'use strict';

// Obsidian repairs links when a file is renamed, but not when a heading is: edit `## Projectile`
// to `## Projectiles` and every [[Guide#Projectile]] in the vault is silently broken. This is
// the one plugin that can notice — it already keeps every heading it indexed.

const { Notice } = require('obsidian');
const { inTableCell } = require('./shared/markdown');
const { rewriteWikiLinks, findWikiLinks } = require('./shared/wikilink');
const { writeReportNote } = require('./shared/report-note');
const preview = require('./shared/update-preview');
const { t } = require('./shared/i18n');

const PREVIEW_CLASS = 'heading-linker-preview';

// The rename two heading lists show, or null. Deliberately narrow: exactly one heading gone and
// exactly one arrived, in the same place and at the same level. Anything else — two edits at
// once, a level change, a reorder — is a guess, and a wrong guess rewrites the vault. The same
// rule the sigil linkers follow when a symbol moves.
function detectRename(before, after) {
  if (!Array.isArray(before) || !Array.isArray(after)) return null;
  if (before.length !== after.length) return null;
  let at = -1;
  for (let i = 0; i < before.length; i++) {
    if (before[i].text === after[i].text && before[i].level === after[i].level) continue;
    if (at >= 0) return null;
    at = i;
  }
  if (at < 0) return null;
  if (before[at].level !== after[at].level) return null;
  if (!before[at].text || !after[at].text) return null;
  return { from: before[at].text, to: after[at].text };
}

// The headings a stored fingerprint was taken from. The fingerprint is JSON rather than a hash
// precisely so the previous headings can be read back out of it.
function headingsOfFingerprint(fingerprint) {
  try {
    const parsed = JSON.parse(fingerprint);
    return Array.isArray(parsed && parsed.h) ? parsed.h : null;
  } catch {
    return null;
  }
}

// One pass over a note's wikilinks, retargeting those that point at the renamed heading.
// `selected` null is a dry run that records every change under a key; a set of keys applies
// only those — same walk, same keys, so the two passes line up.
const rewriteFor = (base, from, to, alsoDisplay) => (plugin, text, selected) => {
  const collect = selected == null;
  const changes = [];
  const out = rewriteWikiLinks(text, (parts, link) => {
    if (parts.file !== base || parts.heading !== from) return null;
    // Keyed by where the link sits, not by the order it is reached: the walk runs right to
    // left so earlier offsets stay true, and a counter would number the preview backwards.
    const k = link.start;
    if (collect) changes.push({ key: k, label: parts.display || parts.heading, from, to });
    if (!collect && !selected.has(k)) return null;
    const next = Object.assign({}, parts, { heading: to });
    // The display is the note's own prose and is left alone — unless it was the old heading
    // word for word, which is the one case where keeping it would leave a visible lie.
    if (alsoDisplay && parts.display === from) next.display = to;
    return next;
  }, inTableCell);
  changes.sort((a, b) => a.key - b.key);
  return { newText: out.text, count: out.count, changes, broken: [] };
};

const methods = {
  // Compare the headings a file had against the ones it has, and remember a rename until the
  // rebuild timer fires. Asking on every keystroke would put a dialog in the middle of typing
  // a heading, so nothing is offered until the edit has settled.
  noteHeadingRename(file, previousFingerprint) {
    if (this.settings.followHeadingRenames === 'off') return;
    const before = headingsOfFingerprint(previousFingerprint);
    const after = this.headingsOf(file);
    const hit = before && detectRename(before, after);
    if (!hit) return;
    if (!this.pendingRenames) this.pendingRenames = [];
    // Typing into a heading lands here once per parse, so A→B→C arrives as two renames inside
    // one debounce window. They must fold into A→C: offering A→B would retarget every link to
    // a heading the file no longer has, and the B→C pass would then find nothing to fix.
    const chained = this.pendingRenames.find((r) => r.base === file.basename && r.to === hit.from);
    if (!chained) {
      this.pendingRenames.push({ base: file.basename, from: hit.from, to: hit.to });
      return;
    }
    chained.to = hit.to;
    // Edited back to what it was: there is nothing left to offer.
    if (chained.from === chained.to) this.pendingRenames.splice(this.pendingRenames.indexOf(chained), 1);
  },

  // Fired from the rebuild timer. Several renames inside one window are offered one after
  // another rather than merged: each is its own preview over its own links.
  flushHeadingRenames() {
    const queued = this.pendingRenames || [];
    this.pendingRenames = [];
    if (this.settings.followHeadingRenames === 'off') return;
    for (const r of queued) this.offerHeadingRename(r);
  },

  // In 'ask' the preview is never opened without a click — not even when the notice cannot be
  // given one. A modal over the whole vault appearing on its own is what this setting rules out.
  offerHeadingRename({ base, from, to }) {
    if (this.settings.followHeadingRenames !== 'ask') { this.previewHeadingRename(base, from, to); return; }
    const notice = new Notice(t('notice.headingRenamed', { from, to }), 15000);
    if (!notice.noticeEl || !notice.noticeEl.createEl) return;
    const act = notice.noticeEl.createEl('a', { text: t('notice.headingRenamed.action'), cls: 'heading-linker-notice-action' });
    act.onclick = () => { notice.hide(); this.previewHeadingRename(base, from, to); };
  },

  previewHeadingRename(base, from, to) {
    return preview.updateInVault(this, rewriteFor(base, from, to, true), PREVIEW_CLASS);
  },

  // A heading renamed while the plugin was off leaves links naming a heading that is gone. Which
  // heading replaced it cannot be told after the fact — that is why the rename is followed as it
  // happens — so this reports rather than guesses, and the reader decides.
  async findBrokenHeadingLinks() {
    const known = new Set(this.terms.map((term) => term.linktext));
    const sources = new Set(this.terms.map((term) => term.fileBase));
    const rows = [];
    for (const f of this.app.vault.getMarkdownFiles()) {
      const text = await this.app.vault.cachedRead(f);
      for (const link of findWikiLinks(text)) {
        const { file: base, heading } = link.parts;
        // Only links into a file this plugin indexes: a heading link into any other note is
        // somebody else's, and a file with no headings at all would report all of them.
        if (!base || !heading || !sources.has(base)) continue;
        if (known.has(`${base}#${heading}`)) continue;
        rows.push({ note: f.path, base, heading });
      }
    }
    return rows;
  },

  async reportBrokenHeadingLinks() {
    let rows;
    // Reading every note can fail on one of them; the command that called this cannot await,
    // so a rejection here would be a silent no-op with a console trace.
    try {
      rows = await this.findBrokenHeadingLinks();
    } catch {
      new Notice(t('notice.reportFailed'));
      return;
    }
    if (!rows.length) { new Notice(t('notice.headingLinksWell')); return; }
    const lines = [
      '# ' + t('report.broken.title'),
      '',
      t('report.broken.summary', { n: rows.length }),
      '',
      '| ' + [t('report.broken.note'), t('report.broken.target')].join(' | ') + ' |',
      '|---|---|',
    ];
    const esc = (s) => String(s).replace(/\|/g, '\\|');
    for (const r of rows) lines.push(`| [[${esc(r.note.replace(/\.md$/i, ''))}]] | \`${esc(r.base)}#${esc(r.heading)}\` |`);
    const file = await writeReportNote(this.app.vault, t('report.broken.file'), lines.join('\n') + '\n');
    if (!file) { new Notice(t('notice.reportFailed')); return; }
    new Notice(t('notice.headingLinksBroken', { n: rows.length, file: file.path }));
    const leaf = this.app.workspace.getLeaf && this.app.workspace.getLeaf(true);
    if (leaf && leaf.openFile) await leaf.openFile(file);
    return file;
  },
};

module.exports = { methods, detectRename, headingsOfFingerprint, rewriteFor };
