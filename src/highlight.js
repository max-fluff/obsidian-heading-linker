'use strict';

const { createHighlight } = require('./shared/prose/highlight');

// Highlighting in Reading view (DOM) and in the editor (CM6). Mixed into the plugin
// prototype; the behaviour is shared with the glossary linker, only the names differ.
module.exports = createHighlight({
  cls: 'heading',
  displayName: 'Heading Linker',
  targetOf: (m) => m.linktext,
  selfIdFor: (plugin, sourcePath) => plugin.currentFileBase(sourcePath),
});
