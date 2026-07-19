'use strict';

// The tab is assembled from shared section renderers, so a rename on either side breaks it
// only when the reader opens Settings — nothing else in the suite constructs it. This runs
// display() end to end and checks the sections still arrive, in order.

const { describe, it, assert } = require('../src/shared/testing/harness');
const path = require('path');
const { fakeApp, installStubs, obsidianStub, RecordingSetting, elLike } = require('../src/shared/testing/stubs');

installStubs();

obsidianStub.Setting = RecordingSetting;

const { t } = require('../src/shared/i18n');
const { HeadingLinkerSettingTab } = require(path.join(__dirname, '..', 'src', 'settings-tab.js'));


// Only what display() reaches for; the index is empty, which is the interesting case for
// the status line anyway.
function fakePlugin() {
  return {
    settings: {
      glossaryMode: 'selected', glossarySources: '', excludeSources: '',
      headingLevels: [1, 2], headingAliases: true,
      scopeMode: 'folders', scopeFolders: '', excludeFolders: '',
      matchMode: 'stemmer', minTermLength: 3, smartCase: true,
      enabledLanguages: [], linkFirstOnly: false, excludeTerms: '',
      highlightInReading: true, editingHighlight: 'live', skipHeadings: false,
      statusBar: true, statusBarIncludeLinks: false,
      linkSuggest: true, suggestMinChars: 2, suggestSkipAfter: '',
      menuTurnInto: true, menuOpen: true, menuExclude: true, menuUnlink: true, menuCollect: true,
      linkPrecedence: 0,
    },
    languages: [],
    languageErrors: [],
    index: { termCount: 0 },
    api: { linker: { id: 'heading-linker', precedence: 0 } },
    glossarySourceList: () => [],
    saveSettings: async () => {},
    loadAliases: async () => {},
    rebuildIndex: () => {},
    rerenderViews: () => {},
    refreshEditors: () => {},
    updateStatusBar: () => {},
    refreshActiveLanguages: () => {},
    moveLanguage: () => {},
  };
}

describe('settings tab', () => {
  it('renders every section without throwing', () => {
    RecordingSetting.reset();
    const tab = new HeadingLinkerSettingTab(fakeApp, fakePlugin());
    tab.containerEl = elLike();
    tab.display();

    const headings = RecordingSetting.entries.filter((e) => e.heading).map((e) => e.name);
    assert.deepStrictEqual(headings, [
      t('set.heading.sources'),
      t('set.heading.scope'),
      t('set.heading.matching'),
      t('set.heading.highlighting'),
      t('set.heading.autocomplete'),
      t('set.heading.contextMenu'),
      t('set.heading.maintenance'),
    ]);
  });

  it('keeps its own settings alongside the shared ones', () => {
    RecordingSetting.reset();
    const tab = new HeadingLinkerSettingTab(fakeApp, fakePlugin());
    tab.containerEl = elLike();
    tab.display();

    const names = RecordingSetting.names();
    // Shared sections.
    assert.ok(names.includes(t('set.matchMode.name')), 'shared matching section missing');
    assert.ok(names.includes(t('set.linkSuggest.name')), 'shared autocomplete section missing');
    assert.ok(names.includes(t('set.menuCollect.name')), 'shared menu toggles missing');
    assert.ok(names.includes(t('set.smartCase.name')), 'shared smart case missing');
    // Heading-only ones the shared renderers know nothing about.
    assert.ok(names.includes(t('set.headingLevels.name')), 'heading levels missing');
    assert.ok(names.includes(t('set.headingAliases.name')), 'heading aliases missing');
  });
});
