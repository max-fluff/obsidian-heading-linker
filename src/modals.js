'use strict';

const { createProseModals } = require('./shared/prose/modals');

// The preview and picker dialogs. Behaviour is shared with the glossary linker; a heading
// match names its target in `linktext` ("Basename#Heading").
const { MaterializePreviewModal, UnlinkPreviewModal, ChooseTermModal } = createProseModals({
  cls: 'heading',
  targetOf: (m) => m.linktext,
  withTarget: (m, linktext) => ({ ...m, linktext }),
});

module.exports = { MaterializePreviewModal, UnlinkPreviewModal, ChooseTermModal };
