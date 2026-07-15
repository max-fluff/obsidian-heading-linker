'use strict';

// Russian morphology for the linker plugins.
//
// stem() implements the Snowball Russian stemming algorithm (Porter framework).
// Snowball is (c) 2001-2006 Dr Martin Porter and Richard Boulton, BSD license
// (free for commercial and non-commercial use):
//   https://snowballstem.org/license.html
//   https://snowballstem.org/algorithms/russian/stemmer.html
// strip()/lemma() are this plugin's own light helpers.

const RVRE = /^(.*?[аеиоуыэюя])(.*)$/;
const PERFECTIVEGROUND = /((ив|ивши|ившись|ыв|ывши|ывшись)|((?<=[ая])(в|вши|вшись)))$/;
const REFLEXIVE = /(с[яь])$/;
const ADJECTIVE = /(ее|ие|ые|ое|ими|ыми|ей|ий|ый|ой|ем|им|ым|ом|его|ого|ему|ому|их|ых|ую|юю|ая|яя|ою|ею)$/;
const PARTICIPLE = /((ивш|ывш|ующ)|((?<=[ая])(ем|нн|вш|ющ|щ)))$/;
const VERB = /((ила|ыла|ена|ейте|уйте|ите|или|ыли|ей|уй|ил|ыл|им|ым|ен|ило|ыло|ено|ят|ует|уют|ит|ыт|ены|ить|ыть|ишь|ую|ю)|((?<=[ая])(ла|на|ете|йте|ли|й|л|ем|н|ло|но|ет|ют|ны|ть|ешь|нно)))$/;
const NOUN = /(а|ев|ов|ие|ье|е|иями|ями|ами|еи|ии|и|ией|ей|ой|ий|й|иям|ям|ием|ем|ам|ом|о|у|ах|иях|ях|ы|ь|ию|ью|ю|ия|ья|я)$/;
const DERIVATIONAL = /[^аеиоуыэюя][аеиоуыэюя]+[^аеиоуыэюя]+[аеиоуыэюя].*(?:[^аеиоуыэюя]+[аеиоуыэюя]+[^аеиоуыэюя]+)?(ость?)$/;
const DER = /ость?$/;
const SUPERLATIVE = /(ейше|ейш)$/;
const I = /и$/;
const P = /ь$/;
const NN = /нн$/;

const ENDINGS = [
  'иями', 'ями', 'ами', 'ах', 'ях', 'ов', 'ев', 'ою', 'ею', 'ом', 'ем',
  'ам', 'ям', 'ого', 'его', 'ому', 'ему', 'ыми', 'ими', 'ой', 'ей', 'ий',
  'ый', 'ую', 'юю', 'а', 'я', 'у', 'ю', 'о', 'е', 'и', 'ы', 'ь',
].sort((a, b) => b.length - a.length);

const VOWELS = 'аеёиоуыэюя';

function stem(word) {
  word = word.toLowerCase().replace(/ё/g, 'е');
  const m = RVRE.exec(word);
  if (!m) return word;
  const pre = m[1];
  let rv = m[2];

  let temp = rv.replace(PERFECTIVEGROUND, '');
  if (temp === rv) {
    rv = rv.replace(REFLEXIVE, '');
    temp = rv.replace(ADJECTIVE, '');
    if (temp !== rv) {
      rv = temp.replace(PARTICIPLE, '');
    } else {
      temp = rv.replace(VERB, '');
      rv = temp === rv ? rv.replace(NOUN, '') : temp;
    }
  } else {
    rv = temp;
  }

  rv = rv.replace(I, '');
  if (DERIVATIONAL.test(rv)) rv = rv.replace(DER, '');

  temp = rv.replace(P, '');
  if (temp === rv) {
    rv = rv.replace(SUPERLATIVE, '');
    rv = rv.replace(NN, 'н');
  } else {
    rv = temp;
  }
  return pre + rv;
}

function strip(word) {
  word = word.toLowerCase().replace(/ё/g, 'е');
  for (const e of ENDINGS) {
    if (word.length - e.length >= 3 && word.endsWith(e)) return word.slice(0, -e.length);
  }
  return word;
}

// Comparison keys for stemmer mode: union of stem and strip, dropping an
// over-short stem so a heavily truncated root does not catch unrelated words.
function stemKeys(word) {
  const es = strip(word);
  const st = stem(word);
  if (st !== es && es.length - st.length <= 1) return [es, st];
  return [es];
}

function softStemNoun(word) {
  const w = word.toLowerCase().replace(/ё/g, 'е');
  if (w.length > 3 && w.endsWith('ем')) {
    const before = w[w.length - 3];
    if (VOWELS.includes(before)) return w.slice(0, -2) + 'й';
  }
  return null;
}

function lemma(word) {
  return softStemNoun(word) || strip(word);
}

module.exports = {
  id: 'ru',
  name: 'Russian',
  priority: 0,
  match: (word) => /[Ѐ-ӿ]/.test(word),
  keys(word, mode) {
    const w = word.toLowerCase();
    if (mode === 'exact') return [w];
    const keyer = (x) => (mode === 'endingStrip' ? [strip(x)] : stemKeys(x));
    const ks = keyer(w);
    const soft = softStemNoun(w);
    if (soft) for (const sk of keyer(soft)) if (!ks.includes(sk)) ks.push(sk);
    return ks;
  },
  lemma,
};
