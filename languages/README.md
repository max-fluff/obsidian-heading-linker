# Language modules

Each file here gives the linker plugins the morphology of one language: how to reduce
an inflected word form back to the term it belongs to, so `units` links to `Unit`
and `юнитов` links to `Юнит`.

Modules are plain JavaScript, bundled into `main.js` at build time; nothing is
loaded or executed at runtime. So adding a language means contributing a module and
rebuilding, via a pull request.

## The contract

A module exports a single object. The contract is enforced by
[`src/language-api.js`](../src/language-api.js); an invalid module is dropped on
load and shown under *Settings → Matching → Languages* with the reason.

| Field | Type | Required | Meaning |
|---|---|---|---|
| `id` | `string` | yes | Lowercase code, usually ISO 639 (`/^[a-z][a-z0-9-]*$/`). Reusing a built-in id overrides it. |
| `name` | `string` | yes | Display name shown in settings. |
| `priority` | `number` | no (0) | Default priority; higher wins when two languages claim a word. Users can reorder languages in settings to change this. |
| `match(word)` | `function → boolean` | yes | Claims a word, usually by script. |
| `keys(word, mode)` | `function → string[]` | yes | Comparison keys for one word. Non-empty array of strings. |
| `lemma(word)` | `function → string` | no | Base form for collected aliases. Defaults to the lowercased word. |

### How matching works

Two words link when their key sets overlap, so `keys()` must map every form of a
word to a key its base form also produces. The mode is a global user setting:

- `exact` — no morphology; return `[word.toLowerCase()]`.
- `endingStrip` — light: trim common endings.
- `stemmer` — full: reduce to a root (Porter/Snowball-class).

When a stem can come out too short, returning the union of a strong stem and a
lighter strip helps the forms still meet (see `ru.js` and `de.js`). For alternating
vowels, `uk.js` adds the alternate stems as extra keys (`кіт`/`кота`). Keys must be
deterministic and derived from the lowercased word.

## Adding a language

1. Copy [`_template.js`](_template.js) to `<id>.js` (e.g. `uk.js`). Files starting
   with `_` are templates and are not bundled.
2. Implement `match` and `keys` (and optionally `lemma`). Keep helper functions
   private to the module.
3. Register it in [`src/builtin-languages.js`](../src/builtin-languages.js).
4. `npm run build`, then check *Settings → Matching → Languages*: your language
   should appear with a toggle (or an error row if the contract is not met).
5. Open a pull request.

## Porting an existing stemmer

The bundled `es`/`de`/`fr` modules are JavaScript ports of Apache Lucene light
stemmers; `en`/`ru` port the Porter/Snowball stemmers. If you port a published
algorithm, keep its attribution and license notice in the file header (see the
existing modules), and make sure the license permits redistribution.
