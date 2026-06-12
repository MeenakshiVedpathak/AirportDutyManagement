// Cloudinary is no longer used for duty PDF storage.
// All attachments are stored as binary in MongoDB (pdfAttachment.data).
// Run backend/migrate-pdfs.js once to migrate any legacy Cloudinary files.
module.exports = {};
