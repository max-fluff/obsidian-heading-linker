'use strict';

// Ukrainian morphology for the linker plugins. A light suffix stemmer plus the о/і
// and е/і vowel alternation in a closed final syllable (кіт → кота, ніч → ночі,
// стіл → стола). This is the plugin's own helper, not a port of a published
// algorithm: lighter than full Snowball, enough to link everyday case forms.

const ENDINGS = [
  'ами', 'ями', 'ові', 'еві', 'ого', 'ому', 'ему', 'ими', 'их',
  'ах', 'ях', 'ів', 'ою', 'ею', 'ом', 'ем', 'ей', 'ий', 'ій',
  'а', 'я', 'у', 'ю', 'е', 'о', 'и', 'і', 'ї', 'ь',
].sort((a, b) => b.length - a.length);

const CLOSED_SYLLABLE = /^(.*)і([^аеєиіїоуюя]+)$/;

function strip(word) {
  const w = word.toLowerCase();
  for (const e of ENDINGS) {
    if (w.length - e.length >= 3 && w.endsWith(e)) return w.slice(0, -e.length);
  }
  return w;
}

// і in a closed final syllable usually opens to о or е once an ending is added, so
// offer both forms as keys, letting the base meet its inflected forms.
function alternations(stem) {
  const m = CLOSED_SYLLABLE.exec(stem);
  return m ? [m[1] + 'о' + m[2], m[1] + 'е' + m[2]] : [];
}

module.exports = {
  id: 'uk',
  name: 'Ukrainian',
  priority: 0,
  match: (word) => /[а-яіїєґ]/i.test(word),
  keys(word, mode) {
    const w = word.toLowerCase();
    if (mode === 'exact') return [w];
    if (mode === 'endingStrip') return [strip(w)];
    const stem = strip(w);
    return [...new Set([stem, ...alternations(stem)])];
  },
  lemma: (word) => strip(word),
};
