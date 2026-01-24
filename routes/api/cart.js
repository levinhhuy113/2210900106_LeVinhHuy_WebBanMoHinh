var express = require('express');
var router = express.Router();

const { asyncHandler } = require('../../utils/index');
const { authAdmin, authUser } = require('../../middlewares/checkAuth');


const CartController = require('../../controllers/api/user/cart.controller');


router.use(authUser);
router.post('/add', asyncHandler(CartController.addToCart));
router.delete('/remove/:productId', asyncHandler(CartController.removeFromCart));
router.patch('/update/:productId', asyncHandler(CartController.updateQuantity));

router.get('/', asyncHandler(CartController.getCart));

module.exports = router;
