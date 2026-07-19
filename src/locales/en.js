'use strict';

// English — the source of truth. Every other locale falls back to these keys.

module.exports = {
  // Commands
  'cmd.linkThisNote': 'Link headings: this note',
  'cmd.linkSelection': 'Link headings: selection',
  'cmd.linkAllNotes': 'Link headings: all notes',
  'cmd.unlinkThisNote': 'Unlink headings: this note',
  'cmd.unlinkSelection': 'Unlink headings: selection',
  'cmd.unlinkAllNotes': 'Unlink headings: all notes',
  'cmd.collectThisNote': 'Collect aliases from links: this note',
  'cmd.rebuildIndex': 'Rebuild heading index',
  'cmd.addSource': 'Add this note to heading sources',
  'cmd.removeSource': 'Remove this note from heading sources',
  'cmd.ignoreSource': 'Ignore this note as a heading source',
  'cmd.unignoreSource': 'Stop ignoring this note as a heading source',
  'cmd.excludeNote': 'Never link in this note',
  'cmd.unexcludeNote': 'Stop always-excluding this note',
  'cmd.scopeNote': 'Include this note in scope',
  'cmd.unscopeNote': 'Remove this note from scope',

  'statusBar.aria': '{n} heading(s) on this page — click to link them',

  // Native context-menu items (brand prefix "Heading:" kept verbatim)
  // No plugin name on these: they act on the link under the cursor, and a link belongs to
  // exactly one linker, so there is never a second one of them to tell apart. The name goes
  // on configuration items instead, where the reader is picking which plugin to change.
  'menu.unlinkThisLink': 'Unlink this link',
  'menu.collectThisAlias': 'Collect this alias',
  // Says whose aliases: the glossary linker offers its own version on the same note menu,
  // and the two write to different places.
  'menu.collectFromNote': 'Collect heading aliases from links',
  'menu.addToSources': 'Heading: add {noun} to sources',
  'menu.removeFromSources': 'Heading: remove {noun} from sources',
  'menu.ignoreSource': 'Heading: ignore {noun} as a source',
  'menu.unignoreSource': 'Heading: stop ignoring as a source',
  'menu.removeFromAlwaysExcluded': 'Heading: remove from always-excluded',
  'menu.addToAlwaysExcluded': 'Heading: add {noun} to always-excluded',
  'menu.removeFromScope': 'Heading: remove {noun} from scope',
  'menu.includeInScope': 'Heading: include {noun} in scope',

  // Linking a word from Obsidian's own editor menu. The three ways to link differ only in
  // how far they reach, so they share one entry with the choice inside it. Each reads on its
  // own — a submenu item is read without its parent in view, so "Here" alone would not say
  // what it does.
  'menu.linkScopeThisNote': 'Link {scope} "{display}" in this note',
  'menu.linkScopeAllNotes': 'Link {scope} "{display}" in all notes',
  'menu.openTitle': 'Open which heading?',
  'menu.openNewTabTitle': 'Open which heading in a new tab?',

  // Exclusion menu
  'exclude.terms': 'excluded headings',
  'exclude.add': 'Add "{value}" to {noun}',
  'exclude.remove': 'Remove "{value}" from {noun}',

  // Modals
  'modal.materialize.title': 'Turn words into heading links',
  'modal.materialize.ambiguous': '{n} word(s) match more than one heading — pick one or skip:',
  'modal.unlink.title': 'Unlink heading links',

  // Notices
  'notice.noMatches': 'No headings found in the text.',
  'notice.noHeadingLinks': 'No heading links to remove.',
  'notice.noteChanged': 'The note changed — nothing written.',
  'notice.noOccurrences': 'No occurrences found.',
  'notice.occurrenceNotFound': 'That occurrence was not found.',
  'notice.linkCreatedSingle': 'Link created.',
  'notice.linksCreated': 'Created {links}.',
  'notice.linksRemoved': 'Removed {links}.',
  'notice.unlinked': 'Link removed.',
  'notice.scanning': 'Scanning notes…',
  'notice.scanningProgress': 'Scanning {current}/{total}…',
  'notice.scopeWritten': 'Wrote {links} across {files}.',
  'notice.indexRebuilt': 'Heading index rebuilt.',
  'notice.aliasAdded': 'Heading Linker: “{alias}” added as an alias of “{term}”',
  'notice.aliasExists': 'Heading Linker: “{term}” already matches “{alias}”',
  'notice.aliasesAdded': 'Heading Linker: {aliases} added',
  'notice.noNewAliases': 'Heading Linker: no new aliases found',
  // The index can be a moment behind the file: the heading was there when the menu opened
  // and gone by the time the write ran.
  'notice.headingGone': 'Heading Linker: “{term}” is no longer in that note',
  'notice.alreadyExcluded': '"{value}" is already excluded.',
  'notice.addedToExcluded': 'Added "{value}" to {where}.',
  'notice.wasNotExcluded': '"{value}" was not excluded.',
  'notice.removedFromExcluded': 'Removed "{value}" from {where}.',
  'notice.pathAddedExcluded': 'Excluded "{entry}".',
  'notice.pathRemovedExcluded': 'No longer excluding "{entry}".',
  'notice.pathAddedScope': 'Added "{entry}" to scope.',
  'notice.pathRemovedScope': 'Removed "{entry}" from scope.',
  'notice.sourceAdded': 'Added "{entry}" to heading sources.',
  'notice.sourceRemoved': 'Removed "{entry}" from heading sources.',
  'notice.ignoreAdded': 'Ignoring "{entry}" as a heading source.',
  'notice.ignoreRemoved': 'No longer ignoring "{entry}".',

  // Autocomplete
  // The line under a name in the autocomplete popup. Kept to a fragment, not a sentence:
  // it sits under the heading it describes, and the glossary linker's candidates share the
  // same popup, so the two have to read as one list.
  'suggest.inflection': 'word form · {file}',
  'suggest.alias': 'as “{form}” · {file}',

  // Settings — sources
  'set.heading.sources': 'Heading sources',
  'set.glossaryMode.name': 'Collect headings from',
  'set.glossaryMode.desc': 'Which notes contribute their headings as linkable terms.',
  'set.glossaryMode.selected': 'Chosen files and folders',
  'set.glossaryMode.vault': 'The whole vault',
  'set.glossarySources.name': 'Files and folders',
  'set.glossarySources.desc': 'Each note here, and each note under a chosen folder, contributes its headings.',
  'set.excludeSources.name': 'Ignored sources',
  'set.excludeSources.desc': 'Files and folders never used as heading sources, even in whole-vault mode.',
  'set.sourceList.add': 'Add a file or folder…',
  'set.sourceList.remove': 'Remove',
  'set.sourceList.addAria': 'Add source',
  'set.noSourcesStatus': 'No sources chosen yet.',
  'set.headingAliases.name': 'Heading aliases',
  'set.headingAliases.desc': 'Read `%% alias: a, b %%` comments under a heading as extra wordings that link to it. Turn off to skip reading file bodies (faster in very large vaults).',

  // Settings — scope
  'set.scopeMode.desc': 'Which notes get their words highlighted and linked.',
  'set.scopeFolders.name': 'Paths to include',
  'set.scopeFolders.desc': 'A file or a folder. Only these are linked.',
  'set.excludeFolders.name': 'Always excluded',
  'set.excludeFolders.desc': 'A file or a folder. Never linked, whatever the mode above says.',
  'set.folderList.remove': 'Remove',
  'set.termsIndexed': '{terms} indexed.',

  // Settings — matching
  'set.matchMode.desc': 'How word forms are reduced before comparing.',
  'set.minTermLength.name': 'Minimum heading length',
  'set.minTermLength.desc': 'Headings shorter than this are not indexed.',
  'set.headingLevels.name': 'Heading levels',
  'set.headingLevels.desc': 'Which heading levels (H1–H6) become linkable terms.',
  'set.languages.invalidSuffix': ', {n} invalid',
  'set.linkFirstOnly.desc': 'Link only the first mention of each heading per note.',
  'set.excludeTerms.name': 'Excluded headings',
  'set.excludeTerms.desc': 'Heading texts to drop from the index entirely, one per line. Their word forms stop linking too.',

  // Settings — highlighting
  'set.highlightInReading.desc': 'Underline matched words in rendered notes.',
  'set.editingHighlight.desc': 'Underline matched words while editing.',
  'set.editingHighlight.off': 'Off',
  'set.skipHeadings.desc': "Don't link words inside a note's own headings.",
  'set.statusBar.desc': 'Show how many headings the current note mentions.',
  'set.statusBarIncludeLinks.desc': 'Include headings already linked in the status-bar count.',

  // Settings — autocomplete
  'set.linkSuggest.desc': 'Offer to complete a word into a heading link as you type.',
  'set.suggestSkipAfter.desc': 'Don\'t suggest when the word follows one of these characters, so other autocompletes keep their slot. Empty disables it.',
  // Settings — context menu
  'set.menuTurnInto.name': 'Link actions',
  'set.menuTurnInto.desc': 'Offer "link to this heading" items on a highlighted word.',
  'set.menuOpen.name': 'Open actions',
  'set.menuOpen.desc': 'Offer "open heading" items on a highlighted word.',
  'set.menuExclude.name': 'Exclude actions',
  'set.menuExclude.desc': 'Offer "exclude word/heading" items.',
  'set.menuUnlink.name': 'Unlink action',
  'set.menuUnlink.desc': 'Offer "unlink this link" on a heading link.',
  'set.menuCollect.name': '"Collect aliases" items',
  'set.menuCollect.desc': 'Offer to collect a link’s own wording as an alias of the heading it points at — on the link itself, and for a whole note from its right-click menu.',

  // Settings — maintenance
  'set.rebuild.name': 'Rebuild index',
  'set.rebuild.desc': 'Re-scan the glossary files for headings.',

  // Plurals
  'plural.term': { one: '{n} heading', other: '{n} headings' },
  'plural.file': { one: '{n} file', other: '{n} files' },
  'plural.link': { one: '{n} link', other: '{n} links' },
};
