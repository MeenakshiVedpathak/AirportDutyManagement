const router = require('express').Router();
const multer = require('multer');
const {protect} = require('../middleware/auth');
const {extractPdfText} = require('../controllers/boardingPassController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {fileSize: 10 * 1024 * 1024}, // 10 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are accepted'));
  },
});

router.post('/extract-text', protect, upload.single('file'), extractPdfText);

module.exports = router;
