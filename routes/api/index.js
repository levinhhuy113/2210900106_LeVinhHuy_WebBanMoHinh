const express = require('express');
const router = express.Router();


router.use('/', require('./auth'));
router.use('/categories', require('./categories'));
router.use('/brands', require('./brands'));
router.use('/products', require('./products'));
router.use('/stock-entries', require('./stockEntries'));
router.use('/cart', require('./cart'));
router.use('/payment', require('./payment'));
router.use('/profile', require('./profile'));
router.use('/orders', require('./orders'));
router.use('/customers', require('./customers'));


module.exports = router;
