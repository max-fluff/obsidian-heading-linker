'use strict';

const DEFAULT_SETTINGS = {
  glossaryMode: 'selected', // 'vault' | 'selected' — where headings are collected from
  glossarySources: '', // file OR folder paths (one per line) whose headings are the terms; used when mode = 'selected'
  excludeSources: '', // file OR folder paths never used as heading sources (even in vault mode)
  headingAliases: true, // read `%% alias: … %%` comments in glossary files as extra matching forms
  scopeMode: 'vault', // 'folders' | 'vault' — which notes get highlighted/linked
  scopeFolders: '',
  excludeFolders: '',
  matchMode: 'stemmer', // 'stemmer' | 'endingStrip' | 'exact'
  smartCase: true, // acronym-like headings (mostly uppercase) match case-sensitively
  minTermLength: 2, // headings shorter than this are not indexed — keeps single letters from matching everywhere
  headingLevels: [1, 2, 3, 4, 5, 6], // which heading levels (H1..H6) become terms
  enabledLanguages: null, // null until first-run defaults are picked
  languageOrder: [], // ids in priority order (first = highest); overrides module defaults
  excludeTerms: '', // heading texts to drop from the index entirely
  linkFirstOnly: false,
  // Who wins a word both linkers match. Read by the other side through the api, so both
  // reach the same verdict; a heading anchor is narrower than a whole note, hence higher.
  linkPrecedence: 20,
  linkSuggest: false, // offer [[link]] autocomplete while typing
  suggestMinChars: 3, // min typed length before autocomplete triggers
  suggestSkipAfter: '@#$^', // yield when the word follows one of these sigils (tags, math, block refs)
  highlightInReading: true,
  editingHighlight: 'live', // 'off' | 'live' | 'onSave'
  skipHeadings: true, // don't link inside a note's own headings
  statusBar: true,
  statusBarIncludeLinks: true,
  menuTurnInto: true,
  menuOpen: true,
  menuExclude: true,
  menuCollect: true, // "collect this alias" / "collect aliases from links" in the editor menu
  menuUnlink: true,
};

// Drop blank, "." and ".." segments so a stray "../" can't escape the vault.
const sanitizeFolder = (s) => (s || '')
  .split('/')
  .map((x) => x.trim())
  .filter((x) => x && x !== '.' && x !== '..')
  .join('/');

module.exports = { DEFAULT_SETTINGS, sanitizeFolder };
