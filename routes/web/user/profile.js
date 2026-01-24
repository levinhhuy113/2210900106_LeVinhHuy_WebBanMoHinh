var express = require('express');
var router = express.Router();

const { asyncHandler } = require('../../../utils/index');
const { authUser } = require('../../../middlewares/checkAuth');

const ProfileController = require('../../../controllers/web/user/profile.controller');
router.use(authUser);
router.get('/', asyncHandler(ProfileController.overview));

module.exports = router;
