'use strict';

// The priority-order setting. Two things matter beyond it not throwing: it stays invisible in
// a vault with one linker installed, and moving a row writes only our own number.

const { describe, it, assert } = require('./harness');
const { obsidianStub } = require('./stubs/app');
const { renderPrecedence, precedenceForIndex, rankedLinkers } = require('../src/shared/precedence');

const provider = (id, precedence) => ({ id, apiVersion: 1, precedence, displayName: id });
const appWith = (...providers) => {
  const plugins = {};
  for (const p of providers) plugins[p.id] = { api: { linker: p } };
  return { plugins: { plugins } };
};

// Just enough of a container to be written into, counting what got created.
const fakeContainer = () => {
  const divs = [];
  return {
    divs,
    createDiv() {
      const el = { empty() {}, addClass() {} };
      divs.push(el);
      return el;
    },
  };
};

const opts = (app, provider, save) => ({
  app,
  provider,
  Setting: obsidianStub.Setting,
  name: 'Priority',
  desc: 'desc',
  save,
});

describe('renderPrecedence', () => {
  it('renders nothing when no other linker is installed', () => {
    // The user's own requirement: the question does not exist in a solo vault, so neither
    // should the control.
    const self = provider('heading-linker', 20);
    const container = fakeContainer();
    renderPrecedence(container, opts(appWith(self), self, async () => {}));
    assert.strictEqual(container.divs.length, 0, 'drew a ranking with nothing to rank');
  });

  it('renders the list once a sibling is there', () => {
    const self = provider('heading-linker', 20);
    const app = appWith(self, provider('glossary-linker', 10));
    const container = fakeContainer();
    renderPrecedence(container, opts(app, self, async () => {}));
    assert.strictEqual(container.divs.length, 1);
  });

  it('does nothing at all without a provider', () => {
    // onload publishes the provider last, so a settings tab opened mid-failure must not throw.
    const container = fakeContainer();
    renderPrecedence(container, opts(appWith(), null, async () => {}));
    assert.strictEqual(container.divs.length, 0);
  });
});

describe('precedenceForIndex', () => {
  it('writes a number that actually moves us, and only ours', () => {
    const self = provider('heading-linker', 20);
    const peer = provider('glossary-linker', 10);
    const before = peer.precedence;
    const moved = precedenceForIndex(appWith(self, peer), self, 1);
    assert.ok(moved < peer.precedence, `expected below ${peer.precedence}, got ${moved}`);
    assert.strictEqual(peer.precedence, before, 'changed a peer’s setting, which is not ours to write');
    assert.deepStrictEqual(
      rankedLinkers(appWith({ ...self, precedence: moved }, peer)).map((p) => p.id),
      ['glossary-linker', 'heading-linker']
    );
  });
});
