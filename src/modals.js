'use strict';

const { Modal } = require('obsidian');
const { t } = require('./shared/i18n');
const { inTableCell } = require('./shared/markdown');

// files: [{ file, original, matches: [{ start, end, display, linktext, label, alts }], label? }].
// Ambiguous matches (alts present) are resolved once per surface word in a top panel
// (the choice applies to every occurrence everywhere); "skip" leaves them as text.
// plugin supplies applyLinks / wikiLink. onApply receives
// [{ file, label, original, newText, count }].
const SKIP = ' skip';

class MaterializePreviewModal extends Modal {
  constructor(app, files, plugin, onApply) {
    super(app);
    this.files = files;
    this.plugin = plugin;
    this.onApply = onApply;
    // One resolution group per ambiguous surface word (case-insensitive).
    this.groups = new Map();
    for (const fc of files) {
      for (const m of fc.matches) {
        if (!(m.alts && m.alts.length)) continue;
        const key = m.display.toLowerCase();
        if (!this.groups.has(key)) this.groups.set(key, { display: m.display, candidates: [m.linktext, ...m.alts], choice: m.linktext, spans: [] });
      }
    }
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl('h3', { text: t('modal.materialize.title') });
    const total = this.files.reduce((n, f) => n + f.matches.length, 0);
    contentEl.createEl('p', { text: t('modal.materialize.summary', { files: this.files.length, replacements: total }) });

    // Resolve-ambiguity panel: one selector per word, applied to all its occurrences.
    if (this.groups.size) {
      contentEl.createEl('p', { cls: 'heading-section-desc', text: t('modal.materialize.ambiguous', { n: this.groups.size }) });
      const panel = contentEl.createDiv({ cls: 'heading-resolve-panel' });
      for (const g of this.groups.values()) {
        const row = panel.createDiv({ cls: 'heading-resolve-row' });
        row.createSpan({ cls: 'heading-resolve-word', text: g.display });
        row.createSpan({ text: '→' });
        const sel = row.createEl('select', { cls: 'heading-term-select' });
        for (const term of g.candidates) sel.createEl('option', { text: term, value: term });
        sel.createEl('option', { text: t('modal.skipOption'), value: SKIP });
        sel.value = g.choice;
        sel.onchange = () => { g.choice = sel.value === SKIP ? null : sel.value; g.spans.forEach((upd) => upd()); };
      }
    }

    this.files.forEach((fc) => {
      contentEl.createDiv({ cls: 'heading-preview-file', text: fc.file ? fc.file.path : (fc.label || t('label.selection')) });
      const table = contentEl.createEl('table', { cls: 'heading-preview-table' });
      fc.matches.slice(0, 50).forEach((m) => {
        const inTable = inTableCell(fc.original, m.start);
        const tr = table.createEl('tr');
        tr.createEl('td', { text: m.display });
        tr.createEl('td', { text: '→' });
        const after = tr.createEl('td');
        if (m.alts && m.alts.length) {
          tr.addClass('heading-ambiguous-row');
          const g = this.groups.get(m.display.toLowerCase());
          const render = () => after.setText(g.choice == null ? t('modal.leftAsText') : this.plugin.wikiLink(g.choice, m.display, inTable));
          g.spans.push(render);
          render();
        } else {
          after.setText(this.plugin.wikiLink(m.linktext, m.display, inTable));
        }
      });
      if (fc.matches.length > 50) contentEl.createEl('div', { cls: 'heading-preview-empty', text: t('modal.andMore', { n: fc.matches.length - 50 }) });
    });

    const buttons = contentEl.createDiv({ cls: 'heading-preview-buttons' });
    const apply = buttons.createEl('button', { text: t('btn.apply'), cls: 'mod-cta' });
    apply.onclick = async () => {
      const results = this.files.map((fc) => {
        const chosen = [];
        for (const m of fc.matches) {
          if (m.alts && m.alts.length) {
            const g = this.groups.get(m.display.toLowerCase());
            if (!g || g.choice == null) continue; // skipped — leave as plain text
            chosen.push(g.choice === m.linktext ? m : { ...m, linktext: g.choice });
          } else {
            chosen.push(m);
          }
        }
        const { newText } = this.plugin.applyLinks(fc.original, chosen);
        return { file: fc.file, label: fc.label, original: fc.original, newText, count: chosen.length };
      });
      await this.onApply(results);
      this.close();
    };
    buttons.createEl('button', { text: t('btn.cancel') }).onclick = () => this.close();
  }

  onClose() { this.contentEl.empty(); }
}

// files: [{ file, original, matches: [{ start, end, display, linktext, source }], label? }].
// Inverse of the materialize preview: each row shows the link source → its plain display.
// plugin supplies unlinkLinks. onApply receives [{ file, label, original, newText, count }].
class UnlinkPreviewModal extends Modal {
  constructor(app, files, plugin, onApply) {
    super(app);
    this.files = files;
    this.plugin = plugin;
    this.onApply = onApply;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl('h3', { text: t('modal.unlink.title') });
    const total = this.files.reduce((n, f) => n + f.matches.length, 0);
    contentEl.createEl('p', { text: t('modal.unlink.summary', { files: this.files.length, links: total }) });

    this.files.forEach((fc) => {
      contentEl.createDiv({ cls: 'heading-preview-file', text: fc.file ? fc.file.path : (fc.label || t('label.selection')) });
      const table = contentEl.createEl('table', { cls: 'heading-preview-table' });
      fc.matches.slice(0, 50).forEach((m) => {
        const tr = table.createEl('tr');
        tr.createEl('td', { text: m.source });
        tr.createEl('td', { text: '→' });
        tr.createEl('td', { text: m.display });
      });
      if (fc.matches.length > 50) contentEl.createEl('div', { cls: 'heading-preview-empty', text: t('modal.andMore', { n: fc.matches.length - 50 }) });
    });

    const buttons = contentEl.createDiv({ cls: 'heading-preview-buttons' });
    const apply = buttons.createEl('button', { text: t('btn.apply'), cls: 'mod-cta' });
    apply.onclick = async () => {
      const results = this.files.map((fc) => {
        const { newText, count } = this.plugin.unlinkLinks(fc.original, fc.matches);
        return { file: fc.file, label: fc.label, original: fc.original, newText, count };
      });
      await this.onApply(results);
      this.close();
    };
    buttons.createEl('button', { text: t('btn.cancel') }).onclick = () => this.close();
  }

  onClose() { this.contentEl.empty(); }
}

// Pick one heading from several (collision). opts: { title, terms: [linktext], onChoose }.
class ChooseTermModal extends Modal {
  constructor(app, opts) {
    super(app);
    this.opts = opts;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl('h3', { text: this.opts.title || t('modal.choose.title') });
    contentEl.createEl('p', { text: t('modal.choose.body') });
    const list = contentEl.createDiv({ cls: 'heading-choose-list' });
    for (const term of this.opts.terms) {
      const b = list.createEl('button', { text: term, cls: 'heading-choose-item' });
      b.onclick = async () => { await this.opts.onChoose(term); this.close(); };
    }
    contentEl.createDiv({ cls: 'heading-preview-buttons' })
      .createEl('button', { text: t('btn.cancel') }).onclick = () => this.close();
  }

  onClose() { this.contentEl.empty(); }
}

module.exports = { MaterializePreviewModal, UnlinkPreviewModal, ChooseTermModal };
