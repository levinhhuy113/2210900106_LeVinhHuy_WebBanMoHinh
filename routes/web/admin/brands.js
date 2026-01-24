var express = require('express');
var router = express.Router();

const { asyncHandler } = require('../../../utils/index');

const BrandController = require('../../../controllers/web/admin/brands.controller');

router.get('/', asyncHandler(BrandController.overview));

module.exports = router;
