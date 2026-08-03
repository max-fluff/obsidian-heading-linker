'use strict';

// The heading index and matching engine. These cover the behaviour that must survive the
// planned extraction of a shared matcher core, so they lean on observable results
// (what matched, where, which link) rather than on internals.

const { describe, it, assert } = require('../src/shared/testing/harness');
const matcher = require('../src/matcher');
const en = require('../src/shared/morphology/languages/en.js');

// A stand-in for the plugin object the matcher mixin is applied to: just the state its
// methods reach for. Vault access is stubbed by handing it the headings directly.
function makePlugin({ files = [], settings = {}, aliases = new Map() } = {}) {
  const p = Object.assign({}, matcher);
  // The real plugin gets this from the api mixin; rebuildIndex tells subscribers the index
  // moved, and nothing here is subscribing.
  p.notifyIndexChange = () => {};
  p.settings = Object.assign(
    {
      matchMode: 'stemmer',
      smartCase: true,
      minTermLength: 2,
      skipHeadings: true,
      headingLevels: [1, 2, 3, 4, 5, 6],
      excludeTerms: '',
    },
    settings
  );
  p.activeLanguages = [en];
  p.keysCache = new Map();
  p.excludedWords = new Set();
  p.index = { byKey: new Map(), termCount: 0 };
  p.terms = [];
  p.aliasCache = aliases;
  p.glossaryFilesList = () => files.map((f) => ({ basename: f.base, path: f.path || `${f.base}.md`, extension: 'md' }));
  p.headingsOf = (file) => {
    const found = files.find((f) => f.base === file.basename);
    return found ? found.headings : [];
  };
  p.fileFingerprint = () => 'fingerprint';
  return p;
}

const guide = { base: 'Guide', headings: [{ text: 'Spawn', level: 2 }, { text: 'Vision radius', level: 2 }] };

describe('keysFor', () => {
  it('collapses an inflected form onto the base form key', () => {
    const p = makePlugin();
    const singular = p.keysFor('spawn');
    const plural = p.keysFor('spawns');
    assert.ok(plural.some((k) => singular.includes(k)), `expected shared key, got ${JSON.stringify(singular)} vs ${JSON.stringify(plural)}`);
  });

  it('is case-insensitive', () => {
    const p = makePlugin();
    assert.deepStrictEqual(p.keysFor('Spawn'), p.keysFor('spawn'));
  });

  it('falls back to the exact form when no language claims the word', () => {
    const p = makePlugin();
    p.activeLanguages = [];
    assert.deepStrictEqual(p.keysFor('Рой'), ['рой']);
  });
});

describe('rebuildIndex', () => {
  it('indexes headings as terms with a File#Heading link', () => {
    const p = makePlugin({ files: [guide] });
    p.rebuildIndex();
    assert.strictEqual(p.index.termCount, 2);
    assert.deepStrictEqual(p.terms.map((t) => t.linktext).sort(), ['Guide#Spawn', 'Guide#Vision radius']);
  });

  it('skips headings holding characters a wikilink target cannot carry', () => {
    const p = makePlugin({
      files: [{ base: 'Guide', headings: [
        { text: 'Fine', level: 2 },
        { text: 'Has | pipe', level: 2 },
        { text: 'Has # hash', level: 2 },
        { text: 'Has [bracket]', level: 2 },
        { text: 'Has ^caret', level: 2 },
      ] }],
    });
    p.rebuildIndex();
    assert.deepStrictEqual(p.terms.map((t) => t.label), ['Fine']);
  });

  it('honours heading levels, minimum length and the exclude list', () => {
    const files = [{ base: 'Guide', headings: [
      { text: 'Keep', level: 2 },
      { text: 'Deep', level: 5 },
      { text: 'X', level: 2 },
      { text: 'Banned', level: 2 },
    ] }];
    const p = makePlugin({ files, settings: { headingLevels: [1, 2, 3], minTermLength: 2, excludeTerms: 'banned' } });
    p.rebuildIndex();
    assert.deepStrictEqual(p.terms.map((t) => t.label), ['Keep']);
  });

  it('stops an excluded word without losing the heading it reached', () => {
    // Reported as issue #1: "specifically" linked to the "Specification" heading, and the
    // two share a stem, so excluding the form must not take the heading down with it.
    const files = [{ base: 'Guide', headings: [{ text: 'Specification', level: 2 }] }];
    const p = makePlugin({ files, settings: { excludeWords: 'specifically' } });
    p.rebuildIndex();
    const found = p.findMatches('this is specifically about the specification', null);
    assert.deepStrictEqual(found.map((m) => m.display), ['specification']);
  });

  it('excludes a word whatever its case', () => {
    const files = [{ base: 'Guide', headings: [{ text: 'Specification', level: 2 }] }];
    const p = makePlugin({ files, settings: { excludeWords: 'Specifically' } });
    p.rebuildIndex();
    assert.deepStrictEqual(p.findMatches('Specifically, no.', null), []);
  });

  it('silences every form behind a starred line', () => {
    const files = [{ base: 'Guide', headings: [{ text: 'Specification', level: 2 }] }];
    const p = makePlugin({ files, settings: { excludeWords: 'specifically*' } });
    p.rebuildIndex();
    assert.deepStrictEqual(p.findMatches('specifically about the specification', null), []);
  });

  it('reads a starred line whether the stem or a form of it was written', () => {
    // "specif*" and "specifically*" are the same wish; only one of them is a word.
    const files = [{ base: 'Guide', headings: [{ text: 'Specification', level: 2 }] }];
    const bare = makePlugin({ files, settings: { excludeWords: 'specif*' } });
    bare.rebuildIndex();
    assert.deepStrictEqual(bare.findMatches('the specification', null), []);
  });

  it('leaves a multi-word heading alone when one of its words is excluded', () => {
    const files = [{ base: 'Guide', headings: [{ text: 'Vision radius', level: 2 }] }];
    const p = makePlugin({ files, settings: { excludeWords: 'vision' } });
    p.rebuildIndex();
    assert.deepStrictEqual(p.findMatches('the vision radius here', null).map((m) => m.display), ['vision radius']);
  });

  it('drops a duplicate heading inside the same file', () => {
    const p = makePlugin({ files: [{ base: 'Guide', headings: [{ text: 'Spawn', level: 2 }, { text: 'Spawn', level: 3 }] }] });
    p.rebuildIndex();
    assert.strictEqual(p.terms.length, 1);
  });
});

describe('smart case', () => {
  // The rule that keeps "cns" in ordinary prose from turning into a link to the "CNS"
  // heading. It is this plugin's alone — the glossary linker has no such setting — so it
  // reaches the shared scan through a hook, and nothing else here would notice if that hook
  // were wired up wrong.
  const acronym = { base: 'Guide', headings: [{ text: 'CNS', level: 2 }] };

  it('matches an acronym heading spelled the same way', () => {
    const p = makePlugin({ files: [acronym] });
    p.rebuildIndex();
    assert.strictEqual(p.findMatches('the CNS here', null).length, 1);
  });

  it('does not match it in a different case', () => {
    const p = makePlugin({ files: [acronym] });
    p.rebuildIndex();
    assert.deepStrictEqual(p.findMatches('the cns here', null), []);
  });

  it('matches either way once the setting is off', () => {
    const p = makePlugin({ files: [acronym], settings: { smartCase: false } });
    p.rebuildIndex();
    assert.strictEqual(p.findMatches('the cns here', null).length, 1);
  });
});

describe('findMatches', () => {
  it('matches an inflected form and keeps the note wording as the display text', () => {
    const p = makePlugin({ files: [guide] });
    p.rebuildIndex();
    const matches = p.findMatches('two spawns happened', null);
    assert.strictEqual(matches.length, 1);
    assert.strictEqual(matches[0].linktext, 'Guide#Spawn');
    assert.strictEqual(matches[0].display, 'spawns');
    assert.strictEqual(matches[0].label, 'Spawn');
  });

  it('matches a multi-word heading as one span', () => {
    const p = makePlugin({ files: [guide] });
    p.rebuildIndex();
    const matches = p.findMatches('check the vision radius here', null);
    assert.strictEqual(matches.length, 1);
    assert.strictEqual(matches[0].linktext, 'Guide#Vision radius');
    assert.strictEqual(matches[0].display, 'vision radius');
  });

  it("skips a file's own headings so a source does not link to itself", () => {
    const p = makePlugin({ files: [guide] });
    p.rebuildIndex();
    assert.strictEqual(p.findMatches('a spawn here', 'Guide').length, 0);
    assert.strictEqual(p.findMatches('a spawn here', 'Other').length, 1);
  });

  it('reports every file claiming the same heading as alternatives', () => {
    const p = makePlugin({ files: [guide, { base: 'Manual', headings: [{ text: 'Spawn', level: 2 }] }] });
    p.rebuildIndex();
    const [match] = p.findMatches('a spawn here', null);
    assert.ok(match.alts && match.alts.length === 1, 'expected one alternative');
    assert.notStrictEqual(match.linktext, match.alts[0]);
    assert.deepStrictEqual([match.linktext, match.alts[0]].sort(), ['Guide#Spawn', 'Manual#Spawn']);
  });

  it('matches an alias declared for a heading', () => {
    const aliases = new Map([['Guide.md', new Map([['Vision radius', ['sightline']]])]]);
    const p = makePlugin({ files: [guide], aliases });
    p.rebuildIndex();
    const [match] = p.findMatches('a long sightline', null);
    assert.ok(match, 'alias did not match');
    assert.strictEqual(match.linktext, 'Guide#Vision radius');
  });

  it('leaves protected ranges alone when asked to protect', () => {
    const p = makePlugin({ files: [guide] });
    p.rebuildIndex();
    const text = 'a spawn here but `spawn` and [[spawn]] are not';
    assert.strictEqual(p.findMatches(text, null).length, 3, 'sanity: unprotected run sees every occurrence');
    const protectedMatches = p.findMatches(text, null, { protect: true });
    assert.strictEqual(protectedMatches.length, 1);
    assert.strictEqual(protectedMatches[0].start, 2);
  });
});

describe('computeProtected', () => {
  const ranges = (text, settings) => makePlugin({ settings }).computeProtected(text);
  const covers = (text, needle, settings) => {
    const at = text.indexOf(needle);
    assert.notStrictEqual(at, -1, `fixture missing ${needle}`);
    const p = makePlugin({ settings });
    return p.overlapsProtected(ranges(text, settings), at, at + needle.length);
  };

  it('protects fenced and inline code', () => {
    assert.ok(covers('```\nspawn\n```', 'spawn'));
    assert.ok(covers('~~~\nspawn\n~~~', 'spawn'));
    assert.ok(covers('text `spawn` text', 'spawn'));
  });

  it('protects links, urls and comments', () => {
    assert.ok(covers('see [[spawn]] here', 'spawn'));
    assert.ok(covers('see [spawn](Other.md) here', 'spawn'));
    assert.ok(covers('see https://example.com/spawn here', 'spawn'));
    assert.ok(covers('%% spawn %%', 'spawn'));
  });

  it('protects frontmatter', () => {
    assert.ok(covers('---\ntitle: spawn\n---\nbody', 'spawn'));
  });

  it('protects headings only while skipHeadings is on', () => {
    assert.ok(covers('## spawn\n', 'spawn', { skipHeadings: true }));
    assert.ok(!covers('## spawn\n', 'spawn', { skipHeadings: false }));
  });

  it('leaves plain prose alone', () => {
    assert.ok(!covers('a spawn in prose', 'spawn'));
  });
});

describe('isProtectedAt', () => {
  const at = (text, needle, settings) => {
    const p = makePlugin({ settings });
    return p.isProtectedAt(text, text.indexOf(needle) + 1);
  };

  it('agrees with computeProtected on the common cases', () => {
    assert.ok(at('text `spawn` text', 'spawn'));
    assert.ok(at('see [[spawn]] here', 'spawn'));
    assert.ok(at('see [spawn](Other.md) here', 'spawn'));
    assert.ok(at('%% spawn %%', 'spawn'));
    assert.ok(at('---\ntitle: spawn\n---\nbody', 'spawn'));
    assert.ok(at('## spawn', 'spawn', { skipHeadings: true }));
    assert.ok(!at('a spawn in prose', 'spawn'));
  });

  it('detects a position inside an open fenced block', () => {
    assert.ok(at('```\nspawn\n```', 'spawn'));
  });
});

describe('ancestor breadcrumbs', () => {
  const nested = { base: 'Guide', headings: [
    { text: 'Combat', level: 1 },
    { text: 'Spawn', level: 2 },
    { text: 'Projectile', level: 2 },
    { text: 'Details', level: 3 },
  ] };

  it('records the enclosing headings, top-down, on each term', () => {
    const p = makePlugin({ files: [nested] });
    p.rebuildIndex();
    const crumbs = (l) => p.terms.find((t) => t.label === l).crumbs;
    assert.deepStrictEqual(crumbs('Combat'), []);
    assert.deepStrictEqual(crumbs('Spawn'), ['Combat']);
    assert.deepStrictEqual(crumbs('Projectile'), ['Combat']);
    assert.deepStrictEqual(crumbs('Details'), ['Combat', 'Projectile']);
  });

  it('keeps a parent that is not itself a term as an ancestor', () => {
    const p = makePlugin({ files: [nested], settings: { headingLevels: [2, 3] } });
    p.rebuildIndex();
    assert.strictEqual(p.terms.find((t) => t.label === 'Combat'), undefined, 'H1 is filtered out as a term');
    assert.deepStrictEqual(p.terms.find((t) => t.label === 'Spawn').crumbs, ['Combat']);
  });
});

describe('duplicate headings in one file', () => {
  it('indexes the first and records the rest as unlinkable', () => {
    const p = makePlugin({ files: [{ base: 'Guide', headings: [
      { text: 'Spawn', level: 2 },
      { text: 'Spawn', level: 2 },
    ] }] });
    p.rebuildIndex();
    assert.strictEqual(p.terms.filter((t) => t.label === 'Spawn').length, 1, 'only the first is a term');
    assert.deepStrictEqual(p.duplicateHeadings, [{ path: 'Guide.md', label: 'Spawn' }]);
  });

  it('leaves duplicateHeadings empty when every heading is distinct', () => {
    const p = makePlugin({ files: [{ base: 'Guide', headings: [{ text: 'Spawn', level: 2 }, { text: 'Aim', level: 2 }] }] });
    p.rebuildIndex();
    assert.deepStrictEqual(p.duplicateHeadings, []);
  });
});
