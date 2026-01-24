var express = require('express');
var router = express.Router();

const { asyncHandler } = require('../../utils/index');
const { createUploader } = require('../../middlewares/upload');
const { authAdmin } = require('../../middlewares/checkAuth');

const uploadCommon = createUploader();

const BrandsController = require('../../controllers/api/admin/brands.controller');

const { validateAddBrand, validateEditBrand, validateDeleteBrand } = require('../../validators/brand.validator');

router.use(authAdmin);

router.post('/add', uploadCommon.none(), validateAddBrand, asyncHandler(BrandsController.add));
router.put('/edit/:id', uploadCommon.none(), validateEditBrand, asyncHandler(BrandsController.edit));
router.delete('/delete/:id', validateDeleteBrand, asyncHandler(BrandsController.delete));
router.patch('/:id/toggle', BrandsController.toggle);

router.get('/:id', asyncHandler(BrandsController.getById));

module.exports = router;
