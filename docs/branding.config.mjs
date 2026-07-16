// Branding config for Heading Linker — drives both the store plates and the vector
// headers. Run: npm run plates / npm run banner
// See src/shared/branding/BRANDING.md for the full field reference.

// The plugin's mark: a hash over a dotted underline (a heading, and a word linked to it).
// Stems are filled parallelograms rather than slanted strokes so their cuts stay horizontal;
// dots are explicit circles rather than a dashed stroke so the count survives any scale.
const MARK = {
  kind: 'svg',
  viewBox: '29 19 42 62',
  body: `<g fill="#fff">
    <path d="M40.5 19 H48.5 L41.5 67 H33.5 Z"/>
    <path d="M58.5 19 H66.5 L59.5 67 H51.5 Z"/>
    <rect x="31" y="31" width="40" height="8"/>
    <rect x="29" y="47" width="40" height="8"/>
    <circle cx="31" cy="79" r="2"/>
    <circle cx="38.6" cy="79" r="2"/>
    <circle cx="46.2" cy="79" r="2"/>
    <circle cx="53.8" cy="79" r="2"/>
    <circle cx="61.4" cy="79" r="2"/>
    <circle cx="69" cy="79" r="2"/>
  </g>`,
};

export default {
  imagesDir: 'docs/images',
  outDir: 'docs/images/store',

  brand: {
    gradient: ['#27243d', '#191826'],
    tokenColor: '#b6a6e8',
    tokenMono: false,
    // "heading" as an anchor, across the plugin's languages (en, es, de, fr, ru, uk).
    tokens: [
      '#Heading', '#Título', '#Überschrift', '#Titre', '#Заголовок',
      '#Розділ', '#Headings', '#Títulos', '#Titres', '#Заголовки',
      '#Titre', '#Título', '#Heading', '#Розділи',
    ],
    mark: MARK,
    wordmark: { text: 'Heading Linker' },
    tagline: 'Highlight words in any form, link them to headings.',
  },

  plates: [
    { src: 'hero.png',            title: 'Headings link themselves',
      caption: 'Every heading in your glossary files is highlighted — in any word form, in any language.' },
    { src: 'turn-into-links.png', title: 'Turn headings into links',
      caption: 'Preview every replacement before a single word is written to your notes.' },
    { src: 'quick-capture.png',   title: 'Link as you type',
      caption: 'Start typing a heading and pick it from the suggestion list — aliases included.' },
    { src: 'ambiguous.png',       title: 'Same heading, many files',
      caption: 'When a heading is ambiguous, pick the file you meant.' },
  ],
};
