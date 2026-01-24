var express = require('express');
var router = express.Router();

const { asyncHandler } = require('../../../utils/index');

const OrdersController = require('../../../controllers/web/admin/orders.controller');

router.get('/', asyncHandler(OrdersController.overview));
router.get('/:id', asyncHandler(OrdersController.detail));

module.exports = router;
