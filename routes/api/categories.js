var express = require('express');
var router = express.Router();

const { asyncHandler } = require('../../utils/index');
const { createUploader } = require('../../middlewares/upload');
const { authAdmin } = require('../../middlewares/checkAuth');

const uploadCommon = createUploader();

const CategoriesController = require('../../controllers/api/admin/categories.controller');

const { validateAddCategory, validateEditCategory, validateDeleteCategory } = require('../../validators/category.validator');

router.use(authAdmin);

router.post('/add', uploadCommon.none(), validateAddCategory, asyncHandler(CategoriesController.add));
router.put('/edit/:id', uploadCommon.none(), validateEditCategory, asyncHandler(CategoriesController.edit));
router.delete('/delete/:id', validateDeleteCategory, asyncHandler(CategoriesController.delete));
router.patch('/:id/toggle', CategoriesController.toggle);

router.get('/:id', asyncHandler(CategoriesController.getById));

module.exports = router;
