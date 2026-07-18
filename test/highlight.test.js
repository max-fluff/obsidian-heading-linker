'use strict';

// The reading-view decoration, run for real. The behaviour is shared; the names come from
// this plugin's config, and the attribute names are template-built — the only way to check
// them is to produce a node and look at it.

const { describe, it, assert } = require('../src/shared/testing/harness');
const path = require('path');
const { fakeApp, installStubs } = require('./stubs/app');

installStubs();

// Just enough DOM to run the decorator and inspect what it built.
function fakeNode(text) {
  const el = () => {
    const e = {
      tagName: 'SPAN', children: [], attrs: {}, className: '', textContent: '',
      classList: { contains: () => false },
      setAttribute(k, v) { this.attrs[k] = v; },
      getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; },
      appendChild(c) { this.children.push(c); return c; },
      listeners: {},
      addEventListener(name, fn) { this.listeners[name] = fn; },
      parentElement: null,
    };
    return e;
  };
  global.document = {
    createElement: () => el(),
    createTextNode: (t) => ({ nodeText: t }),
    createDocumentFragment: () => el(),
  };
  const parent = el();
  const node = { textContent: text, parentNode: parent };
  parent.replaceChild = (frag) => { parent.replaced = frag; };
  return { node, parent };
}

const load = async () => {
  const Plugin = require(path.join(__dirname, '..', 'src', 'main.js'));
  const plugin = new Plugin(fakeApp, { version: '0.0.0', id: 'heading-linker' });
  await plugin.onload();
  return plugin;
};

// One known match, so the test is about naming rather than about the matcher.
const withMatch = (plugin, match) => {
  plugin.findMatches = () => [match];
  plugin.yieldedIn = () => [];
  return plugin;
};

const anchors = (parent) => (parent.replaced ? parent.replaced.children.filter((c) => c.attrs) : []);

describe('reading-view decoration', () => {
  it('marks a single match as an internal link with our own class', async () => {
    const plugin = withMatch(await load(), { start: 2, end: 7, display: 'Spawn', linktext: 'Guide#Spawn' });
    const { node, parent } = fakeNode('a Spawn here');
    plugin.decorateTextNode(node, null, 'Note.md');

    const a = anchors(parent)[0];
    assert.ok(a, 'nothing was decorated');
    assert.strictEqual(a.className, 'internal-link heading-link');
    assert.strictEqual(a.getAttribute('data-heading-target'), 'Guide#Spawn');
    assert.strictEqual(a.getAttribute('data-href'), 'Guide#Spawn');
    assert.strictEqual(a.textContent, 'Spawn');
  });

  it('marks a match with alternatives as ambiguous and gives it no href', async () => {
    // No data-href on purpose: Obsidian would show one page's preview for a word that
    // resolves to several.
    const plugin = withMatch(await load(), { start: 2, end: 7, display: 'Spawn', linktext: 'Guide#Spawn', alts: ['Other#Spawn'] });
    const { node, parent } = fakeNode('a Spawn here');
    plugin.decorateTextNode(node, null, 'Note.md');

    const a = anchors(parent)[0];
    assert.strictEqual(a.className, 'heading-link heading-ambiguous');
    assert.strictEqual(a.getAttribute('data-href'), null);
    // And no aria-label either: hovering opens the list of meanings, and the app renders an
    // aria-label as a tooltip, so both would say the same thing on top of each other.
    assert.strictEqual(a.getAttribute('aria-label'), null);
  });

  it('offers the list of meanings when the span is ambiguous', async () => {
    // The word means several things, so there is no honest single preview. Hovering lists
    // them; each row then previews itself through Obsidian's own page preview.
    const plugin = withMatch(await load(), { start: 2, end: 7, display: 'Spawn', linktext: 'Guide#Spawn', alts: ['Other#Spawn'] });
    const scheduled = [];
    plugin.choices = { schedule: (c) => scheduled.push(c), leave: () => {} };
    const { node, parent } = fakeNode('a Spawn here');
    plugin.decorateTextNode(node, null, 'Note.md');

    const a = anchors(parent)[0];
    assert.ok(a.listeners.mouseenter, 'an ambiguous span does not react to hover');
    a.listeners.mouseenter({ clientX: 5, clientY: 5 });
    assert.strictEqual(scheduled.length, 1);
    assert.deepStrictEqual(scheduled[0], ['Guide#Spawn', 'Other#Spawn']);
  });

  it('does not offer the list when the span means one thing', async () => {
    // A single target keeps Obsidian's ordinary preview; a list of one would be noise.
    const plugin = withMatch(await load(), { start: 2, end: 7, display: 'Spawn', linktext: 'Guide#Spawn' });
    let scheduled = 0;
    plugin.choices = { schedule: () => { scheduled++; }, leave: () => {} };
    const { node, parent } = fakeNode('a Spawn here');
    plugin.decorateTextNode(node, null, 'Note.md');

    const a = anchors(parent)[0];
    if (a.listeners.mouseenter) a.listeners.mouseenter({ clientX: 5, clientY: 5 });
    assert.strictEqual(scheduled, 0);
  });

  it('never emits the sibling linker’s names', async () => {
    const plugin = withMatch(await load(), { start: 2, end: 7, display: 'Spawn', linktext: 'Guide#Spawn' });
    const { node, parent } = fakeNode('a Spawn here');
    plugin.decorateTextNode(node, null, 'Note.md');

    const a = anchors(parent)[0];
    const written = a.className + ' ' + Object.keys(a.attrs).join(' ');
    assert.ok(!/glossary/.test(written), `leaked the glossary linker's names: ${written}`);
  });
});
