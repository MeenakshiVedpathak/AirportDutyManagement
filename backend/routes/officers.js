const router = require('express').Router();
const { protect, adminOnly } = require('../middleware/auth');
const {
  getOfficers,
  addOfficer,
  updateOfficer,
  toggleAccess,
} = require('../controllers/officerController');

router.use(protect, adminOnly);

router.get('/', getOfficers);
router.post('/', addOfficer);
router.put('/:id', updateOfficer);
router.post('/:id/access', toggleAccess);

module.exports = router;
