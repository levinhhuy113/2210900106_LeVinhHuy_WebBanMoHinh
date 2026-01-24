var express = require('express');
var router = express.Router();

const { asyncHandler } = require('../../utils/index');
const { createUploader } = require('../../middlewares/upload');
const { authAdmin, authUser } = require('../../middlewares/checkAuth');


const ProfileController = require('../../controllers/api/user/profile.controller');

const uploadProduct = createUploader('common');


router.use(authUser);

router.get('/locations', asyncHandler(ProfileController.getLocations));
router.get('/locations/:provinceId/districts', asyncHandler(ProfileController.getDistricts));
router.get('/locations/:provinceId/districts/:districtId/wards', asyncHandler(ProfileController.getWards));
router.put('/', uploadProduct.single('avatar'), asyncHandler(ProfileController.updateProfile));
router.post('/change-password', asyncHandler(ProfileController.changePassword));

module.exports = router;
