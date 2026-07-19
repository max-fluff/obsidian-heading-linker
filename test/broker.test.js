'use strict';

// Merging a sibling linker's autocomplete candidates into our popup. The case worth
// guarding hardest is the last one: a sibling's candidate must be written by the sibling —
// getting that wrong inserts a fine-looking link pointing at the wrong place.

const { describe, it, assert } = require('../src/shared/testing/harness');
const { installStubs } = require('../src/shared/testing/stubs');

installStubs();

const { HeadingSuggest } = require('../src/heading-suggest');

const peer = (id, precedence, items) => ({
  api: {
    linker: {
      apiVersion: 1,
      id,
      displayName: id,
      kind: 'prose',
      precedence,
      suggest: () => items,
      linkFor: (target, display) => `[[${target}|${display}]]<${id}>`,
    },
  },
});

// A plugin with an empty index, so `merged` contributes nothing of its own and the test is
// about the merge rather than about the matcher (which has its own tests).
function makeSuggest(peers = {}) {
  const plugin = {
    settings: { linkSuggest: true, suggestMinChars: 1 },
    app: {
      plugins: { plugins: peers },
      workspace: { getActiveFile: () => null },
    },
    api: { linker: { apiVersion: 1, id: 'heading-linker', kind: 'prose', precedence: 20 } },
    index: { byKey: new Map() },
    terms: [],
    keysFor: () => [],
    currentFileBase: () => null,
    wikiLink: (target, display) => `[[${target}|${display}]]<heading>`,
  };
  peers['heading-linker'] = plugin;
  return { plugin, suggest: new HeadingSuggest(plugin.app, plugin) };
}

describe('autocomplete broker', () => {
  it('returns our own list untouched when no sibling is installed', () => {
    const { suggest } = makeSuggest({});
    const items = suggest.merged('spa');
    assert.deepStrictEqual(items, [], 'a solo vault must not gain or lose candidates');
  });

  it('adds a sibling’s candidates to the popup', () => {
    const { suggest } = makeSuggest({
      'glossary-linker': peer('glossary-linker', 10, [{ label: 'Spawning', note: 'a term', target: 'Spawning', display: 'Spawning' }]),
    });
    const labels = suggest.merged('spa').map((i) => i.label);
    assert.ok(labels.includes('Spawning'), `sibling candidate missing: ${labels.join(', ')}`);
  });

  it('lists a higher-ranked sibling first', () => {
    // Where the priority setting becomes visible in the popup.
    const { suggest } = makeSuggest({
      'glossary-linker': peer('glossary-linker', 99, [{ label: 'Spawning', note: '', target: 'Spawning', display: 'Spawning' }]),
    });
    assert.strictEqual(suggest.merged('spa')[0].label, 'Spawning');
  });

  it('survives a sibling whose suggest throws', () => {
    const broken = peer('glossary-linker', 10, []);
    broken.api.linker.suggest = () => { throw new Error('boom'); };
    const { suggest } = makeSuggest({ 'glossary-linker': broken });
    assert.deepStrictEqual(suggest.merged('spa'), [], 'a broken peer took our popup down with it');
  });

  it('lets the sibling write its own link text', () => {
    // The whole point of handing insert() back rather than reading the target ourselves.
    const { suggest } = makeSuggest({
      'glossary-linker': peer('glossary-linker', 10, [{ label: 'Spawning', note: '', target: 'Spawning', display: 'Spawning' }]),
    });
    const foreign = suggest.merged('spa').find((i) => i.label === 'Spawning');
    assert.ok(foreign && typeof foreign.insert === 'function', 'no insert on the foreign candidate');

    let written = null;
    suggest.context = {
      query: 'spa',
      start: { line: 0, ch: 0 },
      end: { line: 0, ch: 3 },
      editor: {
        getValue: () => 'spa',
        posToOffset: () => 0,
        offsetToPos: (o) => ({ line: 0, ch: o }),
        replaceRange: (text) => { written = text; },
        setCursor: () => {},
      },
    };
    suggest.selectSuggestion(foreign);
    assert.strictEqual(written, '[[Spawning|Spawning]]<glossary-linker>');
    assert.ok(!/<heading>/.test(written), 'wrote our own link format for a sibling’s target');
  });

  // Our own candidates go through the config handed to createProseSuggest, and the two
  // prose plugins fill it differently — a heading links to "File#Heading", a term to its
  // title. Getting it wrong writes a valid-looking link to the wrong place.
  it('writes our own candidate as a link to its heading', () => {
    const { suggest } = makeSuggest({});
    const written = writeWith(suggest, { kind: 'prefix', linktext: 'Guide#Spawn', label: 'Spawn', matchedForm: 'Spawn' });
    assert.strictEqual(written, '[[Guide#Spawn|Spawn]]<heading>');
  });

  it('keeps the reader’s wording when the typed word was an inflection', () => {
    const { suggest } = makeSuggest({});
    const written = writeWith(suggest, { kind: 'form', linktext: 'Guide#Spawn', label: 'Spawn' });
    assert.strictEqual(written, '[[Guide#Spawn|spawning]]<heading>');
  });
});

// selectSuggestion against a fake editor, returning what was written.
function writeWith(suggest, item) {
  let written = null;
  suggest.context = {
    query: 'spawning',
    start: { line: 0, ch: 0 },
    end: { line: 0, ch: 8 },
    editor: {
      getValue: () => 'spawning',
      posToOffset: () => 0,
      offsetToPos: (o) => ({ line: 0, ch: o }),
      replaceRange: (text) => { written = text; },
      setCursor: () => {},
    },
  };
  suggest.selectSuggestion(item);
  return written;
}
