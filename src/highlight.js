'use strict';

const { createHighlight } = require('./shared/prose/highlight');

// Highlighting in Reading view (DOM) and in the editor (CM6). Mixed into the plugin
// prototype. The behaviour is shared with the glossary linker; only the names differ.
module.exports = createHighlight({
  // A global namespace: `heading-link`, `cm-heading-link`, `data-heading-target`.
  cls: 'heading',
  displayName: 'Heading Linker',
  // What a heading match links to: "Basename#Heading".
  targetOf: (m) => m.linktext,
  // A note's own headings are not offered inside it, so the matcher needs to know which
  // file it is reading.
  selfIdFor: (plugin, sourcePath) => plugin.currentFileBase(sourcePath),
});
