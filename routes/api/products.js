var express = require('express');
var router = express.Router();

const { asyncHandler } = require('../../utils/index');
const { createUploader } = require('../../middlewares/upload');
const { authAdmin } = require('../../middlewares/checkAuth');

const uploadProduct = createUploader('products');

const ProductsController = require('../../controllers/api/admin/products.controller');

const { validateAddProduct, validateEditProduct, validateDeleteProduct } = require('../../validators/product.validator');
router.use((req,res,next)=>{
    console.log("ROUTE:", req.method, req.originalUrl);
    next();
});

router.post('/add', uploadProduct.array('images'), authAdmin, validateAddProduct, asyncHandler(ProductsController.add));
router.put('/edit/:id', uploadProduct.array('images'), authAdmin, validateEditProduct, asyncHandler(ProductsController.edit));
router.delete('/delete/:id', authAdmin, validateDeleteProduct, asyncHandler(ProductsController.delete));
router.patch('/:id/toggle', authAdmin, ProductsController.toggle);
router.patch('/:id/toggleVariant', authAdmin, asyncHandler(ProductsController.toggleVariant));

router.get('/category/:categoryId', asyncHandler(ProductsController.getByCategory));
router.get('/:id', asyncHandler(ProductsController.getById));
router.get('/:id/variants', authAdmin, asyncHandler(ProductsController.getVariants));
router.post('/:id/variant/add', authAdmin, asyncHandler(ProductsController.addVariant));
router.delete('/:id/variant/:variantId', authAdmin, asyncHandler(ProductsController.deleteVariant));
router.put('/:id/variant/:variantId/update', authAdmin, asyncHandler(ProductsController.updateVariant));
router.delete('/:id/variant/:variantId/option/:optionValue', authAdmin, asyncHandler(ProductsController.deleteVariantOption));
router.post('/:id/variant/:variantId/option/add', authAdmin, asyncHandler(ProductsController.addVariantOption));
router.put('/:id/variant/:variantId/option/update', authAdmin, asyncHandler(ProductsController.updateVariantOption));
router.post('/:id/variant-combinations/add', authAdmin, uploadProduct.array('images'), asyncHandler(ProductsController.addVariantCombination));
router.put('/:id/variant-combinations/:comboId', authAdmin, uploadProduct.array('images'), asyncHandler(ProductsController.updateVariantCombination));
router.put('/:id/variant-combinations/:comboId/price', authAdmin, asyncHandler(ProductsController.updateVariantCombinationPrice));
router.delete('/:id/variant-combinations/:comboId', authAdmin, asyncHandler(ProductsController.deleteVariantCombination));


module.exports = router;
