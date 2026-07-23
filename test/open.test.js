'use strict';

// Opening a heading must reach the file it names, not whichever the case-insensitive link
// resolver ranks first — two files Guide and guide with the same heading collided.

const { describe, it, assert } = require('../src/shared/testing/harness');
const path = require('path');
const { fakeApp, installStubs } = require('../src/shared/testing/stubs');

installStubs();

const load = () => {
  const Plugin = require(path.join(__dirname, '..', 'src', 'main.js'));
  const plugin = new Plugin(fakeApp, { version: '0.0.0', id: 'heading-linker' });
  plugin.terms = [
    { linktext: 'Guide#Overview', label: 'Overview', path: 'docs/Guide.md', fileBase: 'Guide', aliases: [] },
    { linktext: 'guide#Overview', label: 'Overview', path: 'archive/guide.md', fileBase: 'guide', aliases: [] },
  ];
  return plugin;
};

describe('openTerm', () => {
  it('opens each case-variant file at its heading, by path', () => {
    const plugin = load();
    const opened = [];
    fakeApp.workspace.openLinkText = (linktext) => opened.push(linktext);

    plugin.openTerm('Guide#Overview', 'Note.md', false);
    plugin.openTerm('guide#Overview', 'Note.md', false);

    assert.deepStrictEqual(opened, ['docs/Guide.md#Overview', 'archive/guide.md#Overview']);
  });

  it('falls back to the bare linktext for a target it does not index', () => {
    const plugin = load();
    let opened = null;
    fakeApp.workspace.openLinkText = (linktext) => { opened = linktext; };

    plugin.openTerm('Other#Intro', 'Note.md', false);

    assert.strictEqual(opened, 'Other#Intro');
  });

  it('previews the same path the click opens', () => {
    const plugin = load();
    let hovered = null;
    fakeApp.workspace.trigger = (name, payload) => { if (name === 'hover-link') hovered = payload.linktext; };

    plugin.hoverTerm({}, {}, 'guide#Overview', 'Note.md', null);

    assert.strictEqual(hovered, 'archive/guide.md#Overview');
  });
});
