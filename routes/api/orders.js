var express = require('express');
var router = express.Router();

const { asyncHandler } = require('../../utils/index');
const { authAdmin, authUser } = require('../../middlewares/checkAuth');
const { createUploader } = require('../../middlewares/upload');

const OrdersController = require('../../controllers/api/admin/orders.controller');
const UserOrdersController = require('../../controllers/api/user/orders.controller');
const uploadProduct = createUploader('reviews');

// const { validateAddCategory, validateEditCategory, validateDeleteCategory } = require('../../validators/category.validator');

router.post('/:orderId/items/:itemId/review', authUser,  uploadProduct.array('images'), asyncHandler(UserOrdersController.reviewProduct));
router.patch('/:id/cancel', authUser, asyncHandler(UserOrdersController.cancelOrderByUser));
router.patch('/:id/status', authAdmin, asyncHandler(OrdersController.updateStatus));
module.exports = router;
