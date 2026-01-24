var express = require('express');
var router = express.Router();

const { asyncHandler } = require('../../../utils/index');

const DashboardController = require('../../../controllers/web/admin/dashboard.controller');

router.get('/', asyncHandler(DashboardController.overview));

module.exports = router;
