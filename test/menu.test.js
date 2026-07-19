'use strict';

// What the editor menu offers on a word, and what its items actually do. Both cases below
// broke in a vault while the suite stayed green: nothing exercised the menu handler.

const { describe, it, assert } = require('../src/shared/testing/harness');
const path = require('path');
const { fakeApp, installStubs, recordingMenu, fakeEditor } = require('../src/shared/testing/stubs');

installStubs();

const load = async () => {
  const Plugin = require(path.join(__dirname, '..', 'src', 'main.js'));
  const plugin = new Plugin(fakeApp, { version: '0.0.0', id: 'heading-linker' });
  await plugin.onload();
  plugin.inScope = () => true;
  fakeApp.workspace.getActiveFile = () => ({ path: 'Note.md', basename: 'Note', extension: 'md' });
  return plugin;
};

// A word we match, optionally contested by a peer that yielded it to us.
const hitWith = (foreign = []) => ({
  line: 0,
  match: { start: 0, end: 5, display: 'spawn', alts: [], linktext: 'Guide#Spawn' },
  foreign,
});

const menuFor = () => {
  const menu = recordingMenu();
  fakeApp.handlers.get('editor-menu')(menu, fakeEditor('spawn here', 2));
  return menu;
};

describe('editor menu', () => {
  it('links the word rather than opening a peer’s note', async () => {
    // A link is written by the linker that owns it, so a peer's reading in a Link action
    // could only open its note. A term note usually has a heading of the same name, so this
    // contested case is the ordinary one.
    const plugin = await load();
    let opened = 0;
    let linked = null;
    plugin.matchAtCursor = () => hitWith([{ label: 'Spawn', open: () => { opened++; } }]);
    plugin.materializeSingle = (...a) => { linked = a[1]; };

    const item = menuFor().items.find((e) => /here/i.test(e.title) && e.click);
    assert.ok(item, 'no "link here" item');
    await item.click();
    assert.strictEqual(linked, 'Guide#Spawn');
    assert.strictEqual(opened, 0, 'a Link action opened the peer’s note');
  });

  it('still offers the peer’s reading when opening', async () => {
    // Open is where another linker's meaning belongs — that one it can act on.
    const plugin = await load();
    let opened = 0;
    plugin.matchAtCursor = () => hitWith([{ label: 'Spawn', open: () => { opened++; } }]);
    plugin.openTerm = () => {};

    const item = menuFor().items.find((e) => /^Open/.test(e.title) && e.click);
    assert.ok(item, 'no "open" item');
    // Two candidates, so the picker opens rather than acting outright.
    let handed = null;
    plugin.chooseTerm = (cands) => { handed = cands; };
    await item.click();
    assert.strictEqual(handed.length, 2, 'the peer’s reading was dropped from Open');
  });

  it('offers to undo an exclusion once the word is excluded', async () => {
    // Excluding takes the word out of the index, so nothing matches it any more and the
    // menu came up empty — leaving the settings tab as the only way to undo it.
    const plugin = await load();
    plugin.matchAtCursor = () => null;
    plugin.wordAtCursor = () => null;
    plugin.settings.excludeTerms = 'spawn';

    const titles = menuFor().titles();
    assert.ok(titles.some((x) => /^Remove/.test(x)), `no undo item: ${JSON.stringify(titles)}`);
  });

  it('offers nothing on a word it neither matches nor excludes', async () => {
    const plugin = await load();
    plugin.matchAtCursor = () => null;
    plugin.wordAtCursor = () => null;
    plugin.settings.excludeTerms = '';
    assert.deepStrictEqual(menuFor().titles(), []);
  });

  it('keeps the lone exclusion item flat when no sibling offers one', async () => {
    // A submenu holding one line is a click to reach one line.
    const plugin = await load();
    plugin.matchAtCursor = () => hitWith();
    fakeApp.plugins.plugins = {};
    const menu = menuFor();
    assert.ok(!menu.groups().some((g) => /Exclude/.test(g)), 'wrapped a single item in a submenu');
    assert.ok(menu.titles().some((x) => /^Add "/.test(x)), JSON.stringify(menu.titles()));
  });

  it('shares one Exclude submenu with the sibling', async () => {
    const plugin = await load();
    plugin.matchAtCursor = () => hitWith();
    fakeApp.plugins.plugins = {
      'heading-linker': plugin,
      'glossary-linker': { api: { linker: { apiVersion: 1, id: 'glossary-linker', kind: 'prose', precedence: 10, offers: () => true } } },
    };
    const menu = menuFor();
    assert.ok(menu.groups().includes('Exclude “Spawn”'), JSON.stringify(menu.groups()));
    assert.ok(menu.titles().includes('Exclude “Spawn” ▸ Add to excluded headings'), JSON.stringify(menu.titles()));
    fakeApp.plugins.plugins = {};
  });
});
