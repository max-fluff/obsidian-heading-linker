'use strict';

const { t } = require('./shared/i18n');
const { cursorReader } = require('./shared/actions');

// Everything the editor menu offers on what the cursor sits in, declared once for both
// surfaces (shared/actions.js). The branching the handler used to do lives in `resolve`: a
// link answers first, then a match, then a word a sibling owns, then a word that matches
// nothing because it is already excluded.

const oneWord = (text) => (text.match(/[\p{L}\p{Nd}]+/gu) || []).length === 1;

const LONG = { term: '', form: 'Form', stem: 'Stem' };
const SHORT = { term: 'exclude.shortTerm', form: 'exclude.shortForm', stem: 'exclude.shortStem' };

// One reading of the cursor for the whole list: a link first, then a match, then a word a
// sibling owns, then a bare word — which is what an already-excluded one looks like.
const reading = cursorReader((plugin, editor) => {
  const link = plugin.headingLinkAt(editor);
  if (link) return { link };
  const hit = plugin.matchAtCursor(editor);
  if (hit) return { hit };
  const word = plugin.wordAtCursor(editor);
  return word ? { word } : { raw: plugin.rawWordAtCursor(editor) };
});

const linkAt = (plugin, editor) => (editor ? reading(plugin, editor).link || null : null);
const hitAt = (plugin, editor) => (editor ? reading(plugin, editor).hit || null : null);

// What the exclusion items act on, wherever the cursor is. `settled` marks the last case:
// there only the undo half is offered, since nothing matches to be stopped.
function exclusionTarget(plugin, editor) {
  if (!editor) return null;
  const at = reading(plugin, editor);
  if (at.link) return { display: at.link.display, label: plugin.labelOf(at.link.linktext) };
  if (at.hit) return { display: at.hit.match.display, label: plugin.labelOf(at.hit.match.linktext) };
  if (at.word) return { display: at.word.display, label: plugin.labelOf(at.word.linktext) };
  return at.raw ? { display: at.raw, label: at.raw, settled: true } : null;
}

// One list entry, added or removed. The add twin is tagged with a verb so it groups with
// whatever else offers to stop the same word; an undo finishes no such phrase and stays flat.
const exclusionAction = ({ id, name, listKey, kind, add }) => ({
  id,
  name,
  surface: 'editor',
  icon: add ? (kind === 'term' ? 'trash-2' : 'ban') : 'rotate-ccw',
  verb: add ? (kind === 'term' ? 'exclude' : 'silence') : undefined,
  value: (ctx) => ctx.value,
  inMenu: (plugin) => plugin.settings.menuExclude,
  title: (ctx, grouped) => t(
    grouped ? SHORT[kind] : `exclude.${add ? 'add' : 'remove'}${LONG[kind]}`,
    { value: ctx.value, noun: t(kind === 'term' ? 'exclude.terms' : 'exclude.words') }
  ),
  resolve: (plugin, editor) => {
    const target = exclusionTarget(plugin, editor);
    if (!target || (add && target.settled)) return null;
    if (kind !== 'term' && !oneWord(target.display)) return null;

    if (kind === 'stem') {
      // The line may have been written from another form of the word, so what to undo is
      // looked up; the wording still names the word under the cursor.
      const silencing = plugin.stemLineSilencing(target.display);
      if (add === !!silencing) return null;
      return { value: target.display, line: `${silencing || plugin.keysFor(target.display)[0]}*` };
    }
    const value = kind === 'term' ? target.label : target.display;
    return plugin.isExcluded(listKey, value) === add ? null : { value, line: value };
  },
  run: (plugin, ctx) => plugin.setExcluded(listKey, ctx.line, add),
});

const EXCLUSION_ACTIONS = [
  exclusionAction({ id: 'stop-spelling', name: 'cmd.stopSpelling', listKey: 'excludeWords', kind: 'form', add: true }),
  exclusionAction({ id: 'stop-forms', name: 'cmd.stopForms', listKey: 'excludeWords', kind: 'stem', add: true }),
  exclusionAction({ id: 'exclude-heading', name: 'cmd.excludeHeading', listKey: 'excludeTerms', kind: 'term', add: true }),
  exclusionAction({ id: 'resume-spelling', name: 'cmd.resumeSpelling', listKey: 'excludeWords', kind: 'form', add: false }),
  exclusionAction({ id: 'resume-forms', name: 'cmd.resumeForms', listKey: 'excludeWords', kind: 'stem', add: false }),
  exclusionAction({ id: 'include-heading', name: 'cmd.includeHeading', listKey: 'excludeTerms', kind: 'term', add: false }),
];

// The three ways to link one word differ only in how far they reach, so in the menu they are
// one entry with the choice inside; in the palette each is its own command, to bind a key to.
const linkAction = ({ id, name, titleKey, icon, run }) => ({
  id,
  name,
  surface: 'editor',
  icon,
  section: (ctx) => t('menu.linkThisWord', { display: ctx.display }),
  inMenu: (plugin) => plugin.settings.menuTurnInto,
  title: (ctx) => t(titleKey, { display: ctx.display, scope: ctx.scope }),
  resolve: (plugin, editor) => {
    const hit = hitAt(plugin, editor);
    const file = plugin.app.workspace.getActiveFile();
    if (!hit || !file) return null;
    return {
      editor,
      file,
      hit,
      display: hit.match.display,
      linktext: hit.match.linktext,
      scope: plugin.settings.linkFirstOnly ? t('scope.first') : t('scope.all'),
    };
  },
  run,
});

// Only our own readings: a link is written by the linker that owns it, so a peer's meaning
// here could only open its note, never link the word.
const ownCandidates = (ctx) => [ctx.hit.match.linktext, ...(ctx.hit.match.alts || [])];

const LINK_WORD_ACTIONS = [
  linkAction({
    id: 'link-word-here', name: 'cmd.linkWordHere', titleKey: 'menu.linkHere', icon: 'link',
    run: (plugin, ctx) => plugin.chooseTerm(ownCandidates(ctx), t('menu.linkDisplayTo', { display: ctx.display }),
      (c) => plugin.materializeSingle(ctx.file, ctx.linktext, ctx.display,
        ctx.editor.posToOffset({ line: ctx.hit.line, ch: ctx.hit.match.start }), 0, c)),
  }),
  linkAction({
    id: 'link-word-note', name: 'cmd.linkWordNote', titleKey: 'menu.linkScopeThisNote', icon: 'links-coming-in',
    run: (plugin, ctx) => plugin.chooseTerm(ownCandidates(ctx), t('menu.linkScopeTo', { scope: ctx.scope, display: ctx.display }),
      (c) => plugin.materializeTerm(ctx.file, ctx.linktext, c)),
  }),
  linkAction({
    id: 'link-word-scope', name: 'cmd.linkWordScope', titleKey: 'menu.linkScopeAllNotes', icon: 'links-going-out',
    run: (plugin, ctx) => plugin.chooseTerm(ownCandidates(ctx), t('menu.linkScopeTo', { scope: ctx.scope, display: ctx.display }),
      (c) => plugin.materializeTermScope(ctx.linktext, c)),
  }),
];

const OPEN_WORD = {
  id: 'open-word',
  name: 'cmd.openWord',
  surface: 'editor',
  icon: 'file-text',
  inMenu: (plugin) => plugin.settings.menuOpen,
  title: (ctx) => t('menu.openThisWord', { display: ctx.display }),
  resolve: (plugin, editor) => {
    const hit = hitAt(plugin, editor);
    return hit ? { hit, display: hit.match.display, sourcePath: plugin.activePath() } : null;
  },
  run: (plugin, ctx) => plugin.chooseTerm(plugin.cursorCandidates(ctx.hit, ctx.sourcePath, false),
    t('menu.openTitle'), (c) => plugin.openTerm(c, ctx.sourcePath, false)),
};

const UNLINK_AT_CURSOR = {
  id: 'unlink-at-cursor',
  name: 'cmd.unlinkAtCursor',
  surface: 'editor',
  icon: 'unlink',
  inMenu: (plugin) => plugin.settings.menuUnlink,
  title: () => t('menu.unlinkThisLink'),
  resolve: (plugin, editor) => {
    const link = linkAt(plugin, editor);
    return link ? { editor, link } : null;
  },
  run: (plugin, ctx) => plugin.unlinkLinkAt(ctx.editor, ctx.link),
};

// The link's own wording is someone saying what this heading is called; collecting it makes
// the next occurrence of the phrase match on its own.
const COLLECT_ALIAS = {
  id: 'collect-alias-at-cursor',
  name: 'cmd.collectAliasAtCursor',
  surface: 'editor',
  icon: 'download',
  inMenu: (plugin) => plugin.settings.menuCollect,
  title: () => t('menu.collectThisAlias'),
  resolve: (plugin, editor) => {
    const link = linkAt(plugin, editor);
    if (!link || !link.targetFile || link.display === plugin.labelOf(link.linktext)) return null;
    return { link };
  },
  run: (plugin, ctx) => plugin.collectAliasFromLink(ctx.link),
};

// Declaration order is menu order: what a link offers, then the ways to link a word, then
// what to open, then the exclusion lists.
const EDITOR_ACTIONS = [
  UNLINK_AT_CURSOR,
  COLLECT_ALIAS,
  ...LINK_WORD_ACTIONS,
  OPEN_WORD,
  ...EXCLUSION_ACTIONS,
];

module.exports = { EDITOR_ACTIONS };
