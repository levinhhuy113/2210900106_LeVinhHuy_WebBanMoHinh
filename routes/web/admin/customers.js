var express = require('express');
var router = express.Router();

const { asyncHandler } = require('../../../utils/index');

const CustomersController = require('../../../controllers/web/admin/customers.controller');

router.get('/', asyncHandler(CustomersController.overview));

module.exports = router;
