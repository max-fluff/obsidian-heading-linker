/* Heading Linker — bundled from src/ by esbuild. Do not edit directly; edit src/ and run "npm run build". */
"use strict";
var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// src/constants.js
var require_constants = __commonJS({
  "src/constants.js"(exports2, module2) {
    "use strict";
    var DEFAULT_SETTINGS2 = {
      glossaryMode: "selected",
      // 'vault' | 'selected' — where headings are collected from
      glossarySources: "",
      // file OR folder paths (one per line) whose headings are the terms; used when mode = 'selected'
      excludeSources: "",
      // file OR folder paths never used as heading sources (even in vault mode)
      headingAliases: true,
      // read `%% alias: … %%` comments in glossary files as extra matching forms
      scopeMode: "vault",
      // 'folders' | 'vault' — which notes get highlighted/linked
      scopeFolders: "",
      excludeFolders: "",
      matchMode: "stemmer",
      // 'stemmer' | 'endingStrip' | 'exact'
      smartCase: true,
      // acronym-like headings (mostly uppercase) match case-sensitively
      minTermLength: 2,
      // headings shorter than this are not indexed — keeps single letters from matching everywhere
      headingLevels: [1, 2, 3, 4, 5, 6],
      // which heading levels (H1..H6) become terms
      enabledLanguages: null,
      // null until first-run defaults are picked
      languageOrder: [],
      // ids in priority order (first = highest); overrides module defaults
      excludeTerms: "",
      // heading texts to drop from the index entirely
      linkFirstOnly: false,
      linkSuggest: false,
      // offer [[link]] autocomplete while typing
      suggestMinChars: 3,
      // min typed length before autocomplete triggers
      suggestSkipAfter: "@#$^",
      // yield when the word follows one of these sigils (tags, math, block refs)
      highlightInReading: true,
      editingHighlight: "live",
      // 'off' | 'live' | 'onSave'
      skipHeadings: true,
      // don't link inside a note's own headings
      statusBar: true,
      statusBarIncludeLinks: true,
      menuTurnInto: true,
      menuOpen: true,
      menuExclude: true,
      menuUnlink: true
    };
    var sanitizeFolder2 = (s) => (s || "").split("/").map((x) => x.trim()).filter((x) => x && x !== "." && x !== "..").join("/");
    module2.exports = { DEFAULT_SETTINGS: DEFAULT_SETTINGS2, sanitizeFolder: sanitizeFolder2 };
  }
});

// src/shared/markdown.js
var require_markdown = __commonJS({
  "src/shared/markdown.js"(exports2, module2) {
    "use strict";
    var splitLines2 = (s) => (s || "").split("\n").map((x) => x.trim()).filter(Boolean);
    var LINK_PATTERN = "\\[([^\\]]*)\\]\\(([^)]+)\\)";
    var linkRegex = () => new RegExp(LINK_PATTERN, "g");
    var isFenceLine = (line) => {
      const s = line.trimStart();
      return s.startsWith("```") || s.startsWith("~~~");
    };
    var INLINE_CODE = /`[^`\n]+`/g;
    function inMatch(line, col, re) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(line)) !== null) {
        if (col > m.index && col < m.index + m[0].length)
          return true;
      }
      return false;
    }
    var inInlineCode = (line, col) => inMatch(line, col, INLINE_CODE);
    function locate(lines, pos) {
      let start = 0, i = 0;
      for (; i < lines.length; i++) {
        if (pos <= start + lines[i].length)
          break;
        start += lines[i].length + 1;
      }
      return { i, col: pos - start, line: lines[i] || "" };
    }
    function inCode(text, pos) {
      if (/^---\r?\n/.test(text)) {
        const end = text.indexOf("\n---", 3);
        if (end !== -1 && pos <= end + 4)
          return true;
      }
      const lines = text.split("\n");
      const { i, col, line } = locate(lines, pos);
      let fenced = false;
      for (let k = 0; k < i; k++)
        if (isFenceLine(lines[k]))
          fenced = !fenced;
      if (fenced)
        return true;
      return inMatch(line, col, INLINE_CODE);
    }
    function inLink(text, pos) {
      const { col, line } = locate(text.split("\n"), pos);
      return inMatch(line, col, linkRegex());
    }
    function isProtected(text, pos) {
      return inCode(text, pos) || inLink(text, pos);
    }
    function inTableCell2(text, pos) {
      const lines = text.split("\n");
      const lineIdx = (text.slice(0, pos).match(/\n/g) || []).length;
      if (!lines[lineIdx] || !lines[lineIdx].includes("|"))
        return false;
      const isDelimiter = (l) => l.includes("|") && l.includes("-") && /^[\s|:-]+$/.test(l);
      let top = lineIdx, bot = lineIdx;
      while (top > 0 && lines[top - 1].trim() !== "")
        top--;
      while (bot < lines.length - 1 && lines[bot + 1].trim() !== "")
        bot++;
      for (let i = top; i <= bot; i++)
        if (isDelimiter(lines[i]))
          return true;
      return false;
    }
    module2.exports = { splitLines: splitLines2, linkRegex, isFenceLine, inInlineCode, locate, inCode, inLink, isProtected, inTableCell: inTableCell2 };
  }
});

// languages/ru.js
var require_ru = __commonJS({
  "languages/ru.js"(exports2, module2) {
    "use strict";
    var RVRE = /^(.*?[аеиоуыэюя])(.*)$/;
    var PERFECTIVEGROUND = /((ив|ивши|ившись|ыв|ывши|ывшись)|((?<=[ая])(в|вши|вшись)))$/;
    var REFLEXIVE = /(с[яь])$/;
    var ADJECTIVE = /(ее|ие|ые|ое|ими|ыми|ей|ий|ый|ой|ем|им|ым|ом|его|ого|ему|ому|их|ых|ую|юю|ая|яя|ою|ею)$/;
    var PARTICIPLE = /((ивш|ывш|ующ)|((?<=[ая])(ем|нн|вш|ющ|щ)))$/;
    var VERB = /((ила|ыла|ена|ейте|уйте|ите|или|ыли|ей|уй|ил|ыл|им|ым|ен|ило|ыло|ено|ят|ует|уют|ит|ыт|ены|ить|ыть|ишь|ую|ю)|((?<=[ая])(ла|на|ете|йте|ли|й|л|ем|н|ло|но|ет|ют|ны|ть|ешь|нно)))$/;
    var NOUN = /(а|ев|ов|ие|ье|е|иями|ями|ами|еи|ии|и|ией|ей|ой|ий|й|иям|ям|ием|ем|ам|ом|о|у|ах|иях|ях|ы|ь|ию|ью|ю|ия|ья|я)$/;
    var DERIVATIONAL = /[^аеиоуыэюя][аеиоуыэюя]+[^аеиоуыэюя]+[аеиоуыэюя].*(?:[^аеиоуыэюя]+[аеиоуыэюя]+[^аеиоуыэюя]+)?(ость?)$/;
    var DER = /ость?$/;
    var SUPERLATIVE = /(ейше|ейш)$/;
    var I = /и$/;
    var P = /ь$/;
    var NN = /нн$/;
    var ENDINGS = [
      "\u0438\u044F\u043C\u0438",
      "\u044F\u043C\u0438",
      "\u0430\u043C\u0438",
      "\u0430\u0445",
      "\u044F\u0445",
      "\u043E\u0432",
      "\u0435\u0432",
      "\u043E\u044E",
      "\u0435\u044E",
      "\u043E\u043C",
      "\u0435\u043C",
      "\u0430\u043C",
      "\u044F\u043C",
      "\u043E\u0433\u043E",
      "\u0435\u0433\u043E",
      "\u043E\u043C\u0443",
      "\u0435\u043C\u0443",
      "\u044B\u043C\u0438",
      "\u0438\u043C\u0438",
      "\u043E\u0439",
      "\u0435\u0439",
      "\u0438\u0439",
      "\u044B\u0439",
      "\u0443\u044E",
      "\u044E\u044E",
      "\u0430",
      "\u044F",
      "\u0443",
      "\u044E",
      "\u043E",
      "\u0435",
      "\u0438",
      "\u044B",
      "\u044C"
    ].sort((a, b) => b.length - a.length);
    var VOWELS = "\u0430\u0435\u0451\u0438\u043E\u0443\u044B\u044D\u044E\u044F";
    function stem(word) {
      word = word.toLowerCase().replace(/ё/g, "\u0435");
      const m = RVRE.exec(word);
      if (!m)
        return word;
      const pre = m[1];
      let rv = m[2];
      let temp = rv.replace(PERFECTIVEGROUND, "");
      if (temp === rv) {
        rv = rv.replace(REFLEXIVE, "");
        temp = rv.replace(ADJECTIVE, "");
        if (temp !== rv) {
          rv = temp.replace(PARTICIPLE, "");
        } else {
          temp = rv.replace(VERB, "");
          rv = temp === rv ? rv.replace(NOUN, "") : temp;
        }
      } else {
        rv = temp;
      }
      rv = rv.replace(I, "");
      if (DERIVATIONAL.test(rv))
        rv = rv.replace(DER, "");
      temp = rv.replace(P, "");
      if (temp === rv) {
        rv = rv.replace(SUPERLATIVE, "");
        rv = rv.replace(NN, "\u043D");
      } else {
        rv = temp;
      }
      return pre + rv;
    }
    function strip(word) {
      word = word.toLowerCase().replace(/ё/g, "\u0435");
      for (const e of ENDINGS) {
        if (word.length - e.length >= 3 && word.endsWith(e))
          return word.slice(0, -e.length);
      }
      return word;
    }
    function stemKeys(word) {
      const es = strip(word);
      const st = stem(word);
      if (st !== es && es.length - st.length <= 1)
        return [es, st];
      return [es];
    }
    function softStemNoun(word) {
      const w = word.toLowerCase().replace(/ё/g, "\u0435");
      if (w.length > 3 && w.endsWith("\u0435\u043C")) {
        const before = w[w.length - 3];
        if (VOWELS.includes(before))
          return w.slice(0, -2) + "\u0439";
      }
      return null;
    }
    function lemma(word) {
      return softStemNoun(word) || strip(word);
    }
    module2.exports = {
      id: "ru",
      name: "Russian",
      priority: 0,
      match: (word) => /[Ѐ-ӿ]/.test(word),
      keys(word, mode) {
        const w = word.toLowerCase();
        if (mode === "exact")
          return [w];
        const keyer = (x) => mode === "endingStrip" ? [strip(x)] : stemKeys(x);
        const ks = keyer(w);
        const soft = softStemNoun(w);
        if (soft) {
          for (const sk of keyer(soft))
            if (!ks.includes(sk))
              ks.push(sk);
        }
        return ks;
      },
      lemma
    };
  }
});

// languages/uk.js
var require_uk = __commonJS({
  "languages/uk.js"(exports2, module2) {
    "use strict";
    var ENDINGS = [
      "\u0430\u043C\u0438",
      "\u044F\u043C\u0438",
      "\u043E\u0432\u0456",
      "\u0435\u0432\u0456",
      "\u043E\u0433\u043E",
      "\u043E\u043C\u0443",
      "\u0435\u043C\u0443",
      "\u0438\u043C\u0438",
      "\u0438\u0445",
      "\u0430\u0445",
      "\u044F\u0445",
      "\u0456\u0432",
      "\u043E\u044E",
      "\u0435\u044E",
      "\u043E\u043C",
      "\u0435\u043C",
      "\u0435\u0439",
      "\u0438\u0439",
      "\u0456\u0439",
      "\u0430",
      "\u044F",
      "\u0443",
      "\u044E",
      "\u0435",
      "\u043E",
      "\u0438",
      "\u0456",
      "\u0457",
      "\u044C"
    ].sort((a, b) => b.length - a.length);
    var CLOSED_SYLLABLE = /^(.*)і([^аеєиіїоуюя]+)$/;
    function strip(word) {
      const w = word.toLowerCase();
      for (const e of ENDINGS) {
        if (w.length - e.length >= 3 && w.endsWith(e))
          return w.slice(0, -e.length);
      }
      return w;
    }
    function alternations(stem) {
      const m = CLOSED_SYLLABLE.exec(stem);
      return m ? [m[1] + "\u043E" + m[2], m[1] + "\u0435" + m[2]] : [];
    }
    module2.exports = {
      id: "uk",
      name: "Ukrainian",
      priority: 0,
      match: (word) => /[а-яіїєґ]/i.test(word),
      keys(word, mode) {
        const w = word.toLowerCase();
        if (mode === "exact")
          return [w];
        if (mode === "endingStrip")
          return [strip(w)];
        const stem = strip(w);
        return [.../* @__PURE__ */ new Set([stem, ...alternations(stem)])];
      },
      lemma: (word) => strip(word)
    };
  }
});

// languages/en.js
var require_en = __commonJS({
  "languages/en.js"(exports2, module2) {
    "use strict";
    var STEP2 = { ational: "ate", tional: "tion", enci: "ence", anci: "ance", izer: "ize", bli: "ble", alli: "al", entli: "ent", eli: "e", ousli: "ous", ization: "ize", ation: "ate", ator: "ate", alism: "al", iveness: "ive", fulness: "ful", ousness: "ous", aliti: "al", iviti: "ive", biliti: "ble", logi: "log" };
    var STEP3 = { icate: "ic", ative: "", alize: "al", iciti: "ic", ical: "ic", ful: "", ness: "" };
    var C = "[^aeiou]";
    var V = "[aeiouy]";
    var CC = C + "[^aeiouy]*";
    var VV = V + "[aeiou]*";
    var MGR0 = new RegExp("^(" + CC + ")?" + VV + CC);
    var MEQ1 = new RegExp("^(" + CC + ")?" + VV + CC + "(" + VV + ")?$");
    var MGR1 = new RegExp("^(" + CC + ")?" + VV + CC + VV + CC);
    var S_V = new RegExp("^(" + CC + ")?" + V);
    function stem(word) {
      let w = word.toLowerCase();
      if (w.length < 3)
        return w;
      let st, suffix, fp, re, re2, re3, re4;
      const firstch = w.substr(0, 1);
      if (firstch === "y")
        w = firstch.toUpperCase() + w.substr(1);
      re = /^(.+?)(ss|i)es$/;
      re2 = /^(.+?)([^s])s$/;
      if (re.test(w))
        w = w.replace(re, "$1$2");
      else if (re2.test(w))
        w = w.replace(re2, "$1$2");
      re = /^(.+?)eed$/;
      re2 = /^(.+?)(ed|ing)$/;
      if (re.test(w)) {
        fp = re.exec(w);
        if (MGR0.test(fp[1]))
          w = w.replace(/.$/, "");
      } else if (re2.test(w)) {
        fp = re2.exec(w);
        st = fp[1];
        if (S_V.test(st)) {
          w = st;
          re2 = /(at|bl|iz)$/;
          re3 = /([^aeiouylsz])\1$/;
          re4 = new RegExp("^" + CC + V + "[^aeiouwxy]$");
          if (re2.test(w))
            w = w + "e";
          else if (re3.test(w))
            w = w.replace(/.$/, "");
          else if (re4.test(w))
            w = w + "e";
        }
      }
      re = /^(.+?)y$/;
      if (re.test(w)) {
        fp = re.exec(w);
        st = fp[1];
        if (S_V.test(st))
          w = st + "i";
      }
      re = /^(.+?)(ational|tional|enci|anci|izer|bli|alli|entli|eli|ousli|ization|ation|ator|alism|iveness|fulness|ousness|aliti|iviti|biliti|logi)$/;
      if (re.test(w)) {
        fp = re.exec(w);
        st = fp[1];
        suffix = fp[2];
        if (MGR0.test(st))
          w = st + STEP2[suffix];
      }
      re = /^(.+?)(icate|ative|alize|iciti|ical|ful|ness)$/;
      if (re.test(w)) {
        fp = re.exec(w);
        st = fp[1];
        suffix = fp[2];
        if (MGR0.test(st))
          w = st + STEP3[suffix];
      }
      re = /^(.+?)(al|ance|ence|er|ic|able|ible|ant|ement|ment|ent|ou|ism|ate|iti|ous|ive|ize)$/;
      re2 = /^(.+?)(s|t)(ion)$/;
      if (re.test(w)) {
        fp = re.exec(w);
        st = fp[1];
        if (MGR1.test(st))
          w = st;
      } else if (re2.test(w)) {
        fp = re2.exec(w);
        st = fp[1] + fp[2];
        if (MGR1.test(st))
          w = st;
      }
      re = /^(.+?)e$/;
      if (re.test(w)) {
        fp = re.exec(w);
        st = fp[1];
        re3 = new RegExp("^" + CC + V + "[^aeiouwxy]$");
        if (MGR1.test(st) || MEQ1.test(st) && !re3.test(st))
          w = st;
      }
      if (/ll$/.test(w) && MGR1.test(w))
        w = w.replace(/.$/, "");
      if (firstch === "y")
        w = firstch.toLowerCase() + w.substr(1);
      return w;
    }
    function strip(word) {
      const w = word.toLowerCase();
      if (w.length > 4 && w.endsWith("ies"))
        return w.slice(0, -3) + "y";
      if (w.length > 3 && w.endsWith("es"))
        return w.slice(0, -2);
      if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss"))
        return w.slice(0, -1);
      return w;
    }
    function stemKeys(word) {
      return [stem(word)];
    }
    function lemma(word) {
      return stem(word.toLowerCase());
    }
    module2.exports = {
      id: "en",
      name: "English",
      priority: 0,
      match: (word) => /[A-Za-z]/.test(word),
      keys(word, mode) {
        const w = word.toLowerCase();
        if (mode === "exact")
          return [w];
        if (mode === "endingStrip")
          return [strip(w)];
        return stemKeys(w);
      },
      lemma
    };
  }
});

// languages/es.js
var require_es = __commonJS({
  "languages/es.js"(exports2, module2) {
    "use strict";
    function fold(word) {
      return word.toLowerCase().replace(/[àáâä]/g, "a").replace(/[òóôö]/g, "o").replace(/[èéêë]/g, "e").replace(/[ùúûü]/g, "u").replace(/[ìíîï]/g, "i");
    }
    function stem(word) {
      const s = fold(word);
      const len = s.length;
      if (len < 5)
        return s;
      const last = s[len - 1];
      if (last === "o" || last === "a" || last === "e")
        return s.slice(0, len - 1);
      if (last === "s") {
        if (s[len - 2] === "e" && s[len - 3] === "s" && s[len - 4] === "e")
          return s.slice(0, len - 2);
        if (s[len - 2] === "e" && s[len - 3] === "c")
          return s.slice(0, len - 3) + "z";
        if (s[len - 2] === "o" || s[len - 2] === "a" || s[len - 2] === "e")
          return s.slice(0, len - 2);
      }
      return s;
    }
    function strip(word) {
      const s = fold(word);
      if (s.length > 4 && s.endsWith("ces"))
        return s.slice(0, -3) + "z";
      if (s.length > 3 && s.endsWith("es"))
        return s.slice(0, -2);
      if (s.length > 3 && s.endsWith("s"))
        return s.slice(0, -1);
      return s;
    }
    function stemKeys(word) {
      const a = stem(word);
      const b = strip(word);
      return a === b ? [a] : [a, b];
    }
    function lemma(word) {
      return strip(word);
    }
    module2.exports = {
      id: "es",
      name: "Spanish",
      priority: 0,
      match: (word) => /[a-záéíóúüñ]/i.test(word),
      keys(word, mode) {
        const w = word.toLowerCase();
        if (mode === "exact")
          return [w];
        if (mode === "endingStrip")
          return [strip(w)];
        return stemKeys(w);
      },
      lemma
    };
  }
});

// languages/de.js
var require_de = __commonJS({
  "languages/de.js"(exports2, module2) {
    "use strict";
    function fold(word) {
      return word.toLowerCase().replace(/ß/g, "ss").replace(/[äàáâ]/g, "a").replace(/[öòóô]/g, "o").replace(/[ïìíî]/g, "i").replace(/[üùúû]/g, "u");
    }
    function stEnding(ch) {
      return ch === "b" || ch === "d" || ch === "f" || ch === "g" || ch === "h" || ch === "k" || ch === "l" || ch === "m" || ch === "n" || ch === "t";
    }
    function step1(s, len) {
      if (len > 5 && s[len - 3] === "e" && s[len - 2] === "r" && s[len - 1] === "n")
        return len - 3;
      if (len > 4 && s[len - 2] === "e") {
        const c = s[len - 1];
        if (c === "m" || c === "n" || c === "r" || c === "s")
          return len - 2;
      }
      if (len > 3 && s[len - 1] === "e")
        return len - 1;
      if (len > 3 && s[len - 1] === "s" && stEnding(s[len - 2]))
        return len - 1;
      return len;
    }
    function step2(s, len) {
      if (len > 5 && s[len - 3] === "e" && s[len - 2] === "s" && s[len - 1] === "t")
        return len - 3;
      if (len > 4 && s[len - 2] === "e" && (s[len - 1] === "r" || s[len - 1] === "n"))
        return len - 2;
      if (len > 4 && s[len - 2] === "s" && s[len - 1] === "t" && stEnding(s[len - 3]))
        return len - 2;
      return len;
    }
    function stem(word) {
      const s = fold(word);
      let len = s.length;
      len = step1(s, len);
      len = step2(s, len);
      return s.slice(0, len);
    }
    function strip(word) {
      const s = fold(word);
      for (const e of ["en", "er", "es", "e", "n", "s"]) {
        if (s.length - e.length >= 3 && s.endsWith(e))
          return s.slice(0, -e.length);
      }
      return s;
    }
    function stemKeys(word) {
      const a = stem(word);
      const b = strip(word);
      return a === b ? [a] : [a, b];
    }
    function lemma(word) {
      return strip(word);
    }
    module2.exports = {
      id: "de",
      name: "German",
      priority: 0,
      match: (word) => /[a-zäöüß]/i.test(word),
      keys(word, mode) {
        const w = word.toLowerCase();
        if (mode === "exact")
          return [w];
        if (mode === "endingStrip")
          return [strip(w)];
        return stemKeys(w);
      },
      lemma
    };
  }
});

// languages/fr.js
var require_fr = __commonJS({
  "languages/fr.js"(exports2, module2) {
    "use strict";
    function endsWith(s, len, suffix) {
      const sl = suffix.length;
      if (sl > len)
        return false;
      for (let i = 0; i < sl; i++)
        if (s[len - sl + i] !== suffix[i])
          return false;
      return true;
    }
    function deleteAt(s, pos, len) {
      for (let i = pos; i < len - 1; i++)
        s[i] = s[i + 1];
      return len - 1;
    }
    function norm(s, len) {
      if (len > 4) {
        for (let i = 0; i < len; i++) {
          switch (s[i]) {
            case "\xE0":
            case "\xE1":
            case "\xE2":
              s[i] = "a";
              break;
            case "\xF4":
              s[i] = "o";
              break;
            case "\xE8":
            case "\xE9":
            case "\xEA":
              s[i] = "e";
              break;
            case "\xF9":
            case "\xFB":
              s[i] = "u";
              break;
            case "\xEE":
              s[i] = "i";
              break;
            case "\xE7":
              s[i] = "c";
              break;
          }
        }
        let ch = s[0];
        for (let i = 1; i < len; i++) {
          if (s[i] === ch && /[a-z]/.test(ch))
            len = deleteAt(s, i--, len);
          else
            ch = s[i];
        }
      }
      if (len > 4 && endsWith(s, len, "ie"))
        len -= 2;
      if (len > 4) {
        if (s[len - 1] === "r")
          len--;
        if (s[len - 1] === "e")
          len--;
        if (s[len - 1] === "e")
          len--;
        if (s[len - 1] === s[len - 2] && /[a-z]/.test(s[len - 1]))
          len--;
      }
      return len;
    }
    function stemArr(s, len) {
      if (len > 5 && s[len - 1] === "x") {
        if (s[len - 3] === "a" && s[len - 2] === "u" && s[len - 4] !== "e")
          s[len - 2] = "l";
        len--;
      }
      if (len > 3 && s[len - 1] === "x")
        len--;
      if (len > 3 && s[len - 1] === "s")
        len--;
      if (len > 9 && endsWith(s, len, "issement")) {
        len -= 6;
        s[len - 1] = "r";
        return norm(s, len);
      }
      if (len > 8 && endsWith(s, len, "issant")) {
        len -= 4;
        s[len - 1] = "r";
        return norm(s, len);
      }
      if (len > 6 && endsWith(s, len, "ement")) {
        len -= 4;
        if (len > 3 && endsWith(s, len, "ive")) {
          len--;
          s[len - 1] = "f";
        }
        return norm(s, len);
      }
      if (len > 11 && endsWith(s, len, "ficatrice")) {
        len -= 5;
        s[len - 2] = "e";
        s[len - 1] = "r";
        return norm(s, len);
      }
      if (len > 10 && endsWith(s, len, "ficateur")) {
        len -= 4;
        s[len - 2] = "e";
        s[len - 1] = "r";
        return norm(s, len);
      }
      if (len > 9 && endsWith(s, len, "catrice")) {
        len -= 3;
        s[len - 4] = "q";
        s[len - 3] = "u";
        s[len - 2] = "e";
        return norm(s, len);
      }
      if (len > 8 && endsWith(s, len, "cateur")) {
        len -= 2;
        s[len - 4] = "q";
        s[len - 3] = "u";
        s[len - 2] = "e";
        s[len - 1] = "r";
        return norm(s, len);
      }
      if (len > 8 && endsWith(s, len, "atrice")) {
        len -= 4;
        s[len - 2] = "e";
        s[len - 1] = "r";
        return norm(s, len);
      }
      if (len > 7 && endsWith(s, len, "ateur")) {
        len -= 3;
        s[len - 2] = "e";
        s[len - 1] = "r";
        return norm(s, len);
      }
      if (len > 6 && endsWith(s, len, "trice")) {
        len--;
        s[len - 3] = "e";
        s[len - 2] = "u";
        s[len - 1] = "r";
      }
      if (len > 5 && endsWith(s, len, "i\xE8me"))
        return norm(s, len - 4);
      if (len > 7 && endsWith(s, len, "teuse")) {
        len -= 2;
        s[len - 1] = "r";
        return norm(s, len);
      }
      if (len > 6 && endsWith(s, len, "teur")) {
        len--;
        s[len - 1] = "r";
        return norm(s, len);
      }
      if (len > 5 && endsWith(s, len, "euse"))
        return norm(s, len - 2);
      if (len > 8 && endsWith(s, len, "\xE8re")) {
        len--;
        s[len - 2] = "e";
        return norm(s, len);
      }
      if (len > 7 && endsWith(s, len, "ive")) {
        len--;
        s[len - 1] = "f";
        return norm(s, len);
      }
      if (len > 4 && (endsWith(s, len, "folle") || endsWith(s, len, "molle"))) {
        len -= 2;
        s[len - 1] = "u";
        return norm(s, len);
      }
      if (len > 9 && endsWith(s, len, "nnelle"))
        return norm(s, len - 5);
      if (len > 9 && endsWith(s, len, "nnel"))
        return norm(s, len - 3);
      if (len > 4 && endsWith(s, len, "\xE8te")) {
        len--;
        s[len - 2] = "e";
      }
      if (len > 8 && endsWith(s, len, "ique"))
        len -= 4;
      if (len > 8 && endsWith(s, len, "esse"))
        return norm(s, len - 3);
      if (len > 7 && endsWith(s, len, "inage"))
        return norm(s, len - 3);
      if (len > 9 && endsWith(s, len, "isation")) {
        len -= 7;
        if (len > 5 && endsWith(s, len, "ual"))
          s[len - 2] = "e";
        return norm(s, len);
      }
      if (len > 9 && endsWith(s, len, "isateur"))
        return norm(s, len - 7);
      if (len > 8 && endsWith(s, len, "ation"))
        return norm(s, len - 5);
      if (len > 8 && endsWith(s, len, "ition"))
        return norm(s, len - 5);
      return norm(s, len);
    }
    function stem(word) {
      const arr = word.toLowerCase().split("");
      const len = stemArr(arr, arr.length);
      return arr.slice(0, len).join("");
    }
    function fold(word) {
      return word.toLowerCase().replace(/[àâä]/g, "a").replace(/[ôö]/g, "o").replace(/[èéêë]/g, "e").replace(/[ùûü]/g, "u").replace(/[îï]/g, "i").replace(/ç/g, "c").replace(/ÿ/g, "y");
    }
    function strip(word) {
      const s = fold(word);
      if (s.length > 3 && (s.endsWith("s") || s.endsWith("x")))
        return s.slice(0, -1);
      return s;
    }
    function stemKeys(word) {
      const a = stem(word);
      const b = strip(word);
      return a === b ? [a] : [a, b];
    }
    function lemma(word) {
      return strip(word);
    }
    module2.exports = {
      id: "fr",
      name: "French",
      priority: 0,
      match: (word) => /[a-zàâäçéèêëîïôöùûüÿ]/i.test(word),
      keys(word, mode) {
        const w = word.toLowerCase();
        if (mode === "exact")
          return [w];
        if (mode === "endingStrip")
          return [strip(w)];
        return stemKeys(w);
      },
      lemma
    };
  }
});

// src/builtin-languages.js
var require_builtin_languages = __commonJS({
  "src/builtin-languages.js"(exports2, module2) {
    "use strict";
    var BUILTIN_LANGUAGES2 = [
      require_ru(),
      require_uk(),
      require_en(),
      require_es(),
      require_de(),
      require_fr()
    ];
    module2.exports = { BUILTIN_LANGUAGES: BUILTIN_LANGUAGES2 };
  }
});

// src/language-api.js
var require_language_api = __commonJS({
  "src/language-api.js"(exports2, module2) {
    "use strict";
    var MATCH_MODES = ["stemmer", "endingStrip", "exact"];
    var ID_PATTERN = /^[a-z][a-z0-9-]*$/;
    function validateLanguage2(lang) {
      if (!lang || typeof lang !== "object")
        return "module does not export an object";
      if (typeof lang.id !== "string" || !ID_PATTERN.test(lang.id))
        return 'invalid "id" (expected a lowercase code like "en")';
      if (typeof lang.name !== "string" || !lang.name.trim())
        return 'missing "name"';
      if ("priority" in lang && typeof lang.priority !== "number")
        return '"priority" must be a number';
      if (typeof lang.match !== "function")
        return "missing match(word) function";
      if (typeof lang.keys !== "function")
        return "missing keys(word, mode) function";
      if ("lemma" in lang && typeof lang.lemma !== "function")
        return '"lemma" must be a function';
      const sample = lang.id;
      try {
        lang.match(sample);
      } catch (e) {
        return `match() threw: ${e && e.message || e}`;
      }
      for (const mode of MATCH_MODES) {
        let out;
        try {
          out = lang.keys(sample, mode);
        } catch (e) {
          return `keys() threw in mode "${mode}": ${e && e.message || e}`;
        }
        if (!Array.isArray(out) || !out.length || out.some((k) => typeof k !== "string")) {
          return `keys() must return a non-empty array of strings (mode "${mode}")`;
        }
      }
      return null;
    }
    module2.exports = { MATCH_MODES, ID_PATTERN, validateLanguage: validateLanguage2 };
  }
});

// src/folder-suggest.js
var require_folder_suggest = __commonJS({
  "src/folder-suggest.js"(exports2, module2) {
    "use strict";
    var obsidian = require("obsidian");
    var { AbstractInputSuggest, TFolder: TFolder2 } = obsidian;
    var FolderSuggest = class extends AbstractInputSuggest {
      constructor(app, inputEl) {
        super(app, inputEl);
        this.inputEl = inputEl;
      }
      getSuggestions(query) {
        const q = query.toLowerCase();
        return this.app.vault.getAllLoadedFiles().filter((f) => f instanceof TFolder2 && f.path.toLowerCase().includes(q));
      }
      renderSuggestion(folder, el) {
        el.setText(folder.path || "/");
      }
      selectSuggestion(folder) {
        this.setValue(folder.path);
        this.inputEl.trigger("input");
        this.close();
      }
    };
    var FileSuggest = class extends AbstractInputSuggest {
      constructor(app, inputEl) {
        super(app, inputEl);
        this.inputEl = inputEl;
      }
      getSuggestions(query) {
        const q = query.toLowerCase();
        return this.app.vault.getMarkdownFiles().filter((f) => f.path.toLowerCase().includes(q)).slice(0, 50);
      }
      renderSuggestion(file, el) {
        el.setText(file.path);
      }
      selectSuggestion(file) {
        this.setValue(file.path);
        this.inputEl.trigger("input");
        this.close();
      }
    };
    var PathSuggest = class extends AbstractInputSuggest {
      constructor(app, inputEl, onSelect) {
        super(app, inputEl);
        this.inputEl = inputEl;
        this.onSelect = onSelect;
      }
      getSuggestions(query) {
        const q = query.toLowerCase();
        const isFolder = (f) => f instanceof TFolder2;
        return this.app.vault.getAllLoadedFiles().filter((f) => f.path && f.path.toLowerCase().includes(q)).sort((a, b) => isFolder(a) === isFolder(b) ? a.path.localeCompare(b.path) : isFolder(a) ? -1 : 1).slice(0, 50);
      }
      renderSuggestion(f, el) {
        el.setText(f.path || "/");
      }
      selectSuggestion(f) {
        if (this.onSelect) {
          this.onSelect(f.path);
          this.setValue("");
          this.close();
          return;
        }
        this.setValue(f.path);
        this.inputEl.trigger("input");
        this.close();
      }
    };
    var folderSuggestAvailable = () => typeof AbstractInputSuggest === "function";
    module2.exports = { FolderSuggest, FileSuggest, PathSuggest, folderSuggestAvailable };
  }
});

// src/shared/folder-list.js
var require_folder_list = __commonJS({
  "src/shared/folder-list.js"(exports2, module2) {
    "use strict";
    var { Setting, setIcon } = require("obsidian");
    function renderFolderList(containerEl, opts) {
      const cls = opts.cls;
      const norm = opts.normalize || ((x) => x.trim());
      const read = () => (opts.get() || "").split("\n").map((x) => x.trim()).filter(Boolean);
      new Setting(containerEl).setName(opts.name).setDesc(opts.desc);
      const rowsEl = containerEl.createDiv({ cls: `${cls}-folder-rows` });
      const addEl = containerEl.createDiv({ cls: `${cls}-folder-add` });
      const commit = async (next) => {
        const seen = /* @__PURE__ */ new Set();
        const clean = [];
        for (const p of next) {
          const n = norm(p);
          if (n && !seen.has(n)) {
            seen.add(n);
            clean.push(n);
          }
        }
        await opts.set(clean.join("\n"));
        draw();
      };
      const draw = () => {
        rowsEl.empty();
        read().forEach((path, i) => {
          const row = new Setting(rowsEl).setName(path);
          row.settingEl.addClass(`${cls}-folder-row`);
          row.addExtraButton((b) => b.setIcon("x").setTooltip(opts.removeLabel || "").onClick(() => {
            const next = read();
            next.splice(i, 1);
            commit(next);
          }));
        });
      };
      const input = addEl.createEl("input", { type: "text", cls: `${cls}-folder-input`, attr: { placeholder: opts.placeholder || "" } });
      const addBtn = addEl.createEl("button", { cls: `${cls}-folder-addbtn`, attr: { "aria-label": opts.addLabel || "" } });
      setIcon(addBtn, "plus");
      const add = (raw) => {
        if (norm(raw))
          commit([...read(), raw]);
        input.value = "";
        input.focus();
      };
      if (opts.attachSuggest)
        opts.attachSuggest(input, add);
      addBtn.addEventListener("click", () => add(input.value));
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          add(input.value);
        }
      });
      draw();
    }
    module2.exports = { renderFolderList };
  }
});

// src/shared/i18n.js
var require_i18n = __commonJS({
  "src/shared/i18n.js"(exports2, module2) {
    "use strict";
    var LOCALES = { en: {} };
    var dict = LOCALES.en;
    var pluralRules = new Intl.PluralRules("en");
    function initI18n2(locales) {
      LOCALES = locales;
      const sys = (window.localStorage.getItem("language") || "").split("-")[0].toLowerCase();
      const locale = LOCALES[sys] ? sys : "en";
      dict = LOCALES[locale];
      try {
        pluralRules = new Intl.PluralRules(locale);
      } catch (e) {
        pluralRules = new Intl.PluralRules("en");
      }
    }
    function interpolate(str, vars) {
      if (!vars)
        return str;
      return str.replace(/\{(\w+)\}/g, (m, k) => k in vars ? String(vars[k]) : m);
    }
    function t2(key, vars) {
      let entry = dict[key];
      if (entry === void 0)
        entry = LOCALES.en[key];
      if (entry === void 0)
        return key;
      return interpolate(entry, vars);
    }
    function plural2(noun, n) {
      const forms = dict["plural." + noun] || LOCALES.en["plural." + noun];
      if (!forms)
        return n + " " + noun;
      let cat;
      try {
        cat = pluralRules.select(n);
      } catch (e) {
        cat = "other";
      }
      const tpl = forms[cat] != null ? forms[cat] : forms.other != null ? forms.other : Object.values(forms)[0];
      return interpolate(tpl, { n });
    }
    module2.exports = { initI18n: initI18n2, t: t2, plural: plural2 };
  }
});

// src/settings-tab.js
var require_settings_tab = __commonJS({
  "src/settings-tab.js"(exports2, module2) {
    "use strict";
    var { PluginSettingTab, Setting, Notice: Notice2 } = require("obsidian");
    var { PathSuggest, folderSuggestAvailable } = require_folder_suggest();
    var { sanitizeFolder: sanitizeFolder2 } = require_constants();
    var { renderFolderList } = require_folder_list();
    var { t: t2, plural: plural2 } = require_i18n();
    var HeadingLinkerSettingTab2 = class extends PluginSettingTab {
      constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
      }
      display() {
        const { containerEl } = this;
        containerEl.empty();
        const s = this.plugin.settings;
        const save = async (rebuild) => {
          await this.plugin.saveSettings();
          if (rebuild) {
            this.plugin.rebuildIndex();
            this.plugin.rerenderViews();
            this.plugin.updateStatusBar();
          }
        };
        const saveScope = async () => {
          await this.plugin.saveSettings();
          this.plugin.rerenderViews();
          this.plugin.updateStatusBar();
        };
        const saveSources = async (force) => {
          await this.plugin.saveSettings();
          await this.plugin.loadAliases(force);
          this.plugin.rerenderViews();
          this.plugin.updateStatusBar();
          this.renderStatus();
        };
        new Setting(containerEl).setName(t2("set.heading.sources")).setHeading();
        new Setting(containerEl).setName(t2("set.glossaryMode.name")).setDesc(t2("set.glossaryMode.desc")).addDropdown((d) => d.addOption("selected", t2("set.glossaryMode.selected")).addOption("vault", t2("set.glossaryMode.vault")).setValue(s.glossaryMode).onChange(async (v) => {
          s.glossaryMode = v;
          await saveSources();
          this.display();
        }));
        const sourceList = (name, desc, key) => renderFolderList(containerEl, {
          cls: "heading",
          name,
          desc,
          get: () => s[key],
          set: async (v) => {
            s[key] = v;
            await saveSources();
          },
          normalize: sanitizeFolder2,
          attachSuggest: folderSuggestAvailable() ? (inputEl, onPick) => new PathSuggest(this.app, inputEl, onPick) : null,
          placeholder: t2("set.sourceList.add"),
          removeLabel: t2("set.sourceList.remove"),
          addLabel: t2("set.sourceList.addAria")
        });
        if (s.glossaryMode === "selected")
          sourceList(t2("set.glossarySources.name"), t2("set.glossarySources.desc"), "glossarySources");
        sourceList(t2("set.excludeSources.name"), t2("set.excludeSources.desc"), "excludeSources");
        const levelSetting = new Setting(containerEl).setName(t2("set.headingLevels.name")).setDesc(t2("set.headingLevels.desc"));
        for (let lvl = 1; lvl <= 6; lvl++) {
          const label = levelSetting.controlEl.createEl("label", { cls: "heading-level-check" });
          const cb = label.createEl("input", { type: "checkbox" });
          cb.checked = (s.headingLevels || []).includes(lvl);
          label.createSpan({ text: `H${lvl}` });
          cb.onchange = async () => {
            const set = new Set(s.headingLevels || []);
            if (cb.checked)
              set.add(lvl);
            else
              set.delete(lvl);
            s.headingLevels = [...set].sort((a, b) => a - b);
            await save(true);
            this.renderStatus();
          };
        }
        new Setting(containerEl).setName(t2("set.headingAliases.name")).setDesc(t2("set.headingAliases.desc")).addToggle((c) => c.setValue(s.headingAliases).onChange(async (v) => {
          s.headingAliases = v;
          await saveSources(true);
        }));
        new Setting(containerEl).setName(t2("set.heading.scope")).setHeading();
        new Setting(containerEl).setName(t2("set.scopeMode.name")).setDesc(t2("set.scopeMode.desc")).addDropdown((d) => d.addOption("folders", t2("set.scopeMode.folders")).addOption("vault", t2("set.scopeMode.vault")).setValue(s.scopeMode).onChange(async (v) => {
          s.scopeMode = v;
          await saveScope();
          this.display();
        }));
        const folderList = (name, desc, key) => renderFolderList(containerEl, {
          cls: "heading",
          name,
          desc,
          get: () => s[key],
          set: async (v) => {
            s[key] = v;
            await saveScope();
          },
          normalize: sanitizeFolder2,
          attachSuggest: folderSuggestAvailable() ? (inputEl, onPick) => new PathSuggest(this.app, inputEl, onPick) : null,
          placeholder: t2("set.folderList.add"),
          removeLabel: t2("set.folderList.remove"),
          addLabel: t2("set.folderList.addAria")
        });
        if (s.scopeMode === "folders")
          folderList(t2("set.scopeFolders.name"), t2("set.scopeFolders.desc"), "scopeFolders");
        folderList(t2("set.excludeFolders.name"), t2("set.excludeFolders.desc"), "excludeFolders");
        this.statusEl = containerEl.createEl("div", { cls: "heading-section-desc" });
        this.renderStatus();
        new Setting(containerEl).setName(t2("set.heading.matching")).setHeading();
        new Setting(containerEl).setName(t2("set.matchMode.name")).setDesc(t2("set.matchMode.desc")).addDropdown((d) => d.addOption("stemmer", t2("set.matchMode.stemmer")).addOption("endingStrip", t2("set.matchMode.endingStrip")).addOption("exact", t2("set.matchMode.exact")).setValue(s.matchMode).onChange(async (v) => {
          s.matchMode = v;
          await save(true);
        }));
        new Setting(containerEl).setName(t2("set.minTermLength.name")).setDesc(t2("set.minTermLength.desc")).addText((c) => {
          c.inputEl.type = "number";
          c.inputEl.min = "1";
          c.setValue(String(s.minTermLength)).onChange(async (v) => {
            const n = parseInt(v, 10);
            s.minTermLength = Number.isFinite(n) && n > 0 ? n : 1;
            await save(true);
          });
        });
        new Setting(containerEl).setName(t2("set.smartCase.name")).setDesc(t2("set.smartCase.desc")).addToggle((c) => c.setValue(s.smartCase).onChange(async (v) => {
          s.smartCase = v;
          await save(true);
        }));
        this.renderLanguages(containerEl, s, save);
        new Setting(containerEl).setName(t2("set.linkFirstOnly.name")).setDesc(t2("set.linkFirstOnly.desc")).addToggle((c) => c.setValue(s.linkFirstOnly).onChange(async (v) => {
          s.linkFirstOnly = v;
          await save(false);
        }));
        new Setting(containerEl).setName(t2("set.excludeTerms.name")).setDesc(t2("set.excludeTerms.desc")).addTextArea((c) => {
          c.setValue(s.excludeTerms).onChange(async (v) => {
            s.excludeTerms = v;
            await save(true);
          });
          c.inputEl.rows = 3;
        });
        new Setting(containerEl).setName(t2("set.heading.highlighting")).setHeading();
        new Setting(containerEl).setName(t2("set.highlightInReading.name")).setDesc(t2("set.highlightInReading.desc")).addToggle((c) => c.setValue(s.highlightInReading).onChange(async (v) => {
          s.highlightInReading = v;
          await save(false);
          this.plugin.rerenderViews();
        }));
        new Setting(containerEl).setName(t2("set.editingHighlight.name")).setDesc(t2("set.editingHighlight.desc")).addDropdown((d) => d.addOption("off", t2("set.editingHighlight.off")).addOption("live", t2("set.editingHighlight.live")).addOption("onSave", t2("set.editingHighlight.onSave")).setValue(s.editingHighlight).onChange(async (v) => {
          s.editingHighlight = v;
          await save(false);
          this.plugin.refreshEditors();
        }));
        new Setting(containerEl).setName(t2("set.skipHeadings.name")).setDesc(t2("set.skipHeadings.desc")).addToggle((c) => c.setValue(s.skipHeadings).onChange(async (v) => {
          s.skipHeadings = v;
          await save(false);
          this.plugin.rerenderViews();
        }));
        new Setting(containerEl).setName(t2("set.statusBar.name")).setDesc(t2("set.statusBar.desc")).addToggle((c) => c.setValue(s.statusBar).onChange(async (v) => {
          s.statusBar = v;
          await save(false);
          this.plugin.updateStatusBar();
        }));
        new Setting(containerEl).setName(t2("set.statusBarIncludeLinks.name")).setDesc(t2("set.statusBarIncludeLinks.desc")).addToggle((c) => c.setValue(s.statusBarIncludeLinks).onChange(async (v) => {
          s.statusBarIncludeLinks = v;
          await save(false);
          this.plugin.updateStatusBar();
        }));
        new Setting(containerEl).setName(t2("set.heading.autocomplete")).setHeading();
        new Setting(containerEl).setName(t2("set.linkSuggest.name")).setDesc(t2("set.linkSuggest.desc")).addToggle((c) => c.setValue(s.linkSuggest).onChange(async (v) => {
          s.linkSuggest = v;
          await save(false);
        }));
        new Setting(containerEl).setName(t2("set.suggestMinChars.name")).setDesc(t2("set.suggestMinChars.desc")).addText((c) => {
          c.inputEl.type = "number";
          c.inputEl.min = "1";
          c.setValue(String(s.suggestMinChars)).onChange(async (v) => {
            const n = parseInt(v, 10);
            s.suggestMinChars = Number.isFinite(n) && n > 0 ? n : 1;
            await save(false);
          });
        });
        new Setting(containerEl).setName(t2("set.suggestSkipAfter.name")).setDesc(t2("set.suggestSkipAfter.desc")).addText((c) => c.setValue(s.suggestSkipAfter).onChange(async (v) => {
          s.suggestSkipAfter = v;
          await save(false);
        }));
        new Setting(containerEl).setName(t2("set.heading.contextMenu")).setHeading();
        const menuToggle = (key, name, desc) => new Setting(containerEl).setName(name).setDesc(desc).addToggle((c) => c.setValue(s[key]).onChange(async (v) => {
          s[key] = v;
          await save(false);
        }));
        menuToggle("menuTurnInto", t2("set.menuTurnInto.name"), t2("set.menuTurnInto.desc"));
        menuToggle("menuOpen", t2("set.menuOpen.name"), t2("set.menuOpen.desc"));
        menuToggle("menuExclude", t2("set.menuExclude.name"), t2("set.menuExclude.desc"));
        menuToggle("menuUnlink", t2("set.menuUnlink.name"), t2("set.menuUnlink.desc"));
        new Setting(containerEl).setName(t2("set.heading.maintenance")).setHeading();
        new Setting(containerEl).setName(t2("set.rebuild.name")).setDesc(t2("set.rebuild.desc")).addButton((b) => b.setButtonText(t2("set.rebuild.button")).onClick(() => {
          this.plugin.rebuildIndex();
          new Notice2(t2("notice.indexRebuilt"));
          this.renderStatus();
        }));
      }
      renderLanguages(containerEl, s, save) {
        const langs = this.plugin.languages;
        const errors = this.plugin.languageErrors || [];
        const enabledCount = langs.filter((l) => (s.enabledLanguages || []).includes(l.id)).length;
        if (this.showLanguages === void 0)
          this.showLanguages = false;
        const desc = t2("set.languages.desc", { enabled: enabledCount, total: langs.length }) + (errors.length ? t2("set.languages.invalidSuffix", { n: errors.length }) : "") + ".";
        new Setting(containerEl).setName(t2("set.languages.name")).setDesc(desc).addExtraButton((b) => b.setIcon(this.showLanguages ? "chevron-up" : "chevron-down").setTooltip(this.showLanguages ? t2("set.languages.hide") : t2("set.languages.show")).onClick(() => {
          this.showLanguages = !this.showLanguages;
          this.display();
        }));
        if (!this.showLanguages)
          return;
        langs.forEach((lang, i) => {
          const row = new Setting(containerEl).setName(lang.name).setDesc(`id: ${lang.id}`).addExtraButton((b) => b.setIcon("chevron-up").setTooltip(t2("set.lang.higher")).setDisabled(i === 0).onClick(async () => {
            this.plugin.moveLanguage(lang.id, -1);
            await this.applyLanguageChange();
          })).addExtraButton((b) => b.setIcon("chevron-down").setTooltip(t2("set.lang.lower")).setDisabled(i === langs.length - 1).onClick(async () => {
            this.plugin.moveLanguage(lang.id, 1);
            await this.applyLanguageChange();
          })).addToggle((c) => c.setValue((s.enabledLanguages || []).includes(lang.id)).onChange(async (v) => {
            const set = new Set(s.enabledLanguages || []);
            if (v)
              set.add(lang.id);
            else
              set.delete(lang.id);
            s.enabledLanguages = [...set];
            await this.applyLanguageChange();
          }));
          row.settingEl.addClass("heading-lang-row");
        });
        for (const bad of errors) {
          const row = new Setting(containerEl).setName(bad.id).setDesc(t2("set.lang.invalid", { error: bad.error })).addExtraButton((b) => b.setIcon("alert-triangle").setTooltip(t2("set.lang.invalid", { error: bad.error })).setDisabled(true));
          row.nameEl.addClass("heading-lang-error");
          row.settingEl.addClass("heading-lang-row");
          row.settingEl.addClass("mod-warning");
        }
      }
      async applyLanguageChange() {
        await this.plugin.saveSettings();
        this.plugin.refreshActiveLanguages();
        this.plugin.rebuildIndex();
        this.plugin.rerenderViews();
        this.display();
      }
      renderStatus() {
        const el = this.statusEl;
        if (!el)
          return;
        const s = this.plugin.settings;
        if (s.glossaryMode === "selected" && !this.plugin.glossarySourceList().length) {
          el.setText(t2("set.noSourcesStatus"));
          return;
        }
        const n = this.plugin.index && this.plugin.index.termCount || 0;
        el.setText(t2("set.termsIndexed", { terms: plural2("term", n) }));
      }
    };
    module2.exports = { HeadingLinkerSettingTab: HeadingLinkerSettingTab2 };
  }
});

// src/matcher.js
var require_matcher = __commonJS({
  "src/matcher.js"(exports2, module2) {
    "use strict";
    var { splitLines: splitLines2 } = require_markdown();
    module2.exports = {
      // Keys for a word: the union from every language that claims it (same-script
      // languages overlap); words no language claims fall back to the exact form.
      keysFor(word) {
        const cacheKey = word.toLowerCase();
        if (!this.keysCache)
          this.keysCache = /* @__PURE__ */ new Map();
        const cached = this.keysCache.get(cacheKey);
        if (cached)
          return cached;
        const out = [];
        const seen = /* @__PURE__ */ new Set();
        for (const lang of this.activeLanguages) {
          if (!lang.match(word))
            continue;
          for (const k of lang.keys(word, this.settings.matchMode)) {
            if (!seen.has(k)) {
              seen.add(k);
              out.push(k);
            }
          }
        }
        if (!out.length)
          out.push(cacheKey);
        this.keysCache.set(cacheKey, out);
        return out;
      },
      tokenizeForm(form) {
        const words = [...form.matchAll(/[\p{L}\p{Nd}]+/gu)].map((m) => m[0]);
        return words.map((raw) => ({ raw, keys: this.keysFor(raw) }));
      },
      rebuildIndex() {
        this.keysCache = /* @__PURE__ */ new Map();
        const byKey = /* @__PURE__ */ new Map();
        const linktexts = /* @__PURE__ */ new Set();
        const terms = [];
        const minTermLength = Math.max(1, this.settings.minTermLength || 1);
        const excludeTerms = new Set(splitLines2(this.settings.excludeTerms).map((s) => s.toLowerCase()));
        const levels = new Set(this.settings.headingLevels || [1, 2, 3, 4, 5, 6]);
        this.headingFingerprints = /* @__PURE__ */ new Map();
        for (const file of this.glossaryFilesList()) {
          const headings = this.headingsOf(file);
          this.headingFingerprints.set(file.path, this.fileFingerprint(file));
          const base = file.basename;
          const aliasMap = this.aliasCache && this.aliasCache.get(file.path);
          for (const { text: label, level } of headings) {
            if (!levels.has(level))
              continue;
            if (/[[\]|#^]/.test(label))
              continue;
            if (excludeTerms.has(label.toLowerCase()))
              continue;
            if (label.trim().length < minTermLength)
              continue;
            const labelWords = this.tokenizeForm(label);
            if (!labelWords.length)
              continue;
            const linktext = `${base}#${label}`;
            if (linktexts.has(linktext))
              continue;
            linktexts.add(linktext);
            const aliases = aliasMap && aliasMap.get(label) || [];
            terms.push({ linktext, label, fileBase: base, path: file.path, aliases });
            const forms = [{ text: label, words: labelWords }];
            for (const a of aliases) {
              if (a.toLowerCase() === label.toLowerCase() || a.trim().length < minTermLength)
                continue;
              const w = this.tokenizeForm(a);
              if (w.length)
                forms.push({ text: a, words: w });
            }
            for (const f of forms) {
              const matcher2 = { linktext, label, fileBase: base, words: f.words, wordCount: f.words.length, cs: isAcronymish(f.text), caseText: f.text };
              for (const k of f.words[0].keys) {
                if (!byKey.has(k))
                  byKey.set(k, []);
                byKey.get(k).push(matcher2);
              }
            }
          }
        }
        this.index = { byKey, termCount: linktexts.size };
        this.terms = terms;
      },
      // Linktexts of every term whose heading matches `text`. Runs the same matcher as
      // highlighting, so collisions agree with what gets linked.
      termsMatchingText(text) {
        const out = /* @__PURE__ */ new Set();
        for (const m of this.findMatches(text, null)) {
          out.add(m.linktext);
          if (m.alts)
            for (const a of m.alts)
              out.add(a);
        }
        return [...out];
      },
      // currentFile: basename of the note being scanned, when it is itself a glossary
      // file — its own headings are skipped so a glossary file doesn't link to itself.
      findMatches(text, currentFile, opts = {}) {
        const protect = opts.protect ? this.computeProtected(text) : null;
        const smartCase = this.settings.smartCase;
        const tokens = [...text.matchAll(/[\p{L}\p{Nd}]+/gu)].map((m) => {
          const raw = m[0];
          return { raw, start: m.index, end: m.index + raw.length, keys: this.keysFor(raw) };
        });
        const results = [];
        let i = 0;
        while (i < tokens.length) {
          const tk = tokens[i];
          const cands = [];
          const seen = /* @__PURE__ */ new Set();
          for (const k of tk.keys) {
            const bucket = this.index.byKey.get(k);
            if (!bucket)
              continue;
            for (const c of bucket) {
              if (!seen.has(c)) {
                seen.add(c);
                cands.push(c);
              }
            }
          }
          const fits = (c) => {
            const wc = c.wordCount;
            if (i + wc > tokens.length)
              return false;
            for (let k = 0; k < wc; k++) {
              const t2 = tokens[i + k];
              const w = c.words[k];
              if (k > 0) {
                const between = text.slice(tokens[i + k - 1].end, t2.start);
                if (/[^\s-]/.test(between))
                  return false;
              }
              const t2keys = k === 0 ? t2.keys : this.keysFor(t2.raw);
              if (!t2keys.some((kk) => w.keys.includes(kk)))
                return false;
            }
            if (smartCase && c.cs && text.slice(tokens[i].start, tokens[i + wc - 1].end) !== c.caseText)
              return false;
            return true;
          };
          let matched = null;
          let sorted = null;
          if (cands.length) {
            sorted = cands.length > 1 ? cands.slice().sort((a, b) => b.wordCount - a.wordCount) : cands;
            for (const c of sorted) {
              if (fits(c)) {
                matched = { c, start: tokens[i].start, end: tokens[i + c.wordCount - 1].end, wc: c.wordCount };
                break;
              }
            }
          }
          if (matched && matched.c.fileBase !== currentFile) {
            const inProtected = protect && this.overlapsProtected(protect, matched.start, matched.end);
            if (!inProtected) {
              let alts = null;
              if (sorted.length > 1) {
                const seenLink = /* @__PURE__ */ new Set([matched.c.linktext]);
                for (const c of sorted) {
                  if (c.wordCount !== matched.wc || seenLink.has(c.linktext))
                    continue;
                  if (fits(c)) {
                    seenLink.add(c.linktext);
                    (alts || (alts = [])).push(c.linktext);
                  }
                }
              }
              results.push({
                start: matched.start,
                end: matched.end,
                linktext: matched.c.linktext,
                label: matched.c.label,
                display: text.slice(matched.start, matched.end),
                alts
              });
              i += matched.wc;
              continue;
            }
          }
          i++;
        }
        return results;
      },
      // Ranges in raw markdown that must not be linked: frontmatter, code, links, urls, headings.
      computeProtected(text) {
        const ranges = [];
        const push = (re) => {
          let m;
          while ((m = re.exec(text)) !== null)
            ranges.push([m.index, m.index + m[0].length]);
        };
        if (/^---\r?\n/.test(text)) {
          const end = text.indexOf("\n---", 3);
          if (end !== -1)
            ranges.push([0, end + 4]);
        }
        push(/```[\s\S]*?```/g);
        push(/~~~[\s\S]*?~~~/g);
        push(/`[^`\n]+`/g);
        push(/%%[\s\S]*?%%/g);
        push(/\[\[[^\]]*\]\]/g);
        push(/\[[^\]]*\]\([^)]*\)/g);
        push(/(?:https?:\/\/|www\.)\S+/g);
        if (this.settings.skipHeadings)
          push(/^[ \t]*#{1,6}[ \t].*$/gm);
        return ranges.sort((a, b) => a[0] - b[0]);
      },
      // Frontmatter and code (fenced or inline) — the spans where a [[...]] isn't a real link.
      // Unlike computeProtected it keeps wikilinks and headings, since unlink acts on links and a
      // link inside a heading is still real.
      codeFrontmatterRanges(text) {
        const ranges = [];
        const push = (re) => {
          let m;
          while ((m = re.exec(text)) !== null)
            ranges.push([m.index, m.index + m[0].length]);
        };
        if (/^---\r?\n/.test(text)) {
          const end = text.indexOf("\n---", 3);
          if (end !== -1)
            ranges.push([0, end + 4]);
        }
        push(/```[\s\S]*?```/g);
        push(/~~~[\s\S]*?~~~/g);
        push(/`[^`\n]+`/g);
        return ranges.sort((a, b) => a[0] - b[0]);
      },
      overlapsProtected(ranges, s, e) {
        for (const [rs, re] of ranges) {
          if (rs >= e)
            break;
          if (re > s)
            return true;
        }
        return false;
      },
      // Same spans as computeProtected, but tested at a single position so it stays
      // cheap on every keystroke — no whole-document scan with greedy [\s\S]*? regexes.
      isProtectedAt(text, pos) {
        if (/^---\r?\n/.test(text)) {
          const end = text.indexOf("\n---", 3);
          if (end !== -1 && pos <= end + 4)
            return true;
        }
        const lines = text.split("\n");
        let lineStart = 0, lineIdx = 0;
        for (; lineIdx < lines.length; lineIdx++) {
          if (pos <= lineStart + lines[lineIdx].length)
            break;
          lineStart += lines[lineIdx].length + 1;
        }
        let fenced = false;
        for (let i = 0; i < lineIdx; i++) {
          const s = lines[i].trimStart();
          if (s.startsWith("```") || s.startsWith("~~~"))
            fenced = !fenced;
        }
        if (fenced)
          return true;
        const line = lines[lineIdx] || "";
        if (this.settings.skipHeadings && /^[ \t]*#{1,6}[ \t]/.test(line))
          return true;
        const col = pos - lineStart;
        return inMatch(line, col, /`[^`\n]+`/g) || inMatch(line, col, /%%[^%\n]*%%/g) || inMatch(line, col, /\[\[[^\]]*\]\]/g) || inMatch(line, col, /\[[^\]]*\]\([^)]*\)/g) || inMatch(line, col, /(?:https?:\/\/|www\.)\S+/g);
      }
    };
    function inMatch(line, col, re) {
      let m;
      while ((m = re.exec(line)) !== null) {
        if (col > m.index && col < m.index + m[0].length)
          return true;
      }
      return false;
    }
    function isAcronymish(label) {
      const letters = [...label].filter((ch) => /\p{L}/u.test(ch));
      if (letters.length < 2)
        return false;
      const upper = letters.filter((ch) => ch !== ch.toLowerCase() && ch === ch.toUpperCase()).length;
      return upper / letters.length > 0.75;
    }
  }
});

// src/highlight.js
var require_highlight = __commonJS({
  "src/highlight.js"(exports2, module2) {
    "use strict";
    var { Platform } = require("obsidian");
    var { t: t2 } = require_i18n();
    var LONG_PRESS_MS = 500;
    var fireContextMenu = (el, x, y) => el.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, clientX: x, clientY: y }));
    function longPressTracker(fire) {
      let timer = null, x = 0, y = 0, target = null;
      const cancel = () => {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
      };
      return {
        start(t3, el) {
          target = el;
          x = t3.clientX;
          y = t3.clientY;
          timer = setTimeout(() => {
            timer = null;
            fire(target, x, y);
          }, LONG_PRESS_MS);
        },
        move(t3) {
          if (timer && (Math.abs(t3.clientX - x) > 10 || Math.abs(t3.clientY - y) > 10))
            cancel();
        },
        cancel
      };
    }
    module2.exports = {
      processReadingMode(el, ctx) {
        if (!this.settings.highlightInReading)
          return;
        const sourcePath = ctx.sourcePath;
        if (sourcePath && !this.inScope(sourcePath))
          return;
        const currentFile = this.currentFileBase(sourcePath);
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
          acceptNode: (node) => {
            let p = node.parentElement;
            while (p) {
              const tag = p.tagName;
              if (tag === "CODE" || tag === "PRE" || tag === "A")
                return NodeFilter.FILTER_REJECT;
              if (this.settings.skipHeadings && /^H[1-6]$/.test(tag))
                return NodeFilter.FILTER_REJECT;
              if (p.classList && p.classList.contains("heading-link"))
                return NodeFilter.FILTER_REJECT;
              if (p === el)
                break;
              p = p.parentElement;
            }
            return NodeFilter.FILTER_ACCEPT;
          }
        });
        const nodes = [];
        while (walker.nextNode())
          nodes.push(walker.currentNode);
        for (const node of nodes)
          this.decorateTextNode(node, currentFile, sourcePath);
      },
      decorateTextNode(node, currentFile, sourcePath) {
        const text = node.textContent;
        if (!text || text.length < 2)
          return;
        const matches = this.findMatches(text, currentFile, { protect: true });
        if (!matches.length)
          return;
        const frag = document.createDocumentFragment();
        let cursor = 0;
        for (const m of matches) {
          if (m.start > cursor)
            frag.appendChild(document.createTextNode(text.slice(cursor, m.start)));
          const linktext = m.linktext;
          const display = m.display;
          const a = document.createElement("a");
          a.textContent = display;
          a.setAttribute("data-heading-target", linktext);
          if (m.alts && m.alts.length) {
            a.className = "heading-link heading-ambiguous";
            const candidates = [linktext, ...m.alts];
            a.setAttribute("aria-label", t2("highlight.matches", { terms: candidates.join(", ") }));
            const pick = (e, newTab) => {
              e.preventDefault();
              e.stopPropagation();
              this.chooseTerm(candidates, newTab ? t2("menu.openNewTabTitle") : t2("menu.openTitle"), (c) => this.openTerm(c, sourcePath, newTab));
            };
            a.addEventListener("click", (e) => pick(e, e.ctrlKey || e.metaKey));
            a.addEventListener("auxclick", (e) => {
              if (e.button === 1)
                pick(e, true);
            });
            a.addEventListener("mousedown", (e) => {
              if (e.button === 1) {
                e.preventDefault();
                e.stopPropagation();
              }
            });
          } else {
            a.className = "internal-link heading-link";
            a.href = linktext;
            a.setAttribute("data-href", linktext);
          }
          a.addEventListener("contextmenu", (e) => {
            const file = sourcePath ? this.app.vault.getAbstractFileByPath(sourcePath) : null;
            const root = a.closest(".markdown-reading-view, .markdown-source-view, .markdown-preview-view") || a.ownerDocument;
            let occurrence = 0;
            for (const other of root.querySelectorAll("a.heading-link")) {
              if (other === a)
                break;
              if (other.getAttribute("data-heading-target") === linktext && other.textContent === display)
                occurrence++;
            }
            if (this.showLinkMenu(e, linktext, display, file, null, occurrence, m.alts))
              e.stopPropagation();
          });
          if (Platform.isMobile) {
            const lp = longPressTracker(fireContextMenu);
            a.addEventListener("touchstart", (e) => lp.start(e.touches[0], a), { passive: true });
            a.addEventListener("touchmove", (e) => lp.move(e.touches[0]), { passive: true });
            a.addEventListener("touchend", lp.cancel);
            a.addEventListener("touchcancel", lp.cancel);
          }
          frag.appendChild(a);
          cursor = m.end;
        }
        if (cursor < text.length)
          frag.appendChild(document.createTextNode(text.slice(cursor)));
        node.parentNode.replaceChild(frag, node);
      },
      // Editor highlight (Live Preview / Source). Always registered; the
      // editingHighlight setting controls if and how often it recomputes.
      registerEditingHighlight() {
        let view, state, language;
        try {
          view = require("@codemirror/view");
          state = require("@codemirror/state");
          language = require("@codemirror/language");
        } catch (e) {
          console.warn("Heading Linker: CM6 modules unavailable, editor highlight disabled", e);
          return;
        }
        const { ViewPlugin, Decoration } = view;
        const { RangeSetBuilder, StateEffect } = state;
        const { syntaxTree } = language;
        const plugin = this;
        const refresh = StateEffect.define();
        this.cmRefreshEffect = refresh;
        const markCache = /* @__PURE__ */ new Map();
        const markFor = (linktext) => {
          let m = markCache.get(linktext);
          if (!m) {
            m = Decoration.mark({ class: "cm-heading-link", attributes: { "data-heading-target": linktext } });
            markCache.set(linktext, m);
          }
          return m;
        };
        const markWithAlts = (linktext, alts) => Decoration.mark({
          class: "cm-heading-link cm-heading-ambiguous",
          attributes: { "data-heading-target": linktext, "data-heading-alts": alts.join("\n"), "aria-label": t2("highlight.matches", { terms: [linktext, ...alts].join(", ") }) }
        });
        const skipNode = (name) => /code|link|url|header|hashtag|frontmatter|comment|tag|escape/i.test(name);
        const buildDeco = (editorView) => {
          const builder = new RangeSetBuilder();
          const activeFile = plugin.app.workspace.getActiveFile();
          if (activeFile && !plugin.inScope(activeFile.path))
            return builder.finish();
          const currentFile = activeFile ? plugin.currentFileBase(activeFile.path) : null;
          const tree = syntaxTree(editorView.state);
          for (const { from, to } of editorView.visibleRanges) {
            const text = editorView.state.doc.sliceString(from, to);
            for (const m of plugin.findMatches(text, currentFile)) {
              const start = from + m.start;
              const end = from + m.end;
              let skip = false;
              tree.iterate({ from: start, to: end, enter: (n) => {
                if (skipNode(n.type.name))
                  skip = true;
              } });
              if (!skip)
                builder.add(start, end, m.alts && m.alts.length ? markWithAlts(m.linktext, m.alts) : markFor(m.linktext));
            }
          }
          return builder.finish();
        };
        const targetEl = (e) => e.target instanceof HTMLElement ? e.target.closest(".cm-heading-link") : null;
        const linktextOf = (el) => el.getAttribute("data-heading-target");
        const altsOf = (el) => {
          const v = el.getAttribute("data-heading-alts");
          return v ? v.split("\n") : null;
        };
        const editorLp = longPressTracker(fireContextMenu);
        const vp = ViewPlugin.fromClass(
          class {
            constructor(v) {
              this.decorations = plugin.settings.editingHighlight === "off" ? Decoration.none : buildDeco(v);
            }
            update(u) {
              const mode = plugin.settings.editingHighlight;
              if (mode === "off") {
                if (this.decorations.size)
                  this.decorations = Decoration.none;
                return;
              }
              const forced = u.transactions.some((tr) => tr.effects.some((e) => e.is(refresh)));
              if (u.viewportChanged || forced || mode === "live" && (u.docChanged || u.selectionSet)) {
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
                if (!el)
                  return;
                const file = plugin.app.workspace.getActiveFile();
                const sourcePath = file ? file.path : "";
                const alts = altsOf(el);
                const candidates = alts && alts.length ? [linktextOf(el), ...alts] : [linktextOf(el)];
                if (e.button === 1) {
                  plugin.chooseTerm(candidates, t2("menu.openNewTabTitle"), (c) => plugin.openTerm(c, sourcePath, true));
                  e.preventDefault();
                  return;
                }
                if (e.button !== 0 || !(e.ctrlKey || e.metaKey))
                  return;
                plugin.chooseTerm(candidates, t2("menu.openTitle"), (c) => plugin.openTerm(c, sourcePath, false));
                e.preventDefault();
              },
              mouseover(e) {
                const el = targetEl(e);
                if (!el)
                  return;
                if (el.hasAttribute("data-heading-alts"))
                  return;
                const file = plugin.app.workspace.getActiveFile();
                plugin.hoverTerm(e, el, linktextOf(el), file ? file.path : "");
              },
              contextmenu(e, view2) {
                const el = targetEl(e);
                if (!el)
                  return;
                const file = plugin.app.workspace.getActiveFile();
                plugin.showLinkMenu(e, linktextOf(el), el.textContent, file, view2.posAtDOM(el), void 0, altsOf(el));
              },
              touchstart(e) {
                if (!Platform.isMobile)
                  return;
                const el = targetEl(e);
                if (el)
                  editorLp.start(e.touches[0], el);
              },
              touchmove(e) {
                editorLp.move(e.touches[0]);
              },
              touchend: editorLp.cancel,
              touchcancel: editorLp.cancel
            }
          }
        );
        this.registerEditorExtension(vp);
      }
    };
  }
});

// src/modals.js
var require_modals = __commonJS({
  "src/modals.js"(exports2, module2) {
    "use strict";
    var { Modal } = require("obsidian");
    var { t: t2 } = require_i18n();
    var { inTableCell: inTableCell2 } = require_markdown();
    var SKIP = " skip";
    var MaterializePreviewModal = class extends Modal {
      constructor(app, files, plugin, onApply) {
        super(app);
        this.files = files;
        this.plugin = plugin;
        this.onApply = onApply;
        this.groups = /* @__PURE__ */ new Map();
        for (const fc of files) {
          for (const m of fc.matches) {
            if (!(m.alts && m.alts.length))
              continue;
            const key = m.display.toLowerCase();
            if (!this.groups.has(key))
              this.groups.set(key, { display: m.display, candidates: [m.linktext, ...m.alts], choice: m.linktext, spans: [] });
          }
        }
      }
      onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h3", { text: t2("modal.materialize.title") });
        const total = this.files.reduce((n, f) => n + f.matches.length, 0);
        contentEl.createEl("p", { text: t2("modal.materialize.summary", { files: this.files.length, replacements: total }) });
        if (this.groups.size) {
          contentEl.createEl("p", { cls: "heading-section-desc", text: t2("modal.materialize.ambiguous", { n: this.groups.size }) });
          const panel = contentEl.createDiv({ cls: "heading-resolve-panel" });
          for (const g of this.groups.values()) {
            const row = panel.createDiv({ cls: "heading-resolve-row" });
            row.createSpan({ cls: "heading-resolve-word", text: g.display });
            row.createSpan({ text: "\u2192" });
            const sel = row.createEl("select", { cls: "heading-term-select" });
            for (const term of g.candidates)
              sel.createEl("option", { text: term, value: term });
            sel.createEl("option", { text: t2("modal.skipOption"), value: SKIP });
            sel.value = g.choice;
            sel.onchange = () => {
              g.choice = sel.value === SKIP ? null : sel.value;
              g.spans.forEach((upd) => upd());
            };
          }
        }
        this.files.forEach((fc) => {
          contentEl.createDiv({ cls: "heading-preview-file", text: fc.file ? fc.file.path : fc.label || t2("label.selection") });
          const table = contentEl.createEl("table", { cls: "heading-preview-table" });
          fc.matches.slice(0, 50).forEach((m) => {
            const inTable = inTableCell2(fc.original, m.start);
            const tr = table.createEl("tr");
            tr.createEl("td", { text: m.display });
            tr.createEl("td", { text: "\u2192" });
            const after = tr.createEl("td");
            if (m.alts && m.alts.length) {
              tr.addClass("heading-ambiguous-row");
              const g = this.groups.get(m.display.toLowerCase());
              const render = () => after.setText(g.choice == null ? t2("modal.leftAsText") : this.plugin.wikiLink(g.choice, m.display, inTable));
              g.spans.push(render);
              render();
            } else {
              after.setText(this.plugin.wikiLink(m.linktext, m.display, inTable));
            }
          });
          if (fc.matches.length > 50)
            contentEl.createEl("div", { cls: "heading-preview-empty", text: t2("modal.andMore", { n: fc.matches.length - 50 }) });
        });
        const buttons = contentEl.createDiv({ cls: "heading-preview-buttons" });
        const apply = buttons.createEl("button", { text: t2("btn.apply"), cls: "mod-cta" });
        apply.onclick = async () => {
          const results = this.files.map((fc) => {
            const chosen = [];
            for (const m of fc.matches) {
              if (m.alts && m.alts.length) {
                const g = this.groups.get(m.display.toLowerCase());
                if (!g || g.choice == null)
                  continue;
                chosen.push(g.choice === m.linktext ? m : { ...m, linktext: g.choice });
              } else {
                chosen.push(m);
              }
            }
            const { newText } = this.plugin.applyLinks(fc.original, chosen);
            return { file: fc.file, label: fc.label, original: fc.original, newText, count: chosen.length };
          });
          await this.onApply(results);
          this.close();
        };
        buttons.createEl("button", { text: t2("btn.cancel") }).onclick = () => this.close();
      }
      onClose() {
        this.contentEl.empty();
      }
    };
    var UnlinkPreviewModal = class extends Modal {
      constructor(app, files, plugin, onApply) {
        super(app);
        this.files = files;
        this.plugin = plugin;
        this.onApply = onApply;
      }
      onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h3", { text: t2("modal.unlink.title") });
        const total = this.files.reduce((n, f) => n + f.matches.length, 0);
        contentEl.createEl("p", { text: t2("modal.unlink.summary", { files: this.files.length, links: total }) });
        this.files.forEach((fc) => {
          contentEl.createDiv({ cls: "heading-preview-file", text: fc.file ? fc.file.path : fc.label || t2("label.selection") });
          const table = contentEl.createEl("table", { cls: "heading-preview-table" });
          fc.matches.slice(0, 50).forEach((m) => {
            const tr = table.createEl("tr");
            tr.createEl("td", { text: m.source });
            tr.createEl("td", { text: "\u2192" });
            tr.createEl("td", { text: m.display });
          });
          if (fc.matches.length > 50)
            contentEl.createEl("div", { cls: "heading-preview-empty", text: t2("modal.andMore", { n: fc.matches.length - 50 }) });
        });
        const buttons = contentEl.createDiv({ cls: "heading-preview-buttons" });
        const apply = buttons.createEl("button", { text: t2("btn.apply"), cls: "mod-cta" });
        apply.onclick = async () => {
          const results = this.files.map((fc) => {
            const { newText, count } = this.plugin.unlinkLinks(fc.original, fc.matches);
            return { file: fc.file, label: fc.label, original: fc.original, newText, count };
          });
          await this.onApply(results);
          this.close();
        };
        buttons.createEl("button", { text: t2("btn.cancel") }).onclick = () => this.close();
      }
      onClose() {
        this.contentEl.empty();
      }
    };
    var ChooseTermModal = class extends Modal {
      constructor(app, opts) {
        super(app);
        this.opts = opts;
      }
      onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h3", { text: this.opts.title || t2("modal.choose.title") });
        contentEl.createEl("p", { text: t2("modal.choose.body") });
        const list = contentEl.createDiv({ cls: "heading-choose-list" });
        for (const term of this.opts.terms) {
          const b = list.createEl("button", { text: term, cls: "heading-choose-item" });
          b.onclick = async () => {
            await this.opts.onChoose(term);
            this.close();
          };
        }
        contentEl.createDiv({ cls: "heading-preview-buttons" }).createEl("button", { text: t2("btn.cancel") }).onclick = () => this.close();
      }
      onClose() {
        this.contentEl.empty();
      }
    };
    module2.exports = { MaterializePreviewModal, UnlinkPreviewModal, ChooseTermModal };
  }
});

// src/materialize.js
var require_materialize = __commonJS({
  "src/materialize.js"(exports2, module2) {
    "use strict";
    var { Menu, Notice: Notice2 } = require("obsidian");
    var { splitLines: splitLines2 } = require_markdown();
    var { MaterializePreviewModal, UnlinkPreviewModal, ChooseTermModal } = require_modals();
    var { t: t2, plural: plural2 } = require_i18n();
    module2.exports = {
      collectMatches(text, currentFile) {
        const matches = this.findMatches(text, currentFile, { protect: true });
        if (!this.settings.linkFirstOnly)
          return matches;
        const seen = /* @__PURE__ */ new Set();
        const out = [];
        for (const m of matches) {
          if (seen.has(m.linktext))
            continue;
          seen.add(m.linktext);
          out.push(m);
        }
        return out;
      },
      openMaterializePreview(files, onApply) {
        new MaterializePreviewModal(this.app, files, this, onApply).open();
      },
      // Write each result, skipping notes edited since the preview was built.
      async writeScopeResults(results) {
        let total = 0;
        let skipped = 0;
        for (const r of results) {
          let written = false;
          await this.app.vault.process(r.file, (data) => {
            if (data !== r.original)
              return data;
            written = true;
            return r.newText;
          });
          if (written)
            total += r.count;
          else
            skipped++;
        }
        let msg = t2("notice.scopeWritten", { files: plural2("file", results.length - skipped), links: plural2("link", total) });
        if (skipped)
          msg += t2("notice.scopeSkipped", { n: skipped });
        new Notice2(msg);
        this.updateStatusBar();
      },
      async materializeCurrent() {
        const file = this.app.workspace.getActiveFile();
        if (!file) {
          new Notice2(t2("notice.noActiveNote"));
          return;
        }
        const text = await this.app.vault.cachedRead(file);
        const matches = this.collectMatches(text, this.currentFileBase(file.path));
        if (!matches.length) {
          new Notice2(t2("notice.noMatches"));
          return;
        }
        this.openMaterializePreview([{ file, original: text, matches }], async (results) => {
          const r = results[0];
          let written = false;
          await this.app.vault.process(r.file, (data) => {
            if (data !== r.original)
              return data;
            written = true;
            return r.newText;
          });
          if (!written) {
            new Notice2(t2("notice.noteChanged"));
            return;
          }
          new Notice2(t2("notice.linksCreated", { links: plural2("link", r.count) }));
          this.updateStatusBar();
        });
      },
      materializeSelection(editor) {
        const sel = editor.getSelection();
        if (!sel) {
          new Notice2(t2("notice.noSelection"));
          return;
        }
        const file = this.app.workspace.getActiveFile();
        const matches = this.collectMatches(sel, file ? this.currentFileBase(file.path) : null);
        if (!matches.length) {
          new Notice2(t2("notice.noMatches"));
          return;
        }
        this.openMaterializePreview([{ file: null, original: sel, matches, label: t2("label.selection") }], (results) => {
          editor.replaceSelection(results[0].newText);
          new Notice2(t2("notice.linksCreated", { links: plural2("link", results[0].count) }));
        });
      },
      async scanScopeMatches(compute) {
        const files = this.getScopeFiles();
        const out = [];
        const notice = new Notice2(t2("notice.scanning"), 0);
        try {
          for (let i = 0; i < files.length; i++) {
            if (i % 25 === 0)
              notice.setMessage(t2("notice.scanningProgress", { current: i + 1, total: files.length }));
            const file = files[i];
            const text = await this.app.vault.cachedRead(file);
            const matches = compute(text, file);
            if (matches.length)
              out.push({ file, original: text, matches });
          }
        } finally {
          notice.hide();
        }
        return out;
      },
      async materializeScope() {
        const files = await this.scanScopeMatches((text, file) => this.collectMatches(text, this.currentFileBase(file.path)));
        if (!files.length) {
          new Notice2(t2("notice.noMatches"));
          return;
        }
        this.openMaterializePreview(files, (results) => this.writeScopeResults(results));
      },
      // Heading links in `text` that unlink can revert: each resolves to a glossary file and
      // carries a #heading subpath (the links this plugin creates). Offsets are into `text`.
      findHeadingLinks(text, sourcePath) {
        const ranges = this.codeFrontmatterRanges(text);
        const re = /\[\[([^\]\n]+)\]\]/g;
        const out = [];
        let m;
        while ((m = re.exec(text)) !== null) {
          const start = m.index;
          const end = m.index + m[0].length;
          if (this.overlapsProtected(ranges, start, end))
            continue;
          const parsed = this.parseHeadingInner(m[1]);
          if (!parsed)
            continue;
          const dest = this.app.metadataCache.getFirstLinkpathDest(parsed.target, sourcePath || "");
          if (!dest || !this.isGlossaryFile(dest))
            continue;
          out.push({ start, end, linktext: `${dest.basename}#${parsed.subpath}`, display: parsed.display, source: m[0] });
        }
        return out;
      },
      openUnlinkPreview(files, onApply) {
        new UnlinkPreviewModal(this.app, files, this, onApply).open();
      },
      async unlinkCurrent() {
        const file = this.app.workspace.getActiveFile();
        if (!file) {
          new Notice2(t2("notice.noActiveNote"));
          return;
        }
        const text = await this.app.vault.cachedRead(file);
        const links = this.findHeadingLinks(text, file.path);
        if (!links.length) {
          new Notice2(t2("notice.noHeadingLinks"));
          return;
        }
        this.openUnlinkPreview([{ file, original: text, matches: links }], (results) => this.writeScopeResults(results));
      },
      unlinkSelection(editor) {
        const sel = editor.getSelection();
        if (!sel) {
          new Notice2(t2("notice.noSelection"));
          return;
        }
        const file = this.app.workspace.getActiveFile();
        const links = this.findHeadingLinks(sel, file ? file.path : "");
        if (!links.length) {
          new Notice2(t2("notice.noHeadingLinks"));
          return;
        }
        this.openUnlinkPreview([{ file: null, original: sel, matches: links, label: t2("label.selection") }], (results) => {
          editor.replaceSelection(results[0].newText);
          new Notice2(t2("notice.linksRemoved", { links: plural2("link", results[0].count) }));
        });
      },
      async unlinkScope() {
        const files = await this.scanScopeMatches((text, file) => this.findHeadingLinks(text, file.path));
        if (!files.length) {
          new Notice2(t2("notice.noHeadingLinks"));
          return;
        }
        this.openUnlinkPreview(files, (results) => this.writeScopeResults(results));
      },
      chooseTerm(candidates, title, action) {
        const list = (candidates || []).filter(Boolean);
        if (list.length <= 1)
          return action(list[0]);
        new ChooseTermModal(this.app, { title, terms: list, onChoose: action }).open();
      },
      showLinkMenu(evt, linktext, display, file, nearOffset, occurrence, alts) {
        const sourcePath = file ? file.path : "";
        const candidates = alts && alts.length ? [linktext, ...alts] : [linktext];
        const label = this.labelOf(linktext);
        const groups = [];
        if (file && this.settings.menuTurnInto) {
          const scope = this.settings.linkFirstOnly ? t2("scope.first") : t2("scope.all");
          groups.push((menu2) => {
            menu2.addItem((i) => i.setTitle(t2("menu.linkToHeading")).setIcon("link").onClick(() => this.chooseTerm(
              candidates,
              t2("menu.linkDisplayTo", { display }),
              (c) => this.materializeSingle(file, linktext, display, nearOffset, occurrence, c)
            )));
            menu2.addItem((i) => i.setTitle(t2("menu.linkScopeThisNote", { scope, display })).setIcon("links-coming-in").onClick(() => this.chooseTerm(
              candidates,
              t2("menu.linkScopeTo", { scope, display }),
              (c) => this.materializeTerm(file, linktext, c)
            )));
            menu2.addItem((i) => i.setTitle(t2("menu.linkScopeAllNotes", { scope, display })).setIcon("links-going-out").onClick(() => this.chooseTerm(
              candidates,
              t2("menu.linkScopeTo", { scope, display }),
              (c) => this.materializeTermScope(linktext, c)
            )));
          });
        }
        if (this.settings.menuExclude) {
          groups.push((menu2) => this.addExclusionMenuItem(menu2, label));
        }
        if (this.settings.menuOpen) {
          groups.push((menu2) => {
            menu2.addItem((i) => i.setTitle(t2("menu.openNote")).setIcon("file-text").onClick(() => this.chooseTerm(candidates, t2("menu.openTitle"), (c) => this.openTerm(c, sourcePath, false))));
            menu2.addItem((i) => i.setTitle(t2("menu.openNewTab")).setIcon("file-plus").onClick(() => this.chooseTerm(candidates, t2("menu.openNewTabTitle"), (c) => this.openTerm(c, sourcePath, true))));
          });
        }
        if (!groups.length)
          return false;
        const menu = new Menu();
        groups.forEach((group, i) => {
          if (i)
            menu.addSeparator();
          group(menu);
        });
        evt.preventDefault();
        menu.showAtMouseEvent(evt);
        return true;
      },
      isExcluded(value) {
        const v = value.toLowerCase();
        return splitLines2(this.settings.excludeTerms).some((l) => l.toLowerCase() === v);
      },
      // Toggle `value` (a heading text) in the excluded-headings list. A prefix is used for
      // native menus (brand-prefixed wording); the plugin's own menu passes none.
      addExclusionMenuItem(menu, value, prefix = "") {
        const noun = t2("exclude.terms");
        if (this.isExcluded(value)) {
          menu.addItem((i) => i.setTitle(t2(prefix ? "exclude.removePrefixed" : "exclude.remove", { value, noun })).setIcon("rotate-ccw").onClick(() => this.setExcluded(value, false)));
        } else {
          menu.addItem((i) => i.setTitle(t2(prefix ? "exclude.addPrefixed" : "exclude.add", { value, noun })).setIcon("trash-2").onClick(() => this.setExcluded(value, true)));
        }
      },
      async setExcluded(value, add) {
        const v = value.toLowerCase();
        const lines = splitLines2(this.settings.excludeTerms);
        const has = lines.some((l) => l.toLowerCase() === v);
        if (add === has) {
          new Notice2(t2(add ? "notice.alreadyExcluded" : "notice.wasNotExcluded", { value }));
          return;
        }
        this.settings.excludeTerms = (add ? [...lines, value] : lines.filter((l) => l.toLowerCase() !== v)).join("\n");
        await this.saveSettings();
        this.rebuildIndex();
        this.rerenderViews();
        this.updateStatusBar();
        new Notice2(t2(add ? "notice.addedToExcluded" : "notice.removedFromExcluded", { value, where: t2("exclude.terms") }));
      },
      // linkAs (optional) overrides which heading the occurrence links to — used when a
      // word matches several headings and the user picks an alternative from the menu.
      async materializeSingle(file, linktext, display, nearOffset, occurrence, linkAs) {
        let created = false;
        await this.app.vault.process(file, (text) => {
          const matches = this.findMatches(text, this.currentFileBase(file.path), { protect: true }).filter((m) => m.linktext === linktext && m.display === display);
          if (!matches.length)
            return text;
          let target = matches[0];
          if (occurrence != null && matches[occurrence]) {
            target = matches[occurrence];
          } else if (nearOffset != null) {
            target = matches.reduce((best, m) => Math.abs(m.start - nearOffset) < Math.abs(best.start - nearOffset) ? m : best, matches[0]);
          }
          const chosen = linkAs && linkAs !== target.linktext ? { ...target, linktext: linkAs } : target;
          created = true;
          return this.applyLinks(text, [chosen]).newText;
        });
        if (!created) {
          new Notice2(t2("notice.occurrenceNotFound"));
          return;
        }
        new Notice2(t2("notice.linkCreatedSingle"));
        this.updateStatusBar();
      },
      async materializeTerm(file, linktext, linkAs) {
        let count = 0;
        await this.app.vault.process(file, (text) => {
          let matches = this.findMatches(text, this.currentFileBase(file.path), { protect: true }).filter((m) => m.linktext === linktext);
          if (!matches.length)
            return text;
          if (this.settings.linkFirstOnly)
            matches = matches.slice(0, 1);
          if (linkAs && linkAs !== linktext)
            matches = matches.map((m) => ({ ...m, linktext: linkAs }));
          count = matches.length;
          return this.applyLinks(text, matches).newText;
        });
        if (!count) {
          new Notice2(t2("notice.noOccurrences"));
          return;
        }
        new Notice2(t2("notice.linksCreated", { links: plural2("link", count) }));
        this.updateStatusBar();
      },
      async materializeTermScope(linktext, linkAs) {
        const term = linkAs || linktext;
        const files = await this.scanScopeMatches((text, file) => {
          let matches = this.findMatches(text, this.currentFileBase(file.path), { protect: true }).filter((m) => m.linktext === linktext);
          if (this.settings.linkFirstOnly)
            matches = matches.slice(0, 1);
          return matches.map((m) => ({ ...m, linktext: term, alts: null }));
        });
        if (!files.length) {
          new Notice2(t2("notice.noOccurrences"));
          return;
        }
        this.openMaterializePreview(files, (results) => this.writeScopeResults(results));
      }
    };
  }
});

// src/heading-suggest.js
var require_heading_suggest = __commonJS({
  "src/heading-suggest.js"(exports2, module2) {
    "use strict";
    var { EditorSuggest } = require("obsidian");
    var { t: t2 } = require_i18n();
    var { inTableCell: inTableCell2 } = require_markdown();
    var HeadingSuggest2 = class extends EditorSuggest {
      constructor(app, plugin) {
        super(app);
        this.plugin = plugin;
      }
      onTrigger(cursor, editor, file) {
        const plugin = this.plugin;
        if (!plugin.settings.linkSuggest)
          return null;
        if (!file || !plugin.inScope(file.path))
          return null;
        const line = editor.getLine(cursor.line);
        if (/[\p{L}\p{Nd}]/u.test(line[cursor.ch] || ""))
          return null;
        const m = line.slice(0, cursor.ch).match(/[\p{L}\p{Nd}]+$/u);
        if (!m)
          return null;
        const query = m[0];
        if (query.length < Math.max(1, plugin.settings.suggestMinChars || 1))
          return null;
        const before = line[cursor.ch - query.length - 1] || "";
        if (before && (plugin.settings.suggestSkipAfter || "").includes(before))
          return null;
        const off = editor.posToOffset(cursor);
        if (plugin.isProtectedAt(editor.getValue(), off))
          return null;
        return { start: { line: cursor.line, ch: cursor.ch - query.length }, end: cursor, query };
      }
      getSuggestions(context) {
        const plugin = this.plugin;
        const q = context.query;
        const qLower = q.toLowerCase();
        const byLink = /* @__PURE__ */ new Map();
        const active = plugin.app.workspace.getActiveFile();
        const ownFile = active ? plugin.currentFileBase(active.path) : null;
        const seenCand = /* @__PURE__ */ new Set();
        for (const key of plugin.keysFor(q)) {
          const bucket = plugin.index.byKey.get(key);
          if (!bucket)
            continue;
          for (const c of bucket) {
            if (c.wordCount !== 1 || seenCand.has(c) || c.fileBase === ownFile)
              continue;
            seenCand.add(c);
            if (!byLink.has(c.linktext))
              byLink.set(c.linktext, { linktext: c.linktext, label: c.label, fileBase: c.fileBase, kind: "form" });
          }
        }
        for (const term of plugin.terms || []) {
          if (byLink.has(term.linktext) || term.fileBase === ownFile)
            continue;
          let form = null;
          if (term.label.toLowerCase().startsWith(qLower))
            form = term.label;
          else if (term.aliases)
            form = term.aliases.find((a) => a.toLowerCase().startsWith(qLower));
          if (form)
            byLink.set(term.linktext, { linktext: term.linktext, label: term.label, fileBase: term.fileBase, kind: "prefix", matchedForm: form });
        }
        const items = [...byLink.values()];
        const rank = (it) => it.kind === "form" ? 0 : 1;
        items.sort((a, b) => rank(a) - rank(b) || a.label.length - b.label.length || a.linktext.localeCompare(b.linktext));
        return items.slice(0, 8);
      }
      renderSuggestion(item, el) {
        el.addClass("heading-suggestion");
        el.createSpan({ cls: "heading-suggestion-title", text: item.label });
        let note = item.fileBase;
        if (item.kind === "form")
          note = t2("suggest.inflection", { file: item.fileBase });
        else if (item.matchedForm && item.matchedForm.toLowerCase() !== item.label.toLowerCase())
          note = t2("suggest.alias", { form: item.matchedForm, file: item.fileBase });
        el.createSpan({ cls: "heading-suggestion-note", text: note });
      }
      selectSuggestion(item) {
        const ctx = this.context;
        if (!ctx)
          return;
        const editor = ctx.editor;
        const display = item.kind === "form" ? ctx.query : item.matchedForm || item.label;
        const inTable = inTableCell2(editor.getValue(), editor.posToOffset(ctx.start));
        const link = this.plugin.wikiLink(item.linktext, display, inTable);
        editor.replaceRange(link, ctx.start, ctx.end);
        editor.setCursor(editor.offsetToPos(editor.posToOffset(ctx.start) + link.length));
      }
    };
    var suggestAvailable2 = () => typeof EditorSuggest === "function";
    module2.exports = { HeadingSuggest: HeadingSuggest2, suggestAvailable: suggestAvailable2 };
  }
});

// src/locales/en.js
var require_en2 = __commonJS({
  "src/locales/en.js"(exports2, module2) {
    "use strict";
    module2.exports = {
      // Commands
      "cmd.linkThisNote": "Link headings: this note",
      "cmd.linkSelection": "Link headings: selection",
      "cmd.linkAllNotes": "Link headings: all notes",
      "cmd.unlinkThisNote": "Unlink headings: this note",
      "cmd.unlinkSelection": "Unlink headings: selection",
      "cmd.unlinkAllNotes": "Unlink headings: all notes",
      "cmd.rebuildIndex": "Rebuild heading index",
      "cmd.addSource": "Add this note to heading sources",
      "cmd.removeSource": "Remove this note from heading sources",
      "cmd.ignoreSource": "Ignore this note as a heading source",
      "cmd.unignoreSource": "Stop ignoring this note as a heading source",
      "cmd.excludeNote": "Never link in this note",
      "cmd.unexcludeNote": "Stop always-excluding this note",
      "cmd.scopeNote": "Include this note in scope",
      "cmd.unscopeNote": "Remove this note from scope",
      "statusBar.aria": "{n} heading(s) on this page \u2014 click to link them",
      "noun.file": "file",
      "noun.folder": "folder",
      "scope.first": "first",
      "scope.all": "all",
      // Native context-menu items (brand prefix "Heading:" kept verbatim)
      "menu.unlinkThisLink": "Heading: unlink this link",
      "menu.addToSources": "Heading: add {noun} to sources",
      "menu.removeFromSources": "Heading: remove {noun} from sources",
      "menu.ignoreSource": "Heading: ignore {noun} as a source",
      "menu.unignoreSource": "Heading: stop ignoring as a source",
      "menu.removeFromAlwaysExcluded": "Heading: remove from always-excluded",
      "menu.addToAlwaysExcluded": "Heading: add {noun} to always-excluded",
      "menu.removeFromScope": "Heading: remove {noun} from scope",
      "menu.includeInScope": "Heading: include {noun} in scope",
      // Plugin's own link menu
      "menu.linkToHeading": "Link to this heading",
      "menu.linkScopeThisNote": 'Link {scope} "{display}" in this note',
      "menu.linkScopeAllNotes": 'Link {scope} "{display}" in all notes',
      "menu.linkDisplayTo": 'Link "{display}" to\u2026',
      "menu.linkScopeTo": 'Link {scope} "{display}" to\u2026',
      "menu.openNote": "Open heading",
      "menu.openNewTab": "Open heading in a new tab",
      "menu.openTitle": "Open which heading?",
      "menu.openNewTabTitle": "Open which heading in a new tab?",
      // Exclusion menu
      "exclude.terms": "excluded headings",
      "exclude.add": 'Add "{value}" to {noun}',
      "exclude.addPrefixed": 'Heading: add "{value}" to {noun}',
      "exclude.remove": 'Remove "{value}" from {noun}',
      "exclude.removePrefixed": 'Heading: remove "{value}" from {noun}',
      // Highlight tooltip
      "highlight.matches": "Matches several headings: {terms}",
      // Modals
      "modal.materialize.title": "Turn words into heading links",
      "modal.materialize.summary": "Reviewing {files} file(s), {replacements} replacement(s).",
      "modal.materialize.ambiguous": "{n} word(s) match more than one heading \u2014 pick one or skip:",
      "modal.leftAsText": "(left as text)",
      "modal.skipOption": "skip",
      "modal.andMore": "\u2026and {n} more",
      "modal.unlink.title": "Unlink heading links",
      "modal.unlink.summary": "Reviewing {files} file(s), {links} link(s).",
      "modal.choose.title": "Which heading?",
      "modal.choose.body": "This word matches more than one heading.",
      "btn.apply": "Apply",
      "btn.cancel": "Cancel",
      "label.selection": "Selection",
      // Notices
      "notice.noActiveNote": "No active note.",
      "notice.noSelection": "Nothing selected.",
      "notice.noMatches": "No headings found in the text.",
      "notice.noHeadingLinks": "No heading links to remove.",
      "notice.noteChanged": "The note changed \u2014 nothing written.",
      "notice.noOccurrences": "No occurrences found.",
      "notice.occurrenceNotFound": "That occurrence was not found.",
      "notice.linkCreatedSingle": "Link created.",
      "notice.linksCreated": "Created {links}.",
      "notice.linksRemoved": "Removed {links}.",
      "notice.unlinked": "Link removed.",
      "notice.scanning": "Scanning notes\u2026",
      "notice.scanningProgress": "Scanning {current}/{total}\u2026",
      "notice.scopeWritten": "Wrote {links} across {files}.",
      "notice.scopeSkipped": " Skipped {n} note(s) changed since the preview.",
      "notice.indexRebuilt": "Heading index rebuilt.",
      "notice.alreadyExcluded": '"{value}" is already excluded.',
      "notice.addedToExcluded": 'Added "{value}" to {where}.',
      "notice.wasNotExcluded": '"{value}" was not excluded.',
      "notice.removedFromExcluded": 'Removed "{value}" from {where}.',
      "notice.pathAddedExcluded": 'Excluded "{entry}".',
      "notice.pathRemovedExcluded": 'No longer excluding "{entry}".',
      "notice.pathAddedScope": 'Added "{entry}" to scope.',
      "notice.pathRemovedScope": 'Removed "{entry}" from scope.',
      "notice.sourceAdded": 'Added "{entry}" to heading sources.',
      "notice.sourceRemoved": 'Removed "{entry}" from heading sources.',
      "notice.ignoreAdded": 'Ignoring "{entry}" as a heading source.',
      "notice.ignoreRemoved": 'No longer ignoring "{entry}".',
      // Autocomplete
      "suggest.inflection": "form of a heading in {file}",
      "suggest.alias": "alias \u201C{form}\u201D \xB7 {file}",
      // Settings — sources
      "set.heading.sources": "Heading sources",
      "set.glossaryMode.name": "Collect headings from",
      "set.glossaryMode.desc": "Which notes contribute their headings as linkable terms.",
      "set.glossaryMode.selected": "Chosen files and folders",
      "set.glossaryMode.vault": "The whole vault",
      "set.glossarySources.name": "Files and folders",
      "set.glossarySources.desc": "Each note here, and each note under a chosen folder, contributes its headings.",
      "set.excludeSources.name": "Ignored sources",
      "set.excludeSources.desc": "Files and folders never used as heading sources, even in whole-vault mode.",
      "set.sourceList.add": "Add a file or folder\u2026",
      "set.sourceList.remove": "Remove",
      "set.sourceList.addAria": "Add source",
      "set.noSourcesStatus": "No sources chosen yet.",
      "set.headingAliases.name": "Heading aliases",
      "set.headingAliases.desc": "Read `%% alias: a, b %%` comments under a heading as extra wordings that link to it. Turn off to skip reading file bodies (faster in very large vaults).",
      // Settings — scope
      "set.heading.scope": "Scope",
      "set.scopeMode.name": "Where to link",
      "set.scopeMode.desc": "Which notes get their words highlighted and linked.",
      "set.scopeMode.folders": "Only chosen folders",
      "set.scopeMode.vault": "The whole vault",
      "set.scopeFolders.name": "Folders in scope",
      "set.scopeFolders.desc": "Only notes under these folders are linked.",
      "set.excludeFolders.name": "Always excluded",
      "set.excludeFolders.desc": "Notes under these folders are never linked.",
      "set.folderList.add": "Add a folder\u2026",
      "set.folderList.remove": "Remove",
      "set.folderList.addAria": "Add folder",
      "set.termsIndexed": "{terms} indexed.",
      // Settings — matching
      "set.heading.matching": "Matching",
      "set.matchMode.name": "Match mode",
      "set.matchMode.desc": "How word forms are reduced before comparing.",
      "set.matchMode.stemmer": "Stemmer (best across forms)",
      "set.matchMode.endingStrip": "Light ending strip",
      "set.matchMode.exact": "Exact (case-insensitive)",
      "set.minTermLength.name": "Minimum heading length",
      "set.minTermLength.desc": "Headings shorter than this are not indexed.",
      "set.smartCase.name": "Smart case for acronyms",
      "set.smartCase.desc": `Match mostly-uppercase headings (like "IT" or "NASA") case-sensitively, so they don't link ordinary words.`,
      "set.headingLevels.name": "Heading levels",
      "set.headingLevels.desc": "Which heading levels (H1\u2013H6) become linkable terms.",
      "set.languages.name": "Languages",
      "set.languages.desc": "{enabled} of {total} enabled",
      "set.languages.invalidSuffix": ", {n} invalid",
      "set.languages.show": "Show languages",
      "set.languages.hide": "Hide languages",
      "set.lang.higher": "Higher priority",
      "set.lang.lower": "Lower priority",
      "set.lang.invalid": "Invalid: {error}",
      "set.linkFirstOnly.name": "Link first occurrence only",
      "set.linkFirstOnly.desc": "Link only the first mention of each heading per note.",
      "set.excludeTerms.name": "Excluded headings",
      "set.excludeTerms.desc": "Heading texts to drop from the index entirely, one per line. Their word forms stop linking too.",
      // Settings — highlighting
      "set.heading.highlighting": "Highlighting",
      "set.highlightInReading.name": "Highlight in Reading view",
      "set.highlightInReading.desc": "Underline matched words in rendered notes.",
      "set.editingHighlight.name": "Highlight in the editor",
      "set.editingHighlight.desc": "Underline matched words while editing.",
      "set.editingHighlight.off": "Off",
      "set.editingHighlight.live": "Live",
      "set.editingHighlight.onSave": "On save",
      "set.skipHeadings.name": "Skip headings",
      "set.skipHeadings.desc": "Don't link words inside a note's own headings.",
      "set.statusBar.name": "Status bar count",
      "set.statusBar.desc": "Show how many headings the current note mentions.",
      "set.statusBarIncludeLinks.name": "Count existing links too",
      "set.statusBarIncludeLinks.desc": "Include headings already linked in the status-bar count.",
      // Settings — autocomplete
      "set.heading.autocomplete": "Autocomplete",
      "set.linkSuggest.name": "Suggest links while typing",
      "set.linkSuggest.desc": "Offer to complete a word into a heading link as you type.",
      "set.suggestMinChars.name": "Minimum typed length",
      "set.suggestMinChars.desc": "How many characters to type before suggestions appear.",
      "set.suggestSkipAfter.name": "Skip after characters",
      "set.suggestSkipAfter.desc": "Don't suggest when the word follows one of these characters.",
      // Settings — context menu
      "set.heading.contextMenu": "Context menu",
      "set.menuTurnInto.name": "Link actions",
      "set.menuTurnInto.desc": 'Offer "link to this heading" items on a highlighted word.',
      "set.menuOpen.name": "Open actions",
      "set.menuOpen.desc": 'Offer "open heading" items on a highlighted word.',
      "set.menuExclude.name": "Exclude actions",
      "set.menuExclude.desc": 'Offer "exclude word/heading" items.',
      "set.menuUnlink.name": "Unlink action",
      "set.menuUnlink.desc": 'Offer "unlink this link" on a heading link.',
      // Settings — maintenance
      "set.heading.maintenance": "Maintenance",
      "set.rebuild.name": "Rebuild index",
      "set.rebuild.desc": "Re-scan the glossary files for headings.",
      "set.rebuild.button": "Rebuild",
      // Plurals
      "plural.term": { one: "{n} heading", other: "{n} headings" },
      "plural.file": { one: "{n} file", other: "{n} files" },
      "plural.link": { one: "{n} link", other: "{n} links" }
    };
  }
});

// src/locales/ru.js
var require_ru2 = __commonJS({
  "src/locales/ru.js"(exports2, module2) {
    "use strict";
    module2.exports = {
      "cmd.linkThisNote": "\u0421\u0432\u044F\u0437\u0430\u0442\u044C \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0438: \u044D\u0442\u0430 \u0437\u0430\u043C\u0435\u0442\u043A\u0430",
      "cmd.linkSelection": "\u0421\u0432\u044F\u0437\u0430\u0442\u044C \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0438: \u0432\u044B\u0434\u0435\u043B\u0435\u043D\u0438\u0435",
      "cmd.linkAllNotes": "\u0421\u0432\u044F\u0437\u0430\u0442\u044C \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0438: \u0432\u0441\u0435 \u0437\u0430\u043C\u0435\u0442\u043A\u0438",
      "cmd.unlinkThisNote": "\u0423\u0431\u0440\u0430\u0442\u044C \u0441\u0441\u044B\u043B\u043A\u0438 \u043D\u0430 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0438: \u044D\u0442\u0430 \u0437\u0430\u043C\u0435\u0442\u043A\u0430",
      "cmd.unlinkSelection": "\u0423\u0431\u0440\u0430\u0442\u044C \u0441\u0441\u044B\u043B\u043A\u0438 \u043D\u0430 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0438: \u0432\u044B\u0434\u0435\u043B\u0435\u043D\u0438\u0435",
      "cmd.unlinkAllNotes": "\u0423\u0431\u0440\u0430\u0442\u044C \u0441\u0441\u044B\u043B\u043A\u0438 \u043D\u0430 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0438: \u0432\u0441\u0435 \u0437\u0430\u043C\u0435\u0442\u043A\u0438",
      "cmd.rebuildIndex": "\u041F\u0435\u0440\u0435\u0441\u0442\u0440\u043E\u0438\u0442\u044C \u0438\u043D\u0434\u0435\u043A\u0441 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u043E\u0432",
      "cmd.addSource": "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u044D\u0442\u0443 \u0437\u0430\u043C\u0435\u0442\u043A\u0443 \u0432 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0438 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u043E\u0432",
      "cmd.removeSource": "\u0423\u0431\u0440\u0430\u0442\u044C \u044D\u0442\u0443 \u0437\u0430\u043C\u0435\u0442\u043A\u0443 \u0438\u0437 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u043E\u0432 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u043E\u0432",
      "cmd.ignoreSource": "\u0418\u0433\u043D\u043E\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u044D\u0442\u0443 \u0437\u0430\u043C\u0435\u0442\u043A\u0443 \u043A\u0430\u043A \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A",
      "cmd.unignoreSource": "\u041F\u0435\u0440\u0435\u0441\u0442\u0430\u0442\u044C \u0438\u0433\u043D\u043E\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u044D\u0442\u0443 \u0437\u0430\u043C\u0435\u0442\u043A\u0443 \u043A\u0430\u043A \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A",
      "cmd.excludeNote": "\u041D\u0438\u043A\u043E\u0433\u0434\u0430 \u043D\u0435 \u0441\u0432\u044F\u0437\u044B\u0432\u0430\u0442\u044C \u0432 \u044D\u0442\u043E\u0439 \u0437\u0430\u043C\u0435\u0442\u043A\u0435",
      "cmd.unexcludeNote": "\u041F\u0435\u0440\u0435\u0441\u0442\u0430\u0442\u044C \u0432\u0441\u0435\u0433\u0434\u0430 \u0438\u0441\u043A\u043B\u044E\u0447\u0430\u0442\u044C \u044D\u0442\u0443 \u0437\u0430\u043C\u0435\u0442\u043A\u0443",
      "cmd.scopeNote": "\u0412\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u044D\u0442\u0443 \u0437\u0430\u043C\u0435\u0442\u043A\u0443 \u0432 \u043E\u0431\u043B\u0430\u0441\u0442\u044C",
      "cmd.unscopeNote": "\u0423\u0431\u0440\u0430\u0442\u044C \u044D\u0442\u0443 \u0437\u0430\u043C\u0435\u0442\u043A\u0443 \u0438\u0437 \u043E\u0431\u043B\u0430\u0441\u0442\u0438",
      "statusBar.aria": "\u0417\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u043E\u0432 \u043D\u0430 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0435: {n} \u2014 \u043D\u0430\u0436\u043C\u0438\u0442\u0435, \u0447\u0442\u043E\u0431\u044B \u0441\u0432\u044F\u0437\u0430\u0442\u044C",
      "noun.file": "\u0444\u0430\u0439\u043B",
      "noun.folder": "\u043F\u0430\u043F\u043A\u0443",
      "scope.first": "\u043F\u0435\u0440\u0432\u043E\u0435",
      "scope.all": "\u0432\u0441\u0435",
      "menu.unlinkThisLink": "Heading: \u0443\u0431\u0440\u0430\u0442\u044C \u044D\u0442\u0443 \u0441\u0441\u044B\u043B\u043A\u0443",
      "menu.addToSources": "Heading: \u0434\u043E\u0431\u0430\u0432\u0438\u0442\u044C {noun} \u0432 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0438",
      "menu.removeFromSources": "Heading: \u0443\u0431\u0440\u0430\u0442\u044C {noun} \u0438\u0437 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u043E\u0432",
      "menu.ignoreSource": "Heading: \u0438\u0433\u043D\u043E\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C {noun} \u043A\u0430\u043A \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A",
      "menu.unignoreSource": "Heading: \u043F\u0435\u0440\u0435\u0441\u0442\u0430\u0442\u044C \u0438\u0433\u043D\u043E\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043A\u0430\u043A \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A",
      "menu.removeFromAlwaysExcluded": "Heading: \u0443\u0431\u0440\u0430\u0442\u044C \u0438\u0437 \u0432\u0441\u0435\u0433\u0434\u0430-\u0438\u0441\u043A\u043B\u044E\u0447\u0451\u043D\u043D\u044B\u0445",
      "menu.addToAlwaysExcluded": "Heading: \u0434\u043E\u0431\u0430\u0432\u0438\u0442\u044C {noun} \u0432\u043E \u0432\u0441\u0435\u0433\u0434\u0430-\u0438\u0441\u043A\u043B\u044E\u0447\u0451\u043D\u043D\u044B\u0435",
      "menu.removeFromScope": "Heading: \u0443\u0431\u0440\u0430\u0442\u044C {noun} \u0438\u0437 \u043E\u0431\u043B\u0430\u0441\u0442\u0438",
      "menu.includeInScope": "Heading: \u0432\u043A\u043B\u044E\u0447\u0438\u0442\u044C {noun} \u0432 \u043E\u0431\u043B\u0430\u0441\u0442\u044C",
      "menu.linkToHeading": "\u0421\u0432\u044F\u0437\u0430\u0442\u044C \u0441 \u044D\u0442\u0438\u043C \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u043E\u043C",
      "menu.linkScopeThisNote": "\u0421\u0432\u044F\u0437\u0430\u0442\u044C {scope} \xAB{display}\xBB \u0432 \u044D\u0442\u043E\u0439 \u0437\u0430\u043C\u0435\u0442\u043A\u0435",
      "menu.linkScopeAllNotes": "\u0421\u0432\u044F\u0437\u0430\u0442\u044C {scope} \xAB{display}\xBB \u0432\u043E \u0432\u0441\u0435\u0445 \u0437\u0430\u043C\u0435\u0442\u043A\u0430\u0445",
      "menu.linkDisplayTo": "\u0421\u0432\u044F\u0437\u0430\u0442\u044C \xAB{display}\xBB \u0441\u2026",
      "menu.linkScopeTo": "\u0421\u0432\u044F\u0437\u0430\u0442\u044C {scope} \xAB{display}\xBB \u0441\u2026",
      "menu.openNote": "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A",
      "menu.openNewTab": "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A \u0432 \u043D\u043E\u0432\u043E\u0439 \u0432\u043A\u043B\u0430\u0434\u043A\u0435",
      "menu.openTitle": "\u041A\u0430\u043A\u043E\u0439 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A \u043E\u0442\u043A\u0440\u044B\u0442\u044C?",
      "menu.openNewTabTitle": "\u041A\u0430\u043A\u043E\u0439 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A \u043E\u0442\u043A\u0440\u044B\u0442\u044C \u0432 \u043D\u043E\u0432\u043E\u0439 \u0432\u043A\u043B\u0430\u0434\u043A\u0435?",
      "exclude.terms": "\u0438\u0441\u043A\u043B\u044E\u0447\u0451\u043D\u043D\u044B\u0435 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0438",
      "exclude.add": "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \xAB{value}\xBB \u0432 {noun}",
      "exclude.addPrefixed": "Heading: \u0434\u043E\u0431\u0430\u0432\u0438\u0442\u044C \xAB{value}\xBB \u0432 {noun}",
      "exclude.remove": "\u0423\u0431\u0440\u0430\u0442\u044C \xAB{value}\xBB \u0438\u0437 {noun}",
      "exclude.removePrefixed": "Heading: \u0443\u0431\u0440\u0430\u0442\u044C \xAB{value}\xBB \u0438\u0437 {noun}",
      "highlight.matches": "\u0421\u043E\u0432\u043F\u0430\u0434\u0430\u0435\u0442 \u0441 \u043D\u0435\u0441\u043A\u043E\u043B\u044C\u043A\u0438\u043C\u0438 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0430\u043C\u0438: {terms}",
      "modal.materialize.title": "\u041F\u0440\u0435\u0432\u0440\u0430\u0442\u0438\u0442\u044C \u0441\u043B\u043E\u0432\u0430 \u0432 \u0441\u0441\u044B\u043B\u043A\u0438 \u043D\u0430 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0438",
      "modal.materialize.summary": "\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430: \u0444\u0430\u0439\u043B\u043E\u0432 \u2014 {files}, \u0437\u0430\u043C\u0435\u043D \u2014 {replacements}.",
      "modal.materialize.ambiguous": "{n} \u0441\u043B\u043E\u0432(\u043E) \u0441\u043E\u0432\u043F\u0430\u0434\u0430\u0435\u0442 \u0441 \u043D\u0435\u0441\u043A\u043E\u043B\u044C\u043A\u0438\u043C\u0438 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0430\u043C\u0438 \u2014 \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0438\u043B\u0438 \u043F\u0440\u043E\u043F\u0443\u0441\u0442\u0438\u0442\u0435:",
      "modal.leftAsText": "(\u043E\u0441\u0442\u0430\u0432\u043B\u0435\u043D\u043E \u0442\u0435\u043A\u0441\u0442\u043E\u043C)",
      "modal.skipOption": "\u043F\u0440\u043E\u043F\u0443\u0441\u0442\u0438\u0442\u044C",
      "modal.andMore": "\u2026\u0438 \u0435\u0449\u0451 {n}",
      "modal.unlink.title": "\u0423\u0431\u0440\u0430\u0442\u044C \u0441\u0441\u044B\u043B\u043A\u0438 \u043D\u0430 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0438",
      "modal.unlink.summary": "\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430: \u0444\u0430\u0439\u043B\u043E\u0432 \u2014 {files}, \u0441\u0441\u044B\u043B\u043E\u043A \u2014 {links}.",
      "modal.choose.title": "\u041A\u0430\u043A\u043E\u0439 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A?",
      "modal.choose.body": "\u042D\u0442\u043E \u0441\u043B\u043E\u0432\u043E \u0441\u043E\u0432\u043F\u0430\u0434\u0430\u0435\u0442 \u0441 \u043D\u0435\u0441\u043A\u043E\u043B\u044C\u043A\u0438\u043C\u0438 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0430\u043C\u0438.",
      "btn.apply": "\u041F\u0440\u0438\u043C\u0435\u043D\u0438\u0442\u044C",
      "btn.cancel": "\u041E\u0442\u043C\u0435\u043D\u0430",
      "label.selection": "\u0412\u044B\u0434\u0435\u043B\u0435\u043D\u0438\u0435",
      "notice.noActiveNote": "\u041D\u0435\u0442 \u0430\u043A\u0442\u0438\u0432\u043D\u043E\u0439 \u0437\u0430\u043C\u0435\u0442\u043A\u0438.",
      "notice.noSelection": "\u041D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u0432\u044B\u0434\u0435\u043B\u0435\u043D\u043E.",
      "notice.noMatches": "\u0412 \u0442\u0435\u043A\u0441\u0442\u0435 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u043E\u0432.",
      "notice.noHeadingLinks": "\u041D\u0435\u0442 \u0441\u0441\u044B\u043B\u043E\u043A \u043D\u0430 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0438 \u0434\u043B\u044F \u0443\u0434\u0430\u043B\u0435\u043D\u0438\u044F.",
      "notice.noteChanged": "\u0417\u0430\u043C\u0435\u0442\u043A\u0430 \u0438\u0437\u043C\u0435\u043D\u0438\u043B\u0430\u0441\u044C \u2014 \u043D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u0437\u0430\u043F\u0438\u0441\u0430\u043D\u043E.",
      "notice.noOccurrences": "\u0421\u043E\u0432\u043F\u0430\u0434\u0435\u043D\u0438\u0439 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E.",
      "notice.occurrenceNotFound": "\u042D\u0442\u043E \u0432\u0445\u043E\u0436\u0434\u0435\u043D\u0438\u0435 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E.",
      "notice.linkCreatedSingle": "\u0421\u0441\u044B\u043B\u043A\u0430 \u0441\u043E\u0437\u0434\u0430\u043D\u0430.",
      "notice.linksCreated": "\u0421\u043E\u0437\u0434\u0430\u043D\u043E: {links}.",
      "notice.linksRemoved": "\u0423\u0434\u0430\u043B\u0435\u043D\u043E: {links}.",
      "notice.unlinked": "\u0421\u0441\u044B\u043B\u043A\u0430 \u0443\u0431\u0440\u0430\u043D\u0430.",
      "notice.scanning": "\u041F\u0440\u043E\u0441\u043C\u043E\u0442\u0440 \u0437\u0430\u043C\u0435\u0442\u043E\u043A\u2026",
      "notice.scanningProgress": "\u041F\u0440\u043E\u0441\u043C\u043E\u0442\u0440 {current}/{total}\u2026",
      "notice.scopeWritten": "\u0417\u0430\u043F\u0438\u0441\u0430\u043D\u043E {links} \u0432 {files}.",
      "notice.scopeSkipped": " \u041F\u0440\u043E\u043F\u0443\u0449\u0435\u043D\u043E \u0437\u0430\u043C\u0435\u0442\u043E\u043A, \u0438\u0437\u043C\u0435\u043D\u0451\u043D\u043D\u044B\u0445 \u043F\u043E\u0441\u043B\u0435 \u043F\u0440\u0435\u0432\u044C\u044E: {n}.",
      "notice.indexRebuilt": "\u0418\u043D\u0434\u0435\u043A\u0441 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u043E\u0432 \u043F\u0435\u0440\u0435\u0441\u0442\u0440\u043E\u0435\u043D.",
      "notice.alreadyExcluded": "\xAB{value}\xBB \u0443\u0436\u0435 \u0438\u0441\u043A\u043B\u044E\u0447\u0435\u043D\u043E.",
      "notice.addedToExcluded": "\xAB{value}\xBB \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u043E \u0432 {where}.",
      "notice.wasNotExcluded": "\xAB{value}\xBB \u043D\u0435 \u0431\u044B\u043B\u043E \u0438\u0441\u043A\u043B\u044E\u0447\u0435\u043D\u043E.",
      "notice.removedFromExcluded": "\xAB{value}\xBB \u0443\u0431\u0440\u0430\u043D\u043E \u0438\u0437 {where}.",
      "notice.pathAddedExcluded": "\xAB{entry}\xBB \u0438\u0441\u043A\u043B\u044E\u0447\u0435\u043D\u043E.",
      "notice.pathRemovedExcluded": "\xAB{entry}\xBB \u0431\u043E\u043B\u044C\u0448\u0435 \u043D\u0435 \u0438\u0441\u043A\u043B\u044E\u0447\u0430\u0435\u0442\u0441\u044F.",
      "notice.pathAddedScope": "\xAB{entry}\xBB \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u043E \u0432 \u043E\u0431\u043B\u0430\u0441\u0442\u044C.",
      "notice.pathRemovedScope": "\xAB{entry}\xBB \u0443\u0431\u0440\u0430\u043D\u043E \u0438\u0437 \u043E\u0431\u043B\u0430\u0441\u0442\u0438.",
      "notice.sourceAdded": "\xAB{entry}\xBB \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u043E \u0432 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0438 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u043E\u0432.",
      "notice.sourceRemoved": "\xAB{entry}\xBB \u0443\u0431\u0440\u0430\u043D\u043E \u0438\u0437 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u043E\u0432 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u043E\u0432.",
      "notice.ignoreAdded": "\xAB{entry}\xBB \u0438\u0433\u043D\u043E\u0440\u0438\u0440\u0443\u0435\u0442\u0441\u044F \u043A\u0430\u043A \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A.",
      "notice.ignoreRemoved": "\xAB{entry}\xBB \u0431\u043E\u043B\u044C\u0448\u0435 \u043D\u0435 \u0438\u0433\u043D\u043E\u0440\u0438\u0440\u0443\u0435\u0442\u0441\u044F.",
      "suggest.inflection": "\u0444\u043E\u0440\u043C\u0430 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0430 \u0438\u0437 {file}",
      "suggest.alias": "\u0430\u043B\u0438\u0430\u0441 \xAB{form}\xBB \xB7 {file}",
      "set.heading.sources": "\u0418\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0438 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u043E\u0432",
      "set.glossaryMode.name": "\u041E\u0442\u043A\u0443\u0434\u0430 \u0431\u0440\u0430\u0442\u044C \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0438",
      "set.glossaryMode.desc": "\u041A\u0430\u043A\u0438\u0435 \u0437\u0430\u043C\u0435\u0442\u043A\u0438 \u043E\u0442\u0434\u0430\u044E\u0442 \u0441\u0432\u043E\u0438 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0438 \u043A\u0430\u043A \u0442\u0435\u0440\u043C\u0438\u043D\u044B \u0434\u043B\u044F \u0441\u0441\u044B\u043B\u043E\u043A.",
      "set.glossaryMode.selected": "\u0412\u044B\u0431\u0440\u0430\u043D\u043D\u044B\u0435 \u0444\u0430\u0439\u043B\u044B \u0438 \u043F\u0430\u043F\u043A\u0438",
      "set.glossaryMode.vault": "\u0412\u0441\u0451 \u0445\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0435",
      "set.glossarySources.name": "\u0424\u0430\u0439\u043B\u044B \u0438 \u043F\u0430\u043F\u043A\u0438",
      "set.glossarySources.desc": "\u041A\u0430\u0436\u0434\u0430\u044F \u0437\u0430\u043C\u0435\u0442\u043A\u0430 \u043E\u0442\u0441\u044E\u0434\u0430 \u2014 \u0438 \u043A\u0430\u0436\u0434\u0430\u044F \u0437\u0430\u043C\u0435\u0442\u043A\u0430 \u0432 \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u043E\u0439 \u043F\u0430\u043F\u043A\u0435 \u2014 \u043E\u0442\u0434\u0430\u0451\u0442 \u0441\u0432\u043E\u0438 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0438.",
      "set.excludeSources.name": "\u0418\u0433\u043D\u043E\u0440\u0438\u0440\u0443\u0435\u043C\u044B\u0435 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0438",
      "set.excludeSources.desc": "\u0424\u0430\u0439\u043B\u044B \u0438 \u043F\u0430\u043F\u043A\u0438, \u043D\u0438\u043A\u043E\u0433\u0434\u0430 \u043D\u0435 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u043C\u044B\u0435 \u043A\u0430\u043A \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0438 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u043E\u0432 \u2014 \u0434\u0430\u0436\u0435 \u0432 \u0440\u0435\u0436\u0438\u043C\u0435 \u0432\u0441\u0435\u0433\u043E \u0445\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0430.",
      "set.sourceList.add": "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0444\u0430\u0439\u043B \u0438\u043B\u0438 \u043F\u0430\u043F\u043A\u0443\u2026",
      "set.sourceList.remove": "\u0423\u0431\u0440\u0430\u0442\u044C",
      "set.sourceList.addAria": "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A",
      "set.noSourcesStatus": "\u0418\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0438 \u043F\u043E\u043A\u0430 \u043D\u0435 \u0432\u044B\u0431\u0440\u0430\u043D\u044B.",
      "set.headingAliases.name": "\u0410\u043B\u0438\u0430\u0441\u044B \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u043E\u0432",
      "set.headingAliases.desc": "\u0427\u0438\u0442\u0430\u0442\u044C \u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0438 `%% alias: a, b %%` \u043F\u043E\u0434 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u043E\u043C \u043A\u0430\u043A \u0434\u043E\u043F. \u0444\u043E\u0440\u043C\u0443\u043B\u0438\u0440\u043E\u0432\u043A\u0438, \u0432\u0435\u0434\u0443\u0449\u0438\u0435 \u043D\u0430 \u043D\u0435\u0433\u043E. \u0412\u044B\u043A\u043B\u044E\u0447\u0438\u0442\u0435, \u0447\u0442\u043E\u0431\u044B \u043D\u0435 \u0447\u0438\u0442\u0430\u0442\u044C \u0442\u0435\u043B\u0430 \u0444\u0430\u0439\u043B\u043E\u0432 (\u0431\u044B\u0441\u0442\u0440\u0435\u0435 \u0432 \u043E\u0447\u0435\u043D\u044C \u0431\u043E\u043B\u044C\u0448\u0438\u0445 \u0445\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0430\u0445).",
      "set.heading.scope": "\u041E\u0431\u043B\u0430\u0441\u0442\u044C",
      "set.scopeMode.name": "\u0413\u0434\u0435 \u0441\u0432\u044F\u0437\u044B\u0432\u0430\u0442\u044C",
      "set.scopeMode.desc": "\u0412 \u043A\u0430\u043A\u0438\u0445 \u0437\u0430\u043C\u0435\u0442\u043A\u0430\u0445 \u0441\u043B\u043E\u0432\u0430 \u043F\u043E\u0434\u0441\u0432\u0435\u0447\u0438\u0432\u0430\u044E\u0442\u0441\u044F \u0438 \u043F\u0440\u0435\u0432\u0440\u0430\u0449\u0430\u044E\u0442\u0441\u044F \u0432 \u0441\u0441\u044B\u043B\u043A\u0438.",
      "set.scopeMode.folders": "\u0422\u043E\u043B\u044C\u043A\u043E \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u044B\u0435 \u043F\u0430\u043F\u043A\u0438",
      "set.scopeMode.vault": "\u0412\u0441\u0451 \u0445\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0435",
      "set.scopeFolders.name": "\u041F\u0430\u043F\u043A\u0438 \u0432 \u043E\u0431\u043B\u0430\u0441\u0442\u0438",
      "set.scopeFolders.desc": "\u0421\u0432\u044F\u0437\u044B\u0432\u0430\u044E\u0442\u0441\u044F \u0442\u043E\u043B\u044C\u043A\u043E \u0437\u0430\u043C\u0435\u0442\u043A\u0438 \u0432 \u044D\u0442\u0438\u0445 \u043F\u0430\u043F\u043A\u0430\u0445.",
      "set.excludeFolders.name": "\u0412\u0441\u0435\u0433\u0434\u0430 \u0438\u0441\u043A\u043B\u044E\u0447\u0430\u0442\u044C",
      "set.excludeFolders.desc": "\u0417\u0430\u043C\u0435\u0442\u043A\u0438 \u0432 \u044D\u0442\u0438\u0445 \u043F\u0430\u043F\u043A\u0430\u0445 \u043D\u0435 \u0441\u0432\u044F\u0437\u044B\u0432\u0430\u044E\u0442\u0441\u044F \u043D\u0438\u043A\u043E\u0433\u0434\u0430.",
      "set.folderList.add": "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043F\u0430\u043F\u043A\u0443\u2026",
      "set.folderList.remove": "\u0423\u0431\u0440\u0430\u0442\u044C",
      "set.folderList.addAria": "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043F\u0430\u043F\u043A\u0443",
      "set.termsIndexed": "\u0412 \u0438\u043D\u0434\u0435\u043A\u0441\u0435: {terms}.",
      "set.heading.matching": "\u0421\u043E\u043F\u043E\u0441\u0442\u0430\u0432\u043B\u0435\u043D\u0438\u0435",
      "set.matchMode.name": "\u0420\u0435\u0436\u0438\u043C \u0441\u043E\u043F\u043E\u0441\u0442\u0430\u0432\u043B\u0435\u043D\u0438\u044F",
      "set.matchMode.desc": "\u041A\u0430\u043A \u043F\u0440\u0438\u0432\u043E\u0434\u044F\u0442\u0441\u044F \u0441\u043B\u043E\u0432\u043E\u0444\u043E\u0440\u043C\u044B \u043F\u0435\u0440\u0435\u0434 \u0441\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u0435\u043C.",
      "set.matchMode.stemmer": "\u0421\u0442\u0435\u043C\u043C\u0435\u0440 (\u043B\u0443\u0447\u0448\u0435 \u0434\u043B\u044F \u0432\u0441\u0435\u0445 \u0444\u043E\u0440\u043C)",
      "set.matchMode.endingStrip": "\u041B\u0451\u0433\u043A\u043E\u0435 \u043E\u0442\u0441\u0435\u0447\u0435\u043D\u0438\u0435 \u043E\u043A\u043E\u043D\u0447\u0430\u043D\u0438\u0439",
      "set.matchMode.exact": "\u0422\u043E\u0447\u043D\u043E\u0435 (\u0431\u0435\u0437 \u0443\u0447\u0451\u0442\u0430 \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0430)",
      "set.minTermLength.name": "\u041C\u0438\u043D\u0438\u043C\u0430\u043B\u044C\u043D\u0430\u044F \u0434\u043B\u0438\u043D\u0430 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0430",
      "set.minTermLength.desc": "\u0417\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0438 \u043A\u043E\u0440\u043E\u0447\u0435 \u044D\u0442\u043E\u0433\u043E \u043D\u0435 \u0438\u043D\u0434\u0435\u043A\u0441\u0438\u0440\u0443\u044E\u0442\u0441\u044F.",
      "set.smartCase.name": "\u0423\u043C\u043D\u044B\u0439 \u0440\u0435\u0433\u0438\u0441\u0442\u0440 \u0434\u043B\u044F \u0430\u0431\u0431\u0440\u0435\u0432\u0438\u0430\u0442\u0443\u0440",
      "set.smartCase.desc": "\u0417\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0438 \u0438\u0437 \u0437\u0430\u0433\u043B\u0430\u0432\u043D\u044B\u0445 \u0431\u0443\u043A\u0432 (\u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440 \xABIT\xBB \u0438\u043B\u0438 \xABNASA\xBB) \u0441\u043E\u043F\u043E\u0441\u0442\u0430\u0432\u043B\u044F\u044E\u0442\u0441\u044F \u0441 \u0443\u0447\u0451\u0442\u043E\u043C \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0430, \u0447\u0442\u043E\u0431\u044B \u043D\u0435 \u0446\u0435\u043F\u043B\u044F\u0442\u044C \u043E\u0431\u044B\u0447\u043D\u044B\u0435 \u0441\u043B\u043E\u0432\u0430.",
      "set.headingLevels.name": "\u0423\u0440\u043E\u0432\u043D\u0438 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u043E\u0432",
      "set.headingLevels.desc": "\u041A\u0430\u043A\u0438\u0435 \u0443\u0440\u043E\u0432\u043D\u0438 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u043E\u0432 (H1\u2013H6) \u0441\u0442\u0430\u043D\u043E\u0432\u044F\u0442\u0441\u044F \u0442\u0435\u0440\u043C\u0438\u043D\u0430\u043C\u0438 \u0434\u043B\u044F \u0441\u0441\u044B\u043B\u043E\u043A.",
      "set.languages.name": "\u042F\u0437\u044B\u043A\u0438",
      "set.languages.desc": "\u0412\u043A\u043B\u044E\u0447\u0435\u043D\u043E {enabled} \u0438\u0437 {total}",
      "set.languages.invalidSuffix": ", {n} \u0441 \u043E\u0448\u0438\u0431\u043A\u043E\u0439",
      "set.languages.show": "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u044F\u0437\u044B\u043A\u0438",
      "set.languages.hide": "\u0421\u043A\u0440\u044B\u0442\u044C \u044F\u0437\u044B\u043A\u0438",
      "set.lang.higher": "\u0412\u044B\u0448\u0435 \u043F\u0440\u0438\u043E\u0440\u0438\u0442\u0435\u0442",
      "set.lang.lower": "\u041D\u0438\u0436\u0435 \u043F\u0440\u0438\u043E\u0440\u0438\u0442\u0435\u0442",
      "set.lang.invalid": "\u041E\u0448\u0438\u0431\u043A\u0430: {error}",
      "set.linkFirstOnly.name": "\u0421\u0432\u044F\u0437\u044B\u0432\u0430\u0442\u044C \u0442\u043E\u043B\u044C\u043A\u043E \u043F\u0435\u0440\u0432\u043E\u0435 \u0432\u0445\u043E\u0436\u0434\u0435\u043D\u0438\u0435",
      "set.linkFirstOnly.desc": "\u0421\u0432\u044F\u0437\u044B\u0432\u0430\u0442\u044C \u0442\u043E\u043B\u044C\u043A\u043E \u043F\u0435\u0440\u0432\u043E\u0435 \u0443\u043F\u043E\u043C\u0438\u043D\u0430\u043D\u0438\u0435 \u043A\u0430\u0436\u0434\u043E\u0433\u043E \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0430 \u0432 \u0437\u0430\u043C\u0435\u0442\u043A\u0435.",
      "set.excludeTerms.name": "\u0418\u0441\u043A\u043B\u044E\u0447\u0451\u043D\u043D\u044B\u0435 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0438",
      "set.excludeTerms.desc": "\u0422\u0435\u043A\u0441\u0442\u044B \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u043E\u0432, \u043F\u043E\u043B\u043D\u043E\u0441\u0442\u044C\u044E \u0443\u0431\u0438\u0440\u0430\u0435\u043C\u044B\u0435 \u0438\u0437 \u0438\u043D\u0434\u0435\u043A\u0441\u0430, \u043F\u043E \u043E\u0434\u043D\u043E\u043C\u0443 \u0432 \u0441\u0442\u0440\u043E\u043A\u0435. \u0418\u0445 \u0441\u043B\u043E\u0432\u043E\u0444\u043E\u0440\u043C\u044B \u0442\u043E\u0436\u0435 \u043F\u0435\u0440\u0435\u0441\u0442\u0430\u044E\u0442 \u0441\u0432\u044F\u0437\u044B\u0432\u0430\u0442\u044C\u0441\u044F.",
      "set.heading.highlighting": "\u041F\u043E\u0434\u0441\u0432\u0435\u0442\u043A\u0430",
      "set.highlightInReading.name": "\u041F\u043E\u0434\u0441\u0432\u0435\u0442\u043A\u0430 \u0432 \u0440\u0435\u0436\u0438\u043C\u0435 \u0447\u0442\u0435\u043D\u0438\u044F",
      "set.highlightInReading.desc": "\u041F\u043E\u0434\u0447\u0451\u0440\u043A\u0438\u0432\u0430\u0442\u044C \u0441\u043E\u0432\u043F\u0430\u0432\u0448\u0438\u0435 \u0441\u043B\u043E\u0432\u0430 \u0432 \u043E\u0442\u0440\u0438\u0441\u043E\u0432\u0430\u043D\u043D\u044B\u0445 \u0437\u0430\u043C\u0435\u0442\u043A\u0430\u0445.",
      "set.editingHighlight.name": "\u041F\u043E\u0434\u0441\u0432\u0435\u0442\u043A\u0430 \u0432 \u0440\u0435\u0434\u0430\u043A\u0442\u043E\u0440\u0435",
      "set.editingHighlight.desc": "\u041F\u043E\u0434\u0447\u0451\u0440\u043A\u0438\u0432\u0430\u0442\u044C \u0441\u043E\u0432\u043F\u0430\u0432\u0448\u0438\u0435 \u0441\u043B\u043E\u0432\u0430 \u043F\u0440\u0438 \u0440\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0438.",
      "set.editingHighlight.off": "\u0412\u044B\u043A\u043B",
      "set.editingHighlight.live": "\u041D\u0430 \u043B\u0435\u0442\u0443",
      "set.editingHighlight.onSave": "\u041F\u0440\u0438 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u0438",
      "set.skipHeadings.name": "\u041F\u0440\u043E\u043F\u0443\u0441\u043A\u0430\u0442\u044C \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0438",
      "set.skipHeadings.desc": "\u041D\u0435 \u0441\u0432\u044F\u0437\u044B\u0432\u0430\u0442\u044C \u0441\u043B\u043E\u0432\u0430 \u0432\u043D\u0443\u0442\u0440\u0438 \u0441\u043E\u0431\u0441\u0442\u0432\u0435\u043D\u043D\u044B\u0445 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u043E\u0432 \u0437\u0430\u043C\u0435\u0442\u043A\u0438.",
      "set.statusBar.name": "\u0421\u0447\u0451\u0442\u0447\u0438\u043A \u0432 \u0441\u0442\u0440\u043E\u043A\u0435 \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u044F",
      "set.statusBar.desc": "\u041F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C, \u0441\u043A\u043E\u043B\u044C\u043A\u043E \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u043E\u0432 \u0443\u043F\u043E\u043C\u044F\u043D\u0443\u0442\u043E \u0432 \u0442\u0435\u043A\u0443\u0449\u0435\u0439 \u0437\u0430\u043C\u0435\u0442\u043A\u0435.",
      "set.statusBarIncludeLinks.name": "\u0421\u0447\u0438\u0442\u0430\u0442\u044C \u0438 \u0443\u0436\u0435 \u0441\u0432\u044F\u0437\u0430\u043D\u043D\u044B\u0435",
      "set.statusBarIncludeLinks.desc": "\u0423\u0447\u0438\u0442\u044B\u0432\u0430\u0442\u044C \u0432 \u0441\u0447\u0451\u0442\u0447\u0438\u043A\u0435 \u0443\u0436\u0435 \u043F\u0440\u043E\u0441\u0442\u0430\u0432\u043B\u0435\u043D\u043D\u044B\u0435 \u0441\u0441\u044B\u043B\u043A\u0438 \u043D\u0430 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0438.",
      "set.heading.autocomplete": "\u0410\u0432\u0442\u043E\u0434\u043E\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u0435",
      "set.linkSuggest.name": "\u041F\u043E\u0434\u0441\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C \u0441\u0441\u044B\u043B\u043A\u0438 \u043F\u0440\u0438 \u043D\u0430\u0431\u043E\u0440\u0435",
      "set.linkSuggest.desc": "\u041F\u0440\u0435\u0434\u043B\u0430\u0433\u0430\u0442\u044C \u043F\u0440\u0435\u0432\u0440\u0430\u0442\u0438\u0442\u044C \u0441\u043B\u043E\u0432\u043E \u0432 \u0441\u0441\u044B\u043B\u043A\u0443 \u043D\u0430 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A \u043F\u043E \u043C\u0435\u0440\u0435 \u043D\u0430\u0431\u043E\u0440\u0430.",
      "set.suggestMinChars.name": "\u041C\u0438\u043D\u0438\u043C\u0443\u043C \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432",
      "set.suggestMinChars.desc": "\u0421\u043A\u043E\u043B\u044C\u043A\u043E \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432 \u043D\u0430\u0431\u0440\u0430\u0442\u044C, \u043F\u0440\u0435\u0436\u0434\u0435 \u0447\u0435\u043C \u043F\u043E\u044F\u0432\u044F\u0442\u0441\u044F \u043F\u043E\u0434\u0441\u043A\u0430\u0437\u043A\u0438.",
      "set.suggestSkipAfter.name": "\u041F\u0440\u043E\u043F\u0443\u0441\u043A\u0430\u0442\u044C \u043F\u043E\u0441\u043B\u0435 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432",
      "set.suggestSkipAfter.desc": "\u041D\u0435 \u043F\u043E\u0434\u0441\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C, \u0435\u0441\u043B\u0438 \u0441\u043B\u043E\u0432\u043E \u0438\u0434\u0451\u0442 \u043F\u043E\u0441\u043B\u0435 \u043E\u0434\u043D\u043E\u0433\u043E \u0438\u0437 \u044D\u0442\u0438\u0445 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432.",
      "set.heading.contextMenu": "\u041A\u043E\u043D\u0442\u0435\u043A\u0441\u0442\u043D\u043E\u0435 \u043C\u0435\u043D\u044E",
      "set.menuTurnInto.name": "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044F \u0441\u0432\u044F\u0437\u044B\u0432\u0430\u043D\u0438\u044F",
      "set.menuTurnInto.desc": "\u041F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C \u043F\u0443\u043D\u043A\u0442\u044B \xAB\u0441\u0432\u044F\u0437\u0430\u0442\u044C \u0441 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u043E\u043C\xBB \u043D\u0430 \u043F\u043E\u0434\u0441\u0432\u0435\u0447\u0435\u043D\u043D\u043E\u043C \u0441\u043B\u043E\u0432\u0435.",
      "set.menuOpen.name": "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044F \u043E\u0442\u043A\u0440\u044B\u0442\u0438\u044F",
      "set.menuOpen.desc": "\u041F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C \u043F\u0443\u043D\u043A\u0442\u044B \xAB\u043E\u0442\u043A\u0440\u044B\u0442\u044C \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A\xBB \u043D\u0430 \u043F\u043E\u0434\u0441\u0432\u0435\u0447\u0435\u043D\u043D\u043E\u043C \u0441\u043B\u043E\u0432\u0435.",
      "set.menuExclude.name": "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044F \u0438\u0441\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F",
      "set.menuExclude.desc": "\u041F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C \u043F\u0443\u043D\u043A\u0442\u044B \xAB\u0438\u0441\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0441\u043B\u043E\u0432\u043E/\u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A\xBB.",
      "set.menuUnlink.name": "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u0440\u0430\u0437\u0432\u044F\u0437\u044B\u0432\u0430\u043D\u0438\u044F",
      "set.menuUnlink.desc": "\u041F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C \xAB\u0443\u0431\u0440\u0430\u0442\u044C \u044D\u0442\u0443 \u0441\u0441\u044B\u043B\u043A\u0443\xBB \u043D\u0430 \u0441\u0441\u044B\u043B\u043A\u0435-\u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0435.",
      "set.heading.maintenance": "\u041E\u0431\u0441\u043B\u0443\u0436\u0438\u0432\u0430\u043D\u0438\u0435",
      "set.rebuild.name": "\u041F\u0435\u0440\u0435\u0441\u0442\u0440\u043E\u0438\u0442\u044C \u0438\u043D\u0434\u0435\u043A\u0441",
      "set.rebuild.desc": "\u0417\u0430\u043D\u043E\u0432\u043E \u043F\u0440\u043E\u0441\u043A\u0430\u043D\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0444\u0430\u0439\u043B\u044B-\u0433\u043B\u043E\u0441\u0441\u0430\u0440\u0438\u0438 \u043D\u0430 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0438.",
      "set.rebuild.button": "\u041F\u0435\u0440\u0435\u0441\u0442\u0440\u043E\u0438\u0442\u044C",
      "plural.term": { one: "{n} \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A", few: "{n} \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0430", many: "{n} \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u043E\u0432", other: "{n} \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0430" },
      "plural.file": { one: "{n} \u0444\u0430\u0439\u043B", few: "{n} \u0444\u0430\u0439\u043B\u0430", many: "{n} \u0444\u0430\u0439\u043B\u043E\u0432", other: "{n} \u0444\u0430\u0439\u043B\u0430" },
      "plural.link": { one: "{n} \u0441\u0441\u044B\u043B\u043A\u0430", few: "{n} \u0441\u0441\u044B\u043B\u043A\u0438", many: "{n} \u0441\u0441\u044B\u043B\u043E\u043A", other: "{n} \u0441\u0441\u044B\u043B\u043A\u0438" }
    };
  }
});

// src/main.js
var { Plugin, Notice, TFile, TFolder, debounce } = require("obsidian");
var { DEFAULT_SETTINGS, sanitizeFolder } = require_constants();
var { splitLines, inTableCell } = require_markdown();
var { BUILTIN_LANGUAGES } = require_builtin_languages();
var { validateLanguage } = require_language_api();
var { HeadingLinkerSettingTab } = require_settings_tab();
var matcher = require_matcher();
var highlight = require_highlight();
var materialize = require_materialize();
var { HeadingSuggest, suggestAvailable } = require_heading_suggest();
var { initI18n, t, plural } = require_i18n();
function parseHeadingAliases(text, headings) {
  const lines = text.split("\n");
  const map = /* @__PURE__ */ new Map();
  for (let i = 0; i < headings.length; i++) {
    const start = headings[i].position.start.line + 1;
    const end = i + 1 < headings.length ? headings[i + 1].position.start.line : lines.length;
    const region = lines.slice(start, end).join("\n");
    const found = [];
    let c;
    const comment = /%%([\s\S]*?)%%/g;
    while ((c = comment.exec(region)) !== null) {
      const am = c[1].match(/^\s*alias(?:es)?\s*:\s*(.+)$/im);
      if (am)
        for (const a of am[1].split(",")) {
          const s = a.trim();
          if (s)
            found.push(s);
        }
    }
    if (found.length) {
      const key = headings[i].heading;
      const set = map.get(key) || /* @__PURE__ */ new Set();
      found.forEach((a) => set.add(a));
      map.set(key, set);
    }
  }
  return new Map([...map].map(([k, v]) => [k, [...v]]));
}
var NOTICE_KEYS = {
  glossarySources: { add: "notice.sourceAdded", remove: "notice.sourceRemoved" },
  excludeSources: { add: "notice.ignoreAdded", remove: "notice.ignoreRemoved" },
  excludeFolders: { add: "notice.pathAddedExcluded", remove: "notice.pathRemovedExcluded" },
  scopeFolders: { add: "notice.pathAddedScope", remove: "notice.pathRemovedScope" }
};
var HeadingLinkerPlugin = class extends Plugin {
  async onload() {
    initI18n({ en: require_en2(), ru: require_ru2() });
    const loaded = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, loaded);
    if (loaded && typeof loaded.glossaryFiles === "string" && loaded.glossarySources === void 0) {
      this.settings.glossarySources = loaded.glossaryFiles;
    }
    this.languages = [];
    this.activeLanguages = [];
    this.languageErrors = [];
    this.index = { byKey: /* @__PURE__ */ new Map(), termCount: 0 };
    this.keysCache = /* @__PURE__ */ new Map();
    this.terms = [];
    this.headingFingerprints = /* @__PURE__ */ new Map();
    this.aliasCache = /* @__PURE__ */ new Map();
    await this.loadLanguages();
    this.rebuildIndex();
    this.scheduleRebuild = debounce(() => {
      this.rebuildIndex();
      this.rerenderViews();
      this.updateStatusBar();
    }, 600, true);
    this.statusBarEl = this.addStatusBarItem();
    this.statusBarEl.addClass("mod-clickable");
    this.registerDomEvent(this.statusBarEl, "click", () => this.materializeCurrent());
    this.updateStatusBarDebounced = debounce(() => this.updateStatusBar(), 400, true);
    this.registerEvent(this.app.workspace.on("file-open", () => this.updateStatusBarDebounced()));
    this.registerEvent(this.app.workspace.on("active-leaf-change", () => this.updateStatusBarDebounced()));
    this.app.workspace.onLayoutReady(async () => {
      await this.loadAliases();
      this.updateStatusBar();
    });
    this.registerEvent(this.app.metadataCache.on("changed", async (file) => {
      if (!this.isGlossaryFile(file))
        return;
      await this.loadFileAliases(file);
      const next = this.fileFingerprint(file);
      if (this.headingFingerprints.get(file.path) === next)
        return;
      this.headingFingerprints.set(file.path, next);
      this.scheduleRebuild();
    }));
    this.registerEvent(this.app.vault.on("create", (file) => {
      if (this.isGlossaryPath(file.path))
        this.scheduleRebuild();
    }));
    this.registerEvent(this.app.vault.on("delete", (file) => {
      if (!this.isGlossaryPath(file.path))
        return;
      this.headingFingerprints.delete(file.path);
      this.aliasCache.delete(file.path);
      this.scheduleRebuild();
    }));
    this.registerEvent(this.app.vault.on("rename", (file, oldPath) => {
      if (!this.isGlossaryPath(file.path) && !this.isGlossaryPath(oldPath))
        return;
      this.headingFingerprints.delete(oldPath);
      this.aliasCache.delete(oldPath);
      this.scheduleRebuild();
    }));
    this.registerEvent(this.app.vault.on("modify", (file) => {
      if (file.extension !== "md")
        return;
      if (this.settings.editingHighlight === "onSave")
        this.refreshEditors();
      const active = this.app.workspace.getActiveFile();
      if (active && active.path === file.path)
        this.updateStatusBarDebounced();
    }));
    this.registerEvent(this.app.workspace.on("editor-menu", (menu, editor) => {
      const link = this.headingLinkAt(editor);
      if (this.settings.menuExclude && link) {
        this.addExclusionMenuItem(menu, this.labelOf(link.linktext), "Heading: ");
      }
      if (this.settings.menuUnlink && link) {
        menu.addItem((i) => i.setTitle(t("menu.unlinkThisLink")).setIcon("unlink").onClick(() => this.unlinkLinkAt(editor, link)));
      }
    }));
    this.registerEvent(this.app.workspace.on("file-menu", (menu, file, source) => {
      if (source === "link-context-menu")
        return;
      const isFolder = file instanceof TFolder;
      if (!isFolder && !(file instanceof TFile && file.extension === "md"))
        return;
      const path = file.path;
      const noun = isFolder ? t("noun.folder") : t("noun.file");
      const item = (title, icon, listKey, add) => menu.addItem((i) => i.setTitle(title).setIcon(icon).onClick(() => this.setPathInList(listKey, path, add)));
      if (this.settings.glossaryMode === "selected") {
        if (this.pathListed("glossarySources", path))
          item(t("menu.removeFromSources", { noun }), "minus-circle", "glossarySources", false);
        else
          item(t("menu.addToSources", { noun }), "plus-circle", "glossarySources", true);
      }
      if (this.pathListed("excludeSources", path))
        item(t("menu.unignoreSource"), "eye", "excludeSources", false);
      else
        item(t("menu.ignoreSource", { noun }), "eye-off", "excludeSources", true);
      if (this.pathListed("excludeFolders", path))
        item(t("menu.removeFromAlwaysExcluded"), "rotate-ccw", "excludeFolders", false);
      else
        item(t("menu.addToAlwaysExcluded", { noun }), "ban", "excludeFolders", true);
      if (this.settings.scopeMode === "folders") {
        if (this.pathListed("scopeFolders", path))
          item(t("menu.removeFromScope", { noun }), "folder-minus", "scopeFolders", false);
        else
          item(t("menu.includeInScope", { noun }), "folder-plus", "scopeFolders", true);
      }
    }));
    this.app.workspace.registerHoverLinkSource("heading-linker", { display: "Heading Linker", defaultMod: true });
    this.registerMarkdownPostProcessor((el, ctx) => this.processReadingMode(el, ctx));
    this.registerEditingHighlight();
    this.addCommand({ id: "link-current", name: t("cmd.linkThisNote"), callback: () => this.materializeCurrent() });
    this.addCommand({ id: "link-selection", name: t("cmd.linkSelection"), editorCallback: (editor) => this.materializeSelection(editor) });
    this.addCommand({ id: "link-scope", name: t("cmd.linkAllNotes"), callback: () => this.materializeScope() });
    this.addCommand({ id: "unlink-current", name: t("cmd.unlinkThisNote"), callback: () => this.unlinkCurrent() });
    this.addCommand({ id: "unlink-selection", name: t("cmd.unlinkSelection"), editorCallback: (editor) => this.unlinkSelection(editor) });
    this.addCommand({ id: "unlink-scope", name: t("cmd.unlinkAllNotes"), callback: () => this.unlinkScope() });
    this.addCommand({ id: "rebuild-index", name: t("cmd.rebuildIndex"), callback: () => {
      this.rebuildIndex();
      new Notice(t("notice.indexRebuilt"));
    } });
    this.addPathCommand("add-source", t("cmd.addSource"), "glossarySources", true, (p) => this.settings.glossaryMode === "selected" && !this.pathListed("glossarySources", p));
    this.addPathCommand("remove-source", t("cmd.removeSource"), "glossarySources", false, (p) => this.pathListed("glossarySources", p));
    this.addPathCommand("ignore-source", t("cmd.ignoreSource"), "excludeSources", true, (p) => !this.pathListed("excludeSources", p));
    this.addPathCommand("unignore-source", t("cmd.unignoreSource"), "excludeSources", false, (p) => this.pathListed("excludeSources", p));
    this.addPathCommand("exclude-note", t("cmd.excludeNote"), "excludeFolders", true, (p) => !this.pathListed("excludeFolders", p));
    this.addPathCommand("unexclude-note", t("cmd.unexcludeNote"), "excludeFolders", false, (p) => this.pathListed("excludeFolders", p));
    this.addPathCommand("scope-note", t("cmd.scopeNote"), "scopeFolders", true, (p) => this.settings.scopeMode === "folders" && !this.pathListed("scopeFolders", p));
    this.addPathCommand("unscope-note", t("cmd.unscopeNote"), "scopeFolders", false, (p) => this.settings.scopeMode === "folders" && this.pathListed("scopeFolders", p));
    if (suggestAvailable())
      this.registerEditorSuggest(new HeadingSuggest(this.app, this));
    this.addSettingTab(new HeadingLinkerSettingTab(this.app, this));
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  async loadLanguages() {
    this.languages = [];
    this.languageErrors = [];
    const seen = /* @__PURE__ */ new Set();
    for (const lang of BUILTIN_LANGUAGES) {
      const id = lang && lang.id;
      const error = validateLanguage(lang);
      if (error) {
        this.languageErrors.push({ id: id || "?", error });
        continue;
      }
      if (seen.has(id)) {
        this.languageErrors.push({ id, error: `duplicate id "${id}"` });
        continue;
      }
      seen.add(id);
      this.languages.push(lang);
    }
    this.sortLanguages();
    this.languageErrors.sort((a, b) => a.id.localeCompare(b.id));
    if (!Array.isArray(this.settings.enabledLanguages)) {
      const sys = (window.localStorage.getItem("language") || "").split("-")[0].toLowerCase();
      const wanted = /* @__PURE__ */ new Set(["en"]);
      if (sys && this.languages.some((l) => l.id === sys))
        wanted.add(sys);
      this.settings.enabledLanguages = this.languages.filter((l) => wanted.has(l.id)).map((l) => l.id);
      await this.saveSettings();
    }
    this.refreshActiveLanguages();
  }
  sortLanguages() {
    const order = this.settings.languageOrder || [];
    const rank = (l) => {
      const i = order.indexOf(l.id);
      return i === -1 ? Infinity : i;
    };
    this.languages.sort((a, b) => rank(a) - rank(b) || (b.priority || 0) - (a.priority || 0) || a.name.localeCompare(b.name));
  }
  moveLanguage(id, dir) {
    const ids = this.languages.map((l) => l.id);
    const i = ids.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length)
      return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    this.settings.languageOrder = ids;
    this.sortLanguages();
  }
  refreshActiveLanguages() {
    const enabled = new Set(this.settings.enabledLanguages || []);
    this.activeLanguages = this.languages.filter((l) => enabled.has(l.id));
    this.keysCache = /* @__PURE__ */ new Map();
  }
  async updateStatusBar() {
    const el = this.statusBarEl;
    if (!el)
      return;
    const clear = () => {
      el.setText("");
      el.removeAttribute("aria-label");
    };
    if (!this.settings.statusBar)
      return clear();
    const file = this.app.workspace.getActiveFile();
    if (!file || file.extension !== "md" || !this.inScope(file.path))
      return clear();
    try {
      const text = await this.app.vault.cachedRead(file);
      const linktexts = new Set(this.findMatches(text, this.currentFileBase(file.path), { protect: true }).map((m) => m.linktext));
      if (this.settings.statusBarIncludeLinks) {
        const cache = this.app.metadataCache.getFileCache(file);
        for (const link of cache && cache.links || []) {
          const hash = link.link.indexOf("#");
          if (hash < 0)
            continue;
          const dest = this.app.metadataCache.getFirstLinkpathDest(link.link, file.path);
          if (dest && this.isGlossaryFile(dest))
            linktexts.add(`${dest.basename}#${link.link.slice(hash + 1)}`);
        }
      }
      const n = linktexts.size;
      el.setText(plural("term", n));
      el.setAttribute("aria-label", t("statusBar.aria", { n }));
    } catch (e) {
      clear();
    }
  }
  // --- Glossary sources & headings ---
  // An entry matches a path when it is that path exactly (a file) or a folder prefix of
  // it — so a list of files-and-folders needs no per-entry type.
  underAny(path, entries) {
    return entries.some((e) => path === e || path.startsWith(e + "/"));
  }
  glossarySourceList() {
    return splitLines(this.settings.glossarySources).map(sanitizeFolder).filter(Boolean);
  }
  excludeSourceList() {
    return splitLines(this.settings.excludeSources).map(sanitizeFolder).filter(Boolean);
  }
  // Is `path` a heading source? Ignored paths lose first (even in vault mode); then in
  // 'vault' mode every note qualifies, in 'selected' mode only listed files/folders.
  isGlossaryPath(path) {
    if (this.underAny(path, this.excludeSourceList()))
      return false;
    if (this.settings.glossaryMode === "vault")
      return true;
    return this.underAny(path, this.glossarySourceList());
  }
  isGlossaryFile(file) {
    return file && file.extension === "md" && this.isGlossaryPath(file.path);
  }
  glossaryFilesList() {
    return this.app.vault.getMarkdownFiles().filter((f) => this.isGlossaryFile(f));
  }
  headingsOf(file) {
    const cache = this.app.metadataCache.getFileCache(file);
    const headings = cache && cache.headings;
    if (!Array.isArray(headings))
      return [];
    return headings.filter((h) => typeof h.heading === "string" && h.heading.trim()).map((h) => ({ text: h.heading, level: h.level }));
  }
  // Fingerprint of what defines a file's terms — its headings and their aliases. The
  // 'changed' handler compares against this to skip rebuilds on unrelated body edits.
  fileFingerprint(file) {
    const aliases = this.aliasCache.get(file.path);
    return JSON.stringify({ h: this.headingsOf(file), a: aliases ? [...aliases] : [] });
  }
  // Read and cache one glossary file's `%%` alias comments. The only place a body is
  // read; called on first index and when the file changes — never during a plain rebuild.
  async loadFileAliases(file) {
    if (!this.settings.headingAliases) {
      this.aliasCache.set(file.path, /* @__PURE__ */ new Map());
      return;
    }
    const cache = this.app.metadataCache.getFileCache(file);
    const headings = cache && cache.headings || [];
    if (!headings.length) {
      this.aliasCache.set(file.path, /* @__PURE__ */ new Map());
      return;
    }
    try {
      const text = await this.app.vault.cachedRead(file);
      this.aliasCache.set(file.path, parseHeadingAliases(text, headings));
    } catch (e) {
      this.aliasCache.set(file.path, /* @__PURE__ */ new Map());
    }
  }
  // Fill the alias cache for glossary files (only unread ones unless forced), then rebuild.
  async loadAliases(force = false) {
    for (const file of this.glossaryFilesList()) {
      if (force || !this.aliasCache.has(file.path))
        await this.loadFileAliases(file);
    }
    this.rebuildIndex();
  }
  // Basename of `path` when it is a glossary file, else null — the note's own headings
  // are skipped so a glossary file doesn't link to itself.
  currentFileBase(path) {
    if (!path || !this.isGlossaryPath(path))
      return null;
    return path.split("/").pop().replace(/\.md$/, "");
  }
  // The heading text of a "Basename#Heading" linktext.
  labelOf(linktext) {
    const i = linktext.indexOf("#");
    return i >= 0 ? linktext.slice(i + 1) : linktext;
  }
  // Parse the inside of a [[...]] as a heading link, or null if it carries no #subpath.
  // Shared by the unlink scan and the cursor-hit lookup so both read links identically.
  parseHeadingInner(inner) {
    const pipe = inner.indexOf("|");
    const rawTarget = (pipe >= 0 ? inner.slice(0, pipe) : inner).replace(/\\$/, "").trim();
    const hash = rawTarget.indexOf("#");
    if (hash < 0)
      return null;
    const target = rawTarget.slice(0, hash).trim();
    const subpath = rawTarget.slice(hash + 1).trim();
    if (!target || !subpath)
      return null;
    const display = pipe >= 0 ? inner.slice(pipe + 1).trim() : subpath;
    if (!display)
      return null;
    return { target, subpath, display };
  }
  // --- Links ---
  // linktext is always "Basename#Heading", so the link always needs the alias form to
  // show the note's own word rather than Obsidian's "Basename > Heading" rendering.
  // Inside a Markdown table cell the alias pipe must be escaped or it splits the row.
  wikiLink(linktext, display, inTable) {
    return inTable ? `[[${linktext}\\|${display}]]` : `[[${linktext}|${display}]]`;
  }
  // Replace each match (sorted, non-overlapping) with a wikilink, right to left.
  applyLinks(text, matches) {
    const sorted = matches.slice().sort((a, b) => a.start - b.start);
    let out = text;
    for (let j = sorted.length - 1; j >= 0; j--) {
      const link = this.wikiLink(sorted[j].linktext, sorted[j].display, inTableCell(text, sorted[j].start));
      out = out.slice(0, sorted[j].start) + link + out.slice(sorted[j].end);
    }
    return { newText: out };
  }
  // Inverse of applyLinks: replace each heading-link span with its plain display text,
  // right to left. The display has no pipe, so a table cell survives without escaping.
  unlinkLinks(text, links) {
    const sorted = links.slice().sort((a, b) => a.start - b.start);
    let out = text;
    for (let j = sorted.length - 1; j >= 0; j--) {
      out = out.slice(0, sorted[j].start) + sorted[j].display + out.slice(sorted[j].end);
    }
    return { newText: out, count: sorted.length };
  }
  // The heading link the cursor or selection touches, else null. Spanning the selection
  // (not just a point) catches a link in a table cell, where a right-click selects the
  // cell text instead of placing a bare cursor.
  headingLinkAt(editor) {
    const head = editor.getCursor("head");
    const from = editor.getCursor("from");
    const to = editor.getCursor("to");
    const lineNo = head.line;
    const line = editor.getLine(lineNo);
    const selStart = from.line === lineNo ? from.ch : 0;
    const selEnd = to.line === lineNo ? to.ch : line.length;
    const re = /\[\[([^\]\n]+)\]\]/g;
    let m;
    while ((m = re.exec(line)) !== null) {
      const s = m.index;
      const e = m.index + m[0].length;
      if (selEnd < s || selStart > e)
        continue;
      const parsed = this.parseHeadingInner(m[1]);
      if (!parsed)
        continue;
      const sourcePath = this.app.workspace.getActiveFile() ? this.app.workspace.getActiveFile().path : "";
      const dest = this.app.metadataCache.getFirstLinkpathDest(parsed.target, sourcePath);
      if (dest && this.isGlossaryFile(dest))
        return { linktext: `${dest.basename}#${parsed.subpath}`, display: parsed.display, targetFile: dest, line: lineNo, from: s, to: e };
    }
    return null;
  }
  unlinkLinkAt(editor, link) {
    editor.replaceRange(link.display, { line: link.line, ch: link.from }, { line: link.line, ch: link.to });
    new Notice(t("notice.unlinked"));
    this.updateStatusBar();
  }
  openTerm(linktext, sourcePath, newTab) {
    this.app.workspace.openLinkText(linktext, sourcePath || "", newTab);
  }
  hoverTerm(event, targetEl, linktext, sourcePath) {
    this.app.workspace.trigger("hover-link", {
      event,
      source: "heading-linker",
      hoverParent: this,
      targetEl,
      linktext,
      sourcePath: sourcePath || ""
    });
  }
  // --- Scope ---
  inScope(path) {
    if (this.noteOptedOut(path))
      return false;
    const covers = (entry) => {
      const e = sanitizeFolder(entry);
      return !!e && (path === e || path.startsWith(e + "/"));
    };
    if (splitLines(this.settings.excludeFolders).some(covers))
      return false;
    if (this.settings.scopeMode === "folders")
      return splitLines(this.settings.scopeFolders).some(covers);
    return true;
  }
  // A note can turn linking off for itself with a `heading-linker: false` (or off/no/ignore)
  // frontmatter property — the per-note escape hatch, without touching folder settings.
  noteOptedOut(path) {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile))
      return false;
    const fm = this.app.metadataCache.getFileCache(file);
    const v = fm && fm.frontmatter && fm.frontmatter["heading-linker"];
    if (v === false)
      return true;
    return typeof v === "string" && ["false", "off", "no", "ignore", "disabled"].includes(v.trim().toLowerCase());
  }
  getScopeFiles() {
    return this.app.vault.getMarkdownFiles().filter((f) => this.inScope(f.path));
  }
  pathListed(listKey, path) {
    const entry = sanitizeFolder(path);
    return !!entry && splitLines(this.settings[listKey]).some((l) => sanitizeFolder(l) === entry);
  }
  // A command that adds/removes the active note's path in a list, shown only when
  // `available(path)` holds — so the add and remove twins never appear together.
  addPathCommand(id, name, listKey, add, available) {
    this.addCommand({
      id,
      name,
      checkCallback: (checking) => {
        const f = this.app.workspace.getActiveFile();
        if (!f || f.extension !== "md" || !available(f.path))
          return false;
        if (!checking)
          this.setPathInList(listKey, f.path, add);
        return true;
      }
    });
  }
  async setPathInList(listKey, path, add) {
    const entry = sanitizeFolder(path);
    if (!entry || add === this.pathListed(listKey, path))
      return;
    const lines = splitLines(this.settings[listKey]);
    this.settings[listKey] = (add ? [...lines, entry] : lines.filter((l) => sanitizeFolder(l) !== entry)).join("\n");
    await this.saveSettings();
    if (listKey === "glossarySources" || listKey === "excludeSources")
      await this.loadAliases();
    this.rerenderViews();
    this.updateStatusBar();
    new Notice(t(NOTICE_KEYS[listKey][add ? "add" : "remove"], { entry }));
  }
  // --- Rendering ---
  rerenderViews() {
    this.app.workspace.getLeavesOfType("markdown").forEach((leaf) => {
      const v = leaf.view;
      if (v && v.previewMode && typeof v.previewMode.rerender === "function")
        v.previewMode.rerender(true);
    });
    this.refreshEditors();
  }
  refreshEditors() {
    if (!this.cmRefreshEffect)
      return;
    this.app.workspace.getLeavesOfType("markdown").forEach((leaf) => {
      const cm = leaf.view && leaf.view.editor && leaf.view.editor.cm;
      if (cm)
        cm.dispatch({ effects: this.cmRefreshEffect.of(null) });
    });
  }
};
Object.assign(HeadingLinkerPlugin.prototype, matcher, highlight, materialize);
module.exports = HeadingLinkerPlugin;
