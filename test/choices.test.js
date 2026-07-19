'use strict';

// The list of what an ambiguous word could mean. It renders no previews of its own: each
// row asks Obsidian for its ordinary page preview of that one target, tied to the list's
// own component.

const { describe, it, assert } = require('../src/shared/testing/harness');
const { installStubs } = require('../src/shared/testing/stubs');

installStubs();

const { ChoicePopover } = require('../src/shared/prose/choices');

function installDom() {
  const makeEl = () => {
    const el = {
      classes: new Set(),
      style: {},
      children: [],
      listeners: {},
      text: '',
      classList: { contains: (c) => el.classes.has(c) },
      addClass(c) { for (const p of String(c).split(' ')) el.classes.add(p); },
      removeClass(c) { for (const p of String(c).split(' ')) el.classes.delete(p); },
      empty() { el.children.length = 0; },
      remove() {},
      contains: () => false,
      addEventListener(name, fn) { el.listeners[name] = fn; },
      createDiv(o) {
        const c = makeEl();
        if (o && o.cls) c.addClass(o.cls);
        if (o && o.text) c.text = o.text;
        el.children.push(c);
        return c;
      },
      createEl() { const c = makeEl(); el.children.push(c); return c; },
      getBoundingClientRect: () => ({ width: 200, height: 100 }),
    };
    return el;
  };
  // Merge rather than replace: installStubs already put localStorage on window and the
  // element helpers on document, and a plugin loaded by a later test file still needs them.
  global.window = Object.assign(global.window || {}, { innerWidth: 1000, innerHeight: 800 });
  global.document = Object.assign(global.document || {}, { body: makeEl() });
}

const tick = () => new Promise((r) => setTimeout(r, 5));

// The rows, flattened out of the list div.
const rows = (pop) => {
  const list = pop.pop.el.children.find((c) => c.classes.has('heading-choices-list'));
  return list ? list.children : [];
};

function make(opts = {}) {
  installDom();
  const calls = { hovered: [], opened: [] };
  const pop = new ChoicePopover(Object.assign({
    cls: 'heading',
    title: 'Which one?',
    hover: (target, event, row, parent) => calls.hovered.push({ target, parent }),
    open: (target) => calls.opened.push(target),
  }, opts));
  pop.pop.showDelay = 0;
  return { pop, calls };
}

describe('duplicate list', () => {
  it('draws a row per candidate, each described by its owner', async () => {
    // Two files holding the same heading are the case this list exists for: without the
    // second line both rows render as the same word and the reader picks blind.
    const { pop } = make({
      plugin: { api: { linker: { describe: (target) => ({ title: target.split('#').pop(), note: `Heading · ${target.split('#')[0]}` }) } } },
    });
    pop.schedule(['Guide#Spawn', 'Other#Spawn'], 10, 10);
    await tick();
    const drawn = rows(pop).map((r) => r.children.map((c) => c.text));
    assert.deepStrictEqual(drawn, [['Spawn', 'Heading · Guide'], ['Spawn', 'Heading · Other']]);
  });

  it('falls back to the bare target when nobody describes it', async () => {
    const { pop } = make();
    pop.schedule(['Guide#Spawn', 'Other#Spawn'], 10, 10);
    await tick();
    assert.deepStrictEqual(rows(pop).map((r) => r.children.map((c) => c.text)),
      [['Guide#Spawn'], ['Other#Spawn']]);
  });

  it('does not appear for a single meaning', async () => {
    // One row would be a menu with no choice in it.
    const { pop } = make();
    pop.schedule(['Guide#Spawn'], 10, 10);
    await tick();
    assert.ok(!pop.isVisible());
  });

  it('previews our own target through our own callback', async () => {
    const { pop, calls } = make();
    pop.schedule(['Guide#Spawn', 'Other#Spawn'], 10, 10);
    await tick();
    rows(pop)[1].listeners.mouseenter({});
    assert.strictEqual(calls.hovered.length, 1);
    assert.strictEqual(calls.hovered[0].target, 'Other#Spawn');
  });

  it('ties the native preview to its own component, not the plugin', async () => {
    // What keeps the preview alive while the pointer travels from the row onto it: Obsidian
    // ends a hover popover when the component that asked for it unloads, so the list hands
    // over its own and unloads it when it closes.
    const { pop, calls } = make();
    pop.schedule(['Guide#Spawn', 'Other#Spawn'], 10, 10);
    await tick();
    rows(pop)[0].listeners.mouseenter({});
    const parent = calls.hovered[0].parent;
    assert.ok(parent, 'no hoverParent was passed — the preview would outlive the list');
    assert.strictEqual(parent, pop.component);

    let unloaded = false;
    parent.unload = () => { unloaded = true; };
    pop.hide();
    assert.ok(unloaded, 'closing the list left its preview behind');
  });

  it('lets a sibling preview and open its own candidate', async () => {
    // We never interpret another linker's target: it hands us bound callbacks and we call
    // them.
    const { pop, calls } = make();
    const seen = [];
    pop.schedule([
      'Guide#Spawn',
      { label: 'Spawning', hover: (e, row, parent) => seen.push({ kind: 'hover', parent }), open: () => seen.push({ kind: 'open' }) },
    ], 10, 10);
    await tick();
    rows(pop)[1].listeners.mouseenter({});
    rows(pop)[1].listeners.click({ preventDefault() {}, stopPropagation() {} });
    assert.deepStrictEqual(seen.map((s) => s.kind), ['hover', 'open']);
    assert.strictEqual(calls.hovered.length, 0, 'previewed a sibling’s target ourselves');
    assert.strictEqual(calls.opened.length, 0, 'opened a sibling’s target ourselves');
  });

  it('closes the previous preview when moving to another row', async () => {
    // Every row is anchored inside the same list, so without a fresh component per row the
    // previews pile up — one left behind for every row the pointer crossed.
    const { pop, calls } = make();
    pop.schedule(['Guide#Spawn', 'Other#Spawn'], 10, 10);
    await tick();
    rows(pop)[0].listeners.mouseenter({});
    const first = calls.hovered[0].parent;
    let unloaded = false;
    first.unload = () => { unloaded = true; };

    rows(pop)[1].listeners.mouseenter({});
    assert.ok(unloaded, 'the first row’s preview was left on screen');
    assert.notStrictEqual(calls.hovered[1].parent, first, 'both rows shared one component');
  });

  it('stays up while the pointer is inside the preview it opened', async () => {
    // The preview is Obsidian's own element in the body, not a child of ours, so walking
    // into it reads as leaving the list. Without this the list vanishes exactly when the
    // reader tries to use it.
    installDom();
    let inPreview = true;
    global.document.querySelector = (sel) => (inPreview && sel === '.hover-popover:hover' ? {} : null);
    const { pop } = make();
    global.document.querySelector = (sel) => (inPreview && sel === '.hover-popover:hover' ? {} : null);
    pop.pop.hideGrace = 0;
    pop.schedule(['Guide#Spawn', 'Other#Spawn'], 10, 10);
    await tick();
    pop.leave();
    await tick();
    assert.ok(pop.isVisible(), 'the list closed while the pointer was inside its preview');

    inPreview = false;
    pop.leave();
    await tick();
    assert.ok(!pop.isVisible(), 'the list stayed up after the pointer left everything');
  });

  it('opens our own candidate on click', async () => {
    const { pop, calls } = make();
    pop.schedule(['Guide#Spawn', 'Other#Spawn'], 10, 10);
    await tick();
    rows(pop)[0].listeners.click({ preventDefault() {}, stopPropagation() {} });
    assert.deepStrictEqual(calls.opened, ['Guide#Spawn']);
    assert.ok(!pop.isVisible(), 'the list stayed up after committing');
  });
});
