'use strict';

// Renaming a heading breaks every link into it, and Obsidian does not repair those. Detection
// is deliberately narrow: a wrong guess here rewrites the vault, so anything ambiguous is left
// alone rather than half-fixed.

const { describe, it, assert } = require('../src/shared/testing/harness');
const path = require('path');
const { fakeApp, installStubs } = require('../src/shared/testing/stubs');

installStubs();

const { detectRename, headingsOfFingerprint, rewriteFor } = require('../src/rename');

const h = (text, level) => ({ text, level: level || 1 });

describe('detectRename', () => {
  it('sees one heading become another', () => {
    assert.deepStrictEqual(
      detectRename([h('Intro'), h('Projectile')], [h('Intro'), h('Projectiles')]),
      { from: 'Projectile', to: 'Projectiles' },
    );
  });

  it('sees nothing when nothing changed', () => {
    assert.strictEqual(detectRename([h('Intro')], [h('Intro')]), null);
  });

  // A heading added or removed is not a rename, and the lists no longer line up.
  it('refuses a heading added or removed', () => {
    assert.strictEqual(detectRename([h('A')], [h('A'), h('B')]), null);
    assert.strictEqual(detectRename([h('A'), h('B')], [h('A')]), null);
  });

  it('refuses two headings changing at once, which cannot say which became which', () => {
    assert.strictEqual(detectRename([h('A'), h('B')], [h('C'), h('D')]), null);
  });

  it('refuses a change of level, which is a restructure rather than a rename', () => {
    assert.strictEqual(detectRename([h('A', 2)], [h('B', 3)]), null);
  });

  it('refuses a reorder, where every position moved', () => {
    assert.strictEqual(detectRename([h('A'), h('B')], [h('B'), h('A')]), null);
  });

  it('refuses an empty heading on either side', () => {
    assert.strictEqual(detectRename([h('A')], [h('')]), null);
  });

  it('survives a missing list rather than throwing', () => {
    assert.strictEqual(detectRename(null, [h('A')]), null);
    assert.strictEqual(detectRename([h('A')], undefined), null);
  });
});

describe('headingsOfFingerprint', () => {
  // The fingerprint is JSON rather than a hash precisely so the previous headings survive in it.
  it('reads the headings back out of a fingerprint', () => {
    const fp = JSON.stringify({ h: [h('A'), h('B')], a: [] });
    assert.deepStrictEqual(headingsOfFingerprint(fp), [h('A'), h('B')]);
  });

  it('gives nothing for a fingerprint that is not one', () => {
    assert.strictEqual(headingsOfFingerprint('not json'), null);
    assert.strictEqual(headingsOfFingerprint(undefined), null);
  });
});

describe('the rewrite', () => {
  const run = (text, opts) => {
    const o = opts || {};
    return rewriteFor(o.base || 'Guide', o.from || 'Old', o.to || 'New', o.alsoDisplay !== false)(null, text, o.selected);
  };

  it('retargets a link and leaves the wording alone', () => {
    const out = run('the [[Guide#Old|projectiles]] fly');
    assert.strictEqual(out.newText, 'the [[Guide#New|projectiles]] fly');
    assert.strictEqual(out.count, 1);
  });

  // The display is the note's own prose, but one that repeated the heading word for word
  // would otherwise be left saying something the source no longer says.
  it('updates a display that was the old heading verbatim', () => {
    assert.strictEqual(run('[[Guide#Old|Old]]').newText, '[[Guide#New|New]]');
  });

  it('leaves a link into another file alone', () => {
    assert.strictEqual(run('[[Other#Old|w]]').newText, '[[Other#Old|w]]');
  });

  it('leaves a link to another heading in the same file alone', () => {
    assert.strictEqual(run('[[Guide#Different|w]]').newText, '[[Guide#Different|w]]');
  });

  it('leaves a whole-note link alone', () => {
    assert.strictEqual(run('[[Guide]]').newText, '[[Guide]]');
  });

  it('does not touch a link inside a fenced block', () => {
    const text = '```\n[[Guide#Old|w]]\n```';
    assert.strictEqual(run(text).newText, text);
  });

  it('keeps the pipe escaped inside a table cell', () => {
    const text = '| h |\n|---|\n| [[Guide#Old\\|w]] |';
    assert.strictEqual(run(text).newText, '| h |\n|---|\n| [[Guide#New\\|w]] |');
  });

  // The walk runs right to left so earlier offsets stay true; the preview must still read top
  // to bottom, or the reader ticks rows in the reverse of the order they appear in the note.
  it('records one change per link, in the order they appear', () => {
    const out = run('[[Guide#Old|a]] [[Guide#Old|b]]');
    assert.deepStrictEqual(out.changes.map((c) => c.label), ['a', 'b']);
    assert.ok(out.changes[0].key < out.changes[1].key);
  });

  // Applying a subset is how an unchecked row is skipped; the keys have to line up with the
  // dry run that drew them, which is why the same walk answers both.
  it('applies only the changes that were kept', () => {
    const dry = run('[[Guide#Old|a]] [[Guide#Old|b]]');
    const out = run('[[Guide#Old|a]] [[Guide#Old|b]]', { selected: new Set([dry.changes[1].key]) });
    assert.strictEqual(out.newText, '[[Guide#Old|a]] [[Guide#New|b]]');
    assert.strictEqual(out.count, 1);
  });
});

describe('the plugin side', () => {
  const load = async (over) => {
    const Plugin = require(path.join(__dirname, '..', 'src', 'main.js'));
    const plugin = new Plugin(fakeApp, { version: '0.0.0', id: 'heading-linker' });
    await plugin.onload();
    Object.assign(plugin.settings, over || {});
    plugin.headingsOf = () => [h('Intro'), h('Projectiles')];
    return plugin;
  };

  const before = JSON.stringify({ h: [h('Intro'), h('Projectile')], a: [] });

  it('remembers a rename rather than acting on the keystroke that made it', async () => {
    const plugin = await load();
    plugin.noteHeadingRename({ basename: 'Guide', path: 'Guide.md' }, before);
    assert.deepStrictEqual(plugin.pendingRenames, [{ base: 'Guide', from: 'Projectile', to: 'Projectiles' }]);
  });

  it('remembers nothing when following renames is off', async () => {
    const plugin = await load({ followHeadingRenames: 'off' });
    plugin.noteHeadingRename({ basename: 'Guide', path: 'Guide.md' }, before);
    assert.ok(!plugin.pendingRenames || !plugin.pendingRenames.length);
  });

  // Typing into a heading lands here once per parse, so A→B→C arrives as two renames inside one
  // debounce window. Offering A→B would retarget every link to a heading the file no longer has,
  // and the B→C pass would then find nothing to fix.
  it('folds a chain of renames into one, so no link lands on the heading in between', async () => {
    const plugin = await load();
    plugin.headingsOf = () => [h('B')];
    plugin.noteHeadingRename({ basename: 'Guide', path: 'Guide.md' }, JSON.stringify({ h: [h('A')], a: [] }));
    plugin.headingsOf = () => [h('C')];
    plugin.noteHeadingRename({ basename: 'Guide', path: 'Guide.md' }, JSON.stringify({ h: [h('B')], a: [] }));
    assert.deepStrictEqual(plugin.pendingRenames, [{ base: 'Guide', from: 'A', to: 'C' }]);
  });

  it('offers nothing when a heading is edited back to what it was', async () => {
    const plugin = await load();
    plugin.headingsOf = () => [h('B')];
    plugin.noteHeadingRename({ basename: 'Guide', path: 'Guide.md' }, JSON.stringify({ h: [h('A')], a: [] }));
    plugin.headingsOf = () => [h('A')];
    plugin.noteHeadingRename({ basename: 'Guide', path: 'Guide.md' }, JSON.stringify({ h: [h('B')], a: [] }));
    assert.deepStrictEqual(plugin.pendingRenames, []);
  });

  it('keeps renames in different files apart', async () => {
    const plugin = await load();
    plugin.headingsOf = () => [h('B')];
    plugin.noteHeadingRename({ basename: 'Guide', path: 'Guide.md' }, JSON.stringify({ h: [h('A')], a: [] }));
    plugin.noteHeadingRename({ basename: 'Other', path: 'Other.md' }, JSON.stringify({ h: [h('A')], a: [] }));
    assert.strictEqual(plugin.pendingRenames.length, 2);
  });

  // A modal over the whole vault appearing on its own is exactly what 'ask' rules out.
  it('never opens the preview on its own in ask mode', async () => {
    const plugin = await load({ followHeadingRenames: 'ask' });
    let opened = 0;
    plugin.previewHeadingRename = () => { opened++; };
    plugin.offerHeadingRename({ base: 'Guide', from: 'A', to: 'B' });
    assert.strictEqual(opened, 0);
  });

  it('empties the queue when it is flushed, so one edit is offered once', async () => {
    const plugin = await load({ followHeadingRenames: 'preview' });
    plugin.noteHeadingRename({ basename: 'Guide', path: 'Guide.md' }, before);
    let offered = 0;
    plugin.previewHeadingRename = () => { offered++; };
    plugin.flushHeadingRenames();
    plugin.flushHeadingRenames();
    assert.strictEqual(offered, 1);
  });
});
