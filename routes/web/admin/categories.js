var express = require('express');
var router = express.Router();

const { asyncHandler } = require('../../../utils/index');

const CategoryController = require('../../../controllers/web/admin/categories.controller');

router.get('/', asyncHandler(CategoryController.overview));

module.exports = router;
