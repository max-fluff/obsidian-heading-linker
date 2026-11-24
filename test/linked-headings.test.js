'use strict';

const { describe, it, assert } = require('../src/shared/testing/harness');
const path = require('path');
const { fakeApp, installStubs } = require('../src/shared/testing/stubs');

installStubs();

const make = (settings) => {
  const Plugin = require(path.join(__dirname, '..', 'src', 'main.js'));
  const p = new Plugin(fakeApp, { version: '0.0.0', id: 'heading-linker' });
  p.settings = { ...settings };
  p.terms = [{ linktext: 'Guide#Spawn', label: 'Spawn', fileBase: 'Guide', path: 'Guide.md' }];
  p.isGlossaryFile = () => true;
  p.app = { ...fakeApp, metadataCache: { ...fakeApp.metadataCache, getFirstLinkpathDest: () => ({ basename: 'Guide', path: 'Guide.md' }) } };
  return p;
};

describe('heading links and the term index', () => {
  it('leaves a link to an excluded heading alone when unlinking', () => {
    const p = make({});
    const text = 'See [[Guide#Spawn|spawn]] and [[Guide#Contents|contents]].';
    assert.deepStrictEqual(p.findHeadingLinks(text, 'Note.md').map((l) => l.linktext), ['Guide#Spawn']);
  });

  it('counts an existing link as the first mention when collecting', () => {
    const p = make({ linkFirstOnly: true });
    p.findMatches = () => [{ linktext: 'Guide#Spawn', start: 30 }];
    assert.deepStrictEqual(p.collectMatches('[[Guide#Spawn|spawn]] then spawn again', 'Note', 'Note.md'), []);
  });

  it('checks the heading it will link to, not the one it matched', () => {
    const p = make({ linkFirstOnly: true });
    assert.deepStrictEqual(p.firstUnlinked([{ linktext: 'Guide#Other' }], '[[Guide#Spawn|spawn]] other', 'Note.md', 'Guide#Spawn'), []);
  });

  it('still takes the first plain mention when nothing is linked yet', () => {
    const p = make({ linkFirstOnly: true });
    assert.strictEqual(p.firstUnlinked([{ linktext: 'Guide#Spawn' }, { linktext: 'Guide#Spawn' }], 'spawn and spawn', 'Note.md').length, 1);
  });
});
