const router = require('express').Router();
const { protect, adminOnly } = require('../middleware/auth');
const {
  createDuty,
  confirmDuty,
  getDuties,
  getDutyById,
  updateDutyStatus,
  deleteDuty,
} = require('../controllers/dutyController');

router.use(protect);

router.get('/', getDuties);
router.post('/', adminOnly, createDuty);
router.get('/:id', getDutyById);
router.patch('/:id/confirm', confirmDuty);
router.patch('/:id/status', updateDutyStatus);
router.delete('/:id', adminOnly, deleteDuty);

module.exports = router;
