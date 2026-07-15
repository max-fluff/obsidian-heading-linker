'use strict';

const { PluginSettingTab, Setting, Notice } = require('obsidian');
const { PathSuggest, folderSuggestAvailable } = require('./folder-suggest');
const { sanitizeFolder } = require('./constants');
const { renderFolderList } = require('./shared/folder-list');
const { t, plural } = require('./shared/i18n');

class HeadingLinkerSettingTab extends PluginSettingTab {
  constructor(app, plugin) { super(app, plugin); this.plugin = plugin; }

  display() {
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

    new Setting(containerEl).setName(t('set.heading.sources')).setHeading();

    new Setting(containerEl)
      .setName(t('set.glossaryMode.name'))
      .setDesc(t('set.glossaryMode.desc'))
      .addDropdown((d) => d
        .addOption('selected', t('set.glossaryMode.selected'))
        .addOption('vault', t('set.glossaryMode.vault'))
        .setValue(s.glossaryMode)
        .onChange(async (v) => { s.glossaryMode = v; await saveSources(); this.display(); }));

    // Files-and-folders editor that rebuilds the index on change (source lists) and shares
    // the source-list labels.
    const sourceList = (name, desc, key) => renderFolderList(containerEl, {
      cls: 'heading',
      name,
      desc,
      get: () => s[key],
      set: async (v) => { s[key] = v; await saveSources(); },
      normalize: sanitizeFolder,
      attachSuggest: folderSuggestAvailable()
        ? (inputEl, onPick) => new PathSuggest(this.app, inputEl, onPick)
        : null,
      placeholder: t('set.sourceList.add'),
      removeLabel: t('set.sourceList.remove'),
      addLabel: t('set.sourceList.addAria'),
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

    new Setting(containerEl).setName(t('set.heading.scope')).setHeading();

    new Setting(containerEl)
      .setName(t('set.scopeMode.name'))
      .setDesc(t('set.scopeMode.desc'))
      .addDropdown((d) => d
        .addOption('folders', t('set.scopeMode.folders'))
        .addOption('vault', t('set.scopeMode.vault'))
        .setValue(s.scopeMode)
        .onChange(async (v) => { s.scopeMode = v; await saveScope(); this.display(); }));

    const folderList = (name, desc, key) => renderFolderList(containerEl, {
      cls: 'heading',
      name,
      desc,
      get: () => s[key],
      set: async (v) => { s[key] = v; await saveScope(); },
      normalize: sanitizeFolder,
      attachSuggest: folderSuggestAvailable()
        ? (inputEl, onPick) => new PathSuggest(this.app, inputEl, onPick)
        : null,
      placeholder: t('set.folderList.add'),
      removeLabel: t('set.folderList.remove'),
      addLabel: t('set.folderList.addAria'),
    });

    if (s.scopeMode === 'folders') folderList(t('set.scopeFolders.name'), t('set.scopeFolders.desc'), 'scopeFolders');
    folderList(t('set.excludeFolders.name'), t('set.excludeFolders.desc'), 'excludeFolders');

    this.statusEl = containerEl.createEl('div', { cls: 'heading-section-desc' });
    this.renderStatus();

    new Setting(containerEl).setName(t('set.heading.matching')).setHeading();

    new Setting(containerEl)
      .setName(t('set.matchMode.name'))
      .setDesc(t('set.matchMode.desc'))
      .addDropdown((d) => d
        .addOption('stemmer', t('set.matchMode.stemmer'))
        .addOption('endingStrip', t('set.matchMode.endingStrip'))
        .addOption('exact', t('set.matchMode.exact'))
        .setValue(s.matchMode)
        .onChange(async (v) => { s.matchMode = v; await save(true); }));

    new Setting(containerEl)
      .setName(t('set.minTermLength.name'))
      .setDesc(t('set.minTermLength.desc'))
      .addText((c) => { c.inputEl.type = 'number'; c.inputEl.min = '1'; c.setValue(String(s.minTermLength)).onChange(async (v) => { const n = parseInt(v, 10); s.minTermLength = Number.isFinite(n) && n > 0 ? n : 1; await save(true); }); });

    new Setting(containerEl)
      .setName(t('set.smartCase.name'))
      .setDesc(t('set.smartCase.desc'))
      .addToggle((c) => c.setValue(s.smartCase).onChange(async (v) => { s.smartCase = v; await save(true); }));

    this.renderLanguages(containerEl, s, save);

    new Setting(containerEl)
      .setName(t('set.linkFirstOnly.name'))
      .setDesc(t('set.linkFirstOnly.desc'))
      .addToggle((c) => c.setValue(s.linkFirstOnly).onChange(async (v) => { s.linkFirstOnly = v; await save(false); }));

    new Setting(containerEl)
      .setName(t('set.excludeTerms.name'))
      .setDesc(t('set.excludeTerms.desc'))
      .addTextArea((c) => { c.setValue(s.excludeTerms).onChange(async (v) => { s.excludeTerms = v; await save(true); }); c.inputEl.rows = 3; });

    new Setting(containerEl).setName(t('set.heading.highlighting')).setHeading();

    new Setting(containerEl)
      .setName(t('set.highlightInReading.name'))
      .setDesc(t('set.highlightInReading.desc'))
      .addToggle((c) => c.setValue(s.highlightInReading).onChange(async (v) => { s.highlightInReading = v; await save(false); this.plugin.rerenderViews(); }));

    new Setting(containerEl)
      .setName(t('set.editingHighlight.name'))
      .setDesc(t('set.editingHighlight.desc'))
      .addDropdown((d) => d
        .addOption('off', t('set.editingHighlight.off'))
        .addOption('live', t('set.editingHighlight.live'))
        .addOption('onSave', t('set.editingHighlight.onSave'))
        .setValue(s.editingHighlight)
        .onChange(async (v) => { s.editingHighlight = v; await save(false); this.plugin.refreshEditors(); }));

    new Setting(containerEl)
      .setName(t('set.skipHeadings.name'))
      .setDesc(t('set.skipHeadings.desc'))
      .addToggle((c) => c.setValue(s.skipHeadings).onChange(async (v) => { s.skipHeadings = v; await save(false); this.plugin.rerenderViews(); }));

    new Setting(containerEl)
      .setName(t('set.statusBar.name'))
      .setDesc(t('set.statusBar.desc'))
      .addToggle((c) => c.setValue(s.statusBar).onChange(async (v) => { s.statusBar = v; await save(false); this.plugin.updateStatusBar(); }));

    new Setting(containerEl)
      .setName(t('set.statusBarIncludeLinks.name'))
      .setDesc(t('set.statusBarIncludeLinks.desc'))
      .addToggle((c) => c.setValue(s.statusBarIncludeLinks).onChange(async (v) => { s.statusBarIncludeLinks = v; await save(false); this.plugin.updateStatusBar(); }));

    new Setting(containerEl).setName(t('set.heading.autocomplete')).setHeading();

    new Setting(containerEl)
      .setName(t('set.linkSuggest.name'))
      .setDesc(t('set.linkSuggest.desc'))
      .addToggle((c) => c.setValue(s.linkSuggest).onChange(async (v) => { s.linkSuggest = v; await save(false); }));

    new Setting(containerEl)
      .setName(t('set.suggestMinChars.name'))
      .setDesc(t('set.suggestMinChars.desc'))
      .addText((c) => { c.inputEl.type = 'number'; c.inputEl.min = '1'; c.setValue(String(s.suggestMinChars)).onChange(async (v) => { const n = parseInt(v, 10); s.suggestMinChars = Number.isFinite(n) && n > 0 ? n : 1; await save(false); }); });

    new Setting(containerEl)
      .setName(t('set.suggestSkipAfter.name'))
      .setDesc(t('set.suggestSkipAfter.desc'))
      .addText((c) => c.setValue(s.suggestSkipAfter).onChange(async (v) => { s.suggestSkipAfter = v; await save(false); }));

    new Setting(containerEl).setName(t('set.heading.contextMenu')).setHeading();

    const menuToggle = (key, name, desc) => new Setting(containerEl)
      .setName(name).setDesc(desc)
      .addToggle((c) => c.setValue(s[key]).onChange(async (v) => { s[key] = v; await save(false); }));
    menuToggle('menuTurnInto', t('set.menuTurnInto.name'), t('set.menuTurnInto.desc'));
    menuToggle('menuOpen', t('set.menuOpen.name'), t('set.menuOpen.desc'));
    menuToggle('menuExclude', t('set.menuExclude.name'), t('set.menuExclude.desc'));
    menuToggle('menuUnlink', t('set.menuUnlink.name'), t('set.menuUnlink.desc'));

    new Setting(containerEl).setName(t('set.heading.maintenance')).setHeading();

    new Setting(containerEl)
      .setName(t('set.rebuild.name'))
      .setDesc(t('set.rebuild.desc'))
      .addButton((b) => b.setButtonText(t('set.rebuild.button')).onClick(() => { this.plugin.rebuildIndex(); new Notice(t('notice.indexRebuilt')); this.renderStatus(); }));
  }

  renderLanguages(containerEl, s, save) {
    const langs = this.plugin.languages;
    const errors = this.plugin.languageErrors || [];
    const enabledCount = langs.filter((l) => (s.enabledLanguages || []).includes(l.id)).length;
    if (this.showLanguages === undefined) this.showLanguages = false;

    const desc = t('set.languages.desc', { enabled: enabledCount, total: langs.length })
      + (errors.length ? t('set.languages.invalidSuffix', { n: errors.length }) : '') + '.';

    new Setting(containerEl)
      .setName(t('set.languages.name'))
      .setDesc(desc)
      .addExtraButton((b) => b.setIcon(this.showLanguages ? 'chevron-up' : 'chevron-down')
        .setTooltip(this.showLanguages ? t('set.languages.hide') : t('set.languages.show'))
        .onClick(() => { this.showLanguages = !this.showLanguages; this.display(); }));

    if (!this.showLanguages) return;

    langs.forEach((lang, i) => {
      const row = new Setting(containerEl)
        .setName(lang.name)
        .setDesc(`id: ${lang.id}`)
        .addExtraButton((b) => b.setIcon('chevron-up').setTooltip(t('set.lang.higher')).setDisabled(i === 0)
          .onClick(async () => { this.plugin.moveLanguage(lang.id, -1); await this.applyLanguageChange(); }))
        .addExtraButton((b) => b.setIcon('chevron-down').setTooltip(t('set.lang.lower')).setDisabled(i === langs.length - 1)
          .onClick(async () => { this.plugin.moveLanguage(lang.id, 1); await this.applyLanguageChange(); }))
        .addToggle((c) => c.setValue((s.enabledLanguages || []).includes(lang.id)).onChange(async (v) => {
          const set = new Set(s.enabledLanguages || []);
          if (v) set.add(lang.id); else set.delete(lang.id);
          s.enabledLanguages = [...set];
          await this.applyLanguageChange();
        }));
      row.settingEl.addClass('heading-lang-row');
    });
    for (const bad of errors) {
      const row = new Setting(containerEl)
        .setName(bad.id)
        .setDesc(t('set.lang.invalid', { error: bad.error }))
        .addExtraButton((b) => b.setIcon('alert-triangle').setTooltip(t('set.lang.invalid', { error: bad.error })).setDisabled(true));
      row.nameEl.addClass('heading-lang-error');
      row.settingEl.addClass('heading-lang-row');
      row.settingEl.addClass('mod-warning');
    }
  }

  async applyLanguageChange() {
    await this.plugin.saveSettings();
    this.plugin.refreshActiveLanguages();
    this.plugin.rebuildIndex();
    this.plugin.rerenderViews();
    this.display();
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
