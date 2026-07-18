'use strict';

// Peer discovery and span ownership. The property worth guarding here is symmetry: both
// plugins must reach the same verdict about who owns a span, or they either both draw it
// (the double underline) or neither does.

const { describe, it, assert } = require('./harness');
const { discoverLinkers, outranks, foreignRanges, ownedMatches, siblingLinkers, overlaps, yieldedCandidates, candidatesFor } = require('../src/shared/discover');
const { rankedLinkers, precedenceForIndex } = require('../src/shared/precedence');

const provider = (id, precedence, matches = () => []) => ({ id, apiVersion: 1, precedence, matches });

// A stand-in for app.plugins.plugins: plugin ids mapped to whatever they expose.
const appWith = (...providers) => {
  const plugins = {};
  providers.forEach((p, i) => { plugins[p && p.id ? p.id : 'plugin' + i] = p ? { api: { linker: p } } : {}; });
  return { plugins: { plugins } };
};

describe('discoverLinkers', () => {
  it('finds every plugin exposing the contract, ourselves included', () => {
    const app = appWith(provider('heading-linker', 20), provider('glossary-linker', 10));
    assert.deepStrictEqual(discoverLinkers(app).map((p) => p.id).sort(), ['glossary-linker', 'heading-linker']);
  });

  it('ignores plugins that expose nothing we recognise', () => {
    const app = appWith(provider('heading-linker', 20));
    app.plugins.plugins['some-other-plugin'] = { api: { somethingElse: true } };
    app.plugins.plugins['no-api-at-all'] = {};
    assert.deepStrictEqual(discoverLinkers(app).map((p) => p.id), ['heading-linker']);
  });

  it('ignores a peer speaking an older contract', () => {
    const old = provider('glossary-linker', 10);
    old.apiVersion = 0;
    assert.deepStrictEqual(discoverLinkers(appWith(provider('heading-linker', 20), old)).map((p) => p.id), ['heading-linker']);
  });

  it('survives an app that exposes no plugin registry', () => {
    assert.deepStrictEqual(discoverLinkers({}), []);
    assert.deepStrictEqual(discoverLinkers(null), []);
  });
});

describe('outranks', () => {
  const heading = provider('heading-linker', 20);
  const glossary = provider('glossary-linker', 10);

  it('gives the span to the higher precedence', () => {
    assert.ok(outranks(heading, glossary));
    assert.ok(!outranks(glossary, heading));
  });

  it('is symmetric — both sides reach the same verdict', () => {
    // The point of comparing published values rather than each preferring itself.
    assert.notStrictEqual(outranks(heading, glossary), outranks(glossary, heading));
  });

  it('breaks a tie by id rather than by who is asking', () => {
    const a = provider('a-linker', 10);
    const b = provider('b-linker', 10);
    assert.ok(outranks(a, b));
    assert.ok(!outranks(b, a));
  });

  it('follows the setting when a plugin is given a higher precedence', () => {
    const glossaryFirst = provider('glossary-linker', 99);
    assert.ok(outranks(glossaryFirst, heading));
    assert.ok(!outranks(heading, glossaryFirst));
  });
});

describe('ownedMatches', () => {
  const mine = [{ start: 2, end: 7 }];
  const self = provider('glossary-linker', 10);

  it('keeps everything when there are no peers', () => {
    assert.deepStrictEqual(ownedMatches(appWith(self), self, 'a spawn here', mine), mine);
  });

  it('keeps everything when the peer ranks below us', () => {
    const app = appWith(self, provider('heading-linker', 1, () => [{ start: 2, end: 7 }]));
    assert.deepStrictEqual(ownedMatches(app, self, 'a spawn here', mine), mine);
  });

  it('drops a span a higher-ranked peer also claims', () => {
    const app = appWith(self, provider('heading-linker', 20, () => [{ start: 2, end: 7 }]));
    assert.deepStrictEqual(ownedMatches(app, self, 'a spawn here', mine), []);
  });

  it('keeps a span the higher-ranked peer does not claim', () => {
    const app = appWith(self, provider('heading-linker', 20, () => [{ start: 40, end: 45 }]));
    assert.deepStrictEqual(ownedMatches(app, self, 'a spawn here', mine), mine);
  });

  it('drops only the overlapping span, not the rest', () => {
    const many = [{ start: 0, end: 3 }, { start: 10, end: 15 }];
    const app = appWith(self, provider('heading-linker', 20, () => [{ start: 10, end: 15 }]));
    assert.deepStrictEqual(ownedMatches(app, self, 'x'.repeat(20), many), [{ start: 0, end: 3 }]);
  });

  it('counts a partial overlap as taken', () => {
    const app = appWith(self, provider('heading-linker', 20, () => [{ start: 5, end: 12 }]));
    assert.deepStrictEqual(ownedMatches(app, self, 'x'.repeat(20), mine), []);
  });

  it('keeps our spans when a peer throws', () => {
    const app = appWith(self, provider('heading-linker', 20, () => { throw new Error('peer is broken'); }));
    assert.deepStrictEqual(ownedMatches(app, self, 'a spawn here', mine), mine);
  });

  it('keeps our spans when a peer offers no matcher', () => {
    const app = appWith(self, { id: 'heading-linker', apiVersion: 1, precedence: 20 });
    assert.deepStrictEqual(ownedMatches(app, self, 'a spawn here', mine), mine);
  });
});

describe('yieldedCandidates', () => {
  const self = provider('heading-linker', 20);
  const spawn = { start: 2, end: 7, label: 'Spawn', target: 'Spawn' };

  it('collects what a lower-ranked peer stood down on', () => {
    const app = appWith(self, provider('glossary-linker', 10, () => [spawn]));
    const [c] = yieldedCandidates(app, self, 'a spawn here');
    assert.strictEqual(c.label, 'Spawn');
    assert.strictEqual(c.source, 'glossary-linker');
    assert.strictEqual(c.start, 2);
  });

  it('ignores a peer that outranks us — it drew the span, we skipped it', () => {
    const app = appWith(self, provider('glossary-linker', 99, () => [spawn]));
    assert.deepStrictEqual(yieldedCandidates(app, self, 'a spawn here'), []);
  });

  it('is empty in a solo vault', () => {
    assert.deepStrictEqual(yieldedCandidates(appWith(self), self, 'a spawn here'), []);
  });

  it('delegates opening back to the peer rather than resolving its target itself', () => {
    let opened = null;
    const peer = provider('glossary-linker', 10, () => [spawn]);
    peer.open = (target, sourcePath, newTab) => { opened = { target, sourcePath, newTab }; };
    const [c] = yieldedCandidates(appWith(self, peer), self, 'a spawn here');
    c.open('Notes/x.md', true);
    assert.deepStrictEqual(opened, { target: 'Spawn', sourcePath: 'Notes/x.md', newTab: true });
  });

  it('survives a peer with no opener', () => {
    const peer = provider('glossary-linker', 10, () => [spawn]);
    const [c] = yieldedCandidates(appWith(self, peer), self, 'a spawn here');
    c.open('Notes/x.md', false); // must not throw
  });

  it('survives a peer that throws', () => {
    const app = appWith(self, provider('glossary-linker', 10, () => { throw new Error('broken'); }));
    assert.deepStrictEqual(yieldedCandidates(app, self, 'a spawn here'), []);
  });
});

describe('candidatesFor', () => {
  const list = [
    { start: 0, end: 5, label: 'A' },
    { start: 10, end: 14, label: 'B' },
  ];

  it('keeps only the candidates covering the span', () => {
    assert.deepStrictEqual(candidatesFor(list, 1, 3).map((c) => c.label), ['A']);
    assert.deepStrictEqual(candidatesFor(list, 11, 12).map((c) => c.label), ['B']);
  });

  it('counts a partial overlap', () => {
    assert.deepStrictEqual(candidatesFor(list, 3, 11).map((c) => c.label), ['A', 'B']);
  });

  it('is empty when nothing covers it', () => {
    assert.deepStrictEqual(candidatesFor(list, 6, 9), []);
  });
});

describe('foreignRanges', () => {
  it('is empty in a solo vault, so nothing is recomputed', () => {
    const self = provider('heading-linker', 20);
    assert.deepStrictEqual(foreignRanges(appWith(self), self, 'text'), []);
  });

  it('sorts the ranges it collects', () => {
    const self = provider('glossary-linker', 10);
    const app = appWith(self, provider('heading-linker', 20, () => [{ start: 9, end: 12 }, { start: 1, end: 4 }]));
    assert.deepStrictEqual(foreignRanges(app, self, 'x'.repeat(20)), [[1, 4], [9, 12]]);
  });
});

describe('overlaps', () => {
  const ranges = [[2, 5], [10, 14]];
  it('reports a touch and only a touch', () => {
    assert.ok(overlaps(ranges, 3, 4));
    assert.ok(overlaps(ranges, 1, 3));
    assert.ok(!overlaps(ranges, 5, 10));
    assert.ok(!overlaps(ranges, 20, 25));
  });
});

describe('rankedLinkers / precedenceForIndex', () => {
  // The whole family, not just the prose pair: precedence is one order across all four, and
  // a plugin moves itself within it because it cannot write anyone else's settings.
  const heading = provider('heading-linker', 20);
  const glossary = provider('glossary-linker', 10);
  const code = provider('code-linker', 40);
  const reference = provider('reference-linker', 30);
  const app = () => appWith(code, reference, heading, glossary);

  const idsAfterMove = (self, index) => {
    const moved = { ...self, precedence: precedenceForIndex(app(), self, index) };
    const others = [code, reference, heading, glossary].filter((p) => p.id !== self.id);
    return rankedLinkers(appWith(...others, moved)).map((p) => p.id);
  };

  it('lists every installed linker, highest first', () => {
    assert.deepStrictEqual(rankedLinkers(app()).map((p) => p.id),
      ['code-linker', 'reference-linker', 'heading-linker', 'glossary-linker']);
  });

  it('puts us on top when we move to the first slot', () => {
    assert.deepStrictEqual(idsAfterMove(glossary, 0),
      ['glossary-linker', 'code-linker', 'reference-linker', 'heading-linker']);
  });

  it('puts us last when we move past everyone', () => {
    assert.deepStrictEqual(idsAfterMove(code, 3),
      ['reference-linker', 'heading-linker', 'glossary-linker', 'code-linker']);
  });

  it('lands us between the two we moved between', () => {
    // The neighbours' values are theirs, not ours, so the new number has to be derived from
    // them rather than from a fixed step.
    assert.deepStrictEqual(idsAfterMove(glossary, 1),
      ['code-linker', 'glossary-linker', 'reference-linker', 'heading-linker']);
  });

  it('still separates neighbours that already sit one apart', () => {
    const tight = [provider('a-linker', 2), provider('b-linker', 1)];
    const self = provider('c-linker', 99);
    const moved = { ...self, precedence: precedenceForIndex(appWith(...tight, self), self, 1) };
    assert.deepStrictEqual(rankedLinkers(appWith(...tight, moved)).map((p) => p.id),
      ['a-linker', 'c-linker', 'b-linker']);
  });

  it('leaves us alone when nothing else is installed', () => {
    assert.strictEqual(precedenceForIndex(appWith(heading), heading, 0), heading.precedence);
  });

  it('agrees from both sides after a move', () => {
    // Only our own setting is written; everyone else reads it back. If the two sides could
    // disagree, a contested word would be drawn twice or not at all.
    const moved = { ...glossary, precedence: precedenceForIndex(app(), glossary, 0) };
    const both = appWith(code, reference, heading, moved);
    assert.strictEqual(rankedLinkers(both)[0].id, 'glossary-linker');
    assert.ok(outranks(moved, heading));
    assert.ok(!outranks(heading, moved));
  });
});

describe('siblingLinkers', () => {
  it('is empty when nothing else is installed — what hides the precedence setting', () => {
    const self = provider('heading-linker', 20);
    assert.deepStrictEqual(siblingLinkers(appWith(self), self), []);
  });

  it('lists the others when they are', () => {
    const self = provider('heading-linker', 20);
    const app = appWith(self, provider('glossary-linker', 10));
    assert.deepStrictEqual(siblingLinkers(app, self).map((p) => p.id), ['glossary-linker']);
  });
});
