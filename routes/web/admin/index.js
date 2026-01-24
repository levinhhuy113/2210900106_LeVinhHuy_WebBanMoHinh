const express = require('express');
const router = express.Router();

const { setActivePage } = require("../../../utils/index");
const { authAdmin } = require('../../../middlewares/checkAuth');

router.use(setActivePage);

router.use('/dashboard', authAdmin, require('./dashboard'));
router.use('/products', authAdmin, require('./products'));
router.use('/categories', authAdmin, require('./categories'));
router.use('/brands', authAdmin, require('./brands'));
router.use('/orders', authAdmin, require('./orders'));
router.use('/customers', authAdmin, require('./customers'));

// router.use('/stock-entries', authAdmin, require('./stockEntries'));

module.exports = router;
