var express = require('express');
var router = express.Router();

const { asyncHandler } = require('../../../utils/index');
const { authUser } = require('../../../middlewares/checkAuth');

const CartController = require('../../../controllers/web/user/cart.controller');
router.use(authUser);
router.get('/', asyncHandler(CartController.overview));

module.exports = router;
