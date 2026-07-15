'use strict';

const { Platform } = require('obsidian');
const { t } = require('./shared/i18n');

// On touch there is no right-click or hover, so a held press stands in for the context
// menu: it re-dispatches a `contextmenu` event, reusing the existing menu handlers below.
const LONG_PRESS_MS = 500;
const fireContextMenu = (el, x, y) => el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: x, clientY: y }));

function longPressTracker(fire) {
  let timer = null, x = 0, y = 0, target = null;
  const cancel = () => { if (timer) { clearTimeout(timer); timer = null; } };
  return {
    start(t, el) { target = el; x = t.clientX; y = t.clientY; timer = setTimeout(() => { timer = null; fire(target, x, y); }, LONG_PRESS_MS); },
    move(t) { if (timer && (Math.abs(t.clientX - x) > 10 || Math.abs(t.clientY - y) > 10)) cancel(); },
    cancel,
  };
}

// Highlighting in Reading view (DOM) and in the editor (CM6). Mixed into the plugin prototype.
module.exports = {
  processReadingMode(el, ctx) {
    if (!this.settings.highlightInReading) return;
    const sourcePath = ctx.sourcePath;
    if (sourcePath && !this.inScope(sourcePath)) return;
    const currentFile = this.currentFileBase(sourcePath);

    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        let p = node.parentElement;
        while (p) {
          const tag = p.tagName;
          if (tag === 'CODE' || tag === 'PRE' || tag === 'A') return NodeFilter.FILTER_REJECT;
          if (this.settings.skipHeadings && /^H[1-6]$/.test(tag)) return NodeFilter.FILTER_REJECT;
          if (p.classList && p.classList.contains('heading-link')) return NodeFilter.FILTER_REJECT;
          if (p === el) break;
          p = p.parentElement;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) this.decorateTextNode(node, currentFile, sourcePath);
  },

  decorateTextNode(node, currentFile, sourcePath) {
    const text = node.textContent;
    if (!text || text.length < 2) return;
    // protect:true keeps this in step with the materialize path, so the Nth
    // highlighted occurrence here is the Nth occurrence that gets linked.
    const matches = this.findMatches(text, currentFile, { protect: true });
    if (!matches.length) return;

    const frag = document.createDocumentFragment();
    let cursor = 0;
    for (const m of matches) {
      if (m.start > cursor) frag.appendChild(document.createTextNode(text.slice(cursor, m.start)));
      const linktext = m.linktext;
      const display = m.display;
      const a = document.createElement('a');
      a.textContent = display;
      a.setAttribute('data-heading-target', linktext); // used for occurrence counting below
      if (m.alts && m.alts.length) {
        // Ambiguous: no data-href, so Obsidian shows no (misleading) single-page
        // preview, just the aria-label tooltip. Click asks which heading to open.
        a.className = 'heading-link heading-ambiguous';
        const candidates = [linktext, ...m.alts];
        a.setAttribute('aria-label', t('highlight.matches', { terms: candidates.join(', ') }));
        const pick = (e, newTab) => {
          e.preventDefault();
          e.stopPropagation();
          this.chooseTerm(candidates, newTab ? t('menu.openNewTabTitle') : t('menu.openTitle'), (c) => this.openTerm(c, sourcePath, newTab));
        };
        a.addEventListener('click', (e) => pick(e, e.ctrlKey || e.metaKey));
        a.addEventListener('auxclick', (e) => { if (e.button === 1) pick(e, true); });
        a.addEventListener('mousedown', (e) => { if (e.button === 1) { e.preventDefault(); e.stopPropagation(); } });
      } else {
        // Single term: a real internal link, so hover shows its heading preview.
        a.className = 'internal-link heading-link';
        a.href = linktext;
        a.setAttribute('data-href', linktext);
      }
      a.addEventListener('contextmenu', (e) => {
        const file = sourcePath ? this.app.vault.getAbstractFileByPath(sourcePath) : null;
        // Reading-rendered links carry no source offset, so identify the clicked
        // occurrence by its DOM-order index, which matches findMatches' order.
        const root = a.closest('.markdown-reading-view, .markdown-source-view, .markdown-preview-view') || a.ownerDocument;
        let occurrence = 0;
        for (const other of root.querySelectorAll('a.heading-link')) {
          if (other === a) break;
          if (other.getAttribute('data-heading-target') === linktext && other.textContent === display) occurrence++;
        }
        if (this.showLinkMenu(e, linktext, display, file, null, occurrence, m.alts)) e.stopPropagation();
      });
      if (Platform.isMobile) {
        const lp = longPressTracker(fireContextMenu);
        a.addEventListener('touchstart', (e) => lp.start(e.touches[0], a), { passive: true });
        a.addEventListener('touchmove', (e) => lp.move(e.touches[0]), { passive: true });
        a.addEventListener('touchend', lp.cancel);
        a.addEventListener('touchcancel', lp.cancel);
      }
      frag.appendChild(a);
      cursor = m.end;
    }
    if (cursor < text.length) frag.appendChild(document.createTextNode(text.slice(cursor)));
    node.parentNode.replaceChild(frag, node);
  },

  // Editor highlight (Live Preview / Source). Always registered; the
  // editingHighlight setting controls if and how often it recomputes.
  registerEditingHighlight() {
    let view, state, language;
    try {
      view = require('@codemirror/view');
      state = require('@codemirror/state');
      language = require('@codemirror/language');
    } catch (e) {
      console.warn('Heading Linker: CM6 modules unavailable, editor highlight disabled', e);
      return;
    }
    const { ViewPlugin, Decoration } = view;
    const { RangeSetBuilder, StateEffect } = state;
    const { syntaxTree } = language;
    const plugin = this;

    const refresh = StateEffect.define();
    this.cmRefreshEffect = refresh;

    const markCache = new Map();
    const markFor = (linktext) => {
      let m = markCache.get(linktext);
      if (!m) {
        m = Decoration.mark({ class: 'cm-heading-link', attributes: { 'data-heading-target': linktext } });
        markCache.set(linktext, m);
      }
      return m;
    };
    // Collision marks carry a per-match tooltip + alt list, so they are not cached.
    const markWithAlts = (linktext, alts) => Decoration.mark({
      class: 'cm-heading-link cm-heading-ambiguous',
      attributes: { 'data-heading-target': linktext, 'data-heading-alts': alts.join('\n'), 'aria-label': t('highlight.matches', { terms: [linktext, ...alts].join(', ') }) },
    });

    const skipNode = (name) => /code|link|url|header|hashtag|frontmatter|comment|tag|escape/i.test(name);

    const buildDeco = (editorView) => {
      const builder = new RangeSetBuilder();
      const activeFile = plugin.app.workspace.getActiveFile();
      if (activeFile && !plugin.inScope(activeFile.path)) return builder.finish();
      const currentFile = activeFile ? plugin.currentFileBase(activeFile.path) : null;
      const tree = syntaxTree(editorView.state);
      for (const { from, to } of editorView.visibleRanges) {
        const text = editorView.state.doc.sliceString(from, to);
        for (const m of plugin.findMatches(text, currentFile)) {
          const start = from + m.start;
          const end = from + m.end;
          let skip = false;
          tree.iterate({ from: start, to: end, enter: (n) => { if (skipNode(n.type.name)) skip = true; } });
          if (!skip) builder.add(start, end, m.alts && m.alts.length ? markWithAlts(m.linktext, m.alts) : markFor(m.linktext));
        }
      }
      return builder.finish();
    };

    const targetEl = (e) => (e.target instanceof HTMLElement ? e.target.closest('.cm-heading-link') : null);
    const linktextOf = (el) => el.getAttribute('data-heading-target');
    const altsOf = (el) => { const v = el.getAttribute('data-heading-alts'); return v ? v.split('\n') : null; };
    const editorLp = longPressTracker(fireContextMenu);

    const vp = ViewPlugin.fromClass(
      class {
        constructor(v) { this.decorations = plugin.settings.editingHighlight === 'off' ? Decoration.none : buildDeco(v); }
        update(u) {
          const mode = plugin.settings.editingHighlight;
          if (mode === 'off') { if (this.decorations.size) this.decorations = Decoration.none; return; }
          const forced = u.transactions.some((tr) => tr.effects.some((e) => e.is(refresh)));
          if (u.viewportChanged || forced || (mode === 'live' && (u.docChanged || u.selectionSet))) {
            this.decorations = buildDeco(u.view);
          } else if (u.docChanged) {
            this.decorations = this.decorations.map(u.changes);
          }
        }
      },
      {
        decorations: (v) => v.decorations,
        eventHandlers: {
          mousedown(e) {
            const el = targetEl(e);
            if (!el) return;
            const file = plugin.app.workspace.getActiveFile();
            const sourcePath = file ? file.path : '';
            const alts = altsOf(el);
            const candidates = alts && alts.length ? [linktextOf(el), ...alts] : [linktextOf(el)];
            if (e.button === 1) {
              plugin.chooseTerm(candidates, t('menu.openNewTabTitle'), (c) => plugin.openTerm(c, sourcePath, true));
              e.preventDefault();
              return;
            }
            if (e.button !== 0 || !(e.ctrlKey || e.metaKey)) return;
            plugin.chooseTerm(candidates, t('menu.openTitle'), (c) => plugin.openTerm(c, sourcePath, false));
            e.preventDefault();
          },
          mouseover(e) {
            const el = targetEl(e);
            if (!el) return;
            // Ambiguous: no single page preview — the aria-label tooltip lists the terms.
            if (el.hasAttribute('data-heading-alts')) return;
            const file = plugin.app.workspace.getActiveFile();
            plugin.hoverTerm(e, el, linktextOf(el), file ? file.path : '');
          },
          contextmenu(e, view) {
            const el = targetEl(e);
            if (!el) return;
            const file = plugin.app.workspace.getActiveFile();
            plugin.showLinkMenu(e, linktextOf(el), el.textContent, file, view.posAtDOM(el), undefined, altsOf(el));
          },
          touchstart(e) {
            if (!Platform.isMobile) return;
            const el = targetEl(e);
            if (el) editorLp.start(e.touches[0], el);
          },
          touchmove(e) { editorLp.move(e.touches[0]); },
          touchend: editorLp.cancel,
          touchcancel: editorLp.cancel,
        },
      }
    );
    this.registerEditorExtension(vp);
  },
};
