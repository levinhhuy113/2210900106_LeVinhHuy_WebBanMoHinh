var express = require('express');
var router = express.Router();

const { asyncHandler } = require('../../../utils/index');

const ProductsController = require('../../../controllers/web/admin/products.controller');

router.get('/', asyncHandler(ProductsController.overview));
router.get('/:id', asyncHandler(ProductsController.detail));


module.exports = router;
