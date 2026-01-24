var express = require('express');
var router = express.Router();

const { asyncHandler } = require('../../utils/index');
const { authAdmin, authUser } = require('../../middlewares/checkAuth');


const PaymentController = require('../../controllers/api/user/payment.controller');

router.use(authUser);
router.post('/create', asyncHandler(PaymentController.create));
router.post('/buy-now', asyncHandler(PaymentController.buyNow));

module.exports = router;
