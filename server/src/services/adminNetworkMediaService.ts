export {};

const {
  insertNetworkMedia,
  selectNetworkMediaList,
  selectNetworkMediaFile,
  selectNetworkMediaThumbnail,
  insertNetworkNotation,
  selectNetworkNotations,
  insertNetworkNote,
  selectNetworkNotes,
  softDeleteNetworkNote,
  updateNetworkNoteContent,
  selectNetworkNoteById,
  insertNoteMedia,
  selectNoteMediaById,
  selectNoteMediaList,
  deleteNoteMedia,
} = require('../repositories/adminNetworkMediaRepository');

module.exports = {
  uploadNetworkMedia: insertNetworkMedia,
  getNetworkMediaList: selectNetworkMediaList,
  getNetworkMediaFile: selectNetworkMediaFile,
  getNetworkMediaThumbnail: selectNetworkMediaThumbnail,
  addNetworkNotation: insertNetworkNotation,
  getNetworkNotations: selectNetworkNotations,
  addNetworkNoteWithFunction: insertNetworkNote,
  getNetworkNotes: selectNetworkNotes,
  deleteNetworkNote: softDeleteNetworkNote,
  updateNetworkNote: updateNetworkNoteContent,
  getNetworkNoteById: selectNetworkNoteById,
  addNoteMedia: insertNoteMedia,
  getNoteMediaById: selectNoteMediaById,
  getNoteMediaList: selectNoteMediaList,
  deleteNoteMedia,
};
