const router = require('express').Router();
const { protect, adminOnly } = require('../middleware/auth');
const {
  createDuty,
  confirmDuty,
  assignOfficer,
  claimDuty,
  releaseDuty,
  getDuties,
  getDutyById,
  updateDutyStatus,
  updateDuty,
  deleteDuty,
} = require('../controllers/dutyController');

router.use(protect);

router.get('/', getDuties);
router.post('/', adminOnly, createDuty);
router.get('/:id', getDutyById);
router.patch('/:id/assign', adminOnly, assignOfficer);
router.patch('/:id/claim', claimDuty);
router.patch('/:id/release', releaseDuty);
router.patch('/:id/confirm', confirmDuty);
router.patch('/:id/status', updateDutyStatus);
router.put('/:id', adminOnly, updateDuty);
router.delete('/:id', adminOnly, deleteDuty);

module.exports = router;
