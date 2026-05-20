const router = require('express').Router();
const { protect } = require('../middleware/auth');
const { extractPdfText } = require('../controllers/boardingPassController');

router.post('/extract-text', protect, extractPdfText);

module.exports = router;
