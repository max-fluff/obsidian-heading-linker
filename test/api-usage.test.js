'use strict';

const { describe, it, assert } = require('../src/shared/testing/harness');
const { installStubs } = require('../src/shared/testing/stubs');

installStubs();

const matcher = require('../src/matcher');
const api = require('../src/api');
const en = require('../src/shared/morphology/languages/en.js');

// A plugin built from the matcher + api mixins, with the vault and scope stubbed so the
// usage/candidate scans run against notes handed in directly. Files are heading sources;
// notes are the prose scanned; `dest` is what a [[Guide#…]] link resolves to.
function makePlugin({ files = [], notes = [], dest = null } = {}) {
  const p = Object.assign({}, matcher, api);
  p.notifyIndexChange = () => {};
  p.manifest = { version: '0.0.0' };
  p.settings = { matchMode: 'stemmer', smartCase: true, minTermLength: 2, skipHeadings: true, headingLevels: [1, 2, 3, 4, 5, 6], excludeTerms: '' };
  p.activeLanguages = [en];
  p.keysCache = new Map();
  p.index = { byKey: new Map(), termCount: 0 };
  p.terms = [];
  p.aliasCache = new Map();
  p.glossaryFilesList = () => files.map((f) => ({ basename: f.base, path: `${f.base}.md`, extension: 'md' }));
  p.headingsOf = (file) => { const f = files.find((x) => x.base === file.basename); return f ? f.headings : []; };
  p.fileFingerprint = () => 'fp';
  p.getScopeFiles = () => notes;
  p.currentFileBase = () => null;
  p.isGlossaryFile = (f) => files.some((x) => x.base === f.basename);
  p.app = {
    vault: {
      getMarkdownFiles: () => notes,
      cachedRead: async (file) => file.text || '',
      getAbstractFileByPath: (pth) => notes.find((n) => n.path === pth) || null,
    },
    metadataCache: {
      getFileCache: (file) => file.cache || null,
      getFirstLinkpathDest: (pathPart) => (dest && dest.basename === pathPart ? dest : null),
    },
  };
  p.rebuildIndex();
  return p;
}

const note = (basename, text, cache) => ({ basename, path: `${basename}.md`, stat: { mtime: 1 }, text, cache });
const guide = { base: 'Guide', headings: [{ text: 'Spawn', level: 2 }, { text: 'Projectile', level: 2 }] };

describe('api: getUsageReport', () => {
  it('counts a heading in every inflected form across notes', async () => {
    const p = makePlugin({ files: [guide], notes: [note('A', 'The spawn spawns; projectiles fly.')] });
    const report = await p.getUsageReport();
    const spawn = report.find((r) => r.linktext === 'Guide#Spawn');
    const proj = report.find((r) => r.linktext === 'Guide#Projectile');
    assert.strictEqual(spawn.count, 2, 'spawn + spawns');
    assert.strictEqual(proj.count, 1);
    assert.deepStrictEqual(spawn.files, [{ path: 'A.md', count: 2 }]);
  });

  it('leaves an unmentioned heading at count 0 (an orphan)', async () => {
    const p = makePlugin({ files: [guide], notes: [note('A', 'only spawn here')] });
    const proj = (await p.getUsageReport()).find((r) => r.linktext === 'Guide#Projectile');
    assert.strictEqual(proj.count, 0);
  });

  it('counts existing [[File#Heading]] links only with includeLinks', async () => {
    const notes = [
      note('A', 'spawn'),
      note('B', '', { links: [{ link: 'Guide#Spawn' }] }),
    ];
    const opts = { files: [guide], notes, dest: { basename: 'Guide' } };
    assert.strictEqual((await makePlugin(opts).getUsageReport()).find((r) => r.linktext === 'Guide#Spawn').count, 1, 'plain text only');
    assert.strictEqual((await makePlugin(opts).getUsageReport({ includeLinks: true })).find((r) => r.linktext === 'Guide#Spawn').count, 2, 'plus the link');
  });
});

describe('api: collectCandidates', () => {
  it('surfaces a frequent word that is not a heading, and hides ones that are', async () => {
    const p = makePlugin({ files: [guide], notes: [note('A', 'projectile projectile fly fly fly')] });
    const cands = await p.collectCandidates();
    const fly = cands.find((c) => c.display === 'fly');
    assert.ok(fly, 'the non-heading word is a candidate');
    assert.strictEqual(fly.count, 3);
    assert.ok(!cands.some((c) => c.display === 'projectile'), 'a heading is not offered as a candidate');
  });
});

describe('api: lemmaFor', () => {
  it('reduces an inflected word to the base a heading would match', () => {
    const p = makePlugin();
    assert.strictEqual(p.lemmaFor('boxes'), p.lemmaFor('box'));
    assert.strictEqual(p.lemmaFor('BOXES'), p.lemmaFor('box'));
  });
});
