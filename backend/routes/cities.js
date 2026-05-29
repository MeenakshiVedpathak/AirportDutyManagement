const router = require('express').Router();
const ctrl = require('../controllers/cityController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect);

router.get('/', ctrl.getCities);
router.post('/', adminOnly, ctrl.createCity);
router.patch('/:id', adminOnly, ctrl.updateCity);
router.patch('/:id/toggle', adminOnly, ctrl.toggleCity);

module.exports = router;
