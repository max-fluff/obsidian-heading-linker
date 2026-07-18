'use strict';

// Collecting link wording as heading aliases.
//
// A heading is matched by its own text and by whatever `%% alias: … %%` comments sit in its
// section. Those comments had to be typed by hand, while the vault is already full of the
// answer: every `[[Note#Heading|some other wording]]` link is someone saying that "some other
// wording" means that heading. Collecting turns those into aliases, so the next occurrence of
// the phrase is matched on its own.
//
// The glossary linker has had this since the start; a heading is just a narrower target for
// the same idea. The mechanics differ though — glossary terms are whole notes and their
// aliases live in frontmatter, which Obsidian will edit for us through processFrontMatter.
// A heading owns no frontmatter, so its aliases live in a comment inside its own section and
// the edit is ours to make.

const { Notice } = require('obsidian');
const { t, plural } = require('./shared/i18n');

const HEADING_RE = /^(#{1,6})\s+(.*)$/;
// A single-line alias comment, the shape this file writes. An alias comment spread over
// several lines is still read by the parser, but it is left alone rather than rewritten.
const ALIAS_LINE_RE = /^\s*%%\s*alias(?:es)?\s*:\s*(.*?)\s*%%\s*$/i;

const headingTextOf = (line) => {
  const m = HEADING_RE.exec(line);
  return m ? m[2].trim() : null;
};

// The line range of `heading`'s own section: the heading line itself, and everything up to
// the next heading of any level. Null when the note holds no such heading — which happens
// whenever the index is a moment behind the file on disk.
function headingRegion(lines, heading) {
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    const text = headingTextOf(lines[i]);
    if (text === null) continue;
    if (start < 0) { if (text === heading) start = i; continue; }
    return { start, end: i };
  }
  return start < 0 ? null : { start, end: lines.length };
}

// Add `aliases` to one heading's comment, returning the new text or null when there was
// nothing to do. Extends the existing comment where there is one so a section doesn't
// accumulate a stack of them, and otherwise writes a fresh line under the heading.
function addAliasesToHeading(text, heading, aliases) {
  const lines = text.split('\n');
  const region = headingRegion(lines, heading);
  if (!region) return null;

  for (let i = region.start + 1; i < region.end; i++) {
    const m = ALIAS_LINE_RE.exec(lines[i]);
    if (!m) continue;
    const existing = m[1].split(',').map((a) => a.trim()).filter(Boolean);
    const seen = new Set(existing.map((a) => a.toLowerCase()));
    const fresh = aliases.filter((a) => !seen.has(a.toLowerCase()));
    if (!fresh.length) return null;
    lines[i] = `%% alias: ${[...existing, ...fresh].join(', ')} %%`;
    return lines.join('\n');
  }

  lines.splice(region.start + 1, 0, `%% alias: ${aliases.join(', ')} %%`);
  return lines.join('\n');
}

module.exports = {
  // Exported for the tests: the text rewrite is the part that touches the reader's notes,
  // and it is pure, so it can be checked without an app.
  _addAliasesToHeading: addAliasesToHeading,
  _headingRegion: headingRegion,

  // Aliases already attached to `heading` in `file`, lower-cased, including the heading's
  // own text — everything a new alias would be redundant against.
  knownFormsFor(file, heading) {
    const forms = new Set([heading.toLowerCase()]);
    const cached = this.aliasCache.get(file.path);
    const list = cached && cached.get(heading);
    for (const a of list || []) forms.add(String(a).toLowerCase());
    return forms;
  },

  // The one write path. `perHeading` is Map<heading, string[]>; returns how many aliases
  // actually landed, which is not the same as how many were offered — a concurrent edit can
  // remove the heading between the menu opening and the click.
  async writeHeadingAliases(file, perHeading) {
    let added = 0;
    // vault.process reads and writes under one lock, so a note being edited elsewhere at the
    // same moment can't lose either change.
    await this.app.vault.process(file, (text) => {
      let out = text;
      for (const [heading, aliases] of perHeading) {
        const next = addAliasesToHeading(out, heading, aliases);
        if (next === null) continue;
        out = next;
        added += aliases.length;
      }
      return out;
    });
    if (added) {
      this.aliasCache.delete(file.path);
      await this.loadFileAliases(file);
      this.scheduleRebuild();
    }
    return added;
  },

  // Collect one link's wording as an alias for the heading it points at.
  async collectAliasFromLink(link) {
    const heading = this.labelOf(link.linktext);
    const display = String(link.display || '').trim();
    if (!link.targetFile || !heading || !display) return;
    if (this.knownFormsFor(link.targetFile, heading).has(display.toLowerCase())) {
      new Notice(t('notice.aliasExists', { alias: display, term: heading }));
      return;
    }
    const added = await this.writeHeadingAliases(link.targetFile, new Map([[heading, [display]]]));
    new Notice(added
      ? t('notice.aliasAdded', { alias: display, term: heading })
      : t('notice.headingGone', { term: heading }));
  },

  // Collect every heading link in `file` whose wording differs from the heading it points at.
  //
  // Grouped by target note so each one is opened and written once, however many of its
  // headings the source note links to.
  async collectAliasesFromNote(file) {
    const cache = this.app.metadataCache.getFileCache(file);
    const links = (cache && cache.links) || [];
    const byFile = new Map();

    for (const link of links) {
      const hash = String(link.link || '').indexOf('#');
      if (hash < 0) continue; // a link to a whole note says nothing about a heading
      const heading = String(link.link).slice(hash + 1).trim();
      const display = String(link.displayText || '').trim();
      if (!heading || !display) continue;

      const target = this.app.metadataCache.getFirstLinkpathDest(String(link.link).slice(0, hash), file.path);
      if (!target || !this.isGlossaryFile(target)) continue;
      // Obsidian fills displayText with "Note > Heading" for a link with no alias of its
      // own; that is its rendering, not the author's wording, so there is nothing to learn.
      if (display.includes('>') || this.knownFormsFor(target, heading).has(display.toLowerCase())) continue;

      let perHeading = byFile.get(target.path);
      if (!perHeading) { perHeading = { file: target, headings: new Map() }; byFile.set(target.path, perHeading); }
      const list = perHeading.headings.get(heading) || [];
      if (!list.some((a) => a.toLowerCase() === display.toLowerCase())) list.push(display);
      perHeading.headings.set(heading, list);
    }

    let total = 0;
    for (const entry of byFile.values()) total += await this.writeHeadingAliases(entry.file, entry.headings);
    new Notice(total ? t('notice.aliasesAdded', { aliases: plural('alias', total) }) : t('notice.noNewAliases'));
  },
};
