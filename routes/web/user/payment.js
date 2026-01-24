var express = require('express');
var router = express.Router();

const { asyncHandler } = require('../../../utils/index');
const { authUser } = require('../../../middlewares/checkAuth');


const PaymentController = require('../../../controllers/web/user/payment.controller');
// router.use();
router.post('/', authUser, asyncHandler(PaymentController.overview));
router.post('/buy-now', authUser, asyncHandler(PaymentController.buyNow));
router.get('/result', asyncHandler(PaymentController.result));

module.exports = router;
