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

  it('offers the written form on a word the heading only matched through its stem', async () => {
    // Issue #1: on "specifically" the only offer was to drop the "Specification" heading,
    // which is the term the reader wants to keep.
    const plugin = await load();
    plugin.matchAtCursor = () => ({
      line: 0,
      match: { start: 0, end: 12, display: 'specifically', alts: [], linktext: 'Guide#Specification' },
      foreign: [],
    });

    const menu = menuFor();
    const titles = menu.titles();
    // All three are ways to stop the word under the cursor, so they read as one set — the
    // heading among them, even though it is the heading text that gets written.
    assert.ok(titles.includes('Stop linking “specifically” ▸ this spelling'), JSON.stringify(titles));
    assert.ok(titles.includes('Stop linking “specifically” ▸ every form of it'), JSON.stringify(titles));
    assert.ok(titles.includes('Add "Specification" to excluded headings'), JSON.stringify(titles));

    await menu.items.find((e) => e.title === 'this spelling').click();
    assert.strictEqual(plugin.settings.excludeWords, 'specifically');
    assert.strictEqual(plugin.settings.excludeTerms, '');
  });

  it('adds the starred line when the reader asks for every form', async () => {
    const plugin = await load();
    plugin.matchAtCursor = () => ({
      line: 0,
      match: { start: 0, end: 12, display: 'specifically', alts: [], linktext: 'Guide#Specification' },
      foreign: [],
    });

    // The base form under the current match mode, not the spelling that was clicked.
    await menuFor().items.find((e) => e.title === 'every form of it').click();
    assert.strictEqual(plugin.settings.excludeWords, 'specif*');
  });

  it('writes the whole word when the match mode keeps forms apart', async () => {
    const plugin = await load();
    plugin.settings.matchMode = 'exact';
    plugin.matchAtCursor = () => ({
      line: 0,
      match: { start: 0, end: 12, display: 'specifically', alts: [], linktext: 'Guide#Specification' },
      foreign: [],
    });

    await menuFor().items.find((e) => e.title === 'every form of it').click();
    assert.strictEqual(plugin.settings.excludeWords, 'specifically*');
  });

  it('offers to undo a starred line from another form of the same word', async () => {
    // The line was written from "specifically"; the reader meets "specification" and wants
    // it back. Looking for "specification*" would find nothing.
    const plugin = await load();
    plugin.matchAtCursor = () => null;
    plugin.wordAtCursor = () => null;
    plugin.rawWordAtCursor = () => 'specification';
    plugin.settings.excludeWords = 'specifically*';

    const titles = menuFor().titles();
    assert.ok(titles.includes('Remove every form of "specification" from excluded words'), JSON.stringify(titles));
  });

  it('keeps a phrase on the heading list, where excluding it has an effect', async () => {
    // The word list is read one word at a time, so a phrase written there is never consulted.
    const plugin = await load();
    plugin.matchAtCursor = () => ({
      line: 0,
      match: { start: 0, end: 21, display: 'brain and spinal cord', alts: [], linktext: 'Guide#Central nervous system' },
      foreign: [],
    });

    const menu = menuFor();
    // And with the word items gone the heading is alone, so it keeps its full title rather
    // than a submenu holding one line.
    assert.ok(menu.titles().includes('Add "Central nervous system" to excluded headings'), JSON.stringify(menu.titles()));
    assert.ok(!menu.groups().some((g) => /Exclude/.test(g)), JSON.stringify(menu.groups()));
  });

  it('offers to undo a word exclusion once the word is excluded', async () => {
    const plugin = await load();
    plugin.matchAtCursor = () => null;
    plugin.wordAtCursor = () => null;
    plugin.settings.excludeWords = 'spawn';

    const titles = menuFor().titles();
    assert.ok(titles.includes('Remove "spawn" from excluded words'), JSON.stringify(titles));
  });

  it('offers nothing on a word it neither matches nor excludes', async () => {
    const plugin = await load();
    plugin.matchAtCursor = () => null;
    plugin.wordAtCursor = () => null;
    plugin.settings.excludeTerms = '';
    assert.deepStrictEqual(menuFor().titles(), []);
  });

  it('offers the word lists on the heading’s own wording too', async () => {
    // Reported on a term named for an everyday word: excluding the heading takes it out of
    // the index and the autocomplete, which is not what "stop linking this word" means.
    const plugin = await load();
    plugin.matchAtCursor = () => ({
      line: 0,
      match: { start: 0, end: 5, display: 'Наряд', alts: [], linktext: 'Guide#Наряд' },
      foreign: [],
    });

    const titles = menuFor().titles();
    assert.ok(titles.includes('Stop linking “Наряд” ▸ this spelling'), JSON.stringify(titles));
    assert.ok(titles.includes('Stop linking “Наряд” ▸ every form of it'), JSON.stringify(titles));
    assert.ok(titles.includes('Add "Наряд" to excluded headings'), JSON.stringify(titles));
  });

  it('shares one Exclude submenu with the sibling', async () => {
    // A phrase leaves us a single item, so what turns it into a group here is the sibling
    // offering the same verb on the same object.
    const plugin = await load();
    plugin.matchAtCursor = () => ({
      line: 0,
      match: { start: 0, end: 21, display: 'brain and spinal cord', alts: [], linktext: 'Guide#Central nervous system' },
      foreign: [],
    });
    fakeApp.plugins.plugins = {
      'heading-linker': plugin,
      'glossary-linker': { api: { linker: { apiVersion: 1, id: 'glossary-linker', kind: 'prose', precedence: 10, offers: () => true } } },
    };
    const menu = menuFor();
    assert.ok(menu.titles().includes('Exclude “Central nervous system” ▸ The heading'), JSON.stringify(menu.titles()));
    fakeApp.plugins.plugins = {};
  });
});
