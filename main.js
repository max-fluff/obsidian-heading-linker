/* Heading Linker 1.3.1 — bundled from src/ by esbuild. Do not edit directly; edit src/ and run "npm run build". */
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
      // 'off' | 'ask' | 'preview': what to do when a source file's heading is renamed.
      followHeadingRenames: "ask",
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
      excludeWords: "",
      // written words that never become a link, whatever heading they match
      linkFirstOnly: false,
      // Who wins a word both linkers match. Read by the other side through the api, so both
      // reach the same verdict; a heading anchor is narrower than a whole note, hence higher.
      linkPrecedence: 20,
      linkSuggest: false,
      // offer [[link]] autocomplete while typing
      suggestMinChars: 3,
      // min typed length before autocomplete triggers
      suggestSkipAfter: "@#$^",
      // yield when the word follows one of these sigils (tags, math, block refs)
      suggestPlainText: false,
      // complete the word without making a link
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
      menuCollect: true,
      // "collect this alias" / "collect aliases from links" in the editor menu
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
    var LINK_TITLE = /^([\s\S]*?)\s+(?:"([^"]*)"|'([^']*)')$/;
    function splitTarget(raw) {
      const s = String(raw == null ? "" : raw).trim();
      const m = LINK_TITLE.exec(s);
      if (!m)
        return { url: s, title: "" };
      return { url: m[1].trim(), title: m[2] != null ? m[2] : m[3] };
    }
    var withTitle = (url, title) => title ? url + ' "' + title + '"' : url;
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
    function rewriteLinks(text, fn) {
      const lines = text.split("\n");
      let fenced = false, count = 0;
      for (let i = 0; i < lines.length; i++) {
        if (isFenceLine(lines[i])) {
          fenced = !fenced;
          continue;
        }
        if (fenced)
          continue;
        lines[i] = lines[i].replace(linkRegex(), (whole, name, target, offset) => {
          if (inInlineCode(lines[i], offset))
            return whole;
          const out = fn(name, target);
          if (out == null)
            return whole;
          count++;
          return out;
        });
      }
      return { text: lines.join("\n"), count };
    }
    function rewriteFences(text, lang, fn) {
      const lines = text.split("\n");
      let count = 0;
      for (let i = 0; i < lines.length; i++) {
        const open = new RegExp("^\\s*(`{3,}|~{3,})\\s*" + lang + "\\s*$").exec(lines[i]);
        if (!open)
          continue;
        const close = new RegExp("^\\s*" + open[1][0] + "{" + open[1].length + ",}\\s*$");
        let j = i + 1;
        while (j < lines.length && !close.test(lines[j]))
          j++;
        const body = lines.slice(i + 1, j);
        const out = fn(body);
        if (out) {
          lines.splice(i + 1, body.length, ...out);
          count++;
          j = i + 1 + out.length;
        }
        i = j;
      }
      return { text: lines.join("\n"), count };
    }
    function wordAt(line, ch) {
      const s = String(line == null ? "" : line);
      if (!s)
        return "";
      const isWord = (c) => /[\p{L}\p{Nd}]/u.test(c || "");
      const at = Math.max(0, Math.min(ch, s.length));
      if (!isWord(s[at]) && !isWord(s[at - 1]))
        return "";
      let start = at;
      while (start > 0 && isWord(s[start - 1]))
        start--;
      let end = at;
      while (end < s.length && isWord(s[end]))
        end++;
      return s.slice(start, end);
    }
    module2.exports = { splitLines: splitLines2, linkRegex, splitTarget, withTitle, rewriteLinks, rewriteFences, isFenceLine, inInlineCode, locate, inCode, inLink, isProtected, inTableCell: inTableCell2, wordAt };
  }
});

// src/shared/morphology/languages/ru.js
var require_ru = __commonJS({
  "src/shared/morphology/languages/ru.js"(exports2, module2) {
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
      "\u044B\u043C",
      "\u044B\u0445",
      "\u0438\u0445",
      "\u0438\u043C",
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
        if (word.length - e.length >= 2 && word.endsWith(e))
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
    var IRREGULAR_STEMS = /* @__PURE__ */ new Map([
      ["\u0447\u0435\u043B\u043E\u0432\u0435\u043A", "\u043B\u044E\u0434"],
      ["\u0440\u0435\u0431\u0435\u043D\u043E\u043A", "\u0434\u0435\u0442"],
      ["\u043C\u0430\u0442\u044C", "\u043C\u0430\u0442\u0435\u0440"],
      ["\u0434\u043E\u0447\u044C", "\u0434\u043E\u0447\u0435\u0440"],
      ["\u043D\u0435\u0431\u043E", "\u043D\u0435\u0431\u0435\u0441"],
      ["\u0447\u0443\u0434\u043E", "\u0447\u0443\u0434\u0435\u0441"],
      ["\u0442\u0435\u043B\u043E", "\u0442\u0435\u043B\u0435\u0441"],
      ["\u0434\u0440\u0443\u0433", "\u0434\u0440\u0443\u0437"],
      ["\u0441\u044B\u043D", "\u0441\u044B\u043D\u043E\u0432"],
      ["\u0443\u0445\u043E", "\u0443\u0448"],
      ["\u043E\u043A\u043E", "\u043E\u0447"],
      ["\u0445\u043E\u0437\u044F\u0438\u043D", "\u0445\u043E\u0437\u044F\u0435\u0432"],
      ["\u0449\u0435\u043D\u043E\u043A", "\u0449\u0435\u043D\u044F\u0442"]
    ]);
    for (const w of ["\u0438\u043C\u044F", "\u0432\u0440\u0435\u043C\u044F", "\u0441\u0435\u043C\u044F", "\u0437\u043D\u0430\u043C\u044F", "\u043F\u043B\u0435\u043C\u044F", "\u0441\u0442\u0440\u0435\u043C\u044F", "\u0442\u0435\u043C\u044F", "\u0431\u0440\u0435\u043C\u044F", "\u0432\u044B\u043C\u044F", "\u043F\u043B\u0430\u043C\u044F"]) {
      IRREGULAR_STEMS.set(w, w.slice(0, -1) + "\u0435\u043D");
    }
    var KEEP_WHOLE = /* @__PURE__ */ new Set(["\u0443\u0440\u043E\u043A", "\u043F\u043E\u0440\u043E\u043A"]);
    function fleetingStems(word) {
      const out = [];
      let m = /^(.+)о([кцнлбмртвшжгх])$/.exec(word);
      if (m)
        out.push(m[1] + m[2]);
      m = /^(.+)е([цкнлмртвшжб])$/.exec(word);
      if (m) {
        out.push(m[1] + m[2]);
        out.push(m[1] + (/[аеиоуыэюя]$/.test(m[1]) ? "\u0439" : "\u044C") + m[2]);
      }
      m = /^(.+)ень$/.exec(word);
      if (m)
        out.push(m[1] + "\u043D");
      return out;
    }
    var NOT_YOUNG = /* @__PURE__ */ new Set(["\u0437\u0432\u043E\u043D\u043E\u043A", "\u0437\u0432\u043E\u043D\u043A"]);
    function youngStems(word) {
      if (NOT_YOUNG.has(word))
        return [];
      let m = /^(.+)ен(?:ок|к)$/.exec(word);
      if (m)
        return [m[1] + "\u044F\u0442"];
      m = /^(.+)он(?:ок|к)$/.exec(word);
      if (m)
        return [m[1] + "\u0430\u0442"];
      return [];
    }
    var IRREGULAR_BY_STEM = /* @__PURE__ */ new Map();
    for (const [form, target] of IRREGULAR_STEMS) {
      for (const k of [strip(form), ...fleetingStems(form)])
        if (!IRREGULAR_BY_STEM.has(k))
          IRREGULAR_BY_STEM.set(k, target);
    }
    function derivedStems(word) {
      const w = word.replace(/ё/g, "\u0435");
      const out = [];
      const es = strip(w);
      const irregular = IRREGULAR_STEMS.get(w) || IRREGULAR_BY_STEM.get(es);
      if (irregular)
        out.push(irregular);
      if (KEEP_WHOLE.has(w))
        return out;
      for (const c of [...fleetingStems(w), ...youngStems(w), ...youngStems(es)])
        if (c.length >= 2)
          out.push(c);
      return out;
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
        const folded = w.replace(/ё/g, "\u0435");
        if (/[^аеиоуыэюяйь]$/.test(folded) && !ks.includes(folded))
          ks.push(folded);
        if (/[ео]му$/.test(folded)) {
          const noun = folded.slice(0, -1);
          if (!ks.includes(noun))
            ks.push(noun);
        }
        const soft = softStemNoun(w);
        if (soft) {
          for (const sk of keyer(soft))
            if (!ks.includes(sk))
              ks.push(sk);
        }
        for (const extra of derivedStems(w))
          if (!ks.includes(extra))
            ks.push(extra);
        return ks;
      },
      lemma
    };
  }
});

// src/shared/morphology/languages/uk.js
var require_uk = __commonJS({
  "src/shared/morphology/languages/uk.js"(exports2, module2) {
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
      "\u044F\u043C",
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
        if (w.length - e.length >= 2 && w.endsWith(e))
          return w.slice(0, -e.length);
      }
      return w;
    }
    function alternations(stem) {
      const m = CLOSED_SYLLABLE.exec(stem);
      return m ? [m[1] + "\u043E" + m[2], m[1] + "\u0435" + m[2]] : [];
    }
    function fleetingStems(word) {
      const out = [];
      let m = /^(.+)о([кцнлбмртвшжгх])$/.exec(word);
      if (m)
        out.push(m[1] + m[2]);
      m = /^(.+)е([цкнлмртвшжб])$/.exec(word);
      if (m)
        out.push(m[1] + m[2]);
      m = /^(.+)ень$/.exec(word);
      if (m)
        out.push(m[1] + "\u043D");
      return out.filter((s) => s.length >= 2);
    }
    var bareApostrophe = (w) => w.replace(/[’ʼ']/g, "");
    var IRREGULAR = /* @__PURE__ */ new Map([
      ["\u043B\u044E\u0434\u0438\u043D\u0430", "\u043B\u044E\u0434"],
      ["\u0434\u0438\u0442\u0438\u043D\u0430", "\u0434\u0456\u0442"],
      ["\u043C\u0430\u0442\u0438", "\u043C\u0430\u0442\u0435\u0440"],
      ["\u043E\u043A\u043E", "\u043E\u0447"],
      ["\u0456\u043C\u044F", "\u0456\u043C\u0435\u043D"],
      ["\u043F\u043B\u0435\u043C\u044F", "\u043F\u043B\u0435\u043C\u0435\u043D"],
      ["\u0432\u0438\u043C\u044F", "\u0432\u0438\u043C\u0435\u043D"]
    ]);
    module2.exports = {
      id: "uk",
      name: "Ukrainian",
      priority: 0,
      match: (word) => /[а-яіїєґ]/i.test(word),
      keys(word, mode) {
        const w = word.toLowerCase();
        if (mode === "exact")
          return [w];
        const stem = strip(w);
        const ks = [.../* @__PURE__ */ new Set([stem, ...alternations(stem), ...fleetingStems(w)])];
        const extra = IRREGULAR.get(bareApostrophe(w));
        if (extra && !ks.includes(extra))
          ks.push(extra);
        return ks;
      },
      lemma: (word) => strip(word)
    };
  }
});

// src/shared/morphology/languages/en.js
var require_en = __commonJS({
  "src/shared/morphology/languages/en.js"(exports2, module2) {
    "use strict";
    var VOWELS = "aeiouy";
    var isV = (c) => VOWELS.includes(c);
    var notV = (c) => !isV(c);
    var DOUBLES = ["bb", "dd", "ff", "gg", "mm", "nn", "pp", "rr", "tt"];
    var VALID_LI = "cdeghkmnrt";
    var PREFIXES = ["gener", "commun", "arsen", "past", "univers", "later", "emerg", "organ", "inter"];
    var EXCEPTION1 = {
      skis: "ski",
      skies: "sky",
      idly: "idl",
      gently: "gentl",
      ugly: "ugli",
      early: "earli",
      only: "onli",
      singly: "singl",
      sky: "sky",
      news: "news",
      howe: "howe",
      atlas: "atlas",
      cosmos: "cosmos",
      bias: "bias",
      andes: "andes"
    };
    var ING_KEEP = ["inn", "out", "cann", "herr", "earr", "even"];
    var gopast = (w, from, test) => {
      let i = from;
      while (i < w.length && !test(w[i]))
        i++;
      return i < w.length ? i + 1 : w.length;
    };
    function markRegions(w) {
      const prefix = PREFIXES.find((p) => w.startsWith(p));
      const p1 = prefix ? prefix.length : gopast(w, gopast(w, 0, isV), notV);
      return [p1, gopast(w, gopast(w, p1, isV), notV)];
    }
    function shortv(w) {
      const n = w.length;
      if (n >= 3 && !isV(w[n - 1]) && w[n - 1] !== "w" && w[n - 1] !== "x" && w[n - 1] !== "Y" && isV(w[n - 2]) && !isV(w[n - 3]))
        return true;
      if (n === 2 && isV(w[0]) && !isV(w[1]))
        return true;
      return w.endsWith("past");
    }
    var longestOf = (w, list) => list.filter((s) => w.endsWith(s)).sort((a, b) => b.length - a.length)[0];
    var STEP2 = [
      ["ational", "ate"],
      ["tional", "tion"],
      ["ization", "ize"],
      ["ousness", "ous"],
      ["iveness", "ive"],
      ["fulness", "ful"],
      ["ogist", "og"],
      ["lessli", "less"],
      ["biliti", "ble"],
      ["alism", "al"],
      ["aliti", "al"],
      ["ation", "ate"],
      ["entli", "ent"],
      ["ousli", "ous"],
      ["iviti", "ive"],
      ["fulli", "ful"],
      ["enci", "ence"],
      ["anci", "ance"],
      ["abli", "able"],
      ["izer", "ize"],
      ["ator", "ate"],
      ["alli", "al"],
      ["ogi", "og"],
      ["bli", "ble"],
      ["li", null]
    ];
    var STEP3 = [
      ["ational", "ate"],
      ["tional", "tion"],
      ["alize", "al"],
      ["icate", "ic"],
      ["iciti", "ic"],
      ["ical", "ic"],
      ["ness", ""],
      ["ful", ""],
      ["ative", null]
    ];
    var STEP4 = [
      "ement",
      "ance",
      "ence",
      "able",
      "ible",
      "ment",
      "ant",
      "ent",
      "ism",
      "ate",
      "iti",
      "ous",
      "ive",
      "ize",
      "ion",
      "al",
      "er",
      "ic"
    ];
    function stem(word) {
      const lower = word.toLowerCase();
      if (EXCEPTION1[lower] !== void 0)
        return EXCEPTION1[lower];
      if (lower.length < 3)
        return lower;
      let w = lower.startsWith("'") ? lower.slice(1) : lower;
      let yFound = false;
      let marked = "";
      for (let i = 0; i < w.length; i++) {
        if (w[i] === "y" && (i === 0 || isV(w[i - 1]))) {
          marked += "Y";
          yFound = true;
        } else
          marked += w[i];
      }
      w = marked;
      const [p1, p2] = markRegions(w);
      const inR1 = (n) => p1 <= w.length - n;
      const inR2 = (n) => p2 <= w.length - n;
      const apo = longestOf(w, ["'s'", "'s", "'"]);
      if (apo)
        w = w.slice(0, -apo.length);
      const s1a = longestOf(w, ["sses", "ied", "ies", "us", "ss", "s"]);
      if (s1a === "sses")
        w = w.slice(0, -2);
      else if (s1a === "ied" || s1a === "ies")
        w = w.length > 4 ? w.slice(0, -2) : w.slice(0, -1);
      else if (s1a === "s" && [...w.slice(0, -2)].some(isV))
        w = w.slice(0, -1);
      const s1b = longestOf(w, ["eedly", "eed", "ingly", "edly", "ing", "ed"]);
      let general = false;
      if (s1b === "eedly" || s1b === "eed") {
        const rest = w.slice(0, -s1b.length);
        if (inR1(s1b.length) && !["proc", "exc", "succ"].includes(rest))
          w = rest + "ee";
      } else if (s1b === "ing") {
        const rest = w.slice(0, -3);
        if (rest.length === 2 && rest.endsWith("y") && !isV(rest[0]))
          w = rest[0] + "ie";
        else if (!ING_KEEP.includes(rest))
          general = true;
      } else if (s1b)
        general = true;
      if (general) {
        const rest = w.slice(0, -s1b.length);
        if ([...rest].some(isV)) {
          w = rest;
          if (w.endsWith("at") || w.endsWith("bl") || w.endsWith("iz"))
            w += "e";
          else if (DOUBLES.some((d) => w.endsWith(d))) {
            if (!(w.length === 3 && "aeo".includes(w[0])))
              w = w.slice(0, -1);
          } else if (w.length === p1 && shortv(w))
            w += "e";
        }
      }
      if (w.length > 2 && (w.endsWith("y") || w.endsWith("Y")) && !isV(w[w.length - 2])) {
        w = w.slice(0, -1) + "i";
      }
      const s2 = STEP2.find(([suf]) => w.endsWith(suf));
      if (s2 && inR1(s2[0].length)) {
        if (s2[0] === "ogi") {
          if (w[w.length - 4] === "l")
            w = w.slice(0, -1);
        } else if (s2[0] === "li") {
          if (VALID_LI.includes(w[w.length - 3]))
            w = w.slice(0, -2);
        } else
          w = w.slice(0, -s2[0].length) + s2[1];
      }
      const s3 = STEP3.find(([suf]) => w.endsWith(suf));
      if (s3 && inR1(s3[0].length)) {
        if (s3[0] === "ative") {
          if (inR2(5))
            w = w.slice(0, -5);
        } else
          w = w.slice(0, -s3[0].length) + s3[1];
      }
      const s4 = longestOf(w, STEP4);
      if (s4 && inR2(s4.length)) {
        if (s4 === "ion") {
          const p = w[w.length - 4];
          if (p === "s" || p === "t")
            w = w.slice(0, -3);
        } else
          w = w.slice(0, -s4.length);
      }
      if (w.endsWith("e")) {
        if (inR2(1) || inR1(1) && !shortv(w.slice(0, -1)))
          w = w.slice(0, -1);
      } else if (w.endsWith("l") && inR2(1) && w[w.length - 2] === "l")
        w = w.slice(0, -1);
      return yFound ? w.replace(/Y/g, "y") : w;
    }
    var SIBILANT_ES = /(?:s|x|z|ch|sh|[^aeiou]o)es$/;
    function strip(word) {
      const w = word.toLowerCase();
      const out = [w];
      if (w.length > 4 && w.endsWith("ies"))
        out.push(w.slice(0, -3) + "y");
      else if (w.length > 4 && SIBILANT_ES.test(w))
        out.push(w.slice(0, -2));
      if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss"))
        out.push(w.slice(0, -1));
      return out;
    }
    var CLASSICAL = [
      ["cactus", "cacti"],
      ["nucleus", "nuclei"],
      ["radius", "radii"],
      ["stimulus", "stimuli"],
      ["fungus", "fungi"],
      ["alumnus", "alumni"],
      ["syllabus", "syllabi"],
      ["bacillus", "bacilli"],
      ["locus", "loci"],
      ["terminus", "termini"],
      ["datum", "data"],
      ["bacterium", "bacteria"],
      ["curriculum", "curricula"],
      ["memorandum", "memoranda"],
      ["stratum", "strata"],
      ["spectrum", "spectra"],
      ["erratum", "errata"],
      ["symposium", "symposia"],
      ["millennium", "millennia"],
      ["ovum", "ova"],
      ["quantum", "quanta"],
      ["phenomenon", "phenomena"],
      ["criterion", "criteria"],
      ["ganglion", "ganglia"],
      ["automaton", "automata"],
      ["index", "indices", "indexes"],
      ["matrix", "matrices"],
      ["appendix", "appendices", "appendixes"],
      ["vertex", "vertices", "vertexes"],
      ["apex", "apices", "apexes"],
      ["cortex", "cortices"],
      ["helix", "helices"],
      ["corpus", "corpora"],
      ["genus", "genera"],
      ["formula", "formulae"],
      ["larva", "larvae"],
      ["alga", "algae"],
      ["vertebra", "vertebrae"],
      ["nebula", "nebulae"],
      ["antenna", "antennae"],
      ["thesis", "theses"],
      ["hypothesis", "hypotheses"],
      ["analysis", "analyses"],
      ["crisis", "crises"],
      ["diagnosis", "diagnoses"],
      ["parenthesis", "parentheses"],
      ["ellipsis", "ellipses"],
      ["synopsis", "synopses"],
      ["schema", "schemata"],
      ["stigma", "stigmata"],
      ["dogma", "dogmata"]
    ];
    var GERMANIC = [
      ["mouse", "mice"],
      ["louse", "lice"],
      ["foot", "feet"],
      ["tooth", "teeth"],
      ["goose", "geese"],
      ["man", "men"],
      ["woman", "women"],
      ["child", "children"],
      ["ox", "oxen"],
      ["person", "people"]
    ];
    var FVES = [
      ["wolf", "wolves"],
      ["calf", "calves"],
      ["half", "halves"],
      ["shelf", "shelves"],
      ["elf", "elves"],
      ["loaf", "loaves"],
      ["thief", "thieves"],
      ["self", "selves"],
      ["scarf", "scarves"],
      ["wharf", "wharves"],
      ["hoof", "hooves"],
      ["knife", "knives"],
      ["life", "lives"],
      ["wife", "wives"]
    ];
    var IRREGULAR = /* @__PURE__ */ new Map();
    for (const [sing, ...plurals] of [...CLASSICAL, ...GERMANIC, ...FVES]) {
      IRREGULAR.set(sing, sing);
      for (const p of plurals)
        IRREGULAR.set(p, sing);
    }
    var KEEP_WHOLE = /* @__PURE__ */ new Set(["omen", "amen", "ramen", "carmen", "dolmen", "nova", "bases", "phases"]);
    var COMPOUND = new RegExp(
      "^(.+)(" + [...IRREGULAR.keys()].filter((form) => IRREGULAR.get(form) !== form).sort((a, b) => b.length - a.length).join("|") + ")$"
    );
    var GREEK_PLURAL = /.ses$/;
    function derivedKeys(word, reduce) {
      if (KEEP_WHOLE.has(word))
        return [];
      const derived = /* @__PURE__ */ new Set();
      const m = COMPOUND.exec(word);
      if (m)
        derived.add(m[1] + IRREGULAR.get(m[2]));
      if (GREEK_PLURAL.test(word))
        derived.add(word.slice(0, -3) + "sis");
      const out = [];
      for (const d of derived)
        out.push(...reduce(d));
      return out;
    }
    function lemma(word) {
      const w = word.toLowerCase();
      return IRREGULAR.get(w) || stem(w);
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
        const canon = IRREGULAR.get(w);
        if (canon)
          return [canon];
        const reduce = mode === "endingStrip" ? strip : (x) => [stem(x)];
        return [.../* @__PURE__ */ new Set([...reduce(w), ...derivedKeys(w, reduce)])];
      },
      lemma
    };
  }
});

// src/shared/morphology/languages/es.js
var require_es = __commonJS({
  "src/shared/morphology/languages/es.js"(exports2, module2) {
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
    function stripKeys(word) {
      const s = fold(word);
      const out = [s];
      if (s.length > 4 && s.endsWith("ces"))
        out.push(s.slice(0, -3) + "z");
      if (s.length > 3 && s.endsWith("es"))
        out.push(s.slice(0, -2));
      if (s.length > 3 && s.endsWith("s"))
        out.push(s.slice(0, -1));
      return [...new Set(out)];
    }
    function stemKeys(word) {
      return [.../* @__PURE__ */ new Set([stem(word), ...stripKeys(word)])];
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
          return stripKeys(w);
        return stemKeys(w);
      },
      lemma
    };
  }
});

// src/shared/morphology/languages/de.js
var require_de = __commonJS({
  "src/shared/morphology/languages/de.js"(exports2, module2) {
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
    function stripKeys(word) {
      const s = fold(word);
      const cut = strip(word);
      return cut === s ? [s] : [s, cut];
    }
    function stemKeys(word) {
      const a = stem(word);
      const b = strip(word);
      return a === b ? [a] : [a, b];
    }
    var cistemPark = (w) => w.replace(/sch/g, "$").replace(/ei/g, "%").replace(/ie/g, "&").replace(/(.)\1/g, "$1*");
    var cistemUnpark = (w) => w.replace(/(.)\*/g, "$1$1").replace(/%/g, "ei").replace(/&/g, "ie").replace(/\$/g, "sch");
    function cistem(word) {
      const chars = [...cistemPark(fold(word))];
      while (chars.length > 3) {
        const j = chars.length - 1;
        if (chars.length > 5) {
          if ((chars[j] === "m" || chars[j] === "r") && chars[j - 1] === "e") {
            chars.length -= 2;
            continue;
          }
          if (chars[j] === "d" && chars[j - 1] === "n") {
            chars.length -= 2;
            continue;
          }
        }
        if (chars[j] === "t" || chars[j] === "e" || chars[j] === "s" || chars[j] === "n") {
          chars.length -= 1;
          continue;
        }
        break;
      }
      return cistemUnpark(chars.join(""));
    }
    var feminine = (word) => {
      const s = fold(word);
      return s.length > 6 && s.endsWith("innen") ? s.slice(0, -3) : null;
    };
    function lemma(word) {
      return feminine(word) || strip(word);
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
        const reduce = mode === "endingStrip" ? stripKeys : stemKeys;
        const singular = feminine(w);
        const ks = reduce(w);
        if (singular) {
          for (const k of reduce(singular))
            if (!ks.includes(k))
              ks.push(k);
        }
        if (mode === "stemmer") {
          const c = cistem(w);
          if (!ks.includes(c))
            ks.push(c);
        }
        return ks;
      },
      lemma
    };
  }
});

// src/shared/morphology/languages/fr.js
var require_fr = __commonJS({
  "src/shared/morphology/languages/fr.js"(exports2, module2) {
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
    function stripKeys(word) {
      const s = fold(word);
      const out = [s, strip(word)];
      if (s.length > 4 && s.endsWith("aux"))
        out.push(s.slice(0, -3) + "al");
      return [...new Set(out)];
    }
    function stemKeys(word) {
      const a = stem(word);
      const b = strip(word);
      return a === b ? [a] : [a, b];
    }
    function lemma(word) {
      return strip(word);
    }
    var IRREGULAR = /* @__PURE__ */ new Map([
      ["travail", "travau"],
      ["vitrail", "vitrau"],
      ["corail", "corau"],
      ["bail", "bau"],
      ["email", "emau"],
      ["soupirail", "soupirau"],
      ["vantail", "vantau"],
      ["oeil", "yeu"],
      ["\u0153il", "yeu"],
      ["ciel", "cieu"],
      ["aieul", "aieu"]
    ]);
    module2.exports = {
      id: "fr",
      name: "French",
      priority: 0,
      match: (word) => /[a-zàâäçéèêëîïôöùûüÿ]/i.test(word),
      keys(word, mode) {
        const w = word.toLowerCase();
        if (mode === "exact")
          return [w];
        const base = mode === "endingStrip" ? stripKeys(w) : stemKeys(w);
        const extra = IRREGULAR.get(fold(w));
        return extra && !base.includes(extra) ? [...base, extra] : base;
      },
      lemma
    };
  }
});

// src/shared/morphology/languages/la.js
var require_la = __commonJS({
  "src/shared/morphology/languages/la.js"(exports2, module2) {
    "use strict";
    var QUE_KEEP = /* @__PURE__ */ new Set([
      "atque",
      "quoque",
      "neque",
      "itaque",
      "absque",
      "apsque",
      "abusque",
      "adaeque",
      "adusque",
      "denique",
      "deque",
      "susque",
      "oblique",
      "peraeque",
      "plenisque",
      "quandoque",
      "quisque",
      "quaeque",
      "cuiusque",
      "cuique",
      "quemque",
      "quamque",
      "quaque",
      "quique",
      "quorumque",
      "quarumque",
      "quibusque",
      "quosque",
      "quasque",
      "quotusquisque",
      "quousque",
      "ubique",
      "undique",
      "usque",
      "uterque",
      "utique",
      "utroque",
      "utribique",
      "torque",
      "coque",
      "concoque",
      "contorque",
      "detorque",
      "decoque",
      "excoque",
      "extorque",
      "obtorque",
      "optorque",
      "retorque",
      "recoque",
      "attorque",
      "incoque",
      "intorque",
      "praetorque"
    ]);
    var NOUN_SUFFIXES = ["ibus", "ius", "ae", "am", "as", "em", "es", "ia", "is", "nt", "os", "ud", "um", "us", "a", "e", "i", "o", "u"];
    var VERB_SUFFIXES = ["iuntur", "beris", "erunt", "untur", "iunt", "mini", "ntur", "stis", "bor", "ero", "mur", "mus", "ris", "sti", "tis", "tur", "unt", "bo", "ns", "nt", "ri", "m", "r", "s", "t"];
    var VERB_REPLACE = { iuntur: "i", erunt: "i", untur: "i", iunt: "i", unt: "i", beris: "bi", bor: "bi", bo: "bi", ero: "eri" };
    function normalize(word) {
      return word.toLowerCase().replace(/j/g, "i").replace(/v/g, "u");
    }
    function longestSuffix(word, suffixes) {
      let best = "";
      for (const s of suffixes) {
        if (s.length > best.length && word.length > s.length && word.endsWith(s))
          best = s;
      }
      return best;
    }
    function nounStem(w) {
      const s = longestSuffix(w, NOUN_SUFFIXES);
      if (s) {
        const t2 = w.slice(0, -s.length);
        if (t2.length >= 2)
          return t2;
      }
      return w;
    }
    function verbStem(w) {
      const s = longestSuffix(w, VERB_SUFFIXES);
      if (s) {
        const t2 = w.slice(0, -s.length) + (VERB_REPLACE[s] || "");
        if (t2.length >= 2)
          return t2;
      }
      return w;
    }
    function deque(w) {
      return w.endsWith("que") && !QUE_KEEP.has(w) ? w.slice(0, -3) : w;
    }
    module2.exports = {
      id: "la",
      name: "Latin",
      priority: 0,
      match: (word) => /[a-z]/i.test(word),
      keys(word, mode) {
        const w = word.toLowerCase();
        if (mode === "exact")
          return [w];
        const base = deque(normalize(w));
        if (mode === "endingStrip")
          return [nounStem(base)];
        return [.../* @__PURE__ */ new Set([nounStem(base), verbStem(base)])];
      }
    };
  }
});

// src/shared/morphology/languages/el.js
var require_el = __commonJS({
  "src/shared/morphology/languages/el.js"(exports2, module2) {
    "use strict";
    var FINAL_SIGMA = String.fromCharCode(962);
    var SIGMA = String.fromCharCode(963);
    function fold(word) {
      return word.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().split(FINAL_SIGMA).join(SIGMA);
    }
    var NEUTER = new RegExp("(" + ["\u03BC\u03B1\u03C4\u03BF\u03C2", "\u03BC\u03B1\u03C4\u03C9\u03BD", "\u03BC\u03B1\u03C4\u03B1", "\u03BC\u03B1\u03C3\u03B9\u03BD", "\u03BC\u03B1\u03C3\u03B9", "\u03BC\u03B1\u03C4\u03B9"].map(fold).join("|") + ")$");
    var ENDINGS = [
      "\u03BF\u03C5\u03C3\u03B9\u03BD",
      "\u03BF\u03BD\u03C4\u03C9\u03BD",
      "\u03BF\u03C5\u03C3\u03B9",
      "\u03BF\u03BD\u03C4\u03BF\u03C2",
      "\u03BF\u03BD\u03C4\u03B1",
      "\u03BF\u03C5\u03C3\u03B1",
      "\u03BC\u03B5\u03B8\u03B1",
      "\u03BD\u03C4\u03B1\u03B9",
      "\u03C3\u03B8\u03B5",
      "\u03B5\u03C9\u03C2",
      "\u03B5\u03C9\u03BD",
      "\u03BF\u03B9\u03C2",
      "\u03BF\u03C5\u03C2",
      "\u03C4\u03B1\u03B9",
      "\u03BD\u03B1\u03B9",
      "\u03BC\u03B1\u03B9",
      "\u03C3\u03B1\u03B9",
      "\u03BF\u03C2",
      "\u03BF\u03C5",
      "\u03BF\u03BD",
      "\u03BF\u03B9",
      "\u03C9\u03BD",
      "\u03B7\u03C2",
      "\u03B7\u03BD",
      "\u03B1\u03B9",
      "\u03B1\u03C2",
      "\u03B1\u03BD",
      "\u03B5\u03B9\u03C2",
      "\u03B5\u03B9",
      "\u03B9\u03C2",
      "\u03B5\u03C2",
      "\u03B1",
      "\u03B5",
      "\u03B7",
      "\u03C9",
      "\u03B9",
      "\u03BF"
    ].map(fold).sort((a, b) => b.length - a.length);
    var NEUTER_I = /[^αεηιουω]ι$/;
    function strip(word) {
      const w = fold(word).replace(NEUTER, "\u03BC\u03B1");
      for (const e of ENDINGS) {
        if (w.length - e.length >= 2 && w.endsWith(e))
          return w.slice(0, -e.length);
      }
      return w;
    }
    module2.exports = {
      id: "el",
      name: "Greek",
      priority: 0,
      match: (word) => /[Ͱ-Ͽἀ-῿]/.test(word),
      keys(word, mode) {
        if (mode === "exact")
          return [word.toLowerCase()];
        const cut = strip(word);
        if (mode === "endingStrip")
          return [cut];
        const w = fold(word);
        return w !== cut && NEUTER_I.test(w) ? [cut, w] : [cut];
      },
      lemma: (word) => strip(word)
    };
  }
});

// src/shared/morphology/builtin-languages.js
var require_builtin_languages = __commonJS({
  "src/shared/morphology/builtin-languages.js"(exports2, module2) {
    "use strict";
    var BUILTIN_LANGUAGES2 = [
      require_ru(),
      require_uk(),
      require_en(),
      require_es(),
      require_de(),
      require_fr(),
      require_la(),
      require_el()
    ];
    module2.exports = { BUILTIN_LANGUAGES: BUILTIN_LANGUAGES2 };
  }
});

// src/shared/morphology/language-api.js
var require_language_api = __commonJS({
  "src/shared/morphology/language-api.js"(exports2, module2) {
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

// src/shared/suggest-base.js
var require_suggest_base = __commonJS({
  "src/shared/suggest-base.js"(exports2, module2) {
    "use strict";
    var { AbstractInputSuggest } = require("obsidian");
    var PathSuggestBase = class extends AbstractInputSuggest {
      constructor(app, inputEl, onSelect) {
        super(app, inputEl);
        this.app = app;
        this.inputEl = inputEl;
        this.onSelect = onSelect;
      }
      // A vault completer deals in TFile/TFolder, a disk one in plain paths.
      pathOf(item) {
        return typeof item === "string" ? item : item.path;
      }
      match(items, query, limit) {
        const q = String(query == null ? "" : query).replace(/\\/g, "/").toLowerCase();
        const hit = items.filter((i) => this.pathOf(i).toLowerCase().includes(q));
        return limit ? hit.slice(0, limit) : hit;
      }
      renderSuggestion(item, el) {
        el.setText(this.pathOf(item) || "/");
      }
      // onSelect clears the box instead of keeping the pick: the folder-list editor adds it as a
      // row rather than binding the input to one value.
      selectSuggestion(item) {
        const path = this.pathOf(item);
        if (this.onSelect) {
          this.onSelect(path);
          this.setValue("");
          this.close();
          return;
        }
        this.setValue(path);
        this.inputEl.trigger("input");
        this.close();
      }
    };
    var suggestAvailable2 = () => typeof AbstractInputSuggest === "function";
    var SUGGEST_LIMIT = 50;
    module2.exports = { PathSuggestBase, suggestAvailable: suggestAvailable2, SUGGEST_LIMIT };
  }
});

// src/shared/prose/vault-suggest.js
var require_vault_suggest = __commonJS({
  "src/shared/prose/vault-suggest.js"(exports2, module2) {
    "use strict";
    var { TFolder: TFolder2 } = require("obsidian");
    var { PathSuggestBase, suggestAvailable: suggestAvailable2, SUGGEST_LIMIT } = require_suggest_base();
    var isFolder = (f) => f instanceof TFolder2;
    var VaultFolderSuggest = class extends PathSuggestBase {
      getSuggestions(query) {
        return this.match(this.app.vault.getAllLoadedFiles().filter(isFolder), query, SUGGEST_LIMIT);
      }
    };
    var VaultFileSuggest = class extends PathSuggestBase {
      getSuggestions(query) {
        return this.match(this.app.vault.getMarkdownFiles(), query, SUGGEST_LIMIT);
      }
    };
    var VaultPathSuggest = class extends PathSuggestBase {
      getSuggestions(query) {
        return this.match(this.app.vault.getAllLoadedFiles().filter((f) => f.path), query, 0).sort((a, b) => isFolder(a) === isFolder(b) ? a.path.localeCompare(b.path) : isFolder(a) ? -1 : 1).slice(0, SUGGEST_LIMIT);
      }
    };
    module2.exports = { VaultFolderSuggest, VaultFileSuggest, VaultPathSuggest, suggestAvailable: suggestAvailable2 };
  }
});

// src/shared/locales/common.js
var require_common = __commonJS({
  "src/shared/locales/common.js"(exports2, module2) {
    "use strict";
    var en = {
      "modal.andMore": "\u2026and {n} more",
      "btn.apply": "Apply",
      "btn.cancel": "Cancel",
      "btn.close": "Close",
      "label.thisNote": "This note",
      "modal.update.summary": "{links} change(s) across {files} note(s). Uncheck any change to skip it, or a note to skip all of its changes.",
      "modal.update.upToDate": "Everything is up to date \u2014 nothing to update.",
      "notice.updateSkipped": "({n} note(s) skipped \u2014 changed since the preview)",
      "set.heading.maintenance": "Maintenance",
      "set.rebuild.button": "Rebuild",
      "set.precedence.name": "Priority among linker plugins",
      "set.precedence.desc": "A word or link several linkers claim goes to the one highest in this list. You can only move this plugin \u2014 move the others from their own settings.",
      "set.precedence.other": "Moved from its own settings",
      "set.precedence.up": "Move up",
      "set.precedence.down": "Move down"
    };
    var ru = {
      "modal.andMore": "\u2026\u0438 \u0435\u0449\u0451 {n}",
      "btn.apply": "\u041F\u0440\u0438\u043C\u0435\u043D\u0438\u0442\u044C",
      "btn.cancel": "\u041E\u0442\u043C\u0435\u043D\u0430",
      "btn.close": "\u0417\u0430\u043A\u0440\u044B\u0442\u044C",
      "label.thisNote": "\u042D\u0442\u0430 \u0437\u0430\u043C\u0435\u0442\u043A\u0430",
      "modal.update.summary": "\u041F\u0440\u0430\u0432\u043E\u043A \u2014 {links} \u0432 \u0437\u0430\u043C\u0435\u0442\u043A\u0430\u0445: {files}. \u0421\u043D\u0438\u043C\u0438\u0442\u0435 \u0433\u0430\u043B\u043E\u0447\u043A\u0443 \u0441 \u043F\u0440\u0430\u0432\u043A\u0438, \u0447\u0442\u043E\u0431\u044B \u043F\u0440\u043E\u043F\u0443\u0441\u0442\u0438\u0442\u044C \u0435\u0451, \u0438\u043B\u0438 \u0441 \u0437\u0430\u043C\u0435\u0442\u043A\u0438 \u2014 \u0447\u0442\u043E\u0431\u044B \u043F\u0440\u043E\u043F\u0443\u0441\u0442\u0438\u0442\u044C \u0432\u0441\u0435 \u0435\u0451 \u043F\u0440\u0430\u0432\u043A\u0438.",
      "modal.update.upToDate": "\u0412\u0441\u0451 \u0430\u043A\u0442\u0443\u0430\u043B\u044C\u043D\u043E \u2014 \u043E\u0431\u043D\u043E\u0432\u043B\u044F\u0442\u044C \u043D\u0435\u0447\u0435\u0433\u043E.",
      "notice.updateSkipped": "(\u043F\u0440\u043E\u043F\u0443\u0449\u0435\u043D\u043E \u0437\u0430\u043C\u0435\u0442\u043E\u043A \u2014 {n}: \u0438\u0437\u043C\u0435\u043D\u0438\u043B\u0438\u0441\u044C \u043F\u043E\u0441\u043B\u0435 \u043F\u0440\u0435\u0434\u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440\u0430)",
      "set.heading.maintenance": "\u041E\u0431\u0441\u043B\u0443\u0436\u0438\u0432\u0430\u043D\u0438\u0435",
      "set.rebuild.button": "\u041F\u0435\u0440\u0435\u0441\u0442\u0440\u043E\u0438\u0442\u044C",
      "set.precedence.name": "\u041F\u0440\u0438\u043E\u0440\u0438\u0442\u0435\u0442 \u0441\u0440\u0435\u0434\u0438 \u043F\u043B\u0430\u0433\u0438\u043D\u043E\u0432-\u043B\u0438\u043D\u043A\u0435\u0440\u043E\u0432",
      "set.precedence.desc": "\u0421\u043B\u043E\u0432\u043E \u0438\u043B\u0438 \u0441\u0441\u044B\u043B\u043A\u0443, \u043D\u0430 \u043A\u043E\u0442\u043E\u0440\u044B\u0435 \u043F\u0440\u0435\u0442\u0435\u043D\u0434\u0443\u044E\u0442 \u043D\u0435\u0441\u043A\u043E\u043B\u044C\u043A\u043E \u043B\u0438\u043D\u043A\u0435\u0440\u043E\u0432, \u0437\u0430\u0431\u0438\u0440\u0430\u0435\u0442 \u0442\u043E\u0442, \u043A\u0442\u043E \u0432\u044B\u0448\u0435 \u0432 \u0441\u043F\u0438\u0441\u043A\u0435. \u041E\u0442\u0441\u044E\u0434\u0430 \u0434\u0432\u0438\u0433\u0430\u0435\u0442\u0441\u044F \u0442\u043E\u043B\u044C\u043A\u043E \u044D\u0442\u043E\u0442 \u043F\u043B\u0430\u0433\u0438\u043D \u2014 \u043E\u0441\u0442\u0430\u043B\u044C\u043D\u044B\u0435 \u0438\u0437 \u0441\u0432\u043E\u0438\u0445 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043A.",
      "set.precedence.other": "\u0414\u0432\u0438\u0433\u0430\u0435\u0442\u0441\u044F \u0438\u0437 \u0441\u0432\u043E\u0438\u0445 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043A",
      "set.precedence.up": "\u0412\u044B\u0448\u0435",
      "set.precedence.down": "\u041D\u0438\u0436\u0435"
    };
    var de = {
      "modal.andMore": "\u2026und {n} weitere",
      "btn.apply": "Anwenden",
      "btn.cancel": "Abbrechen",
      "set.heading.maintenance": "Wartung",
      "set.rebuild.button": "Neu aufbauen"
    };
    var es = {
      "modal.andMore": "\u2026y {n} m\xE1s",
      "btn.apply": "Aplicar",
      "btn.cancel": "Cancelar",
      "set.heading.maintenance": "Mantenimiento",
      "set.rebuild.button": "Reconstruir"
    };
    var fr = {
      "modal.andMore": "\u2026et {n} de plus",
      "btn.apply": "Appliquer",
      "btn.cancel": "Annuler",
      "set.heading.maintenance": "Maintenance",
      "set.rebuild.button": "Reconstruire"
    };
    var uk = {
      "modal.andMore": "\u2026\u0442\u0430 \u0449\u0435 {n}",
      "btn.apply": "\u0417\u0430\u0441\u0442\u043E\u0441\u0443\u0432\u0430\u0442\u0438",
      "btn.cancel": "\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438",
      "set.heading.maintenance": "\u041E\u0431\u0441\u043B\u0443\u0433\u043E\u0432\u0443\u0432\u0430\u043D\u043D\u044F",
      "set.rebuild.button": "\u041F\u0435\u0440\u0435\u0431\u0443\u0434\u0443\u0432\u0430\u0442\u0438"
    };
    module2.exports = { en, ru, de, es, fr, uk };
  }
});

// src/shared/locales/prose.js
var require_prose = __commonJS({
  "src/shared/locales/prose.js"(exports2, module2) {
    "use strict";
    var en = {
      "noun.file": "file",
      "noun.folder": "folder",
      "scope.first": "first",
      "scope.all": "all",
      "menu.linkThisWord": "Link \u201C{display}\u201D",
      "menu.linkHere": "Link \u201C{display}\u201D here",
      "menu.linkDisplayTo": 'Link "{display}" to\u2026',
      "menu.linkScopeTo": 'Link {scope} "{display}" to\u2026',
      "menu.openThisWord": "Open \u201C{display}\u201D",
      "modal.choose.title": "Which one?",
      "set.heading.scope": "Scope",
      "set.heading.matching": "Matching",
      "set.languages.name": "Languages",
      "set.languages.show": "Show languages",
      "set.languages.hide": "Hide languages",
      "set.lang.higher": "Higher priority",
      "set.lang.lower": "Lower priority",
      "set.linkFirstOnly.name": "Link first occurrence only",
      "set.heading.highlighting": "Highlighting",
      "set.highlightInReading.name": "Highlight in Reading view",
      "set.editingHighlight.onSave": "On save",
      "set.skipHeadings.name": "Skip headings",
      "set.statusBar.name": "Status bar count",
      "set.heading.autocomplete": "Autocomplete",
      "set.linkSuggest.name": "Suggest links while typing",
      "set.suggestMinChars.desc": "How many characters to type before suggestions appear.",
      "set.suggestSkipAfter.name": "Skip after characters",
      "set.suggestPlainText.name": "Insert plain text",
      "set.suggestPlainText.desc": "Suggestions complete the word without turning it into a link.",
      "set.heading.contextMenu": "Context menu",
      // The shared submenu the exclusion items collect into, and their wording inside it, where
      // the parent already names the word.
      "exclude.group": "Exclude \u201C{value}\u201D",
      "silence.group": "Stop linking \u201C{value}\u201D",
      // The group already carries the verb, so an item only says how far it reaches.
      "exclude.shortForm": "this spelling",
      "exclude.shortStem": "every form of it",
      "label.selection": "Selection",
      "modal.leftAsText": "(left as text)",
      "modal.skipOption": "skip",
      "modal.materialize.summary": "Reviewing {files} file(s), {replacements} replacement(s).",
      "modal.unlink.summary": "Reviewing {files} file(s), {links} link(s).",
      "modal.choose.body": "This word has more than one match.",
      "notice.noActiveNote": "No active note.",
      "notice.noSelection": "Nothing selected.",
      "notice.scopeSkipped": " Skipped {n} note(s) changed since the preview.",
      "set.editingHighlight.live": "Live",
      "set.editingHighlight.name": "Highlight in the editor",
      "set.lang.invalid": "Invalid: {error}",
      "set.languages.desc": "{enabled} of {total} enabled",
      "set.matchMode.name": "Match mode",
      "set.matchMode.exact": "Exact (case-insensitive)",
      "set.matchMode.endingStrip": "Light ending strip",
      "set.matchMode.stemmer": "Stemmer (best across forms)",
      "kind.heading": "Heading",
      "kind.term": "Term",
      "kind.viaAlias": "via alias \u201C{form}\u201D",
      "set.smartCase.name": "Smart case for acronyms",
      "set.smartCase.desc": "Match mostly-uppercase terms (like \u201CIT\u201D or \u201CNASA\u201D) case-sensitively, so they don\u2019t link ordinary words.",
      "set.scopeMode.name": "Where to link",
      "set.scopeMode.vault": "The whole vault",
      "set.scopeMode.folders": "Only chosen folders",
      "set.suggestMinChars.name": "Minimum typed length",
      "set.statusBarIncludeLinks.name": "Count existing links too",
      "set.folderList.add": "Add path\u2026",
      "set.folderList.addAria": "Add",
      "set.exclusionList.add": "Add\u2026",
      "set.exclusionList.addAria": "Add",
      "set.exclusionList.remove": "Remove",
      "set.exclusionList.show": "Show the list",
      "set.exclusionList.hide": "Hide the list",
      "plural.alias": { one: "{n} alias", other: "{n} aliases" }
    };
    var ru = {
      "noun.file": "\u0444\u0430\u0439\u043B",
      "noun.folder": "\u043F\u0430\u043F\u043A\u0443",
      "scope.first": "\u043F\u0435\u0440\u0432\u043E\u0435",
      "scope.all": "\u0432\u0441\u0435",
      "menu.linkThisWord": "\u0421\u0432\u044F\u0437\u0430\u0442\u044C \xAB{display}\xBB",
      "menu.linkHere": "\u0421\u0432\u044F\u0437\u0430\u0442\u044C \xAB{display}\xBB \u0437\u0434\u0435\u0441\u044C",
      "menu.linkDisplayTo": "\u0421\u0432\u044F\u0437\u0430\u0442\u044C \xAB{display}\xBB \u0441\u2026",
      "menu.linkScopeTo": "\u0421\u0432\u044F\u0437\u0430\u0442\u044C {scope} \xAB{display}\xBB \u0441\u2026",
      "menu.openThisWord": "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \xAB{display}\xBB",
      "modal.choose.title": "\u041A\u0430\u043A\u043E\u0435 \u0438\u0437 \u0441\u043E\u0432\u043F\u0430\u0434\u0435\u043D\u0438\u0439?",
      "set.heading.scope": "\u041E\u0431\u043B\u0430\u0441\u0442\u044C",
      "set.heading.matching": "\u0421\u043E\u043F\u043E\u0441\u0442\u0430\u0432\u043B\u0435\u043D\u0438\u0435",
      "set.languages.name": "\u042F\u0437\u044B\u043A\u0438",
      "set.languages.show": "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u044F\u0437\u044B\u043A\u0438",
      "set.languages.hide": "\u0421\u043A\u0440\u044B\u0442\u044C \u044F\u0437\u044B\u043A\u0438",
      "set.lang.higher": "\u0412\u044B\u0448\u0435 \u043F\u0440\u0438\u043E\u0440\u0438\u0442\u0435\u0442",
      "set.lang.lower": "\u041D\u0438\u0436\u0435 \u043F\u0440\u0438\u043E\u0440\u0438\u0442\u0435\u0442",
      "set.linkFirstOnly.name": "\u0421\u0432\u044F\u0437\u044B\u0432\u0430\u0442\u044C \u0442\u043E\u043B\u044C\u043A\u043E \u043F\u0435\u0440\u0432\u043E\u0435 \u0432\u0445\u043E\u0436\u0434\u0435\u043D\u0438\u0435",
      "set.heading.highlighting": "\u041F\u043E\u0434\u0441\u0432\u0435\u0442\u043A\u0430",
      "set.highlightInReading.name": "\u041F\u043E\u0434\u0441\u0432\u0435\u0442\u043A\u0430 \u0432 \u0440\u0435\u0436\u0438\u043C\u0435 \u0447\u0442\u0435\u043D\u0438\u044F",
      "set.editingHighlight.onSave": "\u041F\u0440\u0438 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u0438",
      "set.skipHeadings.name": "\u041F\u0440\u043E\u043F\u0443\u0441\u043A\u0430\u0442\u044C \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0438",
      "set.statusBar.name": "\u0421\u0447\u0451\u0442\u0447\u0438\u043A \u0432 \u0441\u0442\u0440\u043E\u043A\u0435 \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u044F",
      "set.heading.autocomplete": "\u0410\u0432\u0442\u043E\u0434\u043E\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u0435",
      "set.linkSuggest.name": "\u041F\u043E\u0434\u0441\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C \u0441\u0441\u044B\u043B\u043A\u0438 \u043F\u0440\u0438 \u043D\u0430\u0431\u043E\u0440\u0435",
      "set.suggestMinChars.desc": "\u0421\u043A\u043E\u043B\u044C\u043A\u043E \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432 \u043D\u0430\u0431\u0440\u0430\u0442\u044C, \u043F\u0440\u0435\u0436\u0434\u0435 \u0447\u0435\u043C \u043F\u043E\u044F\u0432\u044F\u0442\u0441\u044F \u043F\u043E\u0434\u0441\u043A\u0430\u0437\u043A\u0438.",
      "set.suggestSkipAfter.name": "\u041F\u0440\u043E\u043F\u0443\u0441\u043A\u0430\u0442\u044C \u043F\u043E\u0441\u043B\u0435 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432",
      "set.suggestPlainText.name": "\u0412\u0441\u0442\u0430\u0432\u043B\u044F\u0442\u044C \u043F\u0440\u043E\u0441\u0442\u043E\u0439 \u0442\u0435\u043A\u0441\u0442",
      "set.suggestPlainText.desc": "\u041F\u043E\u0434\u0441\u043A\u0430\u0437\u043A\u0430 \u0434\u043E\u043F\u0438\u0441\u044B\u0432\u0430\u0435\u0442 \u0441\u043B\u043E\u0432\u043E, \u043D\u0435 \u043F\u0440\u0435\u0432\u0440\u0430\u0449\u0430\u044F \u0435\u0433\u043E \u0432 \u0441\u0441\u044B\u043B\u043A\u0443.",
      "set.heading.contextMenu": "\u041A\u043E\u043D\u0442\u0435\u043A\u0441\u0442\u043D\u043E\u0435 \u043C\u0435\u043D\u044E",
      "exclude.group": "\u0418\u0441\u043A\u043B\u044E\u0447\u0438\u0442\u044C \xAB{value}\xBB",
      "silence.group": "\u041D\u0435 \u0441\u0432\u044F\u0437\u044B\u0432\u0430\u0442\u044C \xAB{value}\xBB",
      "exclude.shortForm": "\u044D\u0442\u043E \u043D\u0430\u043F\u0438\u0441\u0430\u043D\u0438\u0435",
      "exclude.shortStem": "\u043B\u044E\u0431\u0443\u044E \u0435\u0433\u043E \u0444\u043E\u0440\u043C\u0443",
      "label.selection": "\u0412\u044B\u0434\u0435\u043B\u0435\u043D\u0438\u0435",
      "modal.leftAsText": "(\u043E\u0441\u0442\u0430\u0432\u043B\u0435\u043D\u043E \u0442\u0435\u043A\u0441\u0442\u043E\u043C)",
      "modal.skipOption": "\u043F\u0440\u043E\u043F\u0443\u0441\u0442\u0438\u0442\u044C",
      "modal.materialize.summary": "\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430: \u0444\u0430\u0439\u043B\u043E\u0432 \u2014 {files}, \u0437\u0430\u043C\u0435\u043D \u2014 {replacements}.",
      "modal.unlink.summary": "\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430: \u0444\u0430\u0439\u043B\u043E\u0432 \u2014 {files}, \u0441\u0441\u044B\u043B\u043E\u043A \u2014 {links}.",
      "modal.choose.body": "\u0423 \u044D\u0442\u043E\u0433\u043E \u0441\u043B\u043E\u0432\u0430 \u043D\u0435\u0441\u043A\u043E\u043B\u044C\u043A\u043E \u0441\u043E\u0432\u043F\u0430\u0434\u0435\u043D\u0438\u0439.",
      "notice.noActiveNote": "\u041D\u0435\u0442 \u0430\u043A\u0442\u0438\u0432\u043D\u043E\u0439 \u0437\u0430\u043C\u0435\u0442\u043A\u0438.",
      "notice.noSelection": "\u041D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u0432\u044B\u0434\u0435\u043B\u0435\u043D\u043E.",
      "notice.scopeSkipped": " \u041F\u0440\u043E\u043F\u0443\u0449\u0435\u043D\u043E \u0437\u0430\u043C\u0435\u0442\u043E\u043A, \u0438\u0437\u043C\u0435\u043D\u0451\u043D\u043D\u044B\u0445 \u043F\u043E\u0441\u043B\u0435 \u043F\u0440\u0435\u0432\u044C\u044E: {n}.",
      "set.editingHighlight.live": "\u041D\u0430 \u043B\u0435\u0442\u0443",
      "set.editingHighlight.name": "\u041F\u043E\u0434\u0441\u0432\u0435\u0442\u043A\u0430 \u0432 \u0440\u0435\u0434\u0430\u043A\u0442\u043E\u0440\u0435",
      "set.lang.invalid": "\u041E\u0448\u0438\u0431\u043A\u0430: {error}",
      "set.languages.desc": "\u0412\u043A\u043B\u044E\u0447\u0435\u043D\u043E {enabled} \u0438\u0437 {total}",
      "set.matchMode.name": "\u0420\u0435\u0436\u0438\u043C \u0441\u043E\u043F\u043E\u0441\u0442\u0430\u0432\u043B\u0435\u043D\u0438\u044F",
      "set.matchMode.exact": "\u0422\u043E\u0447\u043D\u043E\u0435 (\u0431\u0435\u0437 \u0443\u0447\u0451\u0442\u0430 \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0430)",
      "set.matchMode.endingStrip": "\u041B\u0451\u0433\u043A\u043E\u0435 \u043E\u0442\u0441\u0435\u0447\u0435\u043D\u0438\u0435 \u043E\u043A\u043E\u043D\u0447\u0430\u043D\u0438\u0439",
      "set.matchMode.stemmer": "\u0421\u0442\u0435\u043C\u043C\u0435\u0440 (\u043B\u0443\u0447\u0448\u0435 \u0434\u043B\u044F \u0432\u0441\u0435\u0445 \u0444\u043E\u0440\u043C)",
      "kind.heading": "\u0417\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A",
      "kind.term": "\u0422\u0435\u0440\u043C\u0438\u043D",
      "kind.viaAlias": "\u043F\u043E \u0430\u043B\u0438\u0430\u0441\u0443 \xAB{form}\xBB",
      "set.smartCase.name": "\u0423\u043C\u043D\u044B\u0439 \u0440\u0435\u0433\u0438\u0441\u0442\u0440 \u0434\u043B\u044F \u0430\u0431\u0431\u0440\u0435\u0432\u0438\u0430\u0442\u0443\u0440",
      "set.smartCase.desc": "\u0422\u0435\u0440\u043C\u0438\u043D\u044B \u0438\u0437 \u0437\u0430\u0433\u043B\u0430\u0432\u043D\u044B\u0445 \u0431\u0443\u043A\u0432 (\u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440 \xABIT\xBB \u0438\u043B\u0438 \xABNASA\xBB) \u0441\u043E\u043F\u043E\u0441\u0442\u0430\u0432\u043B\u044F\u044E\u0442\u0441\u044F \u0441 \u0443\u0447\u0451\u0442\u043E\u043C \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0430, \u0447\u0442\u043E\u0431\u044B \u043D\u0435 \u0446\u0435\u043F\u043B\u044F\u0442\u044C \u043E\u0431\u044B\u0447\u043D\u044B\u0435 \u0441\u043B\u043E\u0432\u0430.",
      "set.scopeMode.name": "\u0413\u0434\u0435 \u0441\u0432\u044F\u0437\u044B\u0432\u0430\u0442\u044C",
      "set.scopeMode.vault": "\u0412\u0441\u0451 \u0445\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0435",
      "set.scopeMode.folders": "\u0422\u043E\u043B\u044C\u043A\u043E \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u044B\u0435 \u043F\u0430\u043F\u043A\u0438",
      "set.suggestMinChars.name": "\u041C\u0438\u043D\u0438\u043C\u0443\u043C \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432",
      "set.statusBarIncludeLinks.name": "\u0421\u0447\u0438\u0442\u0430\u0442\u044C \u0438 \u0443\u0436\u0435 \u0441\u0432\u044F\u0437\u0430\u043D\u043D\u044B\u0435",
      "set.folderList.add": "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043F\u0443\u0442\u044C\u2026",
      "set.folderList.addAria": "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C",
      "set.exclusionList.add": "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C\u2026",
      "set.exclusionList.addAria": "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C",
      "set.exclusionList.remove": "\u0423\u0431\u0440\u0430\u0442\u044C",
      "set.exclusionList.show": "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0441\u043F\u0438\u0441\u043E\u043A",
      "set.exclusionList.hide": "\u0421\u043A\u0440\u044B\u0442\u044C \u0441\u043F\u0438\u0441\u043E\u043A",
      "plural.alias": { one: "{n} \u043F\u0441\u0435\u0432\u0434\u043E\u043D\u0438\u043C", few: "{n} \u043F\u0441\u0435\u0432\u0434\u043E\u043D\u0438\u043C\u0430", many: "{n} \u043F\u0441\u0435\u0432\u0434\u043E\u043D\u0438\u043C\u043E\u0432", other: "{n} \u043F\u0441\u0435\u0432\u0434\u043E\u043D\u0438\u043C\u043E\u0432" }
    };
    var de = {
      "noun.file": "Datei",
      "noun.folder": "Ordner",
      "scope.first": "erstes",
      "scope.all": "alle",
      "menu.linkDisplayTo": "\u201E{display}\u201C verlinken mit\u2026",
      "menu.linkScopeTo": "{scope} \u201E{display}\u201C verlinken mit\u2026",
      "modal.choose.title": "Begriff w\xE4hlen",
      "set.heading.scope": "Bereich",
      "set.heading.matching": "Abgleich",
      "set.languages.name": "Sprachen",
      "set.languages.show": "Sprachen anzeigen",
      "set.languages.hide": "Sprachen ausblenden",
      "set.lang.higher": "H\xF6here Priorit\xE4t",
      "set.lang.lower": "Niedrigere Priorit\xE4t",
      "set.linkFirstOnly.name": "Nur erstes Vorkommen verlinken",
      "set.heading.highlighting": "Hervorhebung",
      "set.highlightInReading.name": "In der Leseansicht hervorheben",
      "set.editingHighlight.onSave": "Beim Speichern",
      "set.skipHeadings.name": "\xDCberschriften \xFCberspringen",
      "set.statusBar.name": "Z\xE4hler in der Statusleiste",
      "set.heading.autocomplete": "Autovervollst\xE4ndigung",
      "set.linkSuggest.name": "Links w\xE4hrend der Eingabe vorschlagen",
      "set.suggestMinChars.desc": "Wie viele Zeichen einzugeben sind, bevor Vorschl\xE4ge erscheinen.",
      "set.suggestSkipAfter.name": "Nach Zeichen \xFCberspringen",
      "set.suggestPlainText.name": "Reinen Text einf\xFCgen",
      "set.suggestPlainText.desc": "Vorschl\xE4ge vervollst\xE4ndigen das Wort, ohne daraus einen Link zu machen.",
      "set.heading.contextMenu": "Kontextmen\xFC",
      "label.selection": "Auswahl",
      "modal.leftAsText": "\u2014 als Text belassen \u2014",
      "modal.skipOption": "(\xFCberspringen \u2014 als Text belassen)",
      "modal.materialize.summary": "Dateien: {files}, Ersetzungen: {replacements}",
      "modal.unlink.summary": "Dateien: {files}, zu entfernende Links: {links}",
      "modal.choose.body": "Dieses Wort passt zu mehr als einem Begriff \u2014 eines w\xE4hlen:",
      "notice.noActiveNote": "Keine aktive Notiz",
      "notice.noSelection": "Keine Auswahl",
      "notice.scopeSkipped": ", {n} \xFCbersprungen (seit der Vorschau ge\xE4ndert)",
      "set.editingHighlight.live": "Live (w\xE4hrend der Eingabe)",
      "set.editingHighlight.name": "Beim Bearbeiten hervorheben",
      "set.lang.invalid": "Ung\xFCltiges Modul: {error}",
      "set.languages.desc": "Mitgelieferte Morphologie-Module \u2014 {enabled} von {total} aktiviert",
      "set.matchMode.name": "Morphologie",
      "set.matchMode.exact": "Exakter Treffer",
      "set.matchMode.endingStrip": "Endungen abschneiden",
      "set.matchMode.stemmer": "Stemmer (empfohlen)",
      "kind.heading": "\xDCberschrift",
      "kind.term": "Begriff",
      "kind.viaAlias": "\xFCber Alias \u201E{form}\u201C",
      "set.smartCase.name": "Schreibweise von Abk\xFCrzungen beachten",
      "set.smartCase.desc": "\xDCberwiegend gro\xDFgeschriebene Begriffe (etwa \u201EIT\u201C oder \u201ENASA\u201C) werden nur bei gleicher Schreibweise verkn\xFCpft, damit sie keine gew\xF6hnlichen W\xF6rter erfassen.",
      "set.scopeMode.name": "Verlinkungsbereich",
      "set.scopeMode.vault": "\xDCberall",
      "set.scopeMode.folders": "Nur aufgef\xFChrte Pfade",
      "set.suggestMinChars.name": "Mindestanzahl Zeichen",
      "set.statusBarIncludeLinks.name": "Direkte Links z\xE4hlen",
      "plural.alias": { one: "{n} Alias", other: "{n} Aliasse" }
    };
    var es = {
      "noun.file": "archivo",
      "noun.folder": "carpeta",
      "scope.first": "la primera",
      "scope.all": "todas",
      "menu.linkDisplayTo": "Enlazar \xAB{display}\xBB con\u2026",
      "menu.linkScopeTo": "Enlazar {scope} \xAB{display}\xBB con\u2026",
      "modal.choose.title": "Elegir un t\xE9rmino",
      "set.heading.scope": "\xC1mbito",
      "set.heading.matching": "Coincidencia",
      "set.languages.name": "Idiomas",
      "set.languages.show": "Mostrar idiomas",
      "set.languages.hide": "Ocultar idiomas",
      "set.lang.higher": "Mayor prioridad",
      "set.lang.lower": "Menor prioridad",
      "set.linkFirstOnly.name": "Enlazar solo la primera aparici\xF3n",
      "set.heading.highlighting": "Resaltado",
      "set.highlightInReading.name": "Resaltar en vista de lectura",
      "set.editingHighlight.onSave": "Al guardar",
      "set.skipHeadings.name": "Omitir encabezados",
      "set.statusBar.name": "Contador en la barra de estado",
      "set.heading.autocomplete": "Autocompletado",
      "set.linkSuggest.name": "Sugerir enlaces al escribir",
      "set.suggestMinChars.desc": "Cu\xE1ntos caracteres escribir antes de que aparezcan las sugerencias.",
      "set.suggestSkipAfter.name": "Omitir tras caracteres",
      "set.suggestPlainText.name": "Insertar texto sin enlace",
      "set.suggestPlainText.desc": "Las sugerencias completan la palabra sin convertirla en un enlace.",
      "set.heading.contextMenu": "Men\xFA contextual",
      "label.selection": "selecci\xF3n",
      "modal.leftAsText": "\u2014 dejado como texto \u2014",
      "modal.skipOption": "(omitir \u2014 dejar como texto)",
      "modal.materialize.summary": "Archivos: {files}, reemplazos: {replacements}",
      "modal.unlink.summary": "Archivos: {files}, enlaces a eliminar: {links}",
      "modal.choose.body": "Esta palabra coincide con m\xE1s de un t\xE9rmino \u2014 elige uno:",
      "notice.noActiveNote": "No hay nota activa",
      "notice.noSelection": "No hay selecci\xF3n",
      "notice.scopeSkipped": ", {n} omitido(s) (cambiado desde la vista previa)",
      "set.editingHighlight.live": "En vivo (mientras escribes)",
      "set.editingHighlight.name": "Resaltar al editar",
      "set.lang.invalid": "M\xF3dulo no v\xE1lido: {error}",
      "set.languages.desc": "M\xF3dulos de morfolog\xEDa incluidos \u2014 {enabled} de {total} activados",
      "set.matchMode.name": "Morfolog\xEDa",
      "set.matchMode.exact": "Coincidencia exacta",
      "set.matchMode.endingStrip": "Quitar terminaciones",
      "set.matchMode.stemmer": "Lematizador (recomendado)",
      "kind.heading": "Encabezado",
      "kind.term": "T\xE9rmino",
      "kind.viaAlias": "por el alias \xAB{form}\xBB",
      "set.smartCase.name": "Distinguir may\xFAsculas en siglas",
      "set.smartCase.desc": "Los t\xE9rminos escritos casi todo en may\xFAsculas (como \xABIT\xBB o \xABNASA\xBB) solo coinciden con esa misma graf\xEDa, para que no enlacen palabras corrientes.",
      "set.scopeMode.name": "\xC1mbito de enlazado",
      "set.scopeMode.vault": "En todas partes",
      "set.scopeMode.folders": "Solo rutas indicadas",
      "set.suggestMinChars.name": "Caracteres m\xEDnimos",
      "set.statusBarIncludeLinks.name": "Contar enlaces directos",
      "plural.alias": { one: "{n} alias", other: "{n} alias" }
    };
    var fr = {
      "noun.file": "fichier",
      "noun.folder": "dossier",
      "scope.first": "la premi\xE8re",
      "scope.all": "toutes",
      "menu.linkDisplayTo": "Lier \xAB {display} \xBB \xE0\u2026",
      "menu.linkScopeTo": "Lier {scope} \xAB {display} \xBB \xE0\u2026",
      "modal.choose.title": "Choisir un terme",
      "set.heading.scope": "Port\xE9e",
      "set.heading.matching": "Correspondance",
      "set.languages.name": "Langues",
      "set.languages.show": "Afficher les langues",
      "set.languages.hide": "Masquer les langues",
      "set.lang.higher": "Priorit\xE9 plus haute",
      "set.lang.lower": "Priorit\xE9 plus basse",
      "set.linkFirstOnly.name": "Lier seulement la premi\xE8re occurrence",
      "set.heading.highlighting": "Surlignage",
      "set.highlightInReading.name": "Surligner en mode lecture",
      "set.editingHighlight.onSave": "\xC0 l\u2019enregistrement",
      "set.skipHeadings.name": "Ignorer les titres",
      "set.statusBar.name": "Compteur dans la barre d\u2019\xE9tat",
      "set.heading.autocomplete": "Autocompl\xE9tion",
      "set.linkSuggest.name": "Sugg\xE9rer des liens pendant la saisie",
      "set.suggestMinChars.desc": "Combien de caract\xE8res saisir avant que les suggestions apparaissent.",
      "set.suggestSkipAfter.name": "Ignorer apr\xE8s caract\xE8res",
      "set.suggestPlainText.name": "Ins\xE9rer du texte simple",
      "set.suggestPlainText.desc": "Les suggestions compl\xE8tent le mot sans en faire un lien.",
      "set.heading.contextMenu": "Menu contextuel",
      "label.selection": "s\xE9lection",
      "modal.leftAsText": "\u2014 laiss\xE9 en texte \u2014",
      "modal.skipOption": "(ignorer \u2014 laisser en texte)",
      "modal.materialize.summary": "Fichiers : {files}, remplacements : {replacements}",
      "modal.unlink.summary": "Fichiers : {files}, liens \xE0 supprimer : {links}",
      "modal.choose.body": "Ce mot correspond \xE0 plus d\u2019un terme \u2014 choisissez-en un :",
      "notice.noActiveNote": "Aucune note active",
      "notice.noSelection": "Aucune s\xE9lection",
      "notice.scopeSkipped": ", {n} ignor\xE9(s) (modifi\xE9 depuis l\u2019aper\xE7u)",
      "set.editingHighlight.live": "En direct (pendant la saisie)",
      "set.editingHighlight.name": "Surligner pendant l\u2019\xE9dition",
      "set.lang.invalid": "Module non valide : {error}",
      "set.languages.desc": "Modules de morphologie inclus \u2014 {enabled} sur {total} activ\xE9s",
      "set.matchMode.name": "Morphologie",
      "set.matchMode.exact": "Correspondance exacte",
      "set.matchMode.endingStrip": "Suppression des terminaisons",
      "set.matchMode.stemmer": "Racinisation (recommand\xE9)",
      "kind.heading": "Titre",
      "kind.term": "Terme",
      "kind.viaAlias": "via l\u2019alias \xAB {form} \xBB",
      "set.smartCase.name": "Respecter la casse des sigles",
      "set.smartCase.desc": "Les termes \xE9crits en majuscules (comme \xAB IT \xBB ou \xAB NASA \xBB) ne correspondent qu\u2019\xE0 la m\xEAme graphie, afin de ne pas lier des mots ordinaires.",
      "set.scopeMode.name": "Port\xE9e du liage",
      "set.scopeMode.vault": "Partout",
      "set.scopeMode.folders": "Chemins list\xE9s seulement",
      "set.suggestMinChars.name": "Caract\xE8res minimum",
      "set.statusBarIncludeLinks.name": "Compter les liens directs",
      "plural.alias": { one: "{n} alias", other: "{n} alias" }
    };
    var uk = {
      "noun.file": "\u0444\u0430\u0439\u043B",
      "noun.folder": "\u0442\u0435\u043A\u0443",
      "scope.first": "\u043F\u0435\u0440\u0448\u0435",
      "scope.all": "\u0443\u0441\u0456",
      "menu.linkDisplayTo": "\u0417\u0432\u2019\u044F\u0437\u0430\u0442\u0438 \xAB{display}\xBB \u0437\u2026",
      "menu.linkScopeTo": "\u0417\u0432\u2019\u044F\u0437\u0430\u0442\u0438 {scope} \xAB{display}\xBB \u0437\u2026",
      "modal.choose.title": "\u0412\u0438\u0431\u0435\u0440\u0456\u0442\u044C \u0442\u0435\u0440\u043C\u0456\u043D",
      "set.heading.scope": "\u041E\u0431\u043B\u0430\u0441\u0442\u044C",
      "set.heading.matching": "\u0417\u0456\u0441\u0442\u0430\u0432\u043B\u0435\u043D\u043D\u044F",
      "set.languages.name": "\u041C\u043E\u0432\u0438",
      "set.languages.show": "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u0438 \u043C\u043E\u0432\u0438",
      "set.languages.hide": "\u0421\u0445\u043E\u0432\u0430\u0442\u0438 \u043C\u043E\u0432\u0438",
      "set.lang.higher": "\u0412\u0438\u0449\u0438\u0439 \u043F\u0440\u0456\u043E\u0440\u0438\u0442\u0435\u0442",
      "set.lang.lower": "\u041D\u0438\u0436\u0447\u0438\u0439 \u043F\u0440\u0456\u043E\u0440\u0438\u0442\u0435\u0442",
      "set.linkFirstOnly.name": "\u0417\u0432\u2019\u044F\u0437\u0443\u0432\u0430\u0442\u0438 \u043B\u0438\u0448\u0435 \u043F\u0435\u0440\u0448\u0435 \u0432\u0445\u043E\u0434\u0436\u0435\u043D\u043D\u044F",
      "set.heading.highlighting": "\u041F\u0456\u0434\u0441\u0432\u0456\u0447\u0443\u0432\u0430\u043D\u043D\u044F",
      "set.highlightInReading.name": "\u041F\u0456\u0434\u0441\u0432\u0456\u0447\u0443\u0432\u0430\u0442\u0438 \u0432 \u0440\u0435\u0436\u0438\u043C\u0456 \u0447\u0438\u0442\u0430\u043D\u043D\u044F",
      "set.editingHighlight.onSave": "\u041F\u0456\u0434 \u0447\u0430\u0441 \u0437\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u043D\u044F",
      "set.skipHeadings.name": "\u041F\u0440\u043E\u043F\u0443\u0441\u043A\u0430\u0442\u0438 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0438",
      "set.statusBar.name": "\u041B\u0456\u0447\u0438\u043B\u044C\u043D\u0438\u043A \u0443 \u0440\u044F\u0434\u043A\u0443 \u0441\u0442\u0430\u043D\u0443",
      "set.heading.autocomplete": "\u0410\u0432\u0442\u043E\u0434\u043E\u043F\u043E\u0432\u043D\u0435\u043D\u043D\u044F",
      "set.linkSuggest.name": "\u041F\u0440\u043E\u043F\u043E\u043D\u0443\u0432\u0430\u0442\u0438 \u043F\u043E\u0441\u0438\u043B\u0430\u043D\u043D\u044F \u043F\u0456\u0434 \u0447\u0430\u0441 \u043D\u0430\u0431\u043E\u0440\u0443",
      "set.suggestMinChars.desc": "\u0421\u043A\u0456\u043B\u044C\u043A\u0438 \u0441\u0438\u043C\u0432\u043E\u043B\u0456\u0432 \u043D\u0430\u0431\u0440\u0430\u0442\u0438, \u043F\u0435\u0440\u0448 \u043D\u0456\u0436 \u0437\u2019\u044F\u0432\u043B\u044F\u0442\u044C\u0441\u044F \u043F\u0456\u0434\u043A\u0430\u0437\u043A\u0438.",
      "set.suggestSkipAfter.name": "\u041F\u0440\u043E\u043F\u0443\u0441\u043A\u0430\u0442\u0438 \u043F\u0456\u0441\u043B\u044F \u0441\u0438\u043C\u0432\u043E\u043B\u0456\u0432",
      "set.suggestPlainText.name": "\u0412\u0441\u0442\u0430\u0432\u043B\u044F\u0442\u0438 \u043F\u0440\u043E\u0441\u0442\u0438\u0439 \u0442\u0435\u043A\u0441\u0442",
      "set.suggestPlainText.desc": "\u041F\u0456\u0434\u043A\u0430\u0437\u043A\u0430 \u0434\u043E\u043F\u0438\u0441\u0443\u0454 \u0441\u043B\u043E\u0432\u043E, \u043D\u0435 \u043F\u0435\u0440\u0435\u0442\u0432\u043E\u0440\u044E\u044E\u0447\u0438 \u0439\u043E\u0433\u043E \u043D\u0430 \u043F\u043E\u0441\u0438\u043B\u0430\u043D\u043D\u044F.",
      "set.heading.contextMenu": "\u041A\u043E\u043D\u0442\u0435\u043A\u0441\u0442\u043D\u0435 \u043C\u0435\u043D\u044E",
      "label.selection": "\u0432\u0438\u0434\u0456\u043B\u0435\u043D\u043D\u044F",
      "modal.leftAsText": "\u2014 \u0437\u0430\u043B\u0438\u0448\u0435\u043D\u043E \u0442\u0435\u043A\u0441\u0442\u043E\u043C \u2014",
      "modal.skipOption": "(\u043F\u0440\u043E\u043F\u0443\u0441\u0442\u0438\u0442\u0438 \u2014 \u0437\u0430\u043B\u0438\u0448\u0438\u0442\u0438 \u0442\u0435\u043A\u0441\u0442\u043E\u043C)",
      "modal.materialize.summary": "\u0424\u0430\u0439\u043B\u0456\u0432: {files}, \u0437\u0430\u043C\u0456\u043D: {replacements}",
      "modal.unlink.summary": "\u0424\u0430\u0439\u043B\u0456\u0432: {files}, \u043F\u043E\u0441\u0438\u043B\u0430\u043D\u044C \u0434\u043E \u0432\u0438\u0434\u0430\u043B\u0435\u043D\u043D\u044F: {links}",
      "modal.choose.body": "\u0426\u0435 \u0441\u043B\u043E\u0432\u043E \u0437\u0431\u0456\u0433\u0430\u0454\u0442\u044C\u0441\u044F \u0437 \u043A\u0456\u043B\u044C\u043A\u043E\u043C\u0430 \u0442\u0435\u0440\u043C\u0456\u043D\u0430\u043C\u0438 \u2014 \u0432\u0438\u0431\u0435\u0440\u0456\u0442\u044C \u043E\u0434\u0438\u043D:",
      "notice.noActiveNote": "\u041D\u0435\u043C\u0430\u0454 \u0430\u043A\u0442\u0438\u0432\u043D\u043E\u0457 \u043D\u043E\u0442\u0430\u0442\u043A\u0438",
      "notice.noSelection": "\u041D\u0435\u043C\u0430\u0454 \u0432\u0438\u0434\u0456\u043B\u0435\u043D\u043D\u044F",
      "notice.scopeSkipped": ", \u043F\u0440\u043E\u043F\u0443\u0449\u0435\u043D\u043E: {n} (\u0437\u043C\u0456\u043D\u0435\u043D\u043E \u043F\u0456\u0441\u043B\u044F \u043F\u043E\u043F\u0435\u0440\u0435\u0434\u043D\u044C\u043E\u0433\u043E \u043F\u0435\u0440\u0435\u0433\u043B\u044F\u0434\u0443)",
      "set.editingHighlight.live": "\u041D\u0430 \u043B\u044C\u043E\u0442\u0443 (\u043F\u0456\u0434 \u0447\u0430\u0441 \u043D\u0430\u0431\u043E\u0440\u0443)",
      "set.editingHighlight.name": "\u041F\u0456\u0434\u0441\u0432\u0456\u0447\u0443\u0432\u0430\u0442\u0438 \u043F\u0456\u0434 \u0447\u0430\u0441 \u0440\u0435\u0434\u0430\u0433\u0443\u0432\u0430\u043D\u043D\u044F",
      "set.lang.invalid": "\u041D\u0435\u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u0438\u0439 \u043C\u043E\u0434\u0443\u043B\u044C: {error}",
      "set.languages.desc": "\u0412\u0431\u0443\u0434\u043E\u0432\u0430\u043D\u0456 \u043C\u043E\u0434\u0443\u043B\u0456 \u043C\u043E\u0440\u0444\u043E\u043B\u043E\u0433\u0456\u0457 \u2014 \u0443\u0432\u0456\u043C\u043A\u043D\u0435\u043D\u043E {enabled} \u0437 {total}",
      "set.matchMode.name": "\u041C\u043E\u0440\u0444\u043E\u043B\u043E\u0433\u0456\u044F",
      "set.matchMode.exact": "\u0422\u043E\u0447\u043D\u0438\u0439 \u0437\u0431\u0456\u0433",
      "set.matchMode.endingStrip": "\u0412\u0456\u0434\u0441\u0456\u043A\u0430\u043D\u043D\u044F \u0437\u0430\u043A\u0456\u043D\u0447\u0435\u043D\u044C",
      "set.matchMode.stemmer": "\u0421\u0442\u0435\u043C\u0435\u0440 (\u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u043E\u0432\u0430\u043D\u043E)",
      "kind.heading": "\u0417\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A",
      "kind.term": "\u0422\u0435\u0440\u043C\u0456\u043D",
      "kind.viaAlias": "\u0437\u0430 \u0430\u043B\u0456\u0430\u0441\u043E\u043C \xAB{form}\xBB",
      "set.smartCase.name": "\u0420\u043E\u0437\u0443\u043C\u043D\u0438\u0439 \u0440\u0435\u0433\u0456\u0441\u0442\u0440 \u0434\u043B\u044F \u0430\u0431\u0440\u0435\u0432\u0456\u0430\u0442\u0443\u0440",
      "set.smartCase.desc": "\u0422\u0435\u0440\u043C\u0456\u043D\u0438 \u0437 \u0432\u0435\u043B\u0438\u043A\u0438\u0445 \u043B\u0456\u0442\u0435\u0440 (\u043D\u0430\u043F\u0440\u0438\u043A\u043B\u0430\u0434 \xABIT\xBB \u0430\u0431\u043E \xABNASA\xBB) \u0437\u0456\u0441\u0442\u0430\u0432\u043B\u044F\u044E\u0442\u044C\u0441\u044F \u0437 \u0443\u0440\u0430\u0445\u0443\u0432\u0430\u043D\u043D\u044F\u043C \u0440\u0435\u0433\u0456\u0441\u0442\u0440\u0443, \u0449\u043E\u0431 \u043D\u0435 \u0447\u0456\u043F\u043B\u044F\u0442\u0438 \u0437\u0432\u0438\u0447\u0430\u0439\u043D\u0456 \u0441\u043B\u043E\u0432\u0430.",
      "set.scopeMode.name": "\u041E\u0431\u043B\u0430\u0441\u0442\u044C \u0437\u0432\u2019\u044F\u0437\u0443\u0432\u0430\u043D\u043D\u044F",
      "set.scopeMode.vault": "\u0423\u0441\u044E\u0434\u0438",
      "set.scopeMode.folders": "\u041B\u0438\u0448\u0435 \u0432\u043A\u0430\u0437\u0430\u043D\u0456 \u0448\u043B\u044F\u0445\u0438",
      "set.suggestMinChars.name": "\u041C\u0456\u043D\u0456\u043C\u0443\u043C \u0441\u0438\u043C\u0432\u043E\u043B\u0456\u0432",
      "set.statusBarIncludeLinks.name": "\u0420\u0430\u0445\u0443\u0432\u0430\u0442\u0438 \u043F\u0440\u044F\u043C\u0456 \u043F\u043E\u0441\u0438\u043B\u0430\u043D\u043D\u044F",
      "plural.alias": { one: "{n} \u043F\u0441\u0435\u0432\u0434\u043E\u043D\u0456\u043C", few: "{n} \u043F\u0441\u0435\u0432\u0434\u043E\u043D\u0456\u043C\u0438", many: "{n} \u043F\u0441\u0435\u0432\u0434\u043E\u043D\u0456\u043C\u0456\u0432", other: "{n} \u043F\u0441\u0435\u0432\u0434\u043E\u043D\u0456\u043C\u0456\u0432" }
    };
    module2.exports = { en, ru, de, es, fr, uk };
  }
});

// src/shared/locales/sigil.js
var require_sigil = __commonJS({
  "src/shared/locales/sigil.js"(exports2, module2) {
    "use strict";
    var en = {
      "menu.convert": "Find and convert to link",
      "menu.convert.group": "Find and convert to link",
      "menu.open.group": "Find and open",
      "embed.menu.refresh": "Refresh embed",
      "embed.tool.more": "More actions",
      "embed.tool.open": "Open",
      "embed.tool.refresh": "Refresh",
      "modal.embedPlaceholder": "Choose an embed format\u2026",
      "set.heading.suggestions": "Suggestions & links",
      "set.heading.hover": "Hover preview",
      "set.heading.links": "Links",
      "set.codeRoot.desc": "Base folder the scan paths are relative to. Empty = the folder containing this vault.",
      "set.scanFolders.name": "Scan folders",
      "set.folderList.add": "Add folder\u2026",
      "set.folderList.remove": "Remove",
      "set.folderList.addAria": "Add",
      "set.skipFolders.name": "Skip folders",
      "set.trigger.name": "Trigger",
      "set.preset.file": "file://",
      "set.preset.ask": "Always ask",
      "set.editors.count": "{n} added",
      "set.editors.collapse": "Collapse",
      "set.editors.expand": "Expand",
      "set.editors.namePlaceholder": "Name",
      "set.editors.remove": "Remove",
      "set.minChars.name": "Min characters",
      "set.minChars.desc": "How many characters to type before suggestions appear.",
      "set.maxResults.name": "Max results",
      "set.maxResults.desc": "Most suggestions to show at once.",
      "set.autoRefresh.name": "Auto-refresh index",
      "set.autoRefresh.unsupported": "Recursive folder watching isn\u2019t supported on this platform (Linux); rebuild manually instead.",
      "set.contextMenu.name": "Editor context menu",
      "set.markStaleLinks.name": "Mark stale links",
      "set.info.unknownRoot": "(unknown)",
      "plural.entry": { one: "{n} entry", other: "{n} entries" },
      "plural.key": { one: "{n} key", other: "{n} keys" },
      "plural.note": { one: "{n} note", other: "{n} notes" },
      "plural.staleLink": { one: "{n} stale link", other: "{n} stale links" },
      "plural.brokenLink": { one: "{n} broken link", other: "{n} broken links" }
    };
    var ru = {
      "menu.convert": "\u041D\u0430\u0439\u0442\u0438 \u0438 \u043F\u0440\u0435\u0432\u0440\u0430\u0442\u0438\u0442\u044C \u0432 \u0441\u0441\u044B\u043B\u043A\u0443",
      "menu.convert.group": "\u041D\u0430\u0439\u0442\u0438 \u0438 \u043F\u0440\u0435\u0432\u0440\u0430\u0442\u0438\u0442\u044C \u0432 \u0441\u0441\u044B\u043B\u043A\u0443",
      "menu.open.group": "\u041D\u0430\u0439\u0442\u0438 \u0438 \u043E\u0442\u043A\u0440\u044B\u0442\u044C",
      "embed.menu.refresh": "\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C embed",
      "embed.tool.more": "\u0415\u0449\u0451 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F",
      "embed.tool.open": "\u041E\u0442\u043A\u0440\u044B\u0442\u044C",
      "embed.tool.refresh": "\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C",
      "modal.embedPlaceholder": "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0444\u043E\u0440\u043C\u0430\u0442 embed\u2026",
      "set.heading.suggestions": "\u041F\u043E\u0434\u0441\u043A\u0430\u0437\u043A\u0438 \u0438 \u0441\u0441\u044B\u043B\u043A\u0438",
      "set.heading.hover": "\u041F\u0440\u0435\u0432\u044C\u044E \u043F\u0440\u0438 \u043D\u0430\u0432\u0435\u0434\u0435\u043D\u0438\u0438",
      "set.heading.links": "\u0421\u0441\u044B\u043B\u043A\u0438",
      "set.codeRoot.desc": "\u0411\u0430\u0437\u043E\u0432\u0430\u044F \u043F\u0430\u043F\u043A\u0430, \u043E\u0442\u043D\u043E\u0441\u0438\u0442\u0435\u043B\u044C\u043D\u043E \u043A\u043E\u0442\u043E\u0440\u043E\u0439 \u0437\u0430\u0434\u0430\u044E\u0442\u0441\u044F \u043F\u0443\u0442\u0438 \u0441\u043A\u0430\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F. \u041F\u0443\u0441\u0442\u043E = \u043F\u0430\u043F\u043A\u0430, \u0441\u043E\u0434\u0435\u0440\u0436\u0430\u0449\u0430\u044F \u044D\u0442\u043E \u0445\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0435.",
      "set.scanFolders.name": "\u041F\u0430\u043F\u043A\u0438 \u0441\u043A\u0430\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F",
      "set.folderList.add": "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043F\u0430\u043F\u043A\u0443\u2026",
      "set.folderList.remove": "\u0423\u0434\u0430\u043B\u0438\u0442\u044C",
      "set.folderList.addAria": "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C",
      "set.skipFolders.name": "\u041F\u0440\u043E\u043F\u0443\u0441\u043A\u0430\u0435\u043C\u044B\u0435 \u043F\u0430\u043F\u043A\u0438",
      "set.trigger.name": "\u0422\u0440\u0438\u0433\u0433\u0435\u0440",
      "set.preset.file": "file://",
      "set.preset.ask": "\u0412\u0441\u0435\u0433\u0434\u0430 \u0441\u043F\u0440\u0430\u0448\u0438\u0432\u0430\u0442\u044C",
      "set.editors.count": "\u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u043E: {n}",
      "set.editors.collapse": "\u0421\u0432\u0435\u0440\u043D\u0443\u0442\u044C",
      "set.editors.expand": "\u0420\u0430\u0437\u0432\u0435\u0440\u043D\u0443\u0442\u044C",
      "set.editors.namePlaceholder": "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435",
      "set.editors.remove": "\u0423\u0434\u0430\u043B\u0438\u0442\u044C",
      "set.minChars.name": "\u041C\u0438\u043D\u0438\u043C\u0443\u043C \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432",
      "set.minChars.desc": "\u0421\u043A\u043E\u043B\u044C\u043A\u043E \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432 \u0432\u0432\u0435\u0441\u0442\u0438, \u043F\u0440\u0435\u0436\u0434\u0435 \u0447\u0435\u043C \u043F\u043E\u044F\u0432\u044F\u0442\u0441\u044F \u043F\u043E\u0434\u0441\u043A\u0430\u0437\u043A\u0438.",
      "set.maxResults.name": "\u041C\u0430\u043A\u0441\u0438\u043C\u0443\u043C \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u043E\u0432",
      "set.maxResults.desc": "\u0421\u043A\u043E\u043B\u044C\u043A\u043E \u043F\u043E\u0434\u0441\u043A\u0430\u0437\u043E\u043A \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C \u043E\u0434\u043D\u043E\u0432\u0440\u0435\u043C\u0435\u043D\u043D\u043E.",
      "set.autoRefresh.name": "\u0410\u0432\u0442\u043E\u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u0435 \u0438\u043D\u0434\u0435\u043A\u0441\u0430",
      "set.autoRefresh.unsupported": "\u0420\u0435\u043A\u0443\u0440\u0441\u0438\u0432\u043D\u043E\u0435 \u0441\u043B\u0435\u0436\u0435\u043D\u0438\u0435 \u0437\u0430 \u043F\u0430\u043F\u043A\u0430\u043C\u0438 \u043D\u0435 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442\u0441\u044F \u043D\u0430 \u044D\u0442\u043E\u0439 \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u0435 (Linux); \u043F\u0435\u0440\u0435\u0441\u0442\u0440\u0430\u0438\u0432\u0430\u0439\u0442\u0435 \u0432\u0440\u0443\u0447\u043D\u0443\u044E.",
      "set.contextMenu.name": "\u041A\u043E\u043D\u0442\u0435\u043A\u0441\u0442\u043D\u043E\u0435 \u043C\u0435\u043D\u044E \u0440\u0435\u0434\u0430\u043A\u0442\u043E\u0440\u0430",
      "set.markStaleLinks.name": "\u041E\u0442\u043C\u0435\u0447\u0430\u0442\u044C \u0443\u0441\u0442\u0430\u0440\u0435\u0432\u0448\u0438\u0435 \u0441\u0441\u044B\u043B\u043A\u0438",
      "set.info.unknownRoot": "(\u043D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u043E)",
      "plural.entry": { one: "{n} \u0437\u0430\u043F\u0438\u0441\u044C", few: "{n} \u0437\u0430\u043F\u0438\u0441\u0438", many: "{n} \u0437\u0430\u043F\u0438\u0441\u0435\u0439", other: "{n} \u0437\u0430\u043F\u0438\u0441\u0435\u0439" },
      "plural.key": { one: "{n} \u043A\u043B\u044E\u0447", few: "{n} \u043A\u043B\u044E\u0447\u0430", many: "{n} \u043A\u043B\u044E\u0447\u0435\u0439", other: "{n} \u043A\u043B\u044E\u0447\u0435\u0439" },
      "plural.note": { one: "{n} \u0437\u0430\u043C\u0435\u0442\u043A\u0435", few: "{n} \u0437\u0430\u043C\u0435\u0442\u043A\u0430\u0445", many: "{n} \u0437\u0430\u043C\u0435\u0442\u043A\u0430\u0445", other: "{n} \u0437\u0430\u043C\u0435\u0442\u043A\u0430\u0445" },
      "plural.staleLink": { one: "{n} \u0443\u0441\u0442\u0430\u0440\u0435\u0432\u0448\u0430\u044F \u0441\u0441\u044B\u043B\u043A\u0430", few: "{n} \u0443\u0441\u0442\u0430\u0440\u0435\u0432\u0448\u0438\u0435 \u0441\u0441\u044B\u043B\u043A\u0438", many: "{n} \u0443\u0441\u0442\u0430\u0440\u0435\u0432\u0448\u0438\u0445 \u0441\u0441\u044B\u043B\u043E\u043A", other: "{n} \u0443\u0441\u0442\u0430\u0440\u0435\u0432\u0448\u0438\u0445 \u0441\u0441\u044B\u043B\u043E\u043A" },
      "plural.brokenLink": { one: "{n} \u0431\u0438\u0442\u0430\u044F \u0441\u0441\u044B\u043B\u043A\u0430", few: "{n} \u0431\u0438\u0442\u044B\u0435 \u0441\u0441\u044B\u043B\u043A\u0438", many: "{n} \u0431\u0438\u0442\u044B\u0445 \u0441\u0441\u044B\u043B\u043E\u043A", other: "{n} \u0431\u0438\u0442\u044B\u0445 \u0441\u0441\u044B\u043B\u043E\u043A" }
    };
    module2.exports = { en, ru };
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
    var FAMILY = {
      common: require_common(),
      prose: require_prose(),
      sigil: require_sigil()
    };
    function withFamily2(kind, pluginLocales) {
      const common = FAMILY.common;
      const pair = FAMILY[kind] || {};
      const out = {};
      for (const lang of Object.keys(pluginLocales)) {
        out[lang] = Object.assign({}, common[lang], pair[lang], pluginLocales[lang]);
      }
      return out;
    }
    module2.exports = { initI18n: initI18n2, t: t2, plural: plural2, withFamily: withFamily2 };
  }
});

// src/shared/settings-redraw.js
var require_settings_redraw = __commonJS({
  "src/shared/settings-redraw.js"(exports2, module2) {
    "use strict";
    function redraw(tab, draw) {
      const el = tab && tab.containerEl;
      const top = el ? el.scrollTop || 0 : 0;
      draw();
      if (el && top)
        el.scrollTop = top;
    }
    module2.exports = { redraw };
  }
});

// src/shared/discover.js
var require_discover = __commonJS({
  "src/shared/discover.js"(exports2, module2) {
    "use strict";
    var LINKER_API = 1;
    function discoverLinkers(app, opts) {
      const minVersion = opts && opts.minVersion || LINKER_API;
      const found = [];
      const plugins = app && app.plugins && app.plugins.plugins;
      if (!plugins)
        return found;
      for (const id of Object.keys(plugins)) {
        const plugin = plugins[id];
        const provider = plugin && plugin.api && plugin.api.linker;
        if (!provider || typeof provider.id !== "string")
          continue;
        if (!(provider.apiVersion >= minVersion))
          continue;
        found.push(provider);
      }
      return found;
    }
    function outranks(a, b) {
      if (a.precedence !== b.precedence)
        return (a.precedence || 0) > (b.precedence || 0);
      return String(a.id) < String(b.id);
    }
    function drawsHere(peer, where) {
      if (typeof peer.drawsIn !== "function")
        return true;
      const w = where || {};
      try {
        return peer.drawsIn(w.path, w.surface) !== false;
      } catch (e) {
        return true;
      }
    }
    function foreignRanges(app, self, text, where) {
      const ranges = [];
      for (const peer of discoverLinkers(app)) {
        if (peer.id === self.id || !outranks(peer, self))
          continue;
        if (typeof peer.matches !== "function" || !drawsHere(peer, where))
          continue;
        let matches;
        try {
          matches = peer.matches(text) || [];
        } catch (e) {
          matches = [];
        }
        for (const m of matches) {
          if (m && typeof m.start === "number" && typeof m.end === "number")
            ranges.push([m.start, m.end]);
        }
      }
      return ranges.sort((a, b) => a[0] - b[0]);
    }
    function overlaps(ranges, s, e) {
      for (const [rs, re] of ranges) {
        if (rs >= e)
          break;
        if (re > s)
          return true;
      }
      return false;
    }
    function ownedMatches(app, self, text, matches, where) {
      if (!matches.length)
        return matches;
      const foreign = foreignRanges(app, self, text, where);
      if (!foreign.length)
        return matches;
      return matches.filter((m) => !overlaps(foreign, m.start, m.end));
    }
    function yieldedCandidates(app, self, text, where) {
      const out = [];
      for (const peer of discoverLinkers(app)) {
        if (peer.id === self.id || outranks(peer, self))
          continue;
        if (typeof peer.matches !== "function" || !drawsHere(peer, where))
          continue;
        let matches;
        try {
          matches = peer.matches(text) || [];
        } catch (e) {
          matches = [];
        }
        for (const m of matches) {
          if (!m || typeof m.start !== "number" || typeof m.end !== "number")
            continue;
          out.push({
            start: m.start,
            end: m.end,
            label: m.label || m.target || "",
            target: m.target,
            // The id survives a round trip through a DOM attribute; the opener is looked up
            // again at click time.
            id: peer.id,
            source: peer.displayName || peer.id,
            // How this row reads in an ambiguity list, asked of its owner and only when a list is
            // actually drawn — every span on screen produces candidates, few are ever looked at.
            describe: (display) => {
              if (typeof peer.describe !== "function")
                return null;
              try {
                return peer.describe(m.target, display);
              } catch (e) {
                return null;
              }
            },
            open: (sourcePath, newTab) => {
              if (typeof peer.open === "function")
                peer.open(m.target, sourcePath, newTab);
            },
            hover: (event, targetEl, sourcePath, hoverParent) => {
              if (typeof peer.hover === "function")
                peer.hover(m.target, event, targetEl, sourcePath, hoverParent);
            }
          });
        }
      }
      return out;
    }
    function candidatesFor(candidates, s, e) {
      return candidates.filter((c) => c.start < e && c.end > s);
    }
    function peerSuggestions(app, self, query, sourcePath) {
      const out = [];
      for (const peer of discoverLinkers(app)) {
        if (peer.id === self.id || typeof peer.suggest !== "function")
          continue;
        let items;
        try {
          items = peer.suggest(String(query || ""), sourcePath) || [];
        } catch (e) {
          items = [];
        }
        for (const it of items) {
          if (!it || typeof it.label !== "string")
            continue;
          out.push({
            label: it.label,
            note: it.note || "",
            target: it.target,
            // null means "keep what the reader typed"; only the peer knows whether its
            // candidate matched an inflection or completed a prefix.
            display: it.display == null ? null : it.display,
            id: peer.id,
            source: peer.displayName || peer.id,
            precedence: peer.precedence || 0,
            // Answered by the row's owner, including whether to compose a link at all. A peer
            // that predates `insertFor` has only `linkFor`, which always links — the right
            // reading for a plugin with no plain-text mode to consult.
            insert: (display, inTable) => {
              if (typeof peer.insertFor === "function")
                return peer.insertFor(it.target, display, inTable);
              return typeof peer.linkFor === "function" ? peer.linkFor(it.target, display, inTable) : null;
            }
          });
        }
      }
      return out;
    }
    function peersOffering(app, self, kind, text) {
      const out = [];
      for (const peer of discoverLinkers(app)) {
        if (peer.id === self.id || typeof peer.offers !== "function")
          continue;
        let yes;
        try {
          yes = peer.offers(kind, text);
        } catch (e) {
          yes = false;
        }
        if (yes)
          out.push(peer);
      }
      return out;
    }
    function siblingLinkers(app, self) {
      return discoverLinkers(app).filter((p) => p.id !== self.id);
    }
    module2.exports = { LINKER_API, discoverLinkers, outranks, drawsHere, foreignRanges, overlaps, ownedMatches, yieldedCandidates, candidatesFor, peerSuggestions, peersOffering, siblingLinkers };
  }
});

// src/shared/precedence.js
var require_precedence = __commonJS({
  "src/shared/precedence.js"(exports2, module2) {
    "use strict";
    var { discoverLinkers, outranks, siblingLinkers } = require_discover();
    var { t: t2 } = require_i18n();
    var STEP = 10;
    function rankedLinkers(app) {
      return discoverLinkers(app).slice().sort((a, b) => {
        if (outranks(a, b))
          return -1;
        if (outranks(b, a))
          return 1;
        return 0;
      });
    }
    function indexForPrecedence(others, self, value) {
      const hypothetical = { precedence: value, id: self.id };
      return others.filter((o) => outranks(o, hypothetical)).length;
    }
    function precedenceForIndex(app, self, index) {
      const others = rankedLinkers(app).filter((p) => p.id !== self.id);
      if (!others.length)
        return self.precedence || 0;
      const at = Math.max(0, Math.min(index, others.length));
      const values = others.map((p) => p.precedence || 0);
      const candidates = [values[0] + STEP, values[values.length - 1] - STEP];
      for (let i = 1; i < values.length; i++) {
        if (values[i - 1] !== values[i])
          candidates.push((values[i - 1] + values[i]) / 2);
      }
      for (const v of values)
        candidates.push(v);
      const from = currentIndex(app, self);
      const wanted = Math.sign(at - from);
      let best = null;
      let bestLanded = null;
      for (const v of candidates) {
        const landed = indexForPrecedence(others, self, v);
        if (landed === at)
          return v;
        if (Math.sign(landed - from) !== wanted)
          continue;
        if (best === null || Math.abs(landed - at) < Math.abs(bestLanded - at)) {
          best = v;
          bestLanded = landed;
        }
      }
      return best === null ? self.precedence || 0 : best;
    }
    function currentIndex(app, self) {
      return rankedLinkers(app).findIndex((p) => p.id === self.id);
    }
    function renderPrecedence(containerEl, opts) {
      const { app, provider, Setting, name, desc, save } = opts;
      if (!provider || !siblingLinkers(app, provider).length)
        return;
      new Setting(containerEl).setName(name).setDesc(desc);
      const cls = opts.cls || "linker";
      const list = containerEl.createDiv({ cls: `${cls}-precedence-list` });
      const draw = () => {
        list.empty();
        const ranked = rankedLinkers(app);
        ranked.forEach((p, i) => {
          const mine = p.id === provider.id;
          const row = new Setting(list).setName(`${i + 1}. ${p.displayName || p.id}`);
          if (!mine) {
            row.setDesc(opts.otherDesc || "");
            return;
          }
          row.settingEl.addClass(`${cls}-precedence-self`);
          row.addExtraButton((b) => b.setIcon("arrow-up").setTooltip(opts.upTooltip || "").setDisabled(i === 0).onClick(async () => {
            await save(precedenceForIndex(app, provider, i - 1));
            refresh();
          }));
          row.addExtraButton((b) => b.setIcon("arrow-down").setTooltip(opts.downTooltip || "").setDisabled(i === ranked.length - 1).onClick(async () => {
            await save(precedenceForIndex(app, provider, i + 1));
            refresh();
          }));
        });
      };
      const refresh = () => {
        for (const p of siblingLinkers(app, provider)) {
          if (typeof p.refresh === "function") {
            try {
              p.refresh();
            } catch (e) {
            }
          }
        }
        draw();
      };
      draw();
    }
    function renderPrecedenceSetting(containerEl, opts) {
      renderPrecedence(containerEl, {
        app: opts.app,
        provider: opts.provider,
        Setting: opts.Setting,
        cls: opts.cls,
        name: t2("set.precedence.name"),
        desc: t2("set.precedence.desc"),
        otherDesc: t2("set.precedence.other"),
        upTooltip: t2("set.precedence.up"),
        downTooltip: t2("set.precedence.down"),
        save: opts.save
      });
    }
    module2.exports = { STEP, rankedLinkers, precedenceForIndex, currentIndex, renderPrecedence, renderPrecedenceSetting };
  }
});

// src/shared/folder-list.js
var require_folder_list = __commonJS({
  "src/shared/folder-list.js"(exports2, module2) {
    "use strict";
    var openLists = /* @__PURE__ */ new WeakMap();
    function renderFolderList(containerEl, opts) {
      const { Setting, setIcon } = require("obsidian");
      const cls = opts.cls;
      const norm = opts.normalize || ((x) => x.trim());
      const read = () => (opts.get() || "").split("\n").map((x) => x.trim()).filter(Boolean);
      const fold = opts.fold;
      const maxRows = opts.maxRows || 10;
      const opened = () => {
        let set = openLists.get(fold.owner);
        if (!set) {
          set = /* @__PURE__ */ new Set();
          openLists.set(fold.owner, set);
        }
        return set;
      };
      const isOpen = () => !fold || opened().has(fold.key);
      const host = containerEl.createDiv({ cls: `${cls}-list` });
      let refocus = false;
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
      const drawRow = (rowsEl, entry, i) => {
        if (!opts.editable) {
          const row2 = new Setting(rowsEl).setName(entry);
          row2.settingEl.addClass(`${cls}-folder-row`);
          row2.addExtraButton((b) => b.setIcon("x").setTooltip(opts.removeLabel || "").onClick(() => {
            const next = read();
            next.splice(i, 1);
            commit(next);
          }));
          return;
        }
        const row = rowsEl.createDiv({ cls: `${cls}-folder-row ${cls}-list-row` });
        const box = row.createEl("input", { type: "text", cls: `${cls}-list-input` });
        box.value = entry;
        box.addEventListener("change", () => {
          const next = read();
          next[i] = box.value;
          commit(next);
        });
        const del = row.createEl("button", { cls: `${cls}-list-del`, attr: { "aria-label": opts.removeLabel || "" } });
        setIcon(del, "x");
        del.addEventListener("click", () => {
          const next = read();
          next.splice(i, 1);
          commit(next);
        });
      };
      const draw = () => {
        host.empty();
        const entries = read();
        const open = isOpen();
        const head = new Setting(host).setName(entries.length ? `${opts.name} (${entries.length})` : opts.name).setDesc(opts.desc);
        if (fold) {
          head.addExtraButton((b) => b.setIcon(open ? "chevron-up" : "chevron-down").setTooltip((open ? opts.hideLabel : opts.showLabel) || "").onClick(() => {
            const s = opened();
            if (open)
              s.delete(fold.key);
            else
              s.add(fold.key);
            draw();
          }));
          if (!open)
            return;
        }
        const rowsEl = host.createDiv({ cls: `${cls}-folder-rows` });
        if (entries.length > maxRows)
          rowsEl.addClass(`${cls}-list-scroll`);
        entries.forEach((entry, i) => drawRow(rowsEl, entry, i));
        const addEl = host.createDiv({ cls: `${cls}-folder-add` });
        const input = addEl.createEl("input", { type: "text", cls: `${cls}-folder-input`, attr: { placeholder: opts.placeholder || "" } });
        const addBtn = addEl.createEl("button", { cls: `${cls}-folder-addbtn`, attr: { "aria-label": opts.addLabel || "" } });
        setIcon(addBtn, "plus");
        const add = (raw) => {
          input.value = "";
          if (!norm(raw)) {
            input.focus();
            return;
          }
          refocus = true;
          commit([...read(), raw]);
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
        if (refocus) {
          refocus = false;
          input.focus();
        }
      };
      draw();
    }
    module2.exports = { renderFolderList };
  }
});

// src/shared/prose/settings.js
var require_settings = __commonJS({
  "src/shared/prose/settings.js"(exports2, module2) {
    "use strict";
    var { Setting } = require("obsidian");
    var { t: t2 } = require_i18n();
    var { renderFolderList } = require_folder_list();
    var settingsOf = (ctx) => ctx.tab.plugin.settings;
    var openLanguages = /* @__PURE__ */ new WeakSet();
    function positiveNumber(containerEl, ctx, key, rebuild) {
      const s = settingsOf(ctx);
      new Setting(containerEl).setName(t2(`set.${key}.name`)).setDesc(t2(`set.${key}.desc`)).addText((c) => {
        c.inputEl.type = "number";
        c.inputEl.min = "1";
        c.setValue(String(s[key])).onChange(async (v) => {
          const n = parseInt(v, 10);
          s[key] = Number.isFinite(n) && n > 0 ? n : 1;
          await ctx.save(rebuild);
        });
      });
    }
    function renderMatchMode(containerEl, ctx) {
      const s = settingsOf(ctx);
      new Setting(containerEl).setName(t2("set.matchMode.name")).setDesc(t2("set.matchMode.desc")).addDropdown((d) => d.addOption("stemmer", t2("set.matchMode.stemmer")).addOption("endingStrip", t2("set.matchMode.endingStrip")).addOption("exact", t2("set.matchMode.exact")).setValue(s.matchMode).onChange(async (v) => {
        s.matchMode = v;
        await ctx.save(true);
      }));
      positiveNumber(containerEl, ctx, "minTermLength", true);
      new Setting(containerEl).setName(t2("set.smartCase.name")).setDesc(t2("set.smartCase.desc")).addToggle((c) => c.setValue(s.smartCase).onChange(async (v) => {
        s.smartCase = v;
        await ctx.save(true);
      }));
    }
    function renderMatchLimits(containerEl, ctx) {
      const s = settingsOf(ctx);
      new Setting(containerEl).setName(t2("set.linkFirstOnly.name")).setDesc(t2("set.linkFirstOnly.desc")).addToggle((c) => c.setValue(s.linkFirstOnly).onChange(async (v) => {
        s.linkFirstOnly = v;
        await ctx.save(false);
      }));
      renderExclusionList(containerEl, ctx, "excludeTerms");
    }
    function renderExclusionList(containerEl, ctx, key) {
      const s = settingsOf(ctx);
      renderFolderList(containerEl, {
        cls: ctx.cls,
        name: t2(`set.${key}.name`),
        desc: t2(`set.${key}.desc`),
        get: () => s[key],
        set: async (v) => {
          s[key] = v;
          await ctx.save(true);
        },
        editable: true,
        fold: { owner: ctx.tab, key },
        placeholder: t2("set.exclusionList.add"),
        addLabel: t2("set.exclusionList.addAria"),
        removeLabel: t2("set.exclusionList.remove"),
        showLabel: t2("set.exclusionList.show"),
        hideLabel: t2("set.exclusionList.hide")
      });
    }
    async function applyLanguageChange(ctx) {
      const plugin = ctx.tab.plugin;
      await plugin.saveSettings();
      plugin.refreshActiveLanguages();
      plugin.rebuildIndex();
      plugin.rerenderViews();
      ctx.tab.display();
    }
    function renderLanguages(containerEl, ctx) {
      const { tab, cls } = ctx;
      const s = settingsOf(ctx);
      const langs = tab.plugin.languages;
      const errors = tab.plugin.languageErrors || [];
      const enabledCount = langs.filter((l) => (s.enabledLanguages || []).includes(l.id)).length;
      const open = openLanguages.has(tab);
      const desc = t2("set.languages.desc", { enabled: enabledCount, total: langs.length }) + (errors.length ? t2("set.languages.invalidSuffix", { n: errors.length }) : "") + ".";
      new Setting(containerEl).setName(t2("set.languages.name")).setDesc(desc).addExtraButton((b) => b.setIcon(open ? "chevron-up" : "chevron-down").setTooltip(open ? t2("set.languages.hide") : t2("set.languages.show")).onClick(() => {
        if (open)
          openLanguages.delete(tab);
        else
          openLanguages.add(tab);
        tab.display();
      }));
      if (!open)
        return;
      langs.forEach((lang, i) => {
        const row = new Setting(containerEl).setName(lang.name).setDesc(`id: ${lang.id}`).addExtraButton((b) => b.setIcon("chevron-up").setTooltip(t2("set.lang.higher")).setDisabled(i === 0).onClick(async () => {
          tab.plugin.moveLanguage(lang.id, -1);
          await applyLanguageChange(ctx);
        })).addExtraButton((b) => b.setIcon("chevron-down").setTooltip(t2("set.lang.lower")).setDisabled(i === langs.length - 1).onClick(async () => {
          tab.plugin.moveLanguage(lang.id, 1);
          await applyLanguageChange(ctx);
        })).addToggle((c) => c.setValue((s.enabledLanguages || []).includes(lang.id)).onChange(async (v) => {
          const set = new Set(s.enabledLanguages || []);
          if (v)
            set.add(lang.id);
          else
            set.delete(lang.id);
          s.enabledLanguages = [...set];
          await applyLanguageChange(ctx);
        }));
        row.settingEl.addClass(`${cls}-lang-row`);
      });
      for (const bad of errors) {
        const row = new Setting(containerEl).setName(bad.id).setDesc(t2("set.lang.invalid", { error: bad.error })).addExtraButton((b) => b.setIcon("alert-triangle").setTooltip(t2("set.lang.invalid", { error: bad.error })).setDisabled(true));
        row.nameEl.addClass(`${cls}-lang-error`);
        row.settingEl.addClass(`${cls}-lang-row`);
        row.settingEl.addClass("mod-warning");
      }
    }
    function renderHighlighting(containerEl, ctx) {
      const { tab } = ctx;
      const s = settingsOf(ctx);
      new Setting(containerEl).setName(t2("set.heading.highlighting")).setHeading();
      new Setting(containerEl).setName(t2("set.highlightInReading.name")).setDesc(t2("set.highlightInReading.desc")).addToggle((c) => c.setValue(s.highlightInReading).onChange(async (v) => {
        s.highlightInReading = v;
        await ctx.save(false);
        tab.plugin.rerenderViews();
      }));
      new Setting(containerEl).setName(t2("set.editingHighlight.name")).setDesc(t2("set.editingHighlight.desc")).addDropdown((d) => d.addOption("off", t2("set.editingHighlight.off")).addOption("live", t2("set.editingHighlight.live")).addOption("onSave", t2("set.editingHighlight.onSave")).setValue(s.editingHighlight).onChange(async (v) => {
        s.editingHighlight = v;
        await ctx.save(false);
        tab.plugin.refreshEditors();
      }));
      new Setting(containerEl).setName(t2("set.skipHeadings.name")).setDesc(t2("set.skipHeadings.desc")).addToggle((c) => c.setValue(s.skipHeadings).onChange(async (v) => {
        s.skipHeadings = v;
        await ctx.save(false);
        tab.plugin.rerenderViews();
      }));
      new Setting(containerEl).setName(t2("set.statusBar.name")).setDesc(t2("set.statusBar.desc")).addToggle((c) => c.setValue(s.statusBar).onChange(async (v) => {
        s.statusBar = v;
        await ctx.save(false);
        tab.plugin.updateStatusBar();
      }));
      new Setting(containerEl).setName(t2("set.statusBarIncludeLinks.name")).setDesc(t2("set.statusBarIncludeLinks.desc")).addToggle((c) => c.setValue(s.statusBarIncludeLinks).onChange(async (v) => {
        s.statusBarIncludeLinks = v;
        await ctx.save(false);
        tab.plugin.updateStatusBar();
      }));
    }
    function renderAutocomplete(containerEl, ctx) {
      const s = settingsOf(ctx);
      new Setting(containerEl).setName(t2("set.heading.autocomplete")).setHeading();
      new Setting(containerEl).setName(t2("set.linkSuggest.name")).setDesc(t2("set.linkSuggest.desc")).addToggle((c) => c.setValue(s.linkSuggest).onChange(async (v) => {
        s.linkSuggest = v;
        await ctx.save(false);
      }));
      positiveNumber(containerEl, ctx, "suggestMinChars", false);
      new Setting(containerEl).setName(t2("set.suggestSkipAfter.name")).setDesc(t2("set.suggestSkipAfter.desc")).addText((c) => c.setValue(s.suggestSkipAfter).onChange(async (v) => {
        s.suggestSkipAfter = v;
        await ctx.save(false);
      }));
      new Setting(containerEl).setName(t2("set.suggestPlainText.name")).setDesc(t2("set.suggestPlainText.desc")).addToggle((c) => c.setValue(s.suggestPlainText).onChange(async (v) => {
        s.suggestPlainText = v;
        await ctx.save(false);
      }));
    }
    function renderMenuToggles(containerEl, ctx, keys) {
      const s = settingsOf(ctx);
      new Setting(containerEl).setName(t2("set.heading.contextMenu")).setHeading();
      for (const key of keys) {
        new Setting(containerEl).setName(t2(`set.${key}.name`)).setDesc(t2(`set.${key}.desc`)).addToggle((c) => c.setValue(s[key]).onChange(async (v) => {
          s[key] = v;
          await ctx.save(false);
        }));
      }
    }
    function renderScopeMode(containerEl, ctx, saveScope) {
      const s = settingsOf(ctx);
      new Setting(containerEl).setName(t2("set.scopeMode.name")).setDesc(t2("set.scopeMode.desc")).addDropdown((d) => d.addOption("folders", t2("set.scopeMode.folders")).addOption("vault", t2("set.scopeMode.vault")).setValue(s.scopeMode).onChange(async (v) => {
        s.scopeMode = v;
        await saveScope();
        ctx.tab.display();
      }));
    }
    function renderPathList(containerEl, ctx, opts) {
      const s = settingsOf(ctx);
      const labels = opts.labels;
      renderFolderList(containerEl, {
        cls: ctx.cls,
        name: opts.name,
        desc: opts.desc,
        get: () => s[opts.key],
        set: async (v) => {
          s[opts.key] = v;
          await opts.save();
        },
        normalize: opts.normalize,
        attachSuggest: opts.attachSuggest,
        placeholder: t2(`set.${labels}.add`),
        removeLabel: t2(`set.${labels}.remove`),
        addLabel: t2(`set.${labels}.addAria`)
      });
    }
    function createProseSettings(tab, opts) {
      const ctx = { tab, cls: opts.cls, save: opts.save };
      return {
        matchMode: (el) => renderMatchMode(el, ctx),
        languages: (el) => renderLanguages(el, ctx),
        matchLimits: (el) => renderMatchLimits(el, ctx),
        highlighting: (el) => renderHighlighting(el, ctx),
        autocomplete: (el) => renderAutocomplete(el, ctx),
        menuToggles: (el, keys) => renderMenuToggles(el, ctx, keys),
        scopeMode: (el, saveScope) => renderScopeMode(el, ctx, saveScope),
        pathList: (el, o) => renderPathList(el, ctx, o),
        exclusionList: (el, key) => renderExclusionList(el, ctx, key),
        positiveNumber: (el, key, rebuild) => positiveNumber(el, ctx, key, rebuild)
      };
    }
    module2.exports = { createProseSettings };
  }
});

// src/settings-tab.js
var require_settings_tab = __commonJS({
  "src/settings-tab.js"(exports2, module2) {
    "use strict";
    var { PluginSettingTab, Setting, Notice: Notice2 } = require("obsidian");
    var { VaultPathSuggest, suggestAvailable: suggestAvailable2 } = require_vault_suggest();
    var { sanitizeFolder: sanitizeFolder2 } = require_constants();
    var { t: t2, plural: plural2 } = require_i18n();
    var { redraw } = require_settings_redraw();
    var { renderPrecedenceSetting } = require_precedence();
    var { createProseSettings } = require_settings();
    var HeadingLinkerSettingTab2 = class extends PluginSettingTab {
      constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
      }
      // Every fold and toggle redraws the whole pane; the reader keeps their place (shared/settings-redraw).
      display() {
        redraw(this, () => this.draw());
      }
      draw() {
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
        const sections = createProseSettings(this, { cls: "heading", save });
        const attachSuggest = suggestAvailable2() ? (inputEl, onPick) => new VaultPathSuggest(this.app, inputEl, onPick) : null;
        new Setting(containerEl).setName(t2("set.heading.sources")).setHeading();
        new Setting(containerEl).setName(t2("set.glossaryMode.name")).setDesc(t2("set.glossaryMode.desc")).addDropdown((d) => d.addOption("selected", t2("set.glossaryMode.selected")).addOption("vault", t2("set.glossaryMode.vault")).setValue(s.glossaryMode).onChange(async (v) => {
          s.glossaryMode = v;
          await saveSources();
          this.display();
        }));
        const sourceList = (name, desc, key) => sections.pathList(containerEl, {
          name,
          desc,
          key,
          labels: "sourceList",
          normalize: sanitizeFolder2,
          attachSuggest,
          save: saveSources
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
        new Setting(containerEl).setName(t2("set.followRenames.name")).setDesc(t2("set.followRenames.desc")).addDropdown((c) => c.addOption("off", t2("set.followRenames.off")).addOption("ask", t2("set.followRenames.ask")).addOption("preview", t2("set.followRenames.preview")).setValue(s.followHeadingRenames).onChange(async (v) => {
          s.followHeadingRenames = v;
          await save(false);
        }));
        new Setting(containerEl).setName(t2("set.heading.scope")).setHeading();
        sections.scopeMode(containerEl, saveScope);
        const folderList = (name, desc, key) => sections.pathList(containerEl, {
          name,
          desc,
          key,
          labels: "folderList",
          normalize: sanitizeFolder2,
          attachSuggest,
          save: saveScope
        });
        if (s.scopeMode === "folders")
          folderList(t2("set.scopeFolders.name"), t2("set.scopeFolders.desc"), "scopeFolders");
        folderList(t2("set.excludeFolders.name"), t2("set.excludeFolders.desc"), "excludeFolders");
        this.statusEl = containerEl.createEl("div", { cls: "heading-section-desc" });
        this.renderStatus();
        new Setting(containerEl).setName(t2("set.heading.matching")).setHeading();
        sections.matchMode(containerEl);
        sections.languages(containerEl);
        sections.matchLimits(containerEl);
        sections.exclusionList(containerEl, "excludeWords");
        sections.highlighting(containerEl);
        sections.autocomplete(containerEl);
        sections.menuToggles(containerEl, ["menuTurnInto", "menuOpen", "menuExclude", "menuUnlink", "menuCollect"]);
        new Setting(containerEl).setName(t2("set.heading.maintenance")).setHeading();
        renderPrecedenceSetting(containerEl, {
          app: this.app,
          provider: this.plugin.api && this.plugin.api.linker,
          Setting,
          cls: "heading",
          save: async (value) => {
            s.linkPrecedence = value;
            await save(false);
          }
        });
        new Setting(containerEl).setName(t2("set.rebuild.name")).setDesc(t2("set.rebuild.desc")).addButton((b) => b.setButtonText(t2("set.rebuild.button")).onClick(() => {
          this.plugin.rebuildIndex();
          new Notice2(t2("notice.indexRebuilt"));
          this.renderStatus();
        }));
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

// src/shared/prose/matcher.js
var require_matcher = __commonJS({
  "src/shared/prose/matcher.js"(exports2, module2) {
    "use strict";
    var PROTECT = [
      /```[\s\S]*?```/g,
      /~~~[\s\S]*?~~~/g,
      /`[^`\n]+`/g,
      /%%[\s\S]*?%%/g,
      /\[\[[^\]]*\]\]/g,
      /\[[^\]]*\]\([^)]*\)/g,
      /(?:https?:\/\/|www\.)\S+/g
    ];
    var PROTECT_INLINE = [
      /`[^`\n]+`/g,
      /%%[^%\n]*%%/g,
      /\[\[[^\]]*\]\]/g,
      /\[[^\]]*\]\([^)]*\)/g,
      /(?:https?:\/\/|www\.)\S+/g
    ];
    var frontmatterEnd = (text) => {
      if (!/^---\r?\n/.test(text))
        return -1;
      const end = text.indexOf("\n---", 3);
      return end === -1 ? -1 : end + 4;
    };
    function inMatch(line, col, re) {
      let m;
      while ((m = re.exec(line)) !== null) {
        if (col > m.index && col < m.index + m[0].length)
          return true;
      }
      return false;
    }
    function isAcronymish(text) {
      const letters = [...text].filter((ch) => /\p{L}/u.test(ch));
      if (letters.length < 2)
        return false;
      const upper = letters.filter((ch) => ch !== ch.toLowerCase() && ch === ch.toUpperCase()).length;
      return upper / letters.length > 0.75;
    }
    var smartCaseFits = (plugin, c, surface) => !plugin.settings.smartCase || !c.cs || surface === c.caseText;
    function createMatcher(config) {
      const { idOf, selfIdOf, fieldsOf } = config;
      const accepts = config.accepts || (() => true);
      const caseFits = config.caseFits || smartCaseFits;
      return {
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
        // The fields every index entry carries for one written form, or null if the form holds
        // no word at all. Built here rather than by each plugin's index: a forgotten `cs` or
        // `caseText` disables smart case for that form silently, with nothing to notice.
        formEntry(form) {
          const words = this.tokenizeForm(form);
          if (!words.length)
            return null;
          return { words, wordCount: words.length, cs: isAcronymish(form), caseText: form };
        },
        // Every term id whose form matches `text`, `except` one. Runs the same scan as the
        // highlighter, so collisions agree with what actually gets linked.
        termsMatchingText(text, except) {
          const out = /* @__PURE__ */ new Set();
          for (const m of this.findMatches(text, null)) {
            out.add(idOf(m));
            if (m.alts)
              for (const a of m.alts)
                out.add(a);
          }
          if (except)
            out.delete(except);
          return [...out];
        },
        // `selfId` identifies the note being scanned when it is itself a term source; its own
        // entries are skipped so a note doesn't link to itself.
        findMatches(text, selfId, opts = {}) {
          const protect = opts.protect ? this.computeProtected(text) : null;
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
              return caseFits(this, c, text.slice(tokens[i].start, tokens[i + wc - 1].end));
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
            if (matched && selfIdOf(matched.c) !== selfId) {
              const inProtected = protect && this.overlapsProtected(protect, matched.start, matched.end);
              if (accepts(this, matched, tk) && !inProtected) {
                let alts = null;
                if (sorted.length > 1) {
                  const seenId = /* @__PURE__ */ new Set([idOf(matched.c)]);
                  for (const c of sorted) {
                    if (c.wordCount !== matched.wc || seenId.has(idOf(c)))
                      continue;
                    if (fits(c)) {
                      seenId.add(idOf(c));
                      (alts || (alts = [])).push(idOf(c));
                    }
                  }
                }
                results.push(Object.assign({
                  start: matched.start,
                  end: matched.end,
                  display: text.slice(matched.start, matched.end),
                  alts
                }, fieldsOf(matched.c)));
                i += matched.wc;
                continue;
              }
            }
            i++;
          }
          return results;
        },
        // Ranges in raw markdown that must not be linked: frontmatter, code, comments, links,
        // urls and — when the setting asks — headings.
        computeProtected(text) {
          const ranges = [];
          const fm = frontmatterEnd(text);
          if (fm !== -1)
            ranges.push([0, fm]);
          for (const re of PROTECT) {
            re.lastIndex = 0;
            let m;
            while ((m = re.exec(text)) !== null)
              ranges.push([m.index, m.index + m[0].length]);
          }
          if (this.settings.skipHeadings) {
            const re = /^[ \t]*#{1,6}[ \t].*$/gm;
            let m;
            while ((m = re.exec(text)) !== null)
              ranges.push([m.index, m.index + m[0].length]);
          }
          return ranges.sort((a, b) => a[0] - b[0]);
        },
        // Frontmatter and code (fenced or inline) — the spans where a [[...]] isn't a real link.
        // Unlike computeProtected it keeps wikilinks and headings, since unlink acts on links and
        // a link inside a heading is still real.
        codeFrontmatterRanges(text) {
          const ranges = [];
          const fm = frontmatterEnd(text);
          if (fm !== -1)
            ranges.push([0, fm]);
          for (const re of [/```[\s\S]*?```/g, /~~~[\s\S]*?~~~/g, /`[^`\n]+`/g]) {
            re.lastIndex = 0;
            let m;
            while ((m = re.exec(text)) !== null)
              ranges.push([m.index, m.index + m[0].length]);
          }
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
        // Same spans as computeProtected, but tested at a single position so it stays cheap on
        // every keystroke — no whole-document scan with greedy [\s\S]*? regexes.
        isProtectedAt(text, pos) {
          const fm = frontmatterEnd(text);
          if (fm !== -1 && pos <= fm)
            return true;
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
          return PROTECT_INLINE.some((re) => {
            re.lastIndex = 0;
            return inMatch(line, col, re);
          });
        }
      };
    }
    module2.exports = { createMatcher, isAcronymish, smartCaseFits };
  }
});

// src/matcher.js
var require_matcher2 = __commonJS({
  "src/matcher.js"(exports2, module2) {
    "use strict";
    var { splitLines: splitLines2 } = require_markdown();
    var { createMatcher } = require_matcher();
    var core = createMatcher({
      idOf: (c) => c.linktext,
      selfIdOf: (c) => c.fileBase,
      fieldsOf: (c) => ({ linktext: c.linktext, label: c.label }),
      accepts: (plugin, matched, token) => !(matched.wc === 1 && plugin.wordSilenced(token.raw))
    });
    module2.exports = Object.assign({}, core, {
      rebuildIndex() {
        this.keysCache = /* @__PURE__ */ new Map();
        const byKey = /* @__PURE__ */ new Map();
        const linktexts = /* @__PURE__ */ new Set();
        const terms = [];
        const duplicates = [];
        const minTermLength = Math.max(1, this.settings.minTermLength || 1);
        const excludeTerms = new Set(splitLines2(this.settings.excludeTerms).map((s) => s.toLowerCase()));
        const levels = new Set(this.settings.headingLevels || [1, 2, 3, 4, 5, 6]);
        this.excludedWords = /* @__PURE__ */ new Set();
        this.excludedStems = /* @__PURE__ */ new Set();
        for (const line of splitLines2(this.settings.excludeWords)) {
          if (!line.endsWith("*")) {
            this.excludedWords.add(line.toLowerCase());
            continue;
          }
          for (const k of this.keysFor(line.slice(0, -1)))
            this.excludedStems.add(k);
        }
        this.headingFingerprints = /* @__PURE__ */ new Map();
        for (const file of this.glossaryFilesList()) {
          const headings = this.headingsOf(file);
          this.headingFingerprints.set(file.path, this.fileFingerprint(file));
          const base = file.basename;
          const aliasMap = this.aliasCache && this.aliasCache.get(file.path);
          const stack = [];
          for (const { text: label, level } of headings) {
            while (stack.length && stack[stack.length - 1].level >= level)
              stack.pop();
            const crumbs = stack.map((s) => s.text);
            stack.push({ level, text: label });
            if (!levels.has(level))
              continue;
            if (/[[\]|#^]/.test(label))
              continue;
            if (excludeTerms.has(label.toLowerCase()))
              continue;
            if (label.trim().length < minTermLength)
              continue;
            const labelEntry = this.formEntry(label);
            if (!labelEntry)
              continue;
            const linktext = `${base}#${label}`;
            if (linktexts.has(linktext)) {
              duplicates.push({ path: file.path, label });
              continue;
            }
            linktexts.add(linktext);
            const aliases2 = aliasMap && aliasMap.get(label) || [];
            terms.push({ linktext, label, fileBase: base, path: file.path, aliases: aliases2, crumbs });
            const forms = [labelEntry];
            for (const a of aliases2) {
              if (a.toLowerCase() === label.toLowerCase() || a.trim().length < minTermLength)
                continue;
              const entry = this.formEntry(a);
              if (entry)
                forms.push(entry);
            }
            for (const f of forms) {
              const matcher2 = Object.assign({ linktext, label, fileBase: base, crumbs }, f);
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
        this.duplicateHeadings = duplicates;
        this.indexVersion = (this.indexVersion || 0) + 1;
        this.notifyIndexChange();
      },
      // Whether the excluded-words list silences this written word — by its own spelling, or
      // through a starred line standing for a stem and every form that reduces to it.
      wordSilenced(word) {
        if (this.excludedWords.has(word.toLowerCase()))
          return true;
        return this.excludedStems.size > 0 && this.keysFor(word).some((k) => this.excludedStems.has(k));
      },
      // Base (dictionary) form of a word: the first claiming language that has one wins, else
      // the lowercased word. Same rule the glossary linker uses to collapse inflected forms.
      lemmaFor(word) {
        for (const lang of this.activeLanguages || []) {
          if (lang.match(word) && lang.lemma)
            return lang.lemma(word);
        }
        return String(word || "").toLowerCase();
      }
    });
  }
});

// src/shared/prose/highlight.js
var require_highlight = __commonJS({
  "src/shared/prose/highlight.js"(exports2, module2) {
    "use strict";
    var { t: t2 } = require_i18n();
    var { ownedMatches, yieldedCandidates, candidatesFor, discoverLinkers } = require_discover();
    function createHighlight(config) {
      const { cls, displayName, targetOf, selfIdFor } = config;
      const LINK_CLASS = `${cls}-link`;
      const AMBIGUOUS_CLASS = `${cls}-ambiguous`;
      const CM_LINK_CLASS = `cm-${cls}-link`;
      const CM_AMBIGUOUS_CLASS = `cm-${cls}-ambiguous`;
      const ATTR_TARGET = `data-${cls}-target`;
      const ATTR_ALTS = `data-${cls}-alts`;
      const ATTR_FOREIGN = `data-${cls}-foreign`;
      return {
        // Our matches minus the ones a higher-ranked sibling also claims.
        // `where` is `{ path, surface }` — which note, and which of reading/editing/menu is being
        // built. Peers use it to stand aside where they would draw nothing.
        ownSpans(text, matches, where) {
          const provider = this.api && this.api.linker;
          if (!provider)
            return matches;
          return ownedMatches(this.app, provider, text, matches, where);
        },
        // Rebuilt from a DOM attribute rather than handed over as closures, so the peer is
        // resolved at use time — it may have been disabled since the mark was drawn.
        foreignFromAttr(raw, sourcePath, newTab) {
          if (!raw)
            return [];
          let parsed;
          try {
            parsed = JSON.parse(raw);
          } catch (err) {
            return [];
          }
          const peers = discoverLinkers(this.app);
          return parsed.map((f) => {
            const peerOf = () => peers.find((p) => p.id === f.id);
            const ask = (name, fn) => {
              const peer = peerOf();
              if (!peer || typeof peer[name] !== "function")
                return null;
              try {
                return fn(peer);
              } catch (err) {
                return null;
              }
            };
            return {
              label: f.label,
              source: f.source,
              describe: (display) => ask("describe", (peer) => peer.describe(f.target, display)),
              open: () => ask("open", (peer) => peer.open(f.target, sourcePath, newTab)),
              hover: (ev, row, parent) => ask("hover", (peer) => peer.hover(f.target, ev, row, sourcePath, parent))
            };
          });
        },
        // What the linkers that yielded a span to us would have offered there.
        yieldedIn(text, where) {
          const provider = this.api && this.api.linker;
          if (!provider)
            return [];
          return yieldedCandidates(this.app, provider, text, where);
        },
        processReadingMode(el, ctx) {
          if (!this.settings.highlightInReading)
            return;
          const sourcePath = ctx.sourcePath;
          if (sourcePath && !this.inScope(sourcePath))
            return;
          const selfId = selfIdFor(this, sourcePath);
          const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
            acceptNode: (node) => {
              let p = node.parentElement;
              while (p) {
                const tag = p.tagName;
                if (tag === "CODE" || tag === "PRE" || tag === "A")
                  return NodeFilter.FILTER_REJECT;
                if (this.settings.skipHeadings && /^H[1-6]$/.test(tag))
                  return NodeFilter.FILTER_REJECT;
                if (p.classList && p.classList.contains(LINK_CLASS))
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
            this.decorateTextNode(node, selfId, sourcePath);
        },
        decorateTextNode(node, selfId, sourcePath) {
          const text = node.textContent;
          if (!text || text.length < 2)
            return;
          const where = { path: sourcePath, surface: "reading" };
          const matches = this.ownSpans(text, this.findMatches(text, selfId, { protect: true }), where);
          if (!matches.length)
            return;
          const yielded = this.yieldedIn(text, where);
          const frag = document.createDocumentFragment();
          let cursor = 0;
          for (const m of matches) {
            if (m.start > cursor)
              frag.appendChild(document.createTextNode(text.slice(cursor, m.start)));
            const target = targetOf(m);
            const display = m.display;
            const foreign = candidatesFor(yielded, m.start, m.end);
            const alts = [...m.alts || [], ...foreign];
            const a = document.createElement("a");
            a.textContent = display;
            a.setAttribute(ATTR_TARGET, target);
            if (alts.length) {
              a.className = `${LINK_CLASS} ${AMBIGUOUS_CLASS}`;
              const candidates = [target, ...alts];
              const pick = (e, newTab) => {
                e.preventDefault();
                e.stopPropagation();
                this.chooseTerm(
                  candidates.map((c) => typeof c === "object" ? { ...c, open: () => c.open(sourcePath, newTab) } : c),
                  newTab ? t2("menu.openNewTabTitle") : t2("menu.openTitle"),
                  (c) => this.openTerm(c, sourcePath, newTab),
                  display
                );
              };
              a.addEventListener("mouseenter", (e) => {
                if (!this.choices)
                  return;
                this.choices.schedule(candidates.map((c) => typeof c === "object" ? Object.assign({}, c, {
                  open: () => c.open(sourcePath, false),
                  hover: (ev, row, parent) => c.hover(ev, row, sourcePath, parent)
                }) : c), e.clientX, e.clientY, display);
              });
              a.addEventListener("mouseleave", () => {
                if (this.choices)
                  this.choices.leave();
              });
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
              a.className = `internal-link ${LINK_CLASS}`;
              a.href = target;
              a.setAttribute("data-href", target);
            }
            frag.appendChild(a);
            cursor = m.end;
          }
          if (cursor < text.length)
            frag.appendChild(document.createTextNode(text.slice(cursor)));
          node.parentNode.replaceChild(frag, node);
        },
        // Always registered; the editingHighlight setting controls if and how often it recomputes.
        registerEditingHighlight() {
          let view, state, language;
          try {
            view = require("@codemirror/view");
            state = require("@codemirror/state");
            language = require("@codemirror/language");
          } catch (e) {
            console.warn(`${displayName}: CM6 modules unavailable, editor highlight disabled`, e);
            return;
          }
          const { ViewPlugin, Decoration } = view;
          const { RangeSetBuilder, StateEffect } = state;
          const { syntaxTree } = language;
          const plugin = this;
          const refresh = StateEffect.define();
          this.cmRefreshEffect = refresh;
          const markCache = /* @__PURE__ */ new Map();
          const markFor = (target) => {
            let m = markCache.get(target);
            if (!m) {
              m = Decoration.mark({ class: CM_LINK_CLASS, attributes: { [ATTR_TARGET]: target } });
              markCache.set(target, m);
            }
            return m;
          };
          const markWithAlts = (target, alts, foreign) => {
            const attributes = {
              [ATTR_TARGET]: target,
              [ATTR_ALTS]: alts.join("\n")
            };
            if (foreign.length) {
              attributes[ATTR_FOREIGN] = JSON.stringify(foreign.map((f) => ({ id: f.id, label: f.label, target: f.target, source: f.source })));
            }
            return Decoration.mark({ class: `${CM_LINK_CLASS} ${CM_AMBIGUOUS_CLASS}`, attributes });
          };
          const skipNode = (name) => /code|link|url|header|hashtag|frontmatter|comment|tag|escape/i.test(name);
          const buildDeco = (editorView) => {
            const builder = new RangeSetBuilder();
            const activeFile = plugin.app.workspace.getActiveFile();
            if (activeFile && !plugin.inScope(activeFile.path))
              return builder.finish();
            const selfId = activeFile ? selfIdFor(plugin, activeFile.path) : null;
            const tree = syntaxTree(editorView.state);
            for (const { from, to } of editorView.visibleRanges) {
              const text = editorView.state.doc.sliceString(from, to);
              const where = { path: activeFile ? activeFile.path : void 0, surface: "editing" };
              const yielded = plugin.yieldedIn(text, where);
              for (const m of plugin.ownSpans(text, plugin.findMatches(text, selfId), where)) {
                const start = from + m.start;
                const end = from + m.end;
                let skip = false;
                tree.iterate({ from: start, to: end, enter: (n) => {
                  if (skipNode(n.type.name))
                    skip = true;
                } });
                if (skip)
                  continue;
                const alts = m.alts || [];
                const foreign = candidatesFor(yielded, m.start, m.end);
                builder.add(start, end, alts.length || foreign.length ? markWithAlts(targetOf(m), alts, foreign) : markFor(targetOf(m)));
              }
            }
            return builder.finish();
          };
          const targetEl = (e) => e.target instanceof HTMLElement ? e.target.closest("." + CM_LINK_CLASS) : null;
          const targetOfEl = (el) => el.getAttribute(ATTR_TARGET);
          const altsOf = (el) => {
            const v = el.getAttribute(ATTR_ALTS);
            return v ? v.split("\n") : null;
          };
          const foreignOf = (el, sourcePath, newTab) => plugin.foreignFromAttr(el.getAttribute(ATTR_FOREIGN), sourcePath, newTab);
          const candidatesOn = (el, sourcePath) => [targetOfEl(el), ...altsOf(el) || [], ...foreignOf(el, sourcePath, false)];
          let lastX = 0;
          let lastY = 0;
          plugin.registerDomEvent(document, "mousemove", (e) => {
            lastX = e.clientX;
            lastY = e.clientY;
          });
          plugin.registerDomEvent(document, "keydown", (e) => {
            if (!plugin.choices || !(e.ctrlKey || e.metaKey))
              return;
            const under = document.elementFromPoint(lastX, lastY);
            const el = under && under.closest ? under.closest("." + CM_LINK_CLASS) : null;
            if (!el || !(el.hasAttribute(ATTR_ALTS) || el.hasAttribute(ATTR_FOREIGN)))
              return;
            const file = plugin.app.workspace.getActiveFile();
            plugin.choices.schedule(candidatesOn(el, file ? file.path : ""), lastX, lastY, el.textContent);
          });
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
                  const alts = altsOf(el) || [];
                  const pick = (newTab, title) => {
                    const candidates = [targetOfEl(el), ...alts, ...foreignOf(el, sourcePath, newTab)];
                    plugin.chooseTerm(candidates, title, (c) => plugin.openTerm(c, sourcePath, newTab), el.textContent);
                  };
                  if (e.button === 1) {
                    pick(true, t2("menu.openNewTabTitle"));
                    e.preventDefault();
                    return;
                  }
                  if (e.button !== 0 || !(e.ctrlKey || e.metaKey))
                    return;
                  pick(false, t2("menu.openTitle"));
                  e.preventDefault();
                },
                mouseover(e) {
                  const el = targetEl(e);
                  if (!el)
                    return;
                  const file = plugin.app.workspace.getActiveFile();
                  const sourcePath = file ? file.path : "";
                  if (el.hasAttribute(ATTR_ALTS) || el.hasAttribute(ATTR_FOREIGN)) {
                    if (!plugin.choices || !(e.ctrlKey || e.metaKey))
                      return;
                    plugin.choices.schedule(candidatesOn(el, sourcePath), e.clientX, e.clientY, el.textContent);
                    return;
                  }
                  plugin.hoverTerm(e, el, targetOfEl(el), sourcePath);
                },
                mouseout(e) {
                  if (targetEl(e) && plugin.choices)
                    plugin.choices.leave();
                }
                // No contextmenu handler: a right-click already raises Obsidian's menu, and
                // everything we offer for the word under the cursor is added there.
              }
            }
          );
          this.registerEditorExtension(vp);
        }
      };
    }
    module2.exports = { createHighlight };
  }
});

// src/highlight.js
var require_highlight2 = __commonJS({
  "src/highlight.js"(exports2, module2) {
    "use strict";
    var { createHighlight } = require_highlight();
    module2.exports = createHighlight({
      cls: "heading",
      displayName: "Heading Linker",
      targetOf: (m) => m.linktext,
      selfIdFor: (plugin, sourcePath) => plugin.currentFileBase(sourcePath)
    });
  }
});

// src/shared/popover.js
var require_popover = __commonJS({
  "src/shared/popover.js"(exports2, module2) {
    "use strict";
    var SHOW_DELAY = 200;
    var HIDE_GRACE = 250;
    var EDGE_PAD = 12;
    var Popover = class {
      constructor(opts) {
        this.cls = opts.cls;
        this.hiddenCls = opts.hiddenCls;
        this.showDelay = opts.showDelay == null ? SHOW_DELAY : opts.showDelay;
        this.hideGrace = opts.hideGrace == null ? HIDE_GRACE : opts.hideGrace;
        this.onHide = opts.onHide || null;
        this.onDestroy = opts.onDestroy || null;
        this.keepAlive = opts.keepAlive || null;
        this.el = null;
        this.timer = null;
        this.hideTimer = null;
        this.key = "";
        this.pendingKey = "";
        this.token = 0;
      }
      ensureEl() {
        if (!this.el) {
          this.el = document.body.createDiv({ cls: `${this.cls} ${this.hiddenCls}` });
          this.el.addEventListener("mouseenter", () => this.cancelHide());
          this.el.addEventListener("mouseleave", () => this.leave());
        }
        return this.el;
      }
      isVisible() {
        return !!this.el && !this.el.classList.contains(this.hiddenCls);
      }
      contains(node) {
        return !!this.el && !!node && this.el.contains(node);
      }
      cancelHide() {
        clearTimeout(this.hideTimer);
        this.hideTimer = null;
      }
      // Re-asking for what is already up, or already on its way, changes nothing — otherwise
      // every mouse move would restart the timer.
      schedule(key, x, y, build) {
        this.cancelHide();
        if (key === this.key && this.isVisible())
          return;
        if (key === this.pendingKey)
          return;
        this.pendingKey = key;
        clearTimeout(this.timer);
        this.timer = setTimeout(() => {
          this.pendingKey = "";
          this.show(key, x, y, build);
        }, this.showDelay);
      }
      leave() {
        if (this.hideTimer)
          return;
        this.hideTimer = setTimeout(() => {
          this.hideTimer = null;
          if (this.keepAlive && this.keepAlive()) {
            this.leave();
            return;
          }
          this.hide();
        }, this.hideGrace);
      }
      async show(key, x, y, build) {
        const token = ++this.token;
        const ctx = { isCurrent: () => token === this.token };
        const el = this.ensureEl();
        el.empty();
        const after = await build(el, ctx);
        if (after === false || !ctx.isCurrent())
          return;
        this.key = key;
        el.style.visibility = "hidden";
        el.style.left = "-9999px";
        el.style.top = "0px";
        el.removeClass(this.hiddenCls);
        if (typeof after === "function")
          after();
        const r = el.getBoundingClientRect();
        let left = x + EDGE_PAD;
        let top = y + EDGE_PAD;
        if (left + r.width > window.innerWidth - EDGE_PAD)
          left = Math.max(EDGE_PAD, x - EDGE_PAD - r.width);
        if (top + r.height > window.innerHeight - EDGE_PAD)
          top = Math.max(EDGE_PAD, y - EDGE_PAD - r.height);
        el.style.left = left + "px";
        el.style.top = top + "px";
        el.style.visibility = "visible";
      }
      hide() {
        clearTimeout(this.timer);
        clearTimeout(this.hideTimer);
        this.hideTimer = null;
        this.pendingKey = "";
        this.key = "";
        this.token++;
        if (this.onHide)
          this.onHide();
        if (this.el) {
          this.el.addClass(this.hiddenCls);
          this.el.empty();
        }
      }
      destroy() {
        clearTimeout(this.timer);
        clearTimeout(this.hideTimer);
        this.token++;
        if (this.onDestroy)
          this.onDestroy();
        if (this.el) {
          this.el.remove();
          this.el = null;
        }
      }
    };
    module2.exports = { Popover, SHOW_DELAY, HIDE_GRACE };
  }
});

// src/shared/prose/choices.js
var require_choices = __commonJS({
  "src/shared/prose/choices.js"(exports2, module2) {
    "use strict";
    var { Popover } = require_popover();
    var { Component } = require("obsidian");
    var labelOf = (c) => typeof c === "object" && c ? c.label : c;
    function captionFor(plugin, c, display) {
      const provider = plugin && plugin.api && plugin.api.linker;
      let own = null;
      if (typeof c === "object" && c !== null) {
        own = typeof c.describe === "function" ? c.describe(display) : null;
      } else if (provider && typeof provider.describe === "function") {
        own = provider.describe(c, display);
      }
      if (own && own.title)
        return { title: own.title, note: own.note || "" };
      return { title: labelOf(c), note: "" };
    }
    var ChoicePopover2 = class {
      // `hover(target, event, el, hoverParent)` previews one of our own targets; `open(target)`
      // follows it.
      constructor(opts) {
        this.opts = opts;
        this.component = null;
        this.pop = new Popover({
          cls: `${opts.cls}-choices`,
          hiddenCls: `${opts.cls}-hidden`,
          onHide: () => this.unloadComponent(),
          onDestroy: () => this.unloadComponent(),
          // The preview a row opens is Obsidian's own element in the body, not a child of ours,
          // so moving the pointer into it reads as leaving the list.
          keepAlive: () => !!document.querySelector(".hover-popover:hover")
        });
      }
      isVisible() {
        return this.pop.isVisible();
      }
      contains(node) {
        return this.pop.contains(node);
      }
      cancelHide() {
        this.pop.cancelHide();
      }
      leave() {
        this.pop.leave();
      }
      hide() {
        this.pop.hide();
      }
      destroy() {
        this.pop.destroy();
      }
      // Unloading the component closes any preview still hanging off it.
      unloadComponent() {
        if (this.component) {
          this.component.unload();
          this.component = null;
        }
      }
      schedule(candidates, x, y, display) {
        if (!candidates || candidates.length < 2)
          return;
        const key = candidates.map(labelOf).join("\0");
        this.pop.schedule(key, x, y, (el) => this.build(candidates, el, display));
      }
      // A fresh component per preview, so opening one closes the last instead of stacking one
      // preview per row the pointer crossed.
      newComponent() {
        this.unloadComponent();
        this.component = new Component();
        this.component.load();
        return this.component;
      }
      build(candidates, el, display) {
        this.unloadComponent();
        const cls = this.opts.cls;
        el.createDiv({ cls: `${cls}-choices-title`, text: this.opts.title });
        const list = el.createDiv({ cls: `${cls}-choices-list` });
        for (const c of candidates) {
          const foreign = typeof c === "object" && c !== null;
          const { title, note } = captionFor(this.opts.plugin, c, display);
          const row = list.createDiv({ cls: `${cls}-choices-item` });
          row.createDiv({ cls: `${cls}-choices-item-title`, text: title });
          if (note)
            row.createDiv({ cls: `${cls}-choices-item-note`, text: note });
          row.addEventListener("mouseenter", (event) => {
            const parent = this.newComponent();
            if (foreign) {
              if (typeof c.hover === "function")
                c.hover(event, row, parent);
            } else {
              this.opts.hover(c, event, row, parent);
            }
          });
          row.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            this.hide();
            if (foreign)
              c.open();
            else
              this.opts.open(c);
          });
        }
      }
    };
    module2.exports = { ChoicePopover: ChoicePopover2, captionFor };
  }
});

// src/shared/prose/modals.js
var require_modals = __commonJS({
  "src/shared/prose/modals.js"(exports2, module2) {
    "use strict";
    var { Modal } = require("obsidian");
    var { t: t2 } = require_i18n();
    var { inTableCell: inTableCell2 } = require_markdown();
    var { captionFor } = require_choices();
    var SKIP = " skip";
    var MAX_ROWS = 50;
    function createProseModals(config) {
      const { cls, targetOf, withTarget } = config;
      class MaterializePreviewModal extends Modal {
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
              if (!this.groups.has(key)) {
                this.groups.set(key, { display: m.display, candidates: [targetOf(m), ...m.alts], choice: targetOf(m), spans: [] });
              }
            }
          }
        }
        onOpen() {
          const { contentEl } = this;
          contentEl.createEl("h3", { text: t2("modal.materialize.title") });
          const total = this.files.reduce((n, f) => n + f.matches.length, 0);
          contentEl.createEl("p", { text: t2("modal.materialize.summary", { files: this.files.length, replacements: total }) });
          if (this.groups.size) {
            contentEl.createEl("p", { cls: `${cls}-section-desc`, text: t2("modal.materialize.ambiguous", { n: this.groups.size }) });
            const panel = contentEl.createDiv({ cls: `${cls}-resolve-panel` });
            for (const g of this.groups.values()) {
              const row = panel.createDiv({ cls: `${cls}-resolve-row` });
              row.createSpan({ cls: `${cls}-resolve-word`, text: g.display });
              row.createSpan({ text: "\u2192" });
              const sel = row.createEl("select", { cls: `${cls}-term-select` });
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
            contentEl.createDiv({ cls: `${cls}-preview-file`, text: fc.file ? fc.file.path : fc.label || t2("label.selection") });
            const table = contentEl.createEl("table", { cls: `${cls}-preview-table` });
            fc.matches.slice(0, MAX_ROWS).forEach((m) => {
              const inTable = inTableCell2(fc.original, m.start);
              const tr = table.createEl("tr");
              tr.createEl("td", { text: m.display });
              tr.createEl("td", { text: "\u2192" });
              const after = tr.createEl("td");
              if (m.alts && m.alts.length) {
                tr.addClass(`${cls}-ambiguous-row`);
                const g = this.groups.get(m.display.toLowerCase());
                const render = () => after.setText(g.choice == null ? t2("modal.leftAsText") : this.plugin.wikiLink(g.choice, m.display, inTable));
                g.spans.push(render);
                render();
              } else {
                after.setText(this.plugin.wikiLink(targetOf(m), m.display, inTable));
              }
            });
            if (fc.matches.length > MAX_ROWS) {
              contentEl.createEl("div", { cls: `${cls}-preview-empty`, text: t2("modal.andMore", { n: fc.matches.length - MAX_ROWS }) });
            }
          });
          const buttons = contentEl.createDiv({ cls: `${cls}-preview-buttons` });
          const apply = buttons.createEl("button", { text: t2("btn.apply"), cls: "mod-cta" });
          apply.onclick = async () => {
            const results = this.files.map((fc) => {
              const chosen = [];
              for (const m of fc.matches) {
                if (m.alts && m.alts.length) {
                  const g = this.groups.get(m.display.toLowerCase());
                  if (!g || g.choice == null)
                    continue;
                  chosen.push(g.choice === targetOf(m) ? m : withTarget(m, g.choice));
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
      }
      class UnlinkPreviewModal extends Modal {
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
            contentEl.createDiv({ cls: `${cls}-preview-file`, text: fc.file ? fc.file.path : fc.label || t2("label.selection") });
            const table = contentEl.createEl("table", { cls: `${cls}-preview-table` });
            fc.matches.slice(0, MAX_ROWS).forEach((m) => {
              const tr = table.createEl("tr");
              tr.createEl("td", { text: m.source });
              tr.createEl("td", { text: "\u2192" });
              tr.createEl("td", { text: m.display });
            });
            if (fc.matches.length > MAX_ROWS) {
              contentEl.createEl("div", { cls: `${cls}-preview-empty`, text: t2("modal.andMore", { n: fc.matches.length - MAX_ROWS }) });
            }
          });
          const buttons = contentEl.createDiv({ cls: `${cls}-preview-buttons` });
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
      }
      class ChooseTermModal extends Modal {
        constructor(app, opts) {
          super(app);
          this.opts = opts;
        }
        onOpen() {
          const { contentEl } = this;
          contentEl.createEl("h3", { text: this.opts.title || t2("modal.choose.title") });
          contentEl.createEl("p", { text: t2("modal.choose.body") });
          const list = contentEl.createDiv({ cls: `${cls}-choose-list` });
          for (const term of this.opts.terms) {
            const foreign = term && typeof term === "object";
            const { title, note } = captionFor(this.opts.plugin, term, this.opts.display);
            const b = list.createEl("button", { cls: `${cls}-choose-item` });
            b.createDiv({ cls: `${cls}-choose-item-title`, text: title });
            if (note)
              b.createDiv({ cls: `${cls}-choose-item-note`, text: note });
            b.onclick = async () => {
              this.close();
              if (foreign)
                term.open();
              else
                await this.opts.onChoose(term);
            };
          }
          contentEl.createDiv({ cls: `${cls}-preview-buttons` }).createEl("button", { text: t2("btn.cancel") }).onclick = () => this.close();
        }
        onClose() {
          this.contentEl.empty();
        }
      }
      return { MaterializePreviewModal, UnlinkPreviewModal, ChooseTermModal };
    }
    module2.exports = { createProseModals, SKIP };
  }
});

// src/modals.js
var require_modals2 = __commonJS({
  "src/modals.js"(exports2, module2) {
    "use strict";
    var { createProseModals } = require_modals();
    var { MaterializePreviewModal, UnlinkPreviewModal, ChooseTermModal } = createProseModals({
      cls: "heading",
      targetOf: (m) => m.linktext,
      withTarget: (m, linktext) => ({ ...m, linktext })
    });
    module2.exports = { MaterializePreviewModal, UnlinkPreviewModal, ChooseTermModal };
  }
});

// src/materialize.js
var require_materialize = __commonJS({
  "src/materialize.js"(exports2, module2) {
    "use strict";
    var { Notice: Notice2 } = require("obsidian");
    var { splitLines: splitLines2, wordAt } = require_markdown();
    var { MaterializePreviewModal, UnlinkPreviewModal, ChooseTermModal } = require_modals2();
    var { candidatesFor } = require_discover();
    var { t: t2, plural: plural2 } = require_i18n();
    var LONG = { term: "", form: "Form", stem: "Stem" };
    var SHORT = { term: "exclude.shortTerm", form: "exclude.shortForm", stem: "exclude.shortStem" };
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
      // The highlighted (not yet linked) match under the cursor, with whatever the other
      // linkers would offer at the same spot, or null.
      //
      // It runs through ownSpans, so on a word several linkers know only the owner finds
      // anything here — which is what keeps one "Link…" item in the menu instead of one per
      // plugin. The others stay quiet and their readings ride along as candidates.
      matchAtCursor(editor) {
        const head = editor.getCursor("head");
        const line = editor.getLine(head.line);
        if (!line)
          return null;
        const activeFile = this.app.workspace.getActiveFile();
        const activePath = activeFile ? activeFile.path : "";
        const currentFile = this.currentFileBase(activePath);
        const where = { path: activePath, surface: "menu" };
        const matches = this.ownSpans(line, this.findMatches(line, currentFile, { protect: true }), where);
        const hit = matches.find((m) => head.ch >= m.start && head.ch <= m.end);
        if (!hit)
          return null;
        const foreign = candidatesFor(this.yieldedIn(line, where), hit.start, hit.end);
        return { match: hit, foreign, line: head.line };
      },
      // The match under the cursor as we see it, ownership aside — so null only when this word
      // means nothing to us at all.
      //
      // Used for excluding a word, and only for that. Excluding is a setting of *this* plugin:
      // it stops us matching the word and says nothing about what the sibling does. Gating it on
      // ownership hid it exactly where it is most wanted — on a word both linkers match, where
      // the loser is drawing nothing yet still matches, and the settings tab was the only way
      // left to tell it to stop.
      // The plain word under the cursor, whether or not the index knows it.
      rawWordAtCursor(editor) {
        const head = editor.getCursor("head");
        return wordAt(editor.getLine(head.line), head.ch);
      },
      wordAtCursor(editor) {
        const head = editor.getCursor("head");
        const line = editor.getLine(head.line);
        if (!line)
          return null;
        const currentFile = this.currentFileBase(this.app.workspace.getActiveFile() ? this.app.workspace.getActiveFile().path : "");
        const matches = this.findMatches(line, currentFile, { protect: true });
        return matches.find((m) => head.ch >= m.start && head.ch <= m.end) || null;
      },
      // Every reading of the match under the cursor: ours, our own same-named alternatives, and
      // the ones other linkers stood down on. What the menu offers to link or open.
      cursorCandidates(hit, sourcePath, newTab) {
        const own = [hit.match.linktext, ...hit.match.alts || []];
        const foreign = hit.foreign.map((c) => ({ ...c, open: () => c.open(sourcePath, newTab) }));
        return [...own, ...foreign];
      },
      chooseTerm(candidates, title, action, display) {
        const list = (candidates || []).filter(Boolean);
        if (list.length <= 1) {
          const only = list[0];
          if (only && typeof only === "object")
            return only.open();
          return action(only);
        }
        new ChooseTermModal(this.app, { title, terms: list, onChoose: action, display, plugin: this }).open();
      },
      isExcluded(listKey, value) {
        const v = value.toLowerCase();
        return splitLines2(this.settings[listKey]).some((l) => l.toLowerCase() === v);
      },
      // A starred line carries the word's base form under the current match mode — a stem, a
      // stripped ending or the whole word — and stands for every form that reduces to it.
      exclusionLine(kind, value) {
        return kind === "stem" ? `${this.keysFor(value)[0]}*` : value;
      },
      // The base of the starred line that silences this word, or null. Searched rather than
      // built: the line may have been written from a different form of the same word.
      stemLineSilencing(word) {
        const keys = this.keysFor(word);
        for (const line of splitLines2(this.settings.excludeWords)) {
          if (!line.endsWith("*"))
            continue;
          const base = line.slice(0, -1);
          if (this.keysFor(base).some((k) => keys.includes(k)))
            return base;
        }
        return null;
      },
      // Toggle a line in one of the two exclusion lists. `kind` is the wish behind the item — a
      // heading ('term'), this spelling ('form') or every form behind it ('stem') — and picks
      // both the wording and which verb the item is filed under.
      addExclusionMenuItem(menu, listKey, value, kind = "term") {
        const noun = t2(kind === "term" ? "exclude.terms" : "exclude.words");
        const silencing = kind === "stem" ? this.stemLineSilencing(value) : null;
        const line = silencing === null ? this.exclusionLine(kind, value) : `${silencing}*`;
        const excluded = silencing !== null || kind !== "stem" && this.isExcluded(listKey, line);
        const key = `exclude.${excluded ? "remove" : "add"}${LONG[kind]}`;
        const write = (i, grouped) => i.setTitle(t2(grouped ? SHORT[kind] : key, { value, noun })).setIcon(grouped ? null : excluded ? "rotate-ccw" : kind === "term" ? "trash-2" : "ban").onClick(() => this.setExcluded(listKey, line, !excluded));
        if (excluded)
          menu.addItem((i) => write(i, false));
        else
          menu.tagged(kind === "term" ? "exclude" : "silence", { value }, write);
      },
      async setExcluded(listKey, value, add) {
        const v = value.toLowerCase();
        const lines = splitLines2(this.settings[listKey]);
        const has = lines.some((l) => l.toLowerCase() === v);
        if (add === has) {
          new Notice2(t2(add ? "notice.alreadyExcluded" : "notice.wasNotExcluded", { value }));
          return;
        }
        const stored = listKey === "excludeWords" ? v : value;
        this.settings[listKey] = (add ? [...lines, stored] : lines.filter((l) => l.toLowerCase() !== v)).join("\n");
        await this.saveSettings();
        this.rebuildIndex();
        this.rerenderViews();
        this.updateStatusBar();
        const where = t2(listKey === "excludeWords" ? "exclude.words" : "exclude.terms");
        new Notice2(t2(add ? "notice.addedToExcluded" : "notice.removedFromExcluded", { value, where }));
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

// src/shared/prose/provider.js
var require_provider = __commonJS({
  "src/shared/prose/provider.js"(exports2, module2) {
    "use strict";
    var { LINKER_API } = require_discover();
    var { t: t2 } = require_i18n();
    function aliasHit(plugin, term, mainForm, display) {
      const aliases2 = term && term.aliases || [];
      if (!display || !aliases2.length)
        return null;
      const sameForm = (a, b) => {
        const wa = plugin.tokenizeForm(String(a));
        const wb = plugin.tokenizeForm(String(b));
        if (!wa.length || wa.length !== wb.length)
          return String(a).toLowerCase() === String(b).toLowerCase();
        return wa.every((w, i) => w.keys.some((k) => wb[i].keys.includes(k)));
      };
      if (sameForm(mainForm, display))
        return null;
      const hit = aliases2.find((a) => sameForm(a, display));
      return hit ? t2("kind.viaAlias", { form: hit }) : null;
    }
    function drawsIn(plugin, sourcePath, surface) {
      if (sourcePath && !plugin.inScope(sourcePath))
        return false;
      if (surface === "reading")
        return !!plugin.settings.highlightInReading;
      if (surface === "editing")
        return plugin.settings.editingHighlight !== "off";
      return true;
    }
    function createProseProvider(plugin, config) {
      const { id, displayName, spanOf, suggestionsFor, excludes, describe } = config;
      const str = (v) => String(v || "");
      return {
        apiVersion: LINKER_API,
        id,
        displayName,
        kind: "prose",
        // A getter, so a settings change is seen without rebuilding the api object.
        get precedence() {
          return plugin.settings.linkPrecedence;
        },
        // Protected ranges are skipped, so the answer matches what we would decorate. Whether we
        // are switched on anywhere is `drawsIn`'s question, not this one's.
        matches: (text) => plugin.findMatches(str(text), null, { protect: true }).map(spanOf),
        // Asked by a sibling before it yields us a span: claiming a word we will not draw would
        // leave it shown by nobody.
        drawsIn: (sourcePath, surface) => drawsIn(plugin, sourcePath, surface),
        // How one of our targets reads when a sibling lists it beside its own: several notes can
        // claim one word, and without this every row renders as the same string.
        describe: (target, display) => describe(target, display),
        open: (target, sourcePath, newTab) => plugin.openTerm(target, sourcePath, newTab),
        // Our own preview of one of our targets, anchored to someone else's element.
        hover: (target, event, targetEl, sourcePath, hoverParent) => plugin.hoverTerm(event, targetEl, target, sourcePath, hoverParent),
        suggest: (query, sourcePath) => suggestionsFor(plugin, str(query), sourcePath),
        // What choosing our row writes — ours to decide, not the popup owner's.
        insertFor: (target, display, inTable) => plugin.settings.suggestPlainText ? display : plugin.wikiLink(target, display, inTable),
        // Superseded by insertFor; kept for peers that predate it.
        linkFor: (target, display, inTable) => plugin.wikiLink(target, display, inTable),
        // Whether we would add a menu item of this verb for this text — asked before either
        // plugin writes one, since the grouping has to be settled first.
        offers: (kind, text) => (kind === "exclude" || kind === "silence") && !!plugin.settings.menuExclude && (plugin.findMatches(str(text), null).length > 0 || excludes(str(text))),
        refresh: () => plugin.rerenderViews()
      };
    }
    module2.exports = { createProseProvider, drawsIn, aliasHit };
  }
});

// src/shared/prose/usage.js
var require_usage = __commonJS({
  "src/shared/prose/usage.js"(exports2, module2) {
    "use strict";
    function createUsageCache() {
      let store = /* @__PURE__ */ new Map();
      return {
        // Returns [{ file, value }] in input order; onFile(i, total) fires per file, hit or miss.
        // A file absent from a later run drops from the cache, so a shrinking scope can't leak.
        async run(files, signature, compute, onFile) {
          const next = /* @__PURE__ */ new Map();
          const out = [];
          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (onFile)
              onFile(i, files.length);
            const mtime = file && file.stat && file.stat.mtime || 0;
            const prev = store.get(file.path);
            const value = prev && prev.signature === signature && prev.mtime === mtime ? prev.value : await compute(file);
            next.set(file.path, { mtime, signature, value });
            out.push({ file, value });
          }
          store = next;
          return out;
        },
        clear() {
          store = /* @__PURE__ */ new Map();
        }
      };
    }
    function foldUsageInto(counts, results) {
      for (const { file, value: here } of results) {
        for (const [id, n] of here) {
          const entry = counts.get(id);
          if (!entry)
            continue;
          entry.count += n;
          entry.files.push({ path: file.path, count: n });
        }
      }
      return counts;
    }
    async function scanCandidateWords(plugin, file, minLen, isTermWord) {
      const here = /* @__PURE__ */ new Map();
      let text;
      try {
        text = await plugin.app.vault.cachedRead(file);
      } catch (e) {
        return here;
      }
      const protect = plugin.computeProtected(text);
      for (const m of text.matchAll(/[\p{L}\p{Nd}]+/gu)) {
        const raw = m[0];
        if (/^\p{Nd}+$/u.test(raw))
          continue;
        if (plugin.overlapsProtected(protect, m.index, m.index + raw.length))
          continue;
        if (isTermWord(plugin.keysFor(raw), raw))
          continue;
        const lemma = plugin.lemmaFor(raw);
        if (lemma.length < minLen)
          continue;
        let g = here.get(lemma);
        if (!g) {
          g = { forms: /* @__PURE__ */ new Map(), total: 0 };
          here.set(lemma, g);
        }
        g.forms.set(raw, (g.forms.get(raw) || 0) + 1);
        g.total++;
      }
      return here;
    }
    function aggregateCandidates(results, minNotes) {
      const groups = /* @__PURE__ */ new Map();
      for (const { value: here } of results) {
        for (const [lemma, g] of here) {
          let all = groups.get(lemma);
          if (!all) {
            all = { forms: /* @__PURE__ */ new Map(), total: 0, docFreq: 0 };
            groups.set(lemma, all);
          }
          for (const [form, n] of g.forms)
            all.forms.set(form, (all.forms.get(form) || 0) + n);
          all.total += g.total;
          all.docFreq++;
        }
      }
      const out = [];
      for (const [lemma, g] of groups) {
        if (g.docFreq < minNotes)
          continue;
        let display = lemma, best = -1;
        for (const [form, n] of g.forms)
          if (n > best) {
            best = n;
            display = form;
          }
        out.push({ lemma, display, count: g.total, docFreq: g.docFreq });
      }
      out.sort((a, b) => b.docFreq - a.docFreq || b.count - a.count);
      return out.slice(0, 100);
    }
    module2.exports = { createUsageCache, foldUsageInto, scanCandidateWords, aggregateCandidates };
  }
});

// src/shared/prose/suggest.js
var require_suggest = __commonJS({
  "src/shared/prose/suggest.js"(exports2, module2) {
    "use strict";
    var { peerSuggestions } = require_discover();
    function suggestionsAllowed(plugin, query, sourcePath) {
      if (!plugin.settings.linkSuggest)
        return false;
      if (sourcePath && !plugin.inScope(sourcePath))
        return false;
      return query.length >= Math.max(1, plugin.settings.suggestMinChars || 1);
    }
    function mergeSuggestions(plugin, query, own, sourcePath, limit = 8) {
      const provider = plugin.api && plugin.api.linker;
      if (!provider)
        return own;
      const foreign = peerSuggestions(plugin.app, provider, query, sourcePath);
      if (!foreign.length)
        return own;
      const mine = provider.precedence || 0;
      const above = foreign.filter((f) => f.precedence > mine);
      const below = foreign.filter((f) => f.precedence <= mine);
      return [...above, ...own, ...below].slice(0, limit);
    }
    module2.exports = { mergeSuggestions, suggestionsAllowed };
  }
});

// src/shared/prose/editor-suggest.js
var require_editor_suggest = __commonJS({
  "src/shared/prose/editor-suggest.js"(exports2, module2) {
    "use strict";
    var { EditorSuggest } = require("obsidian");
    var { inTableCell: inTableCell2 } = require_markdown();
    var { mergeSuggestions, suggestionsAllowed } = require_suggest();
    function createProseSuggest(config) {
      const { cls, ownId, collect, noteFor, labelOf, targetOf, displayFor } = config;
      return class ProseSuggest extends EditorSuggest {
        constructor(app, plugin) {
          super(app);
          this.plugin = plugin;
        }
        onTrigger(cursor, editor, file) {
          const plugin = this.plugin;
          if (!file)
            return null;
          const line = editor.getLine(cursor.line);
          if (/[\p{L}\p{Nd}]/u.test(line[cursor.ch] || ""))
            return null;
          const m = line.slice(0, cursor.ch).match(/[\p{L}\p{Nd}]+$/u);
          if (!m)
            return null;
          const query = m[0];
          if (!suggestionsAllowed(plugin, query, file.path))
            return null;
          const before = line[cursor.ch - query.length - 1] || "";
          if (before && (plugin.settings.suggestSkipAfter || "").includes(before))
            return null;
          const off = editor.posToOffset(cursor);
          if (plugin.isProtectedAt(editor.getValue(), off))
            return null;
          const items = this.merged(query, file.path);
          if (!items.length)
            return null;
          this.cached = { query, items };
          return { start: { line: cursor.line, ch: cursor.ch - query.length }, end: cursor, query };
        }
        // Ours plus every sibling linker's, in one list. `sourcePath` travels with the query so
        // each sibling can decline a note outside its own scope — we are only in scope for us.
        merged(query, sourcePath) {
          return mergeSuggestions(this.plugin, query, collect(this.plugin, query, ownId(this.plugin)), sourcePath);
        }
        getSuggestions(context) {
          if (this.cached && this.cached.query === context.query)
            return this.cached.items;
          return this.merged(context.query, context.file && context.file.path);
        }
        renderSuggestion(item, el) {
          el.addClass(`${cls}-suggestion`);
          el.createSpan({ cls: `${cls}-suggestion-title`, text: item.insert ? item.label : labelOf(item) });
          const note = item.insert ? item.note : noteFor(item);
          if (note)
            el.createSpan({ cls: `${cls}-suggestion-note`, text: note });
        }
        selectSuggestion(item) {
          const ctx = this.context;
          if (!ctx)
            return;
          const editor = ctx.editor;
          const inTable = inTableCell2(editor.getValue(), editor.posToOffset(ctx.start));
          let text;
          if (item.insert) {
            text = item.insert(item.display == null ? ctx.query : item.display, inTable);
          } else {
            const display = displayFor(item, ctx.query);
            text = this.plugin.settings.suggestPlainText ? display : this.plugin.wikiLink(targetOf(item), display, inTable);
          }
          if (!text)
            return;
          editor.replaceRange(text, ctx.start, ctx.end);
          editor.setCursor(editor.offsetToPos(editor.posToOffset(ctx.start) + text.length));
        }
      };
    }
    var suggestAvailable2 = () => typeof EditorSuggest === "function";
    module2.exports = { createProseSuggest, suggestAvailable: suggestAvailable2 };
  }
});

// src/heading-suggest.js
var require_heading_suggest = __commonJS({
  "src/heading-suggest.js"(exports2, module2) {
    "use strict";
    var { t: t2 } = require_i18n();
    var { createProseSuggest, suggestAvailable: suggestAvailable2 } = require_editor_suggest();
    var { suggestionsAllowed } = require_suggest();
    function collectSuggestions(plugin, query, ownFile) {
      const qLower = query.toLowerCase();
      const byLink = /* @__PURE__ */ new Map();
      const seenCand = /* @__PURE__ */ new Set();
      for (const key of plugin.keysFor(query)) {
        const bucket = plugin.index.byKey.get(key);
        if (!bucket)
          continue;
        for (const c of bucket) {
          if (c.wordCount !== 1 || seenCand.has(c) || c.fileBase === ownFile)
            continue;
          seenCand.add(c);
          if (!byLink.has(c.linktext))
            byLink.set(c.linktext, { linktext: c.linktext, label: c.label, fileBase: c.fileBase, crumbs: c.crumbs, kind: "form" });
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
          byLink.set(term.linktext, { linktext: term.linktext, label: term.label, fileBase: term.fileBase, crumbs: term.crumbs, kind: "prefix", matchedForm: form });
      }
      const items = [...byLink.values()];
      const rank = (it) => it.kind === "form" ? 0 : 1;
      items.sort((a, b) => rank(a) - rank(b) || a.label.length - b.label.length || a.linktext.localeCompare(b.linktext));
      return items.slice(0, 8);
    }
    function locationOf(item) {
      return [item.fileBase, ...item.crumbs || []].join(" \u203A ");
    }
    function noteFor(item) {
      if (item.kind === "form")
        return t2("suggest.inflection", { file: locationOf(item) });
      if (item.matchedForm && item.matchedForm.toLowerCase() !== item.label.toLowerCase()) {
        return t2("suggest.alias", { form: item.matchedForm, file: locationOf(item) });
      }
      return locationOf(item);
    }
    function suggestionsFor(plugin, query, sourcePath) {
      if (!suggestionsAllowed(plugin, query, sourcePath))
        return [];
      const active = plugin.app.workspace.getActiveFile();
      const own = active ? plugin.currentFileBase(active.path) : null;
      return collectSuggestions(plugin, query, own).map((it) => ({
        label: it.label,
        note: noteFor(it),
        target: it.linktext,
        display: it.kind === "form" ? null : it.matchedForm || it.label
      }));
    }
    var HeadingSuggest2 = createProseSuggest({
      cls: "heading",
      // A note's own headings are never offered inside it, the same exclusion the highlighter
      // makes; the matcher recognises them by the file's basename.
      ownId: (plugin) => {
        const active = plugin.app.workspace.getActiveFile();
        return active ? plugin.currentFileBase(active.path) : null;
      },
      collect: collectSuggestions,
      noteFor,
      labelOf: (it) => it.label,
      targetOf: (it) => it.linktext,
      // 'form' keeps the typed wording; 'prefix' uses the wording that matched, heading or alias.
      displayFor: (it, query) => it.kind === "form" ? query : it.matchedForm || it.label
    });
    module2.exports = { HeadingSuggest: HeadingSuggest2, suggestAvailable: suggestAvailable2, collectSuggestions, suggestionsFor };
  }
});

// src/api.js
var require_api = __commonJS({
  "src/api.js"(exports2, module2) {
    "use strict";
    var { createProseProvider, aliasHit } = require_provider();
    var { createUsageCache, foldUsageInto, scanCandidateWords, aggregateCandidates } = require_usage();
    var { t: t2 } = require_i18n();
    var { suggestionsFor } = require_heading_suggest();
    module2.exports = {
      buildApi() {
        const plugin = this;
        return {
          version: this.manifest.version,
          // Every indexed heading: { linktext, label, fileBase, path, aliases }.
          getTerms: () => this.getTerms(),
          // Resolve a heading label or alias (case-insensitive) to its term, or null.
          resolveTerm: (name) => this.resolveTerm(name),
          // Morphology helpers (same engine the matcher uses).
          keysFor: (word) => this.keysFor(String(word || "")),
          lemmaFor: (word) => this.lemmaFor(String(word || "")),
          // Heading matches in arbitrary text, skipping protected ranges.
          findMatches: (text) => this.findMatches(String(text || ""), null, { protect: true }),
          // Per heading, how often it is used across in-scope notes (async). With
          // { includeLinks: true } also counts existing [[File#Heading]] links; { wholeVault:
          // true } scans every note regardless of scope. Headings with count 0 are unused.
          getUsageReport: (opts) => this.getUsageReport(opts),
          // Frequent in-scope words that are not yet a heading, worth defining (async):
          // { lemma, display, count, docFreq }, ordered by how many notes they appear in.
          collectCandidates: (opts) => this.collectCandidates(opts),
          // Subscribe to index rebuilds; returns an unsubscribe function.
          onChange: (cb) => this.onIndexChange(cb),
          linker: createProseProvider(plugin, {
            id: "heading-linker",
            displayName: "Heading Linker",
            spanOf: (m) => ({ start: m.start, end: m.end, label: m.label, target: m.linktext }),
            suggestionsFor,
            excludes: (text) => plugin.wordSilenced(text) || plugin.isExcluded("excludeTerms", text),
            // The raw target reads "Guide#Spawn"; the reader wants the heading and the note it
            // sits in, since two files holding the same heading are what makes a span ambiguous.
            describe: (target, display) => {
              const term = (plugin.terms || []).find((x) => x.linktext === target);
              const label = term ? term.label : String(target).split("#").pop();
              const file = term ? term.fileBase : String(target).split("#")[0];
              const location = [file, ...term && term.crumbs || []].join(" \u203A ");
              const parts = [t2("kind.heading"), aliasHit(plugin, term, label, display), location];
              return { title: label, note: parts.filter(Boolean).join(" \xB7 ") };
            }
          })
        };
      },
      getTerms() {
        return (this.terms || []).map((t3) => ({ linktext: t3.linktext, label: t3.label, fileBase: t3.fileBase, path: t3.path, aliases: (t3.aliases || []).slice() }));
      },
      resolveTerm(name) {
        const q = String(name || "").toLowerCase();
        if (!q)
          return null;
        for (const t3 of this.terms || []) {
          if (t3.label.toLowerCase() === q)
            return t3;
          if ((t3.aliases || []).some((a) => a.toLowerCase() === q))
            return t3;
        }
        return null;
      },
      // The notes a report scans: the whole vault, or just the linker's scope.
      reportFiles(opts) {
        return opts.wholeVault ? this.app.vault.getMarkdownFiles() : this.getScopeFiles();
      },
      // The heading-source file and raw heading text a wikilink's `#heading` subpath points at,
      // or null when it targets no heading in a source file. getFirstLinkpathDest resolves file
      // paths only, so the subpath must be sliced off first — the whole "File#Heading" would be
      // looked up as a file literally named that and never resolve.
      resolveHeadingLink(link, sourcePath) {
        const raw = String(link || "");
        const hash = raw.indexOf("#");
        if (hash < 0)
          return null;
        const heading = raw.slice(hash + 1).trim();
        if (!heading)
          return null;
        const pathPart = raw.slice(0, hash);
        const file = pathPart ? this.app.metadataCache.getFirstLinkpathDest(pathPart, sourcePath) : this.app.vault.getAbstractFileByPath(sourcePath);
        return file && this.isGlossaryFile(file) ? { file, heading } : null;
      },
      // A "Basename#Heading" linktext for an existing wikilink, filtered to indexed headings.
      linkToTerm(link, sourcePath, termSet) {
        const r = this.resolveHeadingLink(link, sourcePath);
        if (!r)
          return null;
        const linktext = `${r.file.basename}#${r.heading}`;
        return termSet.has(linktext) ? linktext : null;
      },
      // Read one note for the usage report: how often each heading is mentioned in it as plain
      // text, plus, with includeLinks, its direct [[File#Heading]] links. Cached per note.
      async usageInFile(file, includeLinks, termSet) {
        const here = /* @__PURE__ */ new Map();
        try {
          const text = await this.app.vault.cachedRead(file);
          for (const m of this.findMatches(text, this.currentFileBase(file.path), { protect: true })) {
            here.set(m.linktext, (here.get(m.linktext) || 0) + 1);
          }
        } catch (e) {
        }
        if (includeLinks) {
          const cache = this.app.metadataCache.getFileCache(file);
          for (const link of cache && cache.links || []) {
            const lt = this.linkToTerm(link.link, file.path, termSet);
            if (lt)
              here.set(lt, (here.get(lt) || 0) + 1);
          }
        }
        return here;
      },
      async getUsageReport(opts = {}) {
        const counts = /* @__PURE__ */ new Map();
        for (const term of this.terms || [])
          counts.set(term.linktext, { linktext: term.linktext, label: term.label, fileBase: term.fileBase, path: term.path, count: 0, files: [] });
        const files = this.reportFiles(opts);
        const termSet = new Set(counts.keys());
        if (!this.usageCache)
          this.usageCache = createUsageCache();
        const signature = `${this.indexVersion || 0}|${opts.includeLinks ? "L" : ""}`;
        const results = await this.usageCache.run(files, signature, (file) => this.usageInFile(file, !!opts.includeLinks, termSet));
        foldUsageInto(counts, results);
        return [...counts.values()];
      },
      async collectCandidates(opts = {}) {
        const minLen = Math.max(1, this.settings.minTermLength || 1);
        const minNotes = Math.max(1, this.settings.candidateMinNotes || 1);
        const files = this.reportFiles(opts);
        if (!this.candidateCache)
          this.candidateCache = createUsageCache();
        const signature = `${this.indexVersion || 0}|${minLen}`;
        const isTermWord = (keys, raw) => keys.some((k) => this.index.byKey.has(k)) || this.wordSilenced(raw);
        const results = await this.candidateCache.run(files, signature, (file) => scanCandidateWords(this, file, minLen, isTermWord));
        return aggregateCandidates(results, minNotes);
      }
    };
  }
});

// src/shared/index-events.js
var require_index_events = __commonJS({
  "src/shared/index-events.js"(exports2, module2) {
    "use strict";
    module2.exports = {
      // Returns an unsubscribe function.
      onIndexChange(cb) {
        if (typeof cb !== "function")
          return () => {
          };
        if (!this._indexListeners)
          this._indexListeners = /* @__PURE__ */ new Set();
        this._indexListeners.add(cb);
        return () => this._indexListeners.delete(cb);
      },
      notifyIndexChange() {
        for (const cb of this._indexListeners || []) {
          try {
            cb();
          } catch (e) {
            console.error(`${this.manifest.id}: index listener failed`, e);
          }
        }
      }
    };
  }
});

// src/shared/menu.js
var require_menu = __commonJS({
  "src/shared/menu.js"(exports2, module2) {
    "use strict";
    var obsidian = require("obsidian");
    var submenuSupport = null;
    function supportsSubmenu() {
      if (submenuSupport !== null)
        return submenuSupport;
      submenuSupport = false;
      try {
        const probe = new obsidian.Menu();
        probe.addItem((item) => {
          submenuSupport = typeof item.setSubmenu === "function";
        });
      } catch (e) {
        submenuSupport = false;
      }
      return submenuSupport;
    }
    function menuSection(menu, label, grouped, icon) {
      if (!grouped)
        return menu;
      if (!supportsSubmenu()) {
        return {
          addItem(cb) {
            return menu.addItem((item) => {
              const setTitle = item.setTitle.bind(item);
              item.setTitle = (title) => setTitle(`${label}: ${title}`);
              cb(item);
            });
          },
          addSeparator() {
            return menu.addSeparator();
          }
        };
      }
      let sub = null;
      const ensure = () => {
        if (!sub) {
          menu.addItem((item) => {
            item.setTitle(label);
            if (icon)
              item.setIcon(icon);
            sub = item.setSubmenu();
          });
        }
        return sub;
      };
      return {
        addItem(cb) {
          return ensure().addItem(cb);
        },
        addSeparator() {
          return sub ? sub.addSeparator() : null;
        }
      };
    }
    var STORE = "__linkerMenuSections";
    function sharedSection(menu, key, label, icon) {
      if (!supportsSubmenu())
        return menuSection(menu, label, true);
      let store = menu[STORE];
      if (!store) {
        store = {};
        try {
          Object.defineProperty(menu, STORE, { value: store, enumerable: false, configurable: true });
        } catch (e) {
          return menuSection(menu, label, true, icon);
        }
      }
      if (!store[key]) {
        menu.addItem((item) => {
          item.setTitle(label);
          if (icon)
            item.setIcon(icon);
          store[key] = item.setSubmenu();
        });
      }
      return store[key];
    }
    module2.exports = { menuSection, sharedSection, supportsSubmenu };
  }
});

// src/shared/menu-verbs.js
var require_menu_verbs = __commonJS({
  "src/shared/menu-verbs.js"(exports2, module2) {
    "use strict";
    var { sharedSection, menuSection } = require_menu();
    var { peersOffering } = require_discover();
    var { t: t2 } = require_i18n();
    var VERBS = {
      convert: { label: "menu.convert.group", icon: "link" },
      open: { label: "menu.open.group", icon: "file-search" },
      // Two verbs, because stopping a word and dropping the term it reached are different acts:
      // one leaves the term in the index, the other takes it out.
      silence: { label: "silence.group", icon: "ban" },
      exclude: { label: "exclude.group", icon: "trash-2" }
    };
    var verbKey = (verb, value) => verb + " " + (value == null ? "" : String(value));
    var MenuBuilder = class {
      constructor(plugin, menu) {
        this.plugin = plugin;
        this.menu = menu;
        this.entries = [];
      }
      // Untagged: written where it stands, exactly as Obsidian's own Menu would.
      addItem(cb) {
        this.entries.push({ cb });
        return this;
      }
      addSeparator() {
        this.entries.push({ separator: true });
        return this;
      }
      // Tagged. `cb(item, grouped)` is told whether it ended up in a submenu, since the wording
      // differs: inside one, the parent already names the object.
      tagged(verb, opts, cb) {
        if (!VERBS[verb])
          throw new Error("unknown menu verb: " + verb);
        this.entries.push({ cb, verb, value: opts && opts.value });
        return this;
      }
      // A submenu of this plugin's own — the several ways to link one word, say. Unlike a verb it
      // is never shared, and it is built even for a single item because the items only read as a
      // set. Takes items the way a menu does.
      section(label, icon) {
        const entry = { section: { label, icon }, children: [] };
        this.entries.push(entry);
        const child = {
          addItem(cb) {
            entry.children.push({ cb });
            return child;
          },
          addSeparator() {
            entry.children.push({ separator: true });
            return child;
          }
        };
        return child;
      }
      // Which (verb, object) pairs earned a submenu. Counted per object, not per verb: a group
      // is named after the object it acts on, so items reaching for different ones — excluding
      // this spelling, dropping that heading — stay apart and keep their full wording.
      groupedVerbs() {
        const counts = /* @__PURE__ */ new Map();
        for (const e of this.entries) {
          if (!e.verb)
            continue;
          const key = verbKey(e.verb, e.value);
          const seen = counts.get(key) || { count: 0, verb: e.verb, value: e.value };
          seen.count++;
          counts.set(key, seen);
        }
        const provider = this.plugin.api && this.plugin.api.linker;
        const grouped = /* @__PURE__ */ new Set();
        for (const [key, { count, verb, value }] of counts) {
          const peers = provider ? peersOffering(this.plugin.app, provider, verb, value).length : 0;
          if (count + peers > 1)
            grouped.add(key);
        }
        return grouped;
      }
      // menuSection builds the group on its first item, so an empty one leaves no trace, and it
      // falls back to prefixed titles where the app has no submenus.
      writeSection(entry) {
        if (!entry.children.length)
          return;
        const sub = menuSection(this.menu, entry.section.label, true, entry.section.icon);
        for (const child of entry.children) {
          if (child.separator)
            sub.addSeparator();
          else
            sub.addItem((item) => child.cb(item, true));
        }
      }
      // The key carries the object too, so two plugins excluding the same word still land in one
      // submenu while two acting on different ones do not.
      sectionFor(verb, value) {
        const spec = VERBS[verb];
        const label = t2(spec.label, value == null ? void 0 : { value });
        return sharedSection(this.menu, "linker:" + verbKey(verb, value), label, spec.icon);
      }
      // Replayed in declaration order, so a verb's submenu appears where its first item would
      // have. Anything else keeps its place.
      flush() {
        const grouped = this.groupedVerbs();
        const sections = /* @__PURE__ */ new Map();
        for (const e of this.entries) {
          if (e.separator) {
            this.menu.addSeparator();
            continue;
          }
          if (e.section) {
            this.writeSection(e);
            continue;
          }
          const key = e.verb ? verbKey(e.verb, e.value) : null;
          if (!key || !grouped.has(key)) {
            this.menu.addItem((item) => e.cb(item, false));
            continue;
          }
          if (!sections.has(key))
            sections.set(key, this.sectionFor(e.verb, e.value));
          sections.get(key).addItem((item) => e.cb(item, true));
        }
      }
    };
    function buildMenu2(plugin, menu, fn) {
      const builder = new MenuBuilder(plugin, menu);
      fn(builder);
      builder.flush();
    }
    module2.exports = { VERBS, MenuBuilder, buildMenu: buildMenu2 };
  }
});

// src/aliases.js
var require_aliases = __commonJS({
  "src/aliases.js"(exports2, module2) {
    "use strict";
    var { Notice: Notice2 } = require("obsidian");
    var { t: t2, plural: plural2 } = require_i18n();
    var HEADING_RE = /^(#{1,6})\s+(.*)$/;
    var ALIAS_LINE_RE = /^\s*%%\s*alias(?:es)?\s*:\s*(.*?)\s*%%\s*$/i;
    var headingTextOf = (line) => {
      const m = HEADING_RE.exec(line);
      return m ? m[2].trim() : null;
    };
    function headingRegion(lines, heading) {
      let start = -1;
      for (let i = 0; i < lines.length; i++) {
        const text = headingTextOf(lines[i]);
        if (text === null)
          continue;
        if (start < 0) {
          if (text === heading)
            start = i;
          continue;
        }
        return { start, end: i };
      }
      return start < 0 ? null : { start, end: lines.length };
    }
    function addAliasesToHeading(text, heading, aliases2) {
      const lines = text.split("\n");
      const region = headingRegion(lines, heading);
      if (!region)
        return null;
      for (let i = region.start + 1; i < region.end; i++) {
        const m = ALIAS_LINE_RE.exec(lines[i]);
        if (!m)
          continue;
        const existing = m[1].split(",").map((a) => a.trim()).filter(Boolean);
        const seen = new Set(existing.map((a) => a.toLowerCase()));
        const fresh = aliases2.filter((a) => !seen.has(a.toLowerCase()));
        if (!fresh.length)
          return null;
        lines[i] = `%% alias: ${[...existing, ...fresh].join(", ")} %%`;
        return lines.join("\n");
      }
      lines.splice(region.start + 1, 0, `%% alias: ${aliases2.join(", ")} %%`);
      return lines.join("\n");
    }
    module2.exports = {
      // Exported for the tests: pure text rewrites, checkable without an app.
      _addAliasesToHeading: addAliasesToHeading,
      _headingRegion: headingRegion,
      // Aliases already attached to `heading` in `file`, lower-cased, including the heading's
      // own text — everything a new alias would be redundant against.
      knownFormsFor(file, heading) {
        const forms = /* @__PURE__ */ new Set([heading.toLowerCase()]);
        const cached = this.aliasCache.get(file.path);
        const list = cached && cached.get(heading);
        for (const a of list || [])
          forms.add(String(a).toLowerCase());
        return forms;
      },
      // The one write path. `perHeading` is Map<heading, string[]>; returns how many aliases
      // actually landed, which is not the same as how many were offered — a concurrent edit can
      // remove the heading between the menu opening and the click.
      async writeHeadingAliases(file, perHeading) {
        let added = 0;
        await this.app.vault.process(file, (text) => {
          let out = text;
          for (const [heading, aliases2] of perHeading) {
            const next = addAliasesToHeading(out, heading, aliases2);
            if (next === null)
              continue;
            out = next;
            added += aliases2.length;
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
        const display = String(link.display || "").trim();
        if (!link.targetFile || !heading || !display)
          return;
        if (this.knownFormsFor(link.targetFile, heading).has(display.toLowerCase())) {
          new Notice2(t2("notice.aliasExists", { alias: display, term: heading }));
          return;
        }
        const added = await this.writeHeadingAliases(link.targetFile, /* @__PURE__ */ new Map([[heading, [display]]]));
        new Notice2(added ? t2("notice.aliasAdded", { alias: display, term: heading }) : t2("notice.headingGone", { term: heading }));
      },
      // Collect every heading link in `file` whose wording differs from the heading it points
      // at, grouped by target note so each one is written once.
      async collectAliasesFromNote(file) {
        const cache = this.app.metadataCache.getFileCache(file);
        const links = cache && cache.links || [];
        const byFile = /* @__PURE__ */ new Map();
        for (const link of links) {
          const r = this.resolveHeadingLink(link.link, file.path);
          if (!r)
            continue;
          const display = String(link.displayText || "").trim();
          if (!display)
            continue;
          if (display.includes(">") || this.knownFormsFor(r.file, r.heading).has(display.toLowerCase()))
            continue;
          let perHeading = byFile.get(r.file.path);
          if (!perHeading) {
            perHeading = { file: r.file, headings: /* @__PURE__ */ new Map() };
            byFile.set(r.file.path, perHeading);
          }
          const list = perHeading.headings.get(r.heading) || [];
          if (!list.some((a) => a.toLowerCase() === display.toLowerCase()))
            list.push(display);
          perHeading.headings.set(r.heading, list);
        }
        let total = 0;
        for (const entry of byFile.values())
          total += await this.writeHeadingAliases(entry.file, entry.headings);
        new Notice2(total ? t2("notice.aliasesAdded", { aliases: plural2("alias", total) }) : t2("notice.noNewAliases"));
      }
    };
  }
});

// src/shared/wikilink.js
var require_wikilink = __commonJS({
  "src/shared/wikilink.js"(exports2, module2) {
    "use strict";
    var { isProtected } = require_markdown();
    var wikiRegex = () => /\[\[([^\]]+)\]\]/g;
    function parseWiki(inner) {
      const s = String(inner == null ? "" : inner);
      const pipe = s.indexOf("|");
      const rawTarget = (pipe >= 0 ? s.slice(0, pipe) : s).replace(/\\$/, "").trim();
      const display = (pipe >= 0 ? s.slice(pipe + 1) : "").trim();
      const block = rawTarget.indexOf("^");
      const withoutBlock = block >= 0 ? rawTarget.slice(0, block) : rawTarget;
      const hash = withoutBlock.indexOf("#");
      return {
        file: (hash >= 0 ? withoutBlock.slice(0, hash) : withoutBlock).trim(),
        heading: hash >= 0 ? withoutBlock.slice(hash + 1).trim() : "",
        block: block >= 0 ? rawTarget.slice(block + 1).trim() : "",
        display,
        hasSubpath: hash >= 0 || block >= 0
      };
    }
    function formatWiki(parts, inTable) {
      const target = parts.file + (parts.heading ? "#" + parts.heading : "") + (parts.block ? "^" + parts.block : "");
      if (!parts.display)
        return "[[" + target + "]]";
      return "[[" + target + (inTable ? "\\|" : "|") + parts.display + "]]";
    }
    function findWikiLinks(text) {
      const s = String(text == null ? "" : text);
      const out = [];
      const re = wikiRegex();
      let m;
      while (m = re.exec(s)) {
        if (isProtected(s, m.index))
          continue;
        out.push({ start: m.index, end: m.index + m[0].length, source: m[0], parts: parseWiki(m[1]) });
      }
      return out;
    }
    function rewriteWikiLinks(text, fn, inTableAt) {
      const s = String(text == null ? "" : text);
      const links = findWikiLinks(s);
      let out = s;
      let count = 0;
      for (let i = links.length - 1; i >= 0; i--) {
        const next = fn(links[i].parts, links[i]);
        if (!next)
          continue;
        const replaced = formatWiki(next, inTableAt ? inTableAt(s, links[i].start) : false);
        if (replaced === links[i].source)
          continue;
        out = out.slice(0, links[i].start) + replaced + out.slice(links[i].end);
        count += 1;
      }
      return { text: out, count };
    }
    module2.exports = { wikiRegex, parseWiki, formatWiki, findWikiLinks, rewriteWikiLinks };
  }
});

// src/shared/report-note.js
var require_report_note = __commonJS({
  "src/shared/report-note.js"(exports2, module2) {
    "use strict";
    var { normalizePath } = require("obsidian");
    var MAX_TRIES = 50;
    async function writeReportNote(vault, base, body) {
      for (let n = 0; n < MAX_TRIES; n++) {
        const name = n ? `${base} ${n + 1}.md` : `${base}.md`;
        try {
          return await vault.create(normalizePath(name), body);
        } catch (e) {
        }
      }
      return null;
    }
    module2.exports = { writeReportNote };
  }
});

// src/shared/update-preview.js
var require_update_preview = __commonJS({
  "src/shared/update-preview.js"(exports2, module2) {
    "use strict";
    var { Notice: Notice2, Modal, MarkdownView } = require("obsidian");
    var { t: t2 } = require_i18n();
    var MAX_ROWS = 50;
    var UpdatePreviewModal = class extends Modal {
      constructor(app, entries, onApply, prefix) {
        super(app);
        this.entries = entries;
        this.onApply = onApply;
        this.prefix = prefix;
        for (const e of entries)
          for (const c of e.changes)
            c.selected = true;
      }
      cls(suffix) {
        return suffix ? this.prefix + "-" + suffix : this.prefix;
      }
      onOpen() {
        const { contentEl } = this;
        contentEl.addClass(this.cls());
        contentEl.createEl("h3", { text: t2("modal.update.title") });
        const changed = this.entries.filter((e) => e.changes.length);
        const total = changed.reduce((n, e) => n + e.changes.length, 0);
        const brokenTotal = this.entries.reduce((n, e) => n + e.broken.length, 0);
        if (!total && !brokenTotal) {
          contentEl.createEl("p", { cls: this.cls("empty"), text: t2("modal.update.upToDate") });
        } else {
          if (total)
            contentEl.createEl("p", { text: t2("modal.update.summary", { links: total, files: changed.length }) });
          if (brokenTotal)
            contentEl.createEl("p", { cls: this.cls("attention"), text: t2("modal.update.attention", { n: brokenTotal }) });
          this.entries.forEach((e) => this.renderEntry(contentEl, e));
        }
        const bar = contentEl.createDiv({ cls: this.cls("buttons") });
        if (total) {
          bar.createEl("button", { text: t2("btn.apply"), cls: "mod-cta" }).onclick = async () => {
            this.close();
            await this.onApply(this.entries);
          };
          bar.createEl("button", { text: t2("btn.cancel") }).onclick = () => this.close();
        } else {
          bar.createEl("button", { text: t2("btn.close"), cls: "mod-cta" }).onclick = () => this.close();
        }
      }
      renderEntry(contentEl, e) {
        if (!e.changes.length && !e.broken.length)
          return;
        const head = contentEl.createDiv({ cls: this.cls("file") });
        if (e.changes.length) {
          const rowBoxes = [];
          const label = head.createEl("label", { cls: this.cls("check") });
          const master = label.createEl("input", { type: "checkbox" });
          master.checked = true;
          master.onchange = () => {
            e.changes.forEach((c, i) => {
              c.selected = master.checked;
              if (rowBoxes[i])
                rowBoxes[i].checked = master.checked;
            });
            master.indeterminate = false;
          };
          label.createSpan({ text: e.label });
          const syncMaster = () => {
            const on = e.changes.filter((c) => c.selected).length;
            master.checked = on > 0;
            master.indeterminate = on > 0 && on < e.changes.length;
          };
          const table = contentEl.createEl("table", { cls: this.cls("table") });
          e.changes.slice(0, MAX_ROWS).forEach((c) => {
            const tr = table.createEl("tr");
            const cb = tr.createEl("td", { cls: this.cls("pick") }).createEl("input", { type: "checkbox" });
            cb.checked = c.selected;
            cb.onchange = () => {
              c.selected = cb.checked;
              syncMaster();
            };
            rowBoxes.push(cb);
            tr.createEl("td", { text: c.label });
            if (c.toPath) {
              tr.addClass(this.cls("moved"));
              tr.createEl("td", { cls: this.cls("move"), text: c.fromPath + ":" + c.from + " \u2192 " + c.toPath + ":" + c.to });
            } else {
              tr.createEl("td", { cls: this.cls("move"), text: c.from + " \u2192 " + c.to });
            }
          });
          if (e.changes.length > MAX_ROWS)
            contentEl.createEl("div", { cls: this.cls("more"), text: t2("modal.andMore", { n: e.changes.length - MAX_ROWS }) });
        } else {
          head.setText(e.label);
        }
        e.broken.forEach((label) => contentEl.createDiv({ cls: this.cls("broken"), text: t2("modal.update.brokenRow", { label }) }));
      }
      onClose() {
        this.contentEl.empty();
      }
    };
    async function applyUpdates(plugin, entries, rewrite) {
      let files = 0, total = 0, skipped = 0;
      for (const e of entries) {
        const keys = new Set(e.changes.filter((c) => c.selected).map((c) => c.key));
        if (!keys.size)
          continue;
        if (e.editor) {
          if (e.editor.getValue() !== e.original) {
            skipped++;
            continue;
          }
          const { newText, count } = rewrite(plugin, e.original, keys);
          const cur = e.editor.getCursor();
          e.editor.setValue(newText);
          e.editor.setCursor(cur);
          files++;
          total += count;
        } else {
          let count = 0;
          await plugin.app.vault.process(e.file, (data) => {
            if (data !== e.original)
              return data;
            const out = rewrite(plugin, data, keys);
            count = out.count;
            return out.newText;
          });
          if (count) {
            files++;
            total += count;
          } else
            skipped++;
        }
      }
      let msg = t2("notice.linksUpdatedVault", { n: total, files });
      if (skipped)
        msg += " " + t2("notice.updateSkipped", { n: skipped });
      new Notice2(msg);
    }
    function openUpdatePreview(plugin, entries, rewrite, prefix) {
      new UpdatePreviewModal(plugin.app, entries, (chosen) => applyUpdates(plugin, chosen, rewrite), prefix).open();
    }
    async function updateInActiveNote(plugin, rewrite, prefix) {
      const view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
      const editor = view && view.editor;
      const file = plugin.app.workspace.getActiveFile();
      if (editor) {
        const original2 = editor.getValue();
        const c2 = rewrite(plugin, original2, null);
        openUpdatePreview(plugin, [{ editor, label: file && file.path || t2("label.thisNote"), original: original2, changes: c2.changes, broken: c2.broken }], rewrite, prefix);
        return;
      }
      if (!file) {
        new Notice2(t2("notice.linksUpdated", { n: 0 }));
        return;
      }
      const original = await plugin.app.vault.read(file);
      const c = rewrite(plugin, original, null);
      openUpdatePreview(plugin, [{ file, label: file.path, original, changes: c.changes, broken: c.broken }], rewrite, prefix);
    }
    async function scanVault(plugin, rewrite) {
      const entries = [];
      for (const f of plugin.app.vault.getMarkdownFiles()) {
        const original = await plugin.app.vault.read(f);
        const c = rewrite(plugin, original, null);
        if (c.changes.length || c.broken.length)
          entries.push({ file: f, label: f.path, original, changes: c.changes, broken: c.broken });
      }
      return entries;
    }
    async function updateInVault(plugin, rewrite, prefix) {
      openUpdatePreview(plugin, await scanVault(plugin, rewrite), rewrite, prefix);
    }
    module2.exports = { UpdatePreviewModal, applyUpdates, openUpdatePreview, updateInActiveNote, updateInVault, scanVault };
  }
});

// src/rename.js
var require_rename = __commonJS({
  "src/rename.js"(exports2, module2) {
    "use strict";
    var { Notice: Notice2 } = require("obsidian");
    var { inTableCell: inTableCell2 } = require_markdown();
    var { rewriteWikiLinks, findWikiLinks } = require_wikilink();
    var { writeReportNote } = require_report_note();
    var preview = require_update_preview();
    var { t: t2 } = require_i18n();
    var PREVIEW_CLASS = "heading-linker-preview";
    function detectRename(before, after) {
      if (!Array.isArray(before) || !Array.isArray(after))
        return null;
      if (before.length !== after.length)
        return null;
      let at = -1;
      for (let i = 0; i < before.length; i++) {
        if (before[i].text === after[i].text && before[i].level === after[i].level)
          continue;
        if (at >= 0)
          return null;
        at = i;
      }
      if (at < 0)
        return null;
      if (before[at].level !== after[at].level)
        return null;
      if (!before[at].text || !after[at].text)
        return null;
      return { from: before[at].text, to: after[at].text };
    }
    function headingsOfFingerprint(fingerprint) {
      try {
        const parsed = JSON.parse(fingerprint);
        return Array.isArray(parsed && parsed.h) ? parsed.h : null;
      } catch (e) {
        return null;
      }
    }
    var rewriteFor = (base, from, to, alsoDisplay) => (plugin, text, selected) => {
      const collect = selected == null;
      const changes = [];
      const out = rewriteWikiLinks(text, (parts, link) => {
        if (parts.file !== base || parts.heading !== from)
          return null;
        const k = link.start;
        if (collect)
          changes.push({ key: k, label: parts.display || parts.heading, from, to });
        if (!collect && !selected.has(k))
          return null;
        const next = Object.assign({}, parts, { heading: to });
        if (alsoDisplay && parts.display === from)
          next.display = to;
        return next;
      }, inTableCell2);
      changes.sort((a, b) => a.key - b.key);
      return { newText: out.text, count: out.count, changes, broken: [] };
    };
    var methods = {
      // Compare the headings a file had against the ones it has, and remember a rename until the
      // rebuild timer fires. Asking on every keystroke would put a dialog in the middle of typing
      // a heading, so nothing is offered until the edit has settled.
      noteHeadingRename(file, previousFingerprint) {
        if (this.settings.followHeadingRenames === "off")
          return;
        const before = headingsOfFingerprint(previousFingerprint);
        const after = this.headingsOf(file);
        const hit = before && detectRename(before, after);
        if (!hit)
          return;
        if (!this.pendingRenames)
          this.pendingRenames = [];
        const chained = this.pendingRenames.find((r) => r.base === file.basename && r.to === hit.from);
        if (!chained) {
          this.pendingRenames.push({ base: file.basename, from: hit.from, to: hit.to });
          return;
        }
        chained.to = hit.to;
        if (chained.from === chained.to)
          this.pendingRenames.splice(this.pendingRenames.indexOf(chained), 1);
      },
      // Fired from the rebuild timer. Several renames inside one window are offered one after
      // another rather than merged: each is its own preview over its own links.
      flushHeadingRenames() {
        const queued = this.pendingRenames || [];
        this.pendingRenames = [];
        if (this.settings.followHeadingRenames === "off")
          return;
        for (const r of queued)
          this.offerHeadingRename(r);
      },
      // In 'ask' the preview is never opened without a click — not even when the notice cannot be
      // given one. A modal over the whole vault appearing on its own is what this setting rules out.
      offerHeadingRename({ base, from, to }) {
        if (this.settings.followHeadingRenames !== "ask") {
          this.previewHeadingRename(base, from, to);
          return;
        }
        const notice = new Notice2(t2("notice.headingRenamed", { from, to }), 15e3);
        if (!notice.noticeEl || !notice.noticeEl.createEl)
          return;
        const act = notice.noticeEl.createEl("a", { text: t2("notice.headingRenamed.action"), cls: "heading-linker-notice-action" });
        act.onclick = () => {
          notice.hide();
          this.previewHeadingRename(base, from, to);
        };
      },
      previewHeadingRename(base, from, to) {
        return preview.updateInVault(this, rewriteFor(base, from, to, true), PREVIEW_CLASS);
      },
      // A heading renamed while the plugin was off leaves links naming a heading that is gone. Which
      // heading replaced it cannot be told after the fact — that is why the rename is followed as it
      // happens — so this reports rather than guesses, and the reader decides.
      async findBrokenHeadingLinks() {
        const known = new Set(this.terms.map((term) => term.linktext));
        const sources = new Set(this.terms.map((term) => term.fileBase));
        const rows = [];
        for (const f of this.app.vault.getMarkdownFiles()) {
          const text = await this.app.vault.cachedRead(f);
          for (const link of findWikiLinks(text)) {
            const { file: base, heading } = link.parts;
            if (!base || !heading || !sources.has(base))
              continue;
            if (known.has(`${base}#${heading}`))
              continue;
            rows.push({ note: f.path, base, heading });
          }
        }
        return rows;
      },
      async reportBrokenHeadingLinks() {
        let rows;
        try {
          rows = await this.findBrokenHeadingLinks();
        } catch (e) {
          new Notice2(t2("notice.reportFailed"));
          return;
        }
        if (!rows.length) {
          new Notice2(t2("notice.headingLinksWell"));
          return;
        }
        const lines = [
          "# " + t2("report.broken.title"),
          "",
          t2("report.broken.summary", { n: rows.length }),
          "",
          "| " + [t2("report.broken.note"), t2("report.broken.target")].join(" | ") + " |",
          "|---|---|"
        ];
        const esc = (s) => String(s).replace(/\|/g, "\\|");
        for (const r of rows)
          lines.push(`| [[${esc(r.note.replace(/\.md$/i, ""))}]] | \`${esc(r.base)}#${esc(r.heading)}\` |`);
        const file = await writeReportNote(this.app.vault, t2("report.broken.file"), lines.join("\n") + "\n");
        if (!file) {
          new Notice2(t2("notice.reportFailed"));
          return;
        }
        new Notice2(t2("notice.headingLinksBroken", { n: rows.length, file: file.path }));
        const leaf = this.app.workspace.getLeaf && this.app.workspace.getLeaf(true);
        if (leaf && leaf.openFile)
          await leaf.openFile(file);
        return file;
      }
    };
    module2.exports = { methods, detectRename, headingsOfFingerprint, rewriteFor };
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
      "cmd.collectThisNote": "Collect aliases from links: this note",
      "cmd.rebuildIndex": "Rebuild heading index",
      "cmd.reportBrokenLinks": "Find heading links that no longer land",
      "set.followRenames.name": "Follow heading renames",
      "set.followRenames.desc": "Obsidian repairs links when a file is renamed, but not when a heading is. Rename one in a source file and the links pointing at it can be retargeted.",
      "set.followRenames.off": "Do nothing",
      "set.followRenames.ask": "Offer it",
      "set.followRenames.preview": "Open the preview",
      "notice.headingRenamed": "Heading renamed: \u201C{from}\u201D \u2192 \u201C{to}\u201D",
      "notice.headingRenamed.action": "Update the links",
      "notice.headingLinksWell": "Every heading link still lands.",
      "notice.headingLinksBroken": "{n} heading link(s) no longer land \u2014 written to {file}",
      "notice.reportFailed": "Could not write the report.",
      "modal.update.title": "Update heading links",
      "modal.update.attention": "{n} link(s) need attention.",
      "modal.update.brokenRow": "{label} \u2014 no fix",
      "notice.linksUpdatedVault": "Heading Linker: {n} link(s) updated across {files} note(s)",
      "report.broken.file": "Broken heading links",
      "report.broken.title": "Heading links that no longer land",
      "report.broken.summary": "{n} link(s) name a heading their source file no longer has.",
      "report.broken.note": "Note",
      "report.broken.target": "Points at",
      "cmd.addSource": "Add this note to heading sources",
      "cmd.removeSource": "Remove this note from heading sources",
      "cmd.ignoreSource": "Ignore this note as a heading source",
      "cmd.unignoreSource": "Stop ignoring this note as a heading source",
      "cmd.excludeNote": "Never link in this note",
      "cmd.unexcludeNote": "Stop always-excluding this note",
      "cmd.scopeNote": "Include this note in scope",
      "cmd.unscopeNote": "Remove this note from scope",
      "statusBar.aria": "{n} heading(s) on this page \u2014 click to link them",
      // Native context-menu items (brand prefix "Heading:" kept verbatim)
      // No plugin name on these: they act on the link under the cursor, and a link belongs to
      // exactly one linker, so there is never a second one of them to tell apart. The name goes
      // on configuration items instead, where the reader is picking which plugin to change.
      "menu.unlinkThisLink": "Unlink this link",
      "menu.collectThisAlias": "Collect this alias",
      // Says whose aliases: the glossary linker offers its own version on the same note menu,
      // and the two write to different places.
      "menu.collectFromNote": "Collect heading aliases from links",
      "menu.addToSources": "Heading: add {noun} to sources",
      "menu.removeFromSources": "Heading: remove {noun} from sources",
      "menu.ignoreSource": "Heading: ignore {noun} as a source",
      "menu.unignoreSource": "Heading: stop ignoring as a source",
      "menu.removeFromAlwaysExcluded": "Heading: remove from always-excluded",
      "menu.addToAlwaysExcluded": "Heading: add {noun} to always-excluded",
      "menu.removeFromScope": "Heading: remove {noun} from scope",
      "menu.includeInScope": "Heading: include {noun} in scope",
      // Linking a word from Obsidian's own editor menu. The three ways to link differ only in
      // how far they reach, so they share one entry with the choice inside it. Each reads on its
      // own — a submenu item is read without its parent in view, so "Here" alone would not say
      // what it does.
      "menu.linkScopeThisNote": 'Link {scope} "{display}" in this note',
      "menu.linkScopeAllNotes": 'Link {scope} "{display}" in all notes',
      "menu.openTitle": "Open which heading?",
      "menu.openNewTabTitle": "Open which heading in a new tab?",
      // Exclusion menu
      "exclude.terms": "excluded headings",
      "exclude.words": "excluded words",
      "exclude.add": 'Add "{value}" to {noun}',
      "exclude.remove": 'Remove "{value}" from {noun}',
      "exclude.addForm": 'Add "{value}" to {noun}',
      "exclude.removeForm": 'Remove "{value}" from {noun}',
      "exclude.addStem": 'Add every form of "{value}" to {noun}',
      "exclude.removeStem": 'Remove every form of "{value}" from {noun}',
      "exclude.shortTerm": "The heading",
      // Modals
      "modal.materialize.title": "Turn words into heading links",
      "modal.materialize.ambiguous": "{n} word(s) match more than one heading \u2014 pick one or skip:",
      "modal.unlink.title": "Unlink heading links",
      // Notices
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
      "notice.indexRebuilt": "Heading index rebuilt.",
      "notice.duplicateHeadings": "{n} heading(s) repeat inside a file \u2014 only the first of each can be linked. See the console for which.",
      "notice.aliasAdded": "Heading Linker: \u201C{alias}\u201D added as an alias of \u201C{term}\u201D",
      "notice.aliasExists": "Heading Linker: \u201C{term}\u201D already matches \u201C{alias}\u201D",
      "notice.aliasesAdded": "Heading Linker: {aliases} added",
      "notice.noNewAliases": "Heading Linker: no new aliases found",
      // The index can be a moment behind the file: the heading was there when the menu opened
      // and gone by the time the write ran.
      "notice.headingGone": "Heading Linker: \u201C{term}\u201D is no longer in that note",
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
      // The line under a name in the autocomplete popup. Kept to a fragment, not a sentence:
      // it sits under the heading it describes, and the glossary linker's candidates share the
      // same popup, so the two have to read as one list.
      "suggest.inflection": "word form \xB7 {file}",
      "suggest.alias": "as \u201C{form}\u201D \xB7 {file}",
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
      "set.scopeMode.desc": "Which notes get their words highlighted and linked.",
      "set.scopeFolders.name": "Paths to include",
      "set.scopeFolders.desc": "A file or a folder. Only these are linked.",
      "set.excludeFolders.name": "Always excluded",
      "set.excludeFolders.desc": "A file or a folder. Never linked, whatever the mode above says.",
      "set.folderList.remove": "Remove",
      "set.termsIndexed": "{terms} indexed.",
      // Settings — matching
      "set.matchMode.desc": "How word forms are reduced before comparing.",
      "set.minTermLength.name": "Minimum heading length",
      "set.minTermLength.desc": "Headings shorter than this are not indexed.",
      "set.headingLevels.name": "Heading levels",
      "set.headingLevels.desc": "Which heading levels (H1\u2013H6) become linkable terms.",
      "set.languages.invalidSuffix": ", {n} invalid",
      "set.linkFirstOnly.desc": "Link only the first mention of each heading per note.",
      "set.excludeTerms.name": "Excluded headings",
      "set.excludeTerms.desc": "Heading texts to drop from the index entirely, one per line. Their word forms stop linking too.",
      "set.excludeWords.name": "Excluded words",
      "set.excludeWords.desc": "Written words, one per line, that never become a link even when they match a heading. A line stops that spelling alone; end it with * to stop every form of the word. The heading itself keeps linking either way.",
      // Settings — highlighting
      "set.highlightInReading.desc": "Underline matched words in rendered notes.",
      "set.editingHighlight.desc": "Underline matched words while editing.",
      "set.editingHighlight.off": "Off",
      "set.skipHeadings.desc": "Don't link words inside a note's own headings.",
      "set.statusBar.desc": "Show how many headings the current note mentions.",
      "set.statusBarIncludeLinks.desc": "Include headings already linked in the status-bar count.",
      // Settings — autocomplete
      "set.linkSuggest.desc": "Offer to complete a word into a heading link as you type.",
      "set.suggestSkipAfter.desc": "Don't suggest when the word follows one of these characters, so other autocompletes keep their slot. Empty disables it.",
      // Settings — context menu
      "set.menuTurnInto.name": "Link actions",
      "set.menuTurnInto.desc": 'Offer "link to this heading" items on a highlighted word.',
      "set.menuOpen.name": "Open actions",
      "set.menuOpen.desc": 'Offer "open heading" items on a highlighted word.',
      "set.menuExclude.name": "Exclude actions",
      "set.menuExclude.desc": 'Offer "exclude word/heading" items.',
      "set.menuUnlink.name": "Unlink action",
      "set.menuUnlink.desc": 'Offer "unlink this link" on a heading link.',
      "set.menuCollect.name": '"Collect aliases" items',
      "set.menuCollect.desc": "Offer to collect a link\u2019s own wording as an alias of the heading it points at \u2014 on the link itself, and for a whole note from its right-click menu.",
      // Settings — maintenance
      "set.rebuild.name": "Rebuild index",
      "set.rebuild.desc": "Re-scan the glossary files for headings.",
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
      "cmd.collectThisNote": "\u0421\u043E\u0431\u0440\u0430\u0442\u044C \u043F\u0441\u0435\u0432\u0434\u043E\u043D\u0438\u043C\u044B \u0438\u0437 \u0441\u0441\u044B\u043B\u043E\u043A: \u044D\u0442\u0430 \u0437\u0430\u043C\u0435\u0442\u043A\u0430",
      "cmd.rebuildIndex": "\u041F\u0435\u0440\u0435\u0441\u0442\u0440\u043E\u0438\u0442\u044C \u0438\u043D\u0434\u0435\u043A\u0441 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u043E\u0432",
      "cmd.reportBrokenLinks": "\u041D\u0430\u0439\u0442\u0438 \u0441\u0441\u044B\u043B\u043A\u0438 \u043D\u0430 \u0438\u0441\u0447\u0435\u0437\u043D\u0443\u0432\u0448\u0438\u0435 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0438",
      "set.followRenames.name": "\u0421\u043B\u0435\u0434\u0438\u0442\u044C \u0437\u0430 \u043F\u0435\u0440\u0435\u0438\u043C\u0435\u043D\u043E\u0432\u0430\u043D\u0438\u0435\u043C \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u043E\u0432",
      "set.followRenames.desc": "Obsidian \u0447\u0438\u043D\u0438\u0442 \u0441\u0441\u044B\u043B\u043A\u0438 \u043F\u0440\u0438 \u043F\u0435\u0440\u0435\u0438\u043C\u0435\u043D\u043E\u0432\u0430\u043D\u0438\u0438 \u0444\u0430\u0439\u043B\u0430, \u043D\u043E \u043D\u0435 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0430. \u041F\u0435\u0440\u0435\u0438\u043C\u0435\u043D\u0443\u0439\u0442\u0435 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A \u0432 \u0444\u0430\u0439\u043B\u0435-\u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0435 \u2014 \u0438 \u0441\u0441\u044B\u043B\u043A\u0438 \u043D\u0430 \u043D\u0435\u0433\u043E \u043C\u043E\u0436\u043D\u043E \u043F\u0435\u0440\u0435\u043D\u0430\u0446\u0435\u043B\u0438\u0442\u044C.",
      "set.followRenames.off": "\u041D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u0434\u0435\u043B\u0430\u0442\u044C",
      "set.followRenames.ask": "\u041F\u0440\u0435\u0434\u043B\u0430\u0433\u0430\u0442\u044C",
      "set.followRenames.preview": "\u0421\u0440\u0430\u0437\u0443 \u043E\u0442\u043A\u0440\u044B\u0432\u0430\u0442\u044C \u043F\u0440\u0435\u0434\u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440",
      "notice.headingRenamed": "\u0417\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A \u043F\u0435\u0440\u0435\u0438\u043C\u0435\u043D\u043E\u0432\u0430\u043D: \xAB{from}\xBB \u2192 \xAB{to}\xBB",
      "notice.headingRenamed.action": "\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u0441\u0441\u044B\u043B\u043A\u0438",
      "notice.headingLinksWell": "\u0412\u0441\u0435 \u0441\u0441\u044B\u043B\u043A\u0438 \u043D\u0430 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0438 \u0432\u0435\u0434\u0443\u0442 \u0442\u0443\u0434\u0430, \u043A\u0443\u0434\u0430 \u0443\u043A\u0430\u0437\u044B\u0432\u0430\u044E\u0442.",
      "notice.headingLinksBroken": "\u0421\u0441\u044B\u043B\u043E\u043A \u0432 \u043D\u0438\u043A\u0443\u0434\u0430: {n} \u2014 \u0437\u0430\u043F\u0438\u0441\u0430\u043D\u043E \u0432 {file}",
      "notice.reportFailed": "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u043F\u0438\u0441\u0430\u0442\u044C \u043E\u0442\u0447\u0451\u0442.",
      "modal.update.title": "\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u0441\u0441\u044B\u043B\u043A\u0438 \u043D\u0430 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0438",
      "modal.update.attention": "\u0421\u0441\u044B\u043B\u043E\u043A, \u0442\u0440\u0435\u0431\u0443\u044E\u0449\u0438\u0445 \u0432\u043D\u0438\u043C\u0430\u043D\u0438\u044F: {n}.",
      "modal.update.brokenRow": "{label} \u2014 \u043D\u0435 \u0438\u0441\u043F\u0440\u0430\u0432\u0438\u0442\u044C",
      "notice.linksUpdatedVault": "Heading Linker: \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u043E \u0441\u0441\u044B\u043B\u043E\u043A \u2014 {n} \u0432 \u0437\u0430\u043C\u0435\u0442\u043A\u0430\u0445: {files}",
      "report.broken.file": "\u0421\u0441\u044B\u043B\u043A\u0438 \u043D\u0430 \u0438\u0441\u0447\u0435\u0437\u043D\u0443\u0432\u0448\u0438\u0435 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0438",
      "report.broken.title": "\u0421\u0441\u044B\u043B\u043A\u0438 \u043D\u0430 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0438, \u043A\u043E\u0442\u043E\u0440\u044B\u0445 \u0431\u043E\u043B\u044C\u0448\u0435 \u043D\u0435\u0442",
      "report.broken.summary": "\u0421\u0441\u044B\u043B\u043E\u043A, \u043D\u0430\u0437\u044B\u0432\u0430\u044E\u0449\u0438\u0445 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A, \u043A\u043E\u0442\u043E\u0440\u043E\u0433\u043E \u0432 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0435 \u0443\u0436\u0435 \u043D\u0435\u0442: {n}.",
      "report.broken.note": "\u0417\u0430\u043C\u0435\u0442\u043A\u0430",
      "report.broken.target": "\u0423\u043A\u0430\u0437\u044B\u0432\u0430\u0435\u0442 \u043D\u0430",
      "cmd.addSource": "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u044D\u0442\u0443 \u0437\u0430\u043C\u0435\u0442\u043A\u0443 \u0432 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0438 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u043E\u0432",
      "cmd.removeSource": "\u0423\u0431\u0440\u0430\u0442\u044C \u044D\u0442\u0443 \u0437\u0430\u043C\u0435\u0442\u043A\u0443 \u0438\u0437 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u043E\u0432 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u043E\u0432",
      "cmd.ignoreSource": "\u0418\u0433\u043D\u043E\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u044D\u0442\u0443 \u0437\u0430\u043C\u0435\u0442\u043A\u0443 \u043A\u0430\u043A \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A",
      "cmd.unignoreSource": "\u041F\u0435\u0440\u0435\u0441\u0442\u0430\u0442\u044C \u0438\u0433\u043D\u043E\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u044D\u0442\u0443 \u0437\u0430\u043C\u0435\u0442\u043A\u0443 \u043A\u0430\u043A \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A",
      "cmd.excludeNote": "\u041D\u0438\u043A\u043E\u0433\u0434\u0430 \u043D\u0435 \u0441\u0432\u044F\u0437\u044B\u0432\u0430\u0442\u044C \u0432 \u044D\u0442\u043E\u0439 \u0437\u0430\u043C\u0435\u0442\u043A\u0435",
      "cmd.unexcludeNote": "\u041F\u0435\u0440\u0435\u0441\u0442\u0430\u0442\u044C \u0432\u0441\u0435\u0433\u0434\u0430 \u0438\u0441\u043A\u043B\u044E\u0447\u0430\u0442\u044C \u044D\u0442\u0443 \u0437\u0430\u043C\u0435\u0442\u043A\u0443",
      "cmd.scopeNote": "\u0412\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u044D\u0442\u0443 \u0437\u0430\u043C\u0435\u0442\u043A\u0443 \u0432 \u043E\u0431\u043B\u0430\u0441\u0442\u044C",
      "cmd.unscopeNote": "\u0423\u0431\u0440\u0430\u0442\u044C \u044D\u0442\u0443 \u0437\u0430\u043C\u0435\u0442\u043A\u0443 \u0438\u0437 \u043E\u0431\u043B\u0430\u0441\u0442\u0438",
      "statusBar.aria": "\u0417\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u043E\u0432 \u043D\u0430 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0435: {n} \u2014 \u043D\u0430\u0436\u043C\u0438\u0442\u0435, \u0447\u0442\u043E\u0431\u044B \u0441\u0432\u044F\u0437\u0430\u0442\u044C",
      "menu.unlinkThisLink": "\u0423\u0431\u0440\u0430\u0442\u044C \u044D\u0442\u0443 \u0441\u0441\u044B\u043B\u043A\u0443",
      "menu.collectThisAlias": "\u0421\u043E\u0431\u0440\u0430\u0442\u044C \u044D\u0442\u043E\u0442 \u043F\u0441\u0435\u0432\u0434\u043E\u043D\u0438\u043C",
      "menu.collectFromNote": "\u0421\u043E\u0431\u0440\u0430\u0442\u044C \u043F\u0441\u0435\u0432\u0434\u043E\u043D\u0438\u043C\u044B \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u043E\u0432 \u0438\u0437 \u0441\u0441\u044B\u043B\u043E\u043A",
      "menu.addToSources": "Heading: \u0434\u043E\u0431\u0430\u0432\u0438\u0442\u044C {noun} \u0432 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0438",
      "menu.removeFromSources": "Heading: \u0443\u0431\u0440\u0430\u0442\u044C {noun} \u0438\u0437 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u043E\u0432",
      "menu.ignoreSource": "Heading: \u0438\u0433\u043D\u043E\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C {noun} \u043A\u0430\u043A \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A",
      "menu.unignoreSource": "Heading: \u043F\u0435\u0440\u0435\u0441\u0442\u0430\u0442\u044C \u0438\u0433\u043D\u043E\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043A\u0430\u043A \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A",
      "menu.removeFromAlwaysExcluded": "Heading: \u0443\u0431\u0440\u0430\u0442\u044C \u0438\u0437 \u0432\u0441\u0435\u0433\u0434\u0430-\u0438\u0441\u043A\u043B\u044E\u0447\u0451\u043D\u043D\u044B\u0445",
      "menu.addToAlwaysExcluded": "Heading: \u0434\u043E\u0431\u0430\u0432\u0438\u0442\u044C {noun} \u0432\u043E \u0432\u0441\u0435\u0433\u0434\u0430-\u0438\u0441\u043A\u043B\u044E\u0447\u0451\u043D\u043D\u044B\u0435",
      "menu.removeFromScope": "Heading: \u0443\u0431\u0440\u0430\u0442\u044C {noun} \u0438\u0437 \u043E\u0431\u043B\u0430\u0441\u0442\u0438",
      "menu.includeInScope": "Heading: \u0432\u043A\u043B\u044E\u0447\u0438\u0442\u044C {noun} \u0432 \u043E\u0431\u043B\u0430\u0441\u0442\u044C",
      "menu.linkScopeThisNote": "\u0421\u0432\u044F\u0437\u0430\u0442\u044C {scope} \xAB{display}\xBB \u0432 \u044D\u0442\u043E\u0439 \u0437\u0430\u043C\u0435\u0442\u043A\u0435",
      "menu.linkScopeAllNotes": "\u0421\u0432\u044F\u0437\u0430\u0442\u044C {scope} \xAB{display}\xBB \u0432\u043E \u0432\u0441\u0435\u0445 \u0437\u0430\u043C\u0435\u0442\u043A\u0430\u0445",
      "menu.openTitle": "\u041A\u0430\u043A\u043E\u0439 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A \u043E\u0442\u043A\u0440\u044B\u0442\u044C?",
      "menu.openNewTabTitle": "\u041A\u0430\u043A\u043E\u0439 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A \u043E\u0442\u043A\u0440\u044B\u0442\u044C \u0432 \u043D\u043E\u0432\u043E\u0439 \u0432\u043A\u043B\u0430\u0434\u043A\u0435?",
      "exclude.terms": "\u0438\u0441\u043A\u043B\u044E\u0447\u0451\u043D\u043D\u044B\u0435 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0438",
      "exclude.words": "\u0438\u0441\u043A\u043B\u044E\u0447\u0451\u043D\u043D\u044B\u0435 \u0441\u043B\u043E\u0432\u0430",
      "exclude.add": "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \xAB{value}\xBB \u0432 {noun}",
      "exclude.remove": "\u0423\u0431\u0440\u0430\u0442\u044C \xAB{value}\xBB \u0438\u0437 {noun}",
      "exclude.addForm": "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \xAB{value}\xBB \u0432 {noun}",
      "exclude.removeForm": "\u0423\u0431\u0440\u0430\u0442\u044C \xAB{value}\xBB \u0438\u0437 {noun}",
      "exclude.addStem": "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0432\u0441\u0435 \u0444\u043E\u0440\u043C\u044B \xAB{value}\xBB \u0432 {noun}",
      "exclude.removeStem": "\u0423\u0431\u0440\u0430\u0442\u044C \u0432\u0441\u0435 \u0444\u043E\u0440\u043C\u044B \xAB{value}\xBB \u0438\u0437 {noun}",
      "exclude.shortTerm": "\u042D\u0442\u043E\u0442 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A",
      "modal.materialize.title": "\u041F\u0440\u0435\u0432\u0440\u0430\u0442\u0438\u0442\u044C \u0441\u043B\u043E\u0432\u0430 \u0432 \u0441\u0441\u044B\u043B\u043A\u0438 \u043D\u0430 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0438",
      "modal.materialize.ambiguous": "{n} \u0441\u043B\u043E\u0432(\u043E) \u0441\u043E\u0432\u043F\u0430\u0434\u0430\u0435\u0442 \u0441 \u043D\u0435\u0441\u043A\u043E\u043B\u044C\u043A\u0438\u043C\u0438 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0430\u043C\u0438 \u2014 \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0438\u043B\u0438 \u043F\u0440\u043E\u043F\u0443\u0441\u0442\u0438\u0442\u0435:",
      "modal.unlink.title": "\u0423\u0431\u0440\u0430\u0442\u044C \u0441\u0441\u044B\u043B\u043A\u0438 \u043D\u0430 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0438",
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
      "notice.indexRebuilt": "\u0418\u043D\u0434\u0435\u043A\u0441 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u043E\u0432 \u043F\u0435\u0440\u0435\u0441\u0442\u0440\u043E\u0435\u043D.",
      "notice.duplicateHeadings": "\u0417\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u043E\u0432, \u043F\u043E\u0432\u0442\u043E\u0440\u044F\u044E\u0449\u0438\u0445\u0441\u044F \u0432\u043D\u0443\u0442\u0440\u0438 \u0444\u0430\u0439\u043B\u0430: {n} \u2014 \u0441\u043B\u0438\u043D\u043A\u043E\u0432\u0430\u0442\u044C \u043C\u043E\u0436\u043D\u043E \u0442\u043E\u043B\u044C\u043A\u043E \u043F\u0435\u0440\u0432\u044B\u0439 \u0438\u0437 \u043A\u0430\u0436\u0434\u043E\u0433\u043E. \u041F\u043E\u0434\u0440\u043E\u0431\u043D\u043E\u0441\u0442\u0438 \u0432 \u043A\u043E\u043D\u0441\u043E\u043B\u0438.",
      "notice.aliasAdded": "Heading Linker: \xAB{alias}\xBB \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D \u043A\u0430\u043A \u043F\u0441\u0435\u0432\u0434\u043E\u043D\u0438\u043C \xAB{term}\xBB",
      "notice.aliasExists": "Heading Linker: \xAB{term}\xBB \u0443\u0436\u0435 \u0441\u043E\u0432\u043F\u0430\u0434\u0430\u0435\u0442 \u0441 \xAB{alias}\xBB",
      "notice.aliasesAdded": "Heading Linker: \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u043E {aliases}",
      "notice.noNewAliases": "Heading Linker: \u043D\u043E\u0432\u044B\u0445 \u043F\u0441\u0435\u0432\u0434\u043E\u043D\u0438\u043C\u043E\u0432 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E",
      "notice.headingGone": "Heading Linker: \xAB{term}\xBB \u0431\u043E\u043B\u044C\u0448\u0435 \u043D\u0435\u0442 \u0432 \u044D\u0442\u043E\u0439 \u0437\u0430\u043C\u0435\u0442\u043A\u0435",
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
      "suggest.inflection": "\u0441\u043B\u043E\u0432\u043E\u0444\u043E\u0440\u043C\u0430 \xB7 {file}",
      "suggest.alias": "\u043A\u0430\u043A \xAB{form}\xBB \xB7 {file}",
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
      "set.headingAliases.name": "\u041F\u0441\u0435\u0432\u0434\u043E\u043D\u0438\u043C\u044B \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u043E\u0432",
      "set.headingAliases.desc": "\u0427\u0438\u0442\u0430\u0442\u044C \u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0438 `%% alias: a, b %%` \u043F\u043E\u0434 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u043E\u043C \u043A\u0430\u043A \u0434\u043E\u043F. \u0444\u043E\u0440\u043C\u0443\u043B\u0438\u0440\u043E\u0432\u043A\u0438, \u0432\u0435\u0434\u0443\u0449\u0438\u0435 \u043D\u0430 \u043D\u0435\u0433\u043E. \u0412\u044B\u043A\u043B\u044E\u0447\u0438\u0442\u0435, \u0447\u0442\u043E\u0431\u044B \u043D\u0435 \u0447\u0438\u0442\u0430\u0442\u044C \u0442\u0435\u043B\u0430 \u0444\u0430\u0439\u043B\u043E\u0432 (\u0431\u044B\u0441\u0442\u0440\u0435\u0435 \u0432 \u043E\u0447\u0435\u043D\u044C \u0431\u043E\u043B\u044C\u0448\u0438\u0445 \u0445\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0430\u0445).",
      "set.scopeMode.desc": "\u0412 \u043A\u0430\u043A\u0438\u0445 \u0437\u0430\u043C\u0435\u0442\u043A\u0430\u0445 \u0441\u043B\u043E\u0432\u0430 \u043F\u043E\u0434\u0441\u0432\u0435\u0447\u0438\u0432\u0430\u044E\u0442\u0441\u044F \u0438 \u043F\u0440\u0435\u0432\u0440\u0430\u0449\u0430\u044E\u0442\u0441\u044F \u0432 \u0441\u0441\u044B\u043B\u043A\u0438.",
      "set.scopeFolders.name": "\u0412\u043A\u043B\u044E\u0447\u0430\u0435\u043C\u044B\u0435 \u043F\u0443\u0442\u0438",
      "set.scopeFolders.desc": "\u0424\u0430\u0439\u043B \u0438\u043B\u0438 \u043F\u0430\u043F\u043A\u0430. \u0421\u0432\u044F\u0437\u044B\u0432\u0430\u044E\u0442\u0441\u044F \u0442\u043E\u043B\u044C\u043A\u043E \u043E\u043D\u0438.",
      "set.excludeFolders.name": "\u0412\u0441\u0435\u0433\u0434\u0430 \u0438\u0441\u043A\u043B\u044E\u0447\u0430\u0442\u044C",
      "set.excludeFolders.desc": "\u0424\u0430\u0439\u043B \u0438\u043B\u0438 \u043F\u0430\u043F\u043A\u0430. \u041D\u0435 \u0441\u0432\u044F\u0437\u044B\u0432\u0430\u044E\u0442\u0441\u044F \u043D\u0438\u043A\u043E\u0433\u0434\u0430, \u043D\u0435\u0437\u0430\u0432\u0438\u0441\u0438\u043C\u043E \u043E\u0442 \u0440\u0435\u0436\u0438\u043C\u0430 \u0432\u044B\u0448\u0435.",
      "set.folderList.remove": "\u0423\u0434\u0430\u043B\u0438\u0442\u044C",
      "set.termsIndexed": "\u0412 \u0438\u043D\u0434\u0435\u043A\u0441\u0435: {terms}.",
      "set.matchMode.desc": "\u041A\u0430\u043A \u043F\u0440\u0438\u0432\u043E\u0434\u044F\u0442\u0441\u044F \u0441\u043B\u043E\u0432\u043E\u0444\u043E\u0440\u043C\u044B \u043F\u0435\u0440\u0435\u0434 \u0441\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u0435\u043C.",
      "set.minTermLength.name": "\u041C\u0438\u043D\u0438\u043C\u0430\u043B\u044C\u043D\u0430\u044F \u0434\u043B\u0438\u043D\u0430 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0430",
      "set.minTermLength.desc": "\u0417\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0438 \u043A\u043E\u0440\u043E\u0447\u0435 \u044D\u0442\u043E\u0433\u043E \u043D\u0435 \u0438\u043D\u0434\u0435\u043A\u0441\u0438\u0440\u0443\u044E\u0442\u0441\u044F.",
      "set.headingLevels.name": "\u0423\u0440\u043E\u0432\u043D\u0438 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u043E\u0432",
      "set.headingLevels.desc": "\u041A\u0430\u043A\u0438\u0435 \u0443\u0440\u043E\u0432\u043D\u0438 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u043E\u0432 (H1\u2013H6) \u0441\u0442\u0430\u043D\u043E\u0432\u044F\u0442\u0441\u044F \u0442\u0435\u0440\u043C\u0438\u043D\u0430\u043C\u0438 \u0434\u043B\u044F \u0441\u0441\u044B\u043B\u043E\u043A.",
      "set.languages.invalidSuffix": ", {n} \u0441 \u043E\u0448\u0438\u0431\u043A\u043E\u0439",
      "set.linkFirstOnly.desc": "\u0421\u0432\u044F\u0437\u044B\u0432\u0430\u0442\u044C \u0442\u043E\u043B\u044C\u043A\u043E \u043F\u0435\u0440\u0432\u043E\u0435 \u0443\u043F\u043E\u043C\u0438\u043D\u0430\u043D\u0438\u0435 \u043A\u0430\u0436\u0434\u043E\u0433\u043E \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0430 \u0432 \u0437\u0430\u043C\u0435\u0442\u043A\u0435.",
      "set.excludeTerms.name": "\u0418\u0441\u043A\u043B\u044E\u0447\u0451\u043D\u043D\u044B\u0435 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0438",
      "set.excludeTerms.desc": "\u0422\u0435\u043A\u0441\u0442\u044B \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u043E\u0432, \u043F\u043E\u043B\u043D\u043E\u0441\u0442\u044C\u044E \u0443\u0431\u0438\u0440\u0430\u0435\u043C\u044B\u0435 \u0438\u0437 \u0438\u043D\u0434\u0435\u043A\u0441\u0430, \u043F\u043E \u043E\u0434\u043D\u043E\u043C\u0443 \u0432 \u0441\u0442\u0440\u043E\u043A\u0435. \u0418\u0445 \u0441\u043B\u043E\u0432\u043E\u0444\u043E\u0440\u043C\u044B \u0442\u043E\u0436\u0435 \u043F\u0435\u0440\u0435\u0441\u0442\u0430\u044E\u0442 \u0441\u0432\u044F\u0437\u044B\u0432\u0430\u0442\u044C\u0441\u044F.",
      "set.excludeWords.name": "\u0418\u0441\u043A\u043B\u044E\u0447\u0451\u043D\u043D\u044B\u0435 \u0441\u043B\u043E\u0432\u0430",
      "set.excludeWords.desc": "\u041D\u0430\u043F\u0438\u0441\u0430\u043D\u0438\u044F, \u043F\u043E \u043E\u0434\u043D\u043E\u043C\u0443 \u0432 \u0441\u0442\u0440\u043E\u043A\u0435, \u043A\u043E\u0442\u043E\u0440\u044B\u0435 \u043D\u0438\u043A\u043E\u0433\u0434\u0430 \u043D\u0435 \u0441\u0442\u0430\u043D\u043E\u0432\u044F\u0442\u0441\u044F \u0441\u0441\u044B\u043B\u043A\u043E\u0439, \u0434\u0430\u0436\u0435 \u0435\u0441\u043B\u0438 \u0441\u043E\u0432\u043F\u0430\u0434\u0430\u044E\u0442 \u0441 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u043E\u043C. \u0421\u0442\u0440\u043E\u043A\u0430 \u043E\u0441\u0442\u0430\u043D\u0430\u0432\u043B\u0438\u0432\u0430\u0435\u0442 \u0442\u043E\u043B\u044C\u043A\u043E \u044D\u0442\u043E \u043D\u0430\u043F\u0438\u0441\u0430\u043D\u0438\u0435; \u0441\u043E \u0437\u0432\u0451\u0437\u0434\u043E\u0447\u043A\u043E\u0439 \u043D\u0430 \u043A\u043E\u043D\u0446\u0435 \u2014 \u0432\u0441\u0435 \u0444\u043E\u0440\u043C\u044B \u0441\u043B\u043E\u0432\u0430. \u0421\u0430\u043C \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A \u0432 \u043E\u0431\u043E\u0438\u0445 \u0441\u043B\u0443\u0447\u0430\u044F\u0445 \u043F\u0440\u043E\u0434\u043E\u043B\u0436\u0430\u0435\u0442 \u0441\u0432\u044F\u0437\u044B\u0432\u0430\u0442\u044C\u0441\u044F.",
      "set.highlightInReading.desc": "\u041F\u043E\u0434\u0447\u0451\u0440\u043A\u0438\u0432\u0430\u0442\u044C \u0441\u043E\u0432\u043F\u0430\u0432\u0448\u0438\u0435 \u0441\u043B\u043E\u0432\u0430 \u0432 \u043E\u0442\u0440\u0438\u0441\u043E\u0432\u0430\u043D\u043D\u044B\u0445 \u0437\u0430\u043C\u0435\u0442\u043A\u0430\u0445.",
      "set.editingHighlight.desc": "\u041F\u043E\u0434\u0447\u0451\u0440\u043A\u0438\u0432\u0430\u0442\u044C \u0441\u043E\u0432\u043F\u0430\u0432\u0448\u0438\u0435 \u0441\u043B\u043E\u0432\u0430 \u043F\u0440\u0438 \u0440\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0438.",
      "set.editingHighlight.off": "\u0412\u044B\u043A\u043B",
      "set.skipHeadings.desc": "\u041D\u0435 \u0441\u0432\u044F\u0437\u044B\u0432\u0430\u0442\u044C \u0441\u043B\u043E\u0432\u0430 \u0432\u043D\u0443\u0442\u0440\u0438 \u0441\u043E\u0431\u0441\u0442\u0432\u0435\u043D\u043D\u044B\u0445 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u043E\u0432 \u0437\u0430\u043C\u0435\u0442\u043A\u0438.",
      "set.statusBar.desc": "\u041F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C, \u0441\u043A\u043E\u043B\u044C\u043A\u043E \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u043E\u0432 \u0443\u043F\u043E\u043C\u044F\u043D\u0443\u0442\u043E \u0432 \u0442\u0435\u043A\u0443\u0449\u0435\u0439 \u0437\u0430\u043C\u0435\u0442\u043A\u0435.",
      "set.statusBarIncludeLinks.desc": "\u0423\u0447\u0438\u0442\u044B\u0432\u0430\u0442\u044C \u0432 \u0441\u0447\u0451\u0442\u0447\u0438\u043A\u0435 \u0443\u0436\u0435 \u043F\u0440\u043E\u0441\u0442\u0430\u0432\u043B\u0435\u043D\u043D\u044B\u0435 \u0441\u0441\u044B\u043B\u043A\u0438 \u043D\u0430 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0438.",
      "set.linkSuggest.desc": "\u041F\u0440\u0435\u0434\u043B\u0430\u0433\u0430\u0442\u044C \u043F\u0440\u0435\u0432\u0440\u0430\u0442\u0438\u0442\u044C \u0441\u043B\u043E\u0432\u043E \u0432 \u0441\u0441\u044B\u043B\u043A\u0443 \u043D\u0430 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A \u043F\u043E \u043C\u0435\u0440\u0435 \u043D\u0430\u0431\u043E\u0440\u0430.",
      "set.suggestSkipAfter.desc": "\u041D\u0435 \u043F\u043E\u0434\u0441\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C, \u0435\u0441\u043B\u0438 \u0441\u043B\u043E\u0432\u043E \u0438\u0434\u0451\u0442 \u043F\u043E\u0441\u043B\u0435 \u043E\u0434\u043D\u043E\u0433\u043E \u0438\u0437 \u044D\u0442\u0438\u0445 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432, \u2014 \u0447\u0442\u043E\u0431\u044B \u0434\u0440\u0443\u0433\u0438\u0435 \u043F\u043E\u0434\u0441\u043A\u0430\u0437\u043A\u0438 \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u043B\u0438 \u0441\u0432\u043E\u0439 \u0441\u043B\u043E\u0442. \u041F\u0443\u0441\u0442\u043E \u2014 \u043E\u0442\u043A\u043B\u044E\u0447\u0438\u0442\u044C.",
      "set.menuTurnInto.name": "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044F \u0441\u0432\u044F\u0437\u044B\u0432\u0430\u043D\u0438\u044F",
      "set.menuTurnInto.desc": "\u041F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C \u043F\u0443\u043D\u043A\u0442\u044B \xAB\u0441\u0432\u044F\u0437\u0430\u0442\u044C \u0441 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u043E\u043C\xBB \u043D\u0430 \u043F\u043E\u0434\u0441\u0432\u0435\u0447\u0435\u043D\u043D\u043E\u043C \u0441\u043B\u043E\u0432\u0435.",
      "set.menuOpen.name": "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044F \u043E\u0442\u043A\u0440\u044B\u0442\u0438\u044F",
      "set.menuOpen.desc": "\u041F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C \u043F\u0443\u043D\u043A\u0442\u044B \xAB\u043E\u0442\u043A\u0440\u044B\u0442\u044C \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A\xBB \u043D\u0430 \u043F\u043E\u0434\u0441\u0432\u0435\u0447\u0435\u043D\u043D\u043E\u043C \u0441\u043B\u043E\u0432\u0435.",
      "set.menuExclude.name": "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044F \u0438\u0441\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F",
      "set.menuExclude.desc": "\u041F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C \u043F\u0443\u043D\u043A\u0442\u044B \xAB\u0438\u0441\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0441\u043B\u043E\u0432\u043E/\u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A\xBB.",
      "set.menuUnlink.name": "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u0440\u0430\u0437\u0432\u044F\u0437\u044B\u0432\u0430\u043D\u0438\u044F",
      "set.menuUnlink.desc": "\u041F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C \xAB\u0443\u0431\u0440\u0430\u0442\u044C \u044D\u0442\u0443 \u0441\u0441\u044B\u043B\u043A\u0443\xBB \u043D\u0430 \u0441\u0441\u044B\u043B\u043A\u0435-\u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0435.",
      "set.menuCollect.name": "\u041F\u0443\u043D\u043A\u0442\u044B \xAB\u0421\u043E\u0431\u0440\u0430\u0442\u044C \u043F\u0441\u0435\u0432\u0434\u043E\u043D\u0438\u043C\u044B\xBB",
      "set.menuCollect.desc": "\u041F\u0440\u0435\u0434\u043B\u0430\u0433\u0430\u0442\u044C \u0441\u043E\u0431\u0440\u0430\u0442\u044C \u0442\u0435\u043A\u0441\u0442 \u0441\u0441\u044B\u043B\u043A\u0438 \u043A\u0430\u043A \u043F\u0441\u0435\u0432\u0434\u043E\u043D\u0438\u043C \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0430 \u2014 \u043D\u0430 \u0441\u0430\u043C\u043E\u0439 \u0441\u0441\u044B\u043B\u043A\u0435 \u0438 \u0434\u043B\u044F \u0432\u0441\u0435\u0439 \u0437\u0430\u043C\u0435\u0442\u043A\u0438 \u0438\u0437 \u0435\u0451 \u043A\u043E\u043D\u0442\u0435\u043A\u0441\u0442\u043D\u043E\u0433\u043E \u043C\u0435\u043D\u044E.",
      "set.rebuild.name": "\u041F\u0435\u0440\u0435\u0441\u0442\u0440\u043E\u0438\u0442\u044C \u0438\u043D\u0434\u0435\u043A\u0441",
      "set.rebuild.desc": "\u0417\u0430\u043D\u043E\u0432\u043E \u043F\u0440\u043E\u0441\u043A\u0430\u043D\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0444\u0430\u0439\u043B\u044B-\u0433\u043B\u043E\u0441\u0441\u0430\u0440\u0438\u0438 \u043D\u0430 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0438.",
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
var matcher = require_matcher2();
var highlight = require_highlight2();
var materialize = require_materialize();
var api = require_api();
var indexEvents = require_index_events();
var { HeadingSuggest, suggestAvailable } = require_heading_suggest();
var { initI18n, withFamily, t, plural } = require_i18n();
var { buildMenu } = require_menu_verbs();
var aliases = require_aliases();
var rename = require_rename();
var { ChoicePopover } = require_choices();
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
var oneWord = (text) => (text.match(/[\p{L}\p{Nd}]+/gu) || []).length === 1;
var NOTICE_KEYS = {
  glossarySources: { add: "notice.sourceAdded", remove: "notice.sourceRemoved" },
  excludeSources: { add: "notice.ignoreAdded", remove: "notice.ignoreRemoved" },
  excludeFolders: { add: "notice.pathAddedExcluded", remove: "notice.pathRemovedExcluded" },
  scopeFolders: { add: "notice.pathAddedScope", remove: "notice.pathRemovedScope" }
};
var HeadingLinkerPlugin = class extends Plugin {
  async onload() {
    initI18n(withFamily("prose", { en: require_en2(), ru: require_ru2() }));
    const loaded = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, loaded);
    if (loaded && typeof loaded.glossaryFiles === "string" && loaded.glossarySources === void 0) {
      this.settings.glossarySources = loaded.glossaryFiles;
    }
    this.languages = [];
    this.activeLanguages = [];
    this.languageErrors = [];
    this.index = { byKey: /* @__PURE__ */ new Map(), termCount: 0 };
    this.excludedWords = /* @__PURE__ */ new Set();
    this.excludedStems = /* @__PURE__ */ new Set();
    this.keysCache = /* @__PURE__ */ new Map();
    this.terms = [];
    this.headingFingerprints = /* @__PURE__ */ new Map();
    this.aliasCache = /* @__PURE__ */ new Map();
    this._indexListeners = /* @__PURE__ */ new Set();
    await this.loadLanguages();
    this.rebuildIndex();
    this.scheduleRebuild = debounce(() => {
      this.rebuildIndex();
      this.rerenderViews();
      this.updateStatusBar();
      this.flushHeadingRenames();
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
      const previous = this.headingFingerprints.get(file.path);
      if (previous === next)
        return;
      this.noteHeadingRename(file, previous);
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
    this.registerEvent(this.app.workspace.on("editor-menu", (nativeMenu, editor) => buildMenu(this, nativeMenu, (menu) => {
      const file = this.app.workspace.getActiveFile();
      const sourcePath = file ? file.path : "";
      const link = this.headingLinkAt(editor);
      const excludeItem = (value, display2) => {
        if (!this.settings.menuExclude)
          return;
        if (display2 && oneWord(display2)) {
          this.addExclusionMenuItem(menu, "excludeWords", display2, "form");
          this.addExclusionMenuItem(menu, "excludeWords", display2, "stem");
        }
        this.addExclusionMenuItem(menu, "excludeTerms", this.labelOf(value));
      };
      if (link) {
        if (this.settings.menuUnlink) {
          menu.addItem((i) => i.setTitle(t("menu.unlinkThisLink")).setIcon("unlink").onClick(() => this.unlinkLinkAt(editor, link)));
        }
        if (this.settings.menuCollect && link.targetFile && link.display !== this.labelOf(link.linktext)) {
          menu.addItem((i) => i.setTitle(t("menu.collectThisAlias")).setIcon("download").onClick(() => this.collectAliasFromLink(link)));
        }
        excludeItem(link.linktext, link.display);
        return;
      }
      const hit = this.matchAtCursor(editor);
      if (!hit) {
        const word = this.wordAtCursor(editor);
        if (word) {
          excludeItem(word.linktext, word.display);
          return;
        }
        const raw = this.rawWordAtCursor(editor);
        if (!raw || !this.settings.menuExclude)
          return;
        if (this.isExcluded("excludeWords", raw))
          this.addExclusionMenuItem(menu, "excludeWords", raw, "form");
        if (this.stemLineSilencing(raw))
          this.addExclusionMenuItem(menu, "excludeWords", raw, "stem");
        if (this.isExcluded("excludeTerms", raw))
          this.addExclusionMenuItem(menu, "excludeTerms", raw);
        return;
      }
      const display = hit.match.display;
      const linktext = hit.match.linktext;
      const candidates = () => this.cursorCandidates(hit, sourcePath, false);
      const ownCandidates = () => [hit.match.linktext, ...hit.match.alts || []];
      if (file && this.settings.menuTurnInto) {
        const scope = this.settings.linkFirstOnly ? t("scope.first") : t("scope.all");
        const linkGroup = menu.section(t("menu.linkThisWord", { display }), "link");
        linkGroup.addItem((i) => i.setTitle(t("menu.linkHere", { display })).setIcon("link").onClick(() => this.chooseTerm(
          ownCandidates(),
          t("menu.linkDisplayTo", { display }),
          (c) => this.materializeSingle(file, linktext, display, editor.posToOffset({ line: hit.line, ch: hit.match.start }), 0, c)
        )));
        linkGroup.addItem((i) => i.setTitle(t("menu.linkScopeThisNote", { scope, display })).setIcon("links-coming-in").onClick(() => this.chooseTerm(
          ownCandidates(),
          t("menu.linkScopeTo", { scope, display }),
          (c) => this.materializeTerm(file, linktext, c)
        )));
        linkGroup.addItem((i) => i.setTitle(t("menu.linkScopeAllNotes", { scope, display })).setIcon("links-going-out").onClick(() => this.chooseTerm(
          ownCandidates(),
          t("menu.linkScopeTo", { scope, display }),
          (c) => this.materializeTermScope(linktext, c)
        )));
      }
      if (this.settings.menuOpen) {
        menu.addItem((i) => i.setTitle(t("menu.openThisWord", { display })).setIcon("file-text").onClick(() => this.chooseTerm(candidates(), t("menu.openTitle"), (c) => this.openTerm(c, sourcePath, false))));
      }
      excludeItem(linktext, display);
    })));
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
      if (this.settings.menuCollect && !isFolder) {
        menu.addItem((i) => i.setTitle(t("menu.collectFromNote")).setIcon("download").onClick(() => this.collectAliasesFromNote(file)));
      }
    }));
    this.app.workspace.registerHoverLinkSource("heading-linker", { display: "Heading Linker", defaultMod: true });
    this.app.workspace.registerHoverLinkSource("heading-linker-choice", { display: "Heading Linker", defaultMod: false });
    this.choices = new ChoicePopover({
      cls: "heading",
      title: t("modal.choose.title"),
      hover: (target, event, row, parent) => this.hoverTerm(event, row, target, this.activePath(), parent),
      open: (target) => this.openTerm(target, this.activePath(), false),
      plugin: this
    });
    this.register(() => this.choices.destroy());
    this.registerMarkdownPostProcessor((el, ctx) => this.processReadingMode(el, ctx));
    this.registerEditingHighlight();
    this.addCommand({ id: "link-current", name: t("cmd.linkThisNote"), callback: () => this.materializeCurrent() });
    this.addCommand({ id: "link-selection", name: t("cmd.linkSelection"), editorCallback: (editor) => this.materializeSelection(editor) });
    this.addCommand({ id: "link-scope", name: t("cmd.linkAllNotes"), callback: () => this.materializeScope() });
    this.addCommand({ id: "unlink-current", name: t("cmd.unlinkThisNote"), callback: () => this.unlinkCurrent() });
    this.addCommand({ id: "unlink-selection", name: t("cmd.unlinkSelection"), editorCallback: (editor) => this.unlinkSelection(editor) });
    this.addCommand({ id: "unlink-scope", name: t("cmd.unlinkAllNotes"), callback: () => this.unlinkScope() });
    this.addCommand({
      id: "collect-current",
      name: t("cmd.collectThisNote"),
      callback: () => {
        const f = this.app.workspace.getActiveFile();
        if (f)
          this.collectAliasesFromNote(f);
      }
    });
    this.addCommand({ id: "rebuild-index", name: t("cmd.rebuildIndex"), callback: () => {
      this.rebuildIndex();
      new Notice(t("notice.indexRebuilt"));
      this.warnDuplicateHeadings();
    } });
    this.addCommand({ id: "report-broken-links", name: t("cmd.reportBrokenLinks"), callback: () => this.reportBrokenHeadingLinks() });
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
    this.api = this.buildApi();
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
          const r = this.resolveHeadingLink(link.link, file.path);
          if (r)
            linktexts.add(`${r.file.basename}#${r.heading}`);
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
    const aliases2 = this.aliasCache.get(file.path);
    return JSON.stringify({ h: this.headingsOf(file), a: aliases2 ? [...aliases2] : [] });
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
  // After a user-run rebuild, flag headings that repeat inside one file: only the first is
  // reachable by [[File#Heading]], so the rest silently never link. Details to the console.
  warnDuplicateHeadings() {
    const dups = this.duplicateHeadings || [];
    if (!dups.length)
      return;
    new Notice(t("notice.duplicateHeadings", { n: dups.length }));
    for (const d of dups)
      console.warn(`Heading Linker: "${d.label}" repeats in ${d.path} \u2014 only the first is linkable`);
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
  // By path, not basename: a bare basename resolves case-insensitively, so Guide and guide open
  // one file. The heading text holds no []|#^ (the index drops those), so it is a safe subpath.
  linktextFor(linktext) {
    const term = (this.terms || []).find((t2) => t2.linktext === linktext);
    return term ? `${term.path}#${term.label}` : linktext;
  }
  openTerm(linktext, sourcePath, newTab) {
    this.app.workspace.openLinkText(this.linktextFor(linktext), sourcePath || "", newTab);
  }
  activePath() {
    const f = this.app.workspace.getActiveFile();
    return f ? f.path : "";
  }
  // `hoverParent` decides how long the preview lives: normally the plugin, but the duplicate
  // list passes its own component so the preview it opens dies with the list.
  hoverTerm(event, targetEl, linktext, sourcePath, hoverParent) {
    this.app.workspace.trigger("hover-link", {
      event,
      source: hoverParent ? "heading-linker-choice" : "heading-linker",
      hoverParent: hoverParent || this,
      targetEl,
      linktext: this.linktextFor(linktext),
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
Object.assign(HeadingLinkerPlugin.prototype, matcher, highlight, materialize, aliases, rename.methods, api, indexEvents);
module.exports = HeadingLinkerPlugin;
