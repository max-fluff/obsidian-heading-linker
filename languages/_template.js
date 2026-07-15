'use strict';

// Template for a the linker plugins language module. Copy to languages/<id>.js, fill
// it in, register it in src/builtin-languages.js, run `npm run build`, open a PR.
// languages/README.md has the full contract. Files starting with "_" aren't bundled.
//
// A language reduces inflected word forms to shared keys. Two words link when their
// key sets overlap, so keys() should map every form of a word to a key its base
// form also produces.

// Reduce a word to its root. Replace with your morphology; keep it deterministic
// and operate on the lowercased word.
function stem(word) {
  return word; // TODO
}

module.exports = {
  // Unique lowercase id, usually the ISO 639 code. Reusing a built-in id replaces it.
  id: 'xx',

  // Display name shown in settings.
  name: 'Example',

  // Default priority; higher wins when two languages claim the same word. Users can
  // reorder languages in settings to change this. Default 0.
  priority: 0,

  // Claim a word, usually by script. Return true if this language should handle it.
  match: (word) => /[a-z]/i.test(word),

  // Comparison keys for a single word. `mode` is one of:
  //   'exact'       — no morphology;   return [word.toLowerCase()]
  //   'endingStrip' — light trim of common endings
  //   'stemmer'     — full reduction to a root
  // Must lowercase the word itself and return a non-empty array of strings.
  keys(word, mode) {
    const w = word.toLowerCase();
    if (mode === 'exact') return [w];
    if (mode === 'endingStrip') return [/* light strip of */ w];
    return [stem(w)];
  },

  // Optional. Base ("dictionary") form used when collecting aliases from links.
  // Defaults to the lowercased word if omitted.
  lemma: (word) => stem(word.toLowerCase()),
};
