var express = require('express');
var router = express.Router();

const { asyncHandler } = require('../../../utils/index');

const HomeController = require('../../../controllers/web/user/home.controller');

router.get('/', asyncHandler(HomeController.overview));

module.exports = router;
