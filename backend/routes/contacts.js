const router = require('express').Router();
const ctrl = require('../controllers/contactController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect);

router.get('/',       ctrl.getContacts);
router.post('/',      adminOnly, ctrl.createContact);
router.put('/:id',    adminOnly, ctrl.updateContact);
router.delete('/:id', adminOnly, ctrl.deleteContact);

module.exports = router;
