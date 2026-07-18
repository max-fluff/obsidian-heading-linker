'use strict';

// Autocomplete candidates. The empty-list cases matter as much as the matches: onTrigger
// reads this to decide whether to claim the popup, and Obsidian only ever asks the first
// suggester that claims. Returning candidates for a word we don't know would silence a
// sibling linker that does.

const { describe, it, assert } = require('./harness');
const { collectSuggestions } = require('../src/heading-suggest');
const matcher = require('../src/matcher');
const en = require('../src/shared/morphology/languages/en.js');

function makePlugin(files, aliases = new Map()) {
  const p = Object.assign({}, matcher);
  // The real plugin gets this from the api mixin; rebuildIndex tells subscribers the index
  // moved, and nothing here is subscribing.
  p.notifyIndexChange = () => {};
  p.settings = { matchMode: 'stemmer', smartCase: true, minTermLength: 2, skipHeadings: true, headingLevels: [1, 2, 3, 4, 5, 6], excludeTerms: '' };
  p.activeLanguages = [en];
  p.keysCache = new Map();
  p.index = { byKey: new Map(), termCount: 0 };
  p.terms = [];
  p.aliasCache = aliases;
  p.glossaryFilesList = () => files.map((f) => ({ basename: f.base, path: `${f.base}.md`, extension: 'md' }));
  p.headingsOf = (file) => (files.find((f) => f.base === file.basename) || { headings: [] }).headings;
  p.fileFingerprint = () => 'fingerprint';
  p.rebuildIndex();
  return p;
}

const guide = { base: 'Guide', headings: [{ text: 'Spawn', level: 2 }, { text: 'Vision radius', level: 2 }] };

describe('collectSuggestions', () => {
  it('offers nothing for a word no heading knows', () => {
    const p = makePlugin([guide]);
    assert.deepStrictEqual(collectSuggestions(p, 'unrelated', null), []);
  });

  it('offers nothing when the index is empty', () => {
    const p = makePlugin([]);
    assert.deepStrictEqual(collectSuggestions(p, 'spawn', null), []);
  });

  it('matches an inflected form of a single-word heading', () => {
    const p = makePlugin([guide]);
    const items = collectSuggestions(p, 'spawns', null);
    assert.strictEqual(items.length, 1);
    assert.strictEqual(items[0].linktext, 'Guide#Spawn');
    assert.strictEqual(items[0].kind, 'form');
  });

  it('matches a prefix of a heading', () => {
    const p = makePlugin([guide]);
    const items = collectSuggestions(p, 'visi', null);
    assert.strictEqual(items.length, 1);
    assert.strictEqual(items[0].linktext, 'Guide#Vision radius');
    assert.strictEqual(items[0].kind, 'prefix');
  });

  it('matches a prefix of an alias and reports which wording matched', () => {
    const aliases = new Map([['Guide.md', new Map([['Vision radius', ['sightline']]])]]);
    const p = makePlugin([guide], aliases);
    const items = collectSuggestions(p, 'sight', null);
    assert.strictEqual(items.length, 1);
    assert.strictEqual(items[0].matchedForm, 'sightline');
  });

  it("never offers a file's own headings", () => {
    const p = makePlugin([guide]);
    assert.deepStrictEqual(collectSuggestions(p, 'spawns', 'Guide'), []);
    assert.strictEqual(collectSuggestions(p, 'spawns', 'Other').length, 1);
  });

  it('ranks inflections above prefixes', () => {
    const p = makePlugin([{ base: 'Guide', headings: [{ text: 'Spawn', level: 2 }, { text: 'Spawner pool', level: 2 }] }]);
    const items = collectSuggestions(p, 'spawn', null);
    assert.ok(items.length >= 2, 'expected both a form and a prefix match');
    assert.strictEqual(items[0].kind, 'form');
  });

  it('offers one entry per heading even when several files claim the word', () => {
    const p = makePlugin([guide, { base: 'Manual', headings: [{ text: 'Spawn', level: 2 }] }]);
    const items = collectSuggestions(p, 'spawn', null);
    assert.deepStrictEqual(items.map((i) => i.linktext).sort(), ['Guide#Spawn', 'Manual#Spawn']);
  });

  it('caps the list', () => {
    const headings = [];
    for (let i = 0; i < 20; i++) headings.push({ text: `Spawn${i}`, level: 2 });
    const p = makePlugin([{ base: 'Guide', headings }]);
    assert.ok(collectSuggestions(p, 'spawn', null).length <= 8);
  });
});
