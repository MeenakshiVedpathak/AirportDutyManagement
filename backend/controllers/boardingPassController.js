const pdfParse = require('pdf-parse');

exports.extractPdfText = async (req, res, next) => {
  try {
    const { base64, fileName } = req.body;
    if (!base64) {
      return res.status(400).json({ message: 'No file data provided' });
    }

    const buffer = Buffer.from(base64, 'base64');
    const data = await pdfParse(buffer);
    res.json({ text: data.text || '' });
  } catch (err) {
    next(err);
  }
};
