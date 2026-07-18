'use strict';

// Writing `%% alias: … %%` comments into a heading's own section.
//
// This is the only place the plugin rewrites a note the reader wrote by hand, so the cases
// that matter are the ones where it must NOT write: a heading that has gone, an alias
// already present, a comment belonging to the section below.

const { describe, it, assert } = require('../src/shared/testing/harness');
const { _addAliasesToHeading: add, _headingRegion: region } = require('../src/aliases');

const lines = (s) => s.split('\n');

describe('headingRegion', () => {
  it('runs from the heading to the next one of any level', () => {
    const text = lines('# One\nbody\n### Two\nmore\n# Three');
    assert.deepStrictEqual(region(text, 'One'), { start: 0, end: 2 });
    assert.deepStrictEqual(region(text, 'Two'), { start: 2, end: 4 });
  });

  it('runs to the end of the note for the last heading', () => {
    const text = lines('# One\nbody\n# Last\ntail');
    assert.deepStrictEqual(region(text, 'Last'), { start: 2, end: 4 });
  });

  it('finds nothing when the heading is not there', () => {
    assert.strictEqual(region(lines('# One\nbody'), 'Missing'), null);
  });
});

describe('addAliasesToHeading', () => {
  it('writes a fresh comment directly under the heading', () => {
    const out = add('# Collision\nbody\n', 'Collision', ['crash']);
    assert.strictEqual(out, '# Collision\n%% alias: crash %%\nbody\n');
  });

  it('extends the comment already there instead of adding a second', () => {
    const out = add('# Collision\n%% alias: crash %%\nbody', 'Collision', ['impact']);
    assert.strictEqual(out, '# Collision\n%% alias: crash, impact %%\nbody');
  });

  it('does nothing when every alias is already listed', () => {
    // Case-insensitively: the matcher does not care, so neither should this.
    assert.strictEqual(add('# A\n%% alias: crash %%', 'A', ['CRASH']), null);
  });

  it('does nothing when the heading has gone from the note', () => {
    // The index can be a moment behind the file — the write must not land somewhere else.
    assert.strictEqual(add('# Other\nbody', 'Collision', ['crash']), null);
  });

  it('does not reach into the next section for a comment', () => {
    const out = add('# One\nbody\n# Two\n%% alias: other %%', 'One', ['first']);
    assert.strictEqual(out, '# One\n%% alias: first %%\nbody\n# Two\n%% alias: other %%');
  });

  it('reads the plural spelling of an existing comment, and normalises it', () => {
    const out = add('# A\n%% aliases: one %%', 'A', ['two']);
    assert.strictEqual(out, '# A\n%% alias: one, two %%');
  });
});
