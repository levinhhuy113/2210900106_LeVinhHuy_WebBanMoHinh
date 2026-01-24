var express = require('express');
var router = express.Router();

const { asyncHandler } = require('../../../utils/index');
const { authUser } = require('../../../middlewares/checkAuth');

const OrdersController = require('../../../controllers/web/user/orders.controller');
router.use(authUser);
router.get('/', asyncHandler(OrdersController.overview));
router.get('/:id', asyncHandler(OrdersController.detail));

module.exports = router;
