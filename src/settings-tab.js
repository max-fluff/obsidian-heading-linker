'use strict';

const { PluginSettingTab, Setting, Notice } = require('obsidian');
const { VaultPathSuggest, suggestAvailable } = require('./shared/prose/vault-suggest');
const { sanitizeFolder } = require('./constants');
const { t, plural } = require('./shared/i18n');
const { redraw } = require('./shared/settings-redraw');
const { renderPrecedenceSetting } = require('./shared/precedence');
const { createProseSettings } = require('./shared/prose/settings');

class HeadingLinkerSettingTab extends PluginSettingTab {
  constructor(app, plugin) { super(app, plugin); this.plugin = plugin; }

  // Every fold and toggle redraws the whole pane; the reader keeps their place (shared/settings-redraw).
  display() {
    redraw(this, () => this.draw());
  }

  draw() {
    const { containerEl } = this;
    containerEl.empty();
    const s = this.plugin.settings;
    // A rebuild changes what matches, so also refresh open views and the status bar.
    const save = async (rebuild) => {
      await this.plugin.saveSettings();
      if (rebuild) { this.plugin.rebuildIndex(); this.plugin.rerenderViews(); this.plugin.updateStatusBar(); }
    };
    // Scope changes don't touch the heading index, so refresh views without a rebuild.
    const saveScope = async () => { await this.plugin.saveSettings(); this.plugin.rerenderViews(); this.plugin.updateStatusBar(); };
    // Source-set changes may pull in files whose alias comments must be read, so reload
    // aliases (which rebuilds). force re-reads every file — for toggling aliases on/off.
    const saveSources = async (force) => { await this.plugin.saveSettings(); await this.plugin.loadAliases(force); this.plugin.rerenderViews(); this.plugin.updateStatusBar(); this.renderStatus(); };

    const sections = createProseSettings(this, { cls: 'heading', save });
    const attachSuggest = suggestAvailable()
      ? (inputEl, onPick) => new VaultPathSuggest(this.app, inputEl, onPick)
      : null;

    new Setting(containerEl).setName(t('set.heading.sources')).setHeading();

    new Setting(containerEl)
      .setName(t('set.glossaryMode.name'))
      .setDesc(t('set.glossaryMode.desc'))
      .addDropdown((d) => d
        .addOption('selected', t('set.glossaryMode.selected'))
        .addOption('vault', t('set.glossaryMode.vault'))
        .setValue(s.glossaryMode)
        .onChange(async (v) => { s.glossaryMode = v; await saveSources(); this.display(); }));

    const sourceList = (name, desc, key) => sections.pathList(containerEl, {
      name, desc, key, labels: 'sourceList', normalize: sanitizeFolder, attachSuggest, save: saveSources,
    });

    if (s.glossaryMode === 'selected') sourceList(t('set.glossarySources.name'), t('set.glossarySources.desc'), 'glossarySources');
    sourceList(t('set.excludeSources.name'), t('set.excludeSources.desc'), 'excludeSources');

    // Which heading levels become terms — a compact row of H1..H6 checkboxes.
    const levelSetting = new Setting(containerEl)
      .setName(t('set.headingLevels.name'))
      .setDesc(t('set.headingLevels.desc'));
    for (let lvl = 1; lvl <= 6; lvl++) {
      const label = levelSetting.controlEl.createEl('label', { cls: 'heading-level-check' });
      const cb = label.createEl('input', { type: 'checkbox' });
      cb.checked = (s.headingLevels || []).includes(lvl);
      label.createSpan({ text: `H${lvl}` });
      cb.onchange = async () => {
        const set = new Set(s.headingLevels || []);
        if (cb.checked) set.add(lvl); else set.delete(lvl);
        s.headingLevels = [...set].sort((a, b) => a - b);
        await save(true);
        this.renderStatus();
      };
    }

    new Setting(containerEl)
      .setName(t('set.headingAliases.name'))
      .setDesc(t('set.headingAliases.desc'))
      .addToggle((c) => c.setValue(s.headingAliases).onChange(async (v) => { s.headingAliases = v; await saveSources(true); }));

    new Setting(containerEl)
      .setName(t('set.followRenames.name'))
      .setDesc(t('set.followRenames.desc'))
      .addDropdown((c) => c
        .addOption('off', t('set.followRenames.off'))
        .addOption('ask', t('set.followRenames.ask'))
        .addOption('preview', t('set.followRenames.preview'))
        .setValue(s.followHeadingRenames)
        .onChange(async (v) => { s.followHeadingRenames = v; await save(false); }));

    new Setting(containerEl).setName(t('set.heading.scope')).setHeading();

    sections.scopeMode(containerEl, saveScope);

    const folderList = (name, desc, key) => sections.pathList(containerEl, {
      name, desc, key, labels: 'folderList', normalize: sanitizeFolder, attachSuggest, save: saveScope,
    });

    if (s.scopeMode === 'folders') folderList(t('set.scopeFolders.name'), t('set.scopeFolders.desc'), 'scopeFolders');
    folderList(t('set.excludeFolders.name'), t('set.excludeFolders.desc'), 'excludeFolders');

    this.statusEl = containerEl.createEl('div', { cls: 'heading-section-desc' });
    this.renderStatus();

    new Setting(containerEl).setName(t('set.heading.matching')).setHeading();

    sections.matchMode(containerEl);
    sections.languages(containerEl);
    sections.matchLimits(containerEl);
    sections.highlighting(containerEl);
    sections.autocomplete(containerEl);
    sections.menuToggles(containerEl, ['menuTurnInto', 'menuOpen', 'menuExclude', 'menuUnlink', 'menuCollect']);

    new Setting(containerEl).setName(t('set.heading.maintenance')).setHeading();

    // First thing in Maintenance, in the same place in all four plugins: it is a
    // vault-wide arrangement between plugins rather than a knob for this one, and it
    // renders nothing at all unless another linker is installed.
    renderPrecedenceSetting(containerEl, {
      app: this.app,
      provider: this.plugin.api && this.plugin.api.linker,
      Setting,
      cls: 'heading',
      save: async (value) => { s.linkPrecedence = value; await save(false); },
    });

    new Setting(containerEl)
      .setName(t('set.rebuild.name'))
      .setDesc(t('set.rebuild.desc'))
      .addButton((b) => b.setButtonText(t('set.rebuild.button')).onClick(() => { this.plugin.rebuildIndex(); new Notice(t('notice.indexRebuilt')); this.renderStatus(); }));
  }

  renderStatus() {
    const el = this.statusEl;
    if (!el) return;
    const s = this.plugin.settings;
    if (s.glossaryMode === 'selected' && !this.plugin.glossarySourceList().length) {
      el.setText(t('set.noSourcesStatus'));
      return;
    }
    const n = (this.plugin.index && this.plugin.index.termCount) || 0;
    el.setText(t('set.termsIndexed', { terms: plural('term', n) }));
  }
}

module.exports = { HeadingLinkerSettingTab };
