const pdfParse = require('pdf-parse');

const MAX_PDF_BYTES = 8 * 1024 * 1024; // 8 MB decoded

exports.extractPdfText = async (req, res, next) => {
  try {
    const { base64, fileName } = req.body;
    if (!base64) {
      return res.status(400).json({ message: 'No file data provided' });
    }

    const buffer = Buffer.from(base64, 'base64');

    if (buffer.length > MAX_PDF_BYTES) {
      return res.status(422).json({
        message: `This PDF is too large (${(buffer.length / 1024 / 1024).toFixed(1)} MB). Boarding pass PDFs are usually under 2 MB — please try a smaller file.`,
      });
    }

    let data;
    try {
      data = await pdfParse(buffer, { max: 0 });
    } catch (parseErr) {
      return res.status(422).json({
        message: 'Could not read this PDF. It may be encrypted, corrupted, or too complex. Try scanning the boarding pass as an image instead.',
      });
    }

    res.json({ text: data.text || '' });
  } catch (err) {
    next(err);
  }
};
