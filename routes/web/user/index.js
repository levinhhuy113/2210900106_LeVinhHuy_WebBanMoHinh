const express = require('express');
const router = express.Router();

// const { setActivePage } = require("../../../utils/index");

// router.use(setActivePage);

router.use('/', require('./home'));
router.use('/products', require('./products'));
router.use('/cart', require('./cart'));
router.use('/payment', require('./payment'));
router.use('/profile', require('./profile'));
router.use('/orders', require('./orders'));

module.exports = router;
