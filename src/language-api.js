'use strict';

// The language-module contract. A language reduces inflected word forms to shared
// keys so a glossary term and its forms in the text resolve to the same key and get
// linked. Modules are bundled at build time (see builtin-languages.js);
// validateLanguage() checks them on load so a broken one surfaces in settings.

// Morphology modes the matcher passes to keys().
const MATCH_MODES = ['stemmer', 'endingStrip', 'exact'];

// Lowercase code, usually ISO 639 (e.g. "en", "ru", "pt-br").
const ID_PATTERN = /^[a-z][a-z0-9-]*$/;

// Returns null when lang satisfies the contract, otherwise the reason. Also smoke-
// tests match()/keys() so obvious runtime bugs are caught.
function validateLanguage(lang) {
  if (!lang || typeof lang !== 'object') return 'module does not export an object';
  if (typeof lang.id !== 'string' || !ID_PATTERN.test(lang.id)) return 'invalid "id" (expected a lowercase code like "en")';
  if (typeof lang.name !== 'string' || !lang.name.trim()) return 'missing "name"';
  if ('priority' in lang && typeof lang.priority !== 'number') return '"priority" must be a number';
  if (typeof lang.match !== 'function') return 'missing match(word) function';
  if (typeof lang.keys !== 'function') return 'missing keys(word, mode) function';
  if ('lemma' in lang && typeof lang.lemma !== 'function') return '"lemma" must be a function';

  const sample = lang.id;
  try {
    lang.match(sample);
  } catch (e) {
    return `match() threw: ${(e && e.message) || e}`;
  }
  for (const mode of MATCH_MODES) {
    let out;
    try {
      out = lang.keys(sample, mode);
    } catch (e) {
      return `keys() threw in mode "${mode}": ${(e && e.message) || e}`;
    }
    if (!Array.isArray(out) || !out.length || out.some((k) => typeof k !== 'string')) {
      return `keys() must return a non-empty array of strings (mode "${mode}")`;
    }
  }
  return null;
}

module.exports = { MATCH_MODES, ID_PATTERN, validateLanguage };
