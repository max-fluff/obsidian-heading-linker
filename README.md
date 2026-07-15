# Heading Linker

An Obsidian plugin that finds words in your notes and turns them into links to
matching **headings** inside files you nominate as glossaries.

If you keep a note called `Guide.md` with a `## Projectile` heading, then every
time the word "projectile" (or "projectiles", or another inflected form) shows up
elsewhere, Heading Linker highlights it and can turn it into
`[[Guide#Projectile|projectiles]]` — a real link that opens the file at that
heading, with the note's own wording kept as the visible text.

**Best for:** vaults in inflected languages (Russian, Ukrainian, German, and
others), where matching has to follow word forms — and anyone who wants the option
of real `[[wikilinks]]`, not just a live overlay.

It's the file-based sibling of [Glossary Linker](https://github.com/max-fluff/obsidian-glossary-linker).
Glossary Linker treats each note as one term; Heading Linker treats each heading
inside a chosen file as a term. Same matching engine, different source.

## How it differs from virtual-link plugins

Plugins like Virtual Linker and FakeLink also auto-link text to notes and headings.
Two things set Heading Linker apart:

- **Word forms.** It matches inflected forms through a stemmer — "spawns",
  "spawning" and "spawn" all find a `Spawn` heading; Russian "рой", "роя", "рои"
  all find `Рой`. Six languages are built in. Plugins that match literal text miss
  these.
- **Real links, on demand.** The highlight is a live overlay that changes nothing on
  disk, but you can also *materialize* — turn matches into actual `[[wikilinks]]`,
  in bulk, with a preview — and unlink them again. Those links count in the graph
  and backlinks.

Like them, it supports per-heading **aliases** — but through an inline comment, since
a heading has no frontmatter of its own (see "Aliases" below).

## How it works

- **You pick the glossary files.** In settings, list the notes whose headings
  should become terms. Nothing else is scanned for headings.
- **Every heading is a term.** Its text is what you see; the link points at
  `File#Heading`.
- **Word forms are matched, not just exact text.** A stemmer reduces inflected
  forms so "spawns", "spawning" and "spawn" all find a `Spawn` heading. English,
  Russian, Ukrainian, German, Spanish and French are built in; you choose which
  are active and in what priority.
- **The same heading text in two files is two terms.** When a word could point at
  either, the highlight is marked ambiguous and asks which one you meant — when
  reading, when clicking, and in the "turn into links" preview.

## What it does

- Highlights matched words in Reading view and in the editor (live, on save, or
  off).
- **Turn into links** — for the current note, a selection, or every note in
  scope. Always shows a preview first; nothing is written until you apply.
- **Unlink** — the reverse, for the current note, a selection, or all notes.
- Native hover-preview and click on the links it makes — they are ordinary
  wikilinks, so Obsidian handles them.
- A right-click menu on a highlighted word (link it, open it, exclude it) and on
  a heading link (unlink it).
- A status-bar count of how many headings the current note mentions.

## Sources and scope

Two separate questions, two separate settings:

- **Sources** — where headings come from: the whole vault, or chosen files and
  folders. An ignore list drops files or folders you never want as a source.
- **Scope** — where links get made: the whole vault, or chosen folders, with an
  always-excluded list.

Both are editable from the settings tab, the file explorer's right-click menu, and
the command palette (for the active note).

## Exclusions

- **Heading levels** — choose which levels (H1–H6) become terms.
- **Excluded headings** — drop a specific heading from the index; its word forms
  stop linking too.
- **Per note** — add `heading-linker: false` to a note's frontmatter to turn off
  linking in that note, without touching folder settings.

## Aliases

A heading can carry extra wordings — abbreviations or synonyms the stemmer won't
reach — in an Obsidian comment right under it:

```markdown
## Central nervous system
%% alias: CNS, brain and spinal cord %%
```

Now "CNS" and "brain and spinal cord" also link to that heading. Comments are
invisible in Reading view, so the note stays clean. Use `alias:` or `aliases:`,
comma-separated. Reading them costs nothing on a normal rebuild (they're cached and
only re-read when the file changes); if you run whole-vault sourcing and don't use
aliases, the **Heading aliases** setting turns the file reads off entirely.

## Settings worth knowing

- **Match mode** — stemmer (best across forms), a lighter ending strip, or exact.
- **Smart case** — mostly-uppercase headings (like `IT` or `NASA`) match
  case-sensitively, so an acronym doesn't link every ordinary word.
- **Minimum heading length** — keeps very short headings from matching everywhere.
- **Link first occurrence only** — link just the first mention of each heading per
  note instead of all of them.
- **Skip headings** — don't link words that sit inside a note's own headings.

## Install (beta via BRAT)

1. Install the **BRAT** community plugin.
2. Add this repository (`max-fluff/obsidian-heading-linker`) as a beta plugin.
3. Enable **Heading Linker** in Community plugins.

## Build from source

```
npm install
npm run build
```

The bundle (`main.js`) is built from `src/` by esbuild. The shared helpers in
`src/shared/` are a git submodule — clone with `--recursive` or run
`git submodule update --init`.

## Not yet

- **Per-word case-sensitivity modes.** Matching is case-insensitive, except that
  smart case makes acronym headings case-sensitive automatically.

Headings that contain `|`, `#`, `[`, `]` or `^` are skipped: those characters can't
sit inside a `[[File#Heading]]` target.

## License

MIT. Bundled stemmers keep their own licenses — see
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
