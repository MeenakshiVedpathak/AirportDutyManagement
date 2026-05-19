const pdfParse = require('pdf-parse');

exports.extractPdfText = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({message: 'No file uploaded'});
    }
    const data = await pdfParse(req.file.buffer);
    res.json({text: data.text || ''});
  } catch (err) {
    next(err);
  }
};
