var express = require('express');
var router = express.Router();

const { asyncHandler } = require('../../utils/index');
const { createUploader } = require('../../middlewares/upload');
const { authAdmin } = require('../../middlewares/checkAuth');

const uploadCommon = createUploader();

const StockEntriesController = require('../../controllers/api/admin/stockEntries.controller');

const { validateAddStockEntry, validateEditStockEntry } = require('../../validators/stockEntry.validator');

router.post('/add', authAdmin , uploadCommon.none(), validateAddStockEntry, asyncHandler(StockEntriesController.add));
router.put('/edit/:id', authAdmin, uploadCommon.none(), validateEditStockEntry, asyncHandler(StockEntriesController.edit));
router.delete('/delete/:id', authAdmin, asyncHandler(StockEntriesController.delete));

router.put('/:id/update-status', authAdmin, asyncHandler(StockEntriesController.updateStatus));
router.get('/:id', asyncHandler(StockEntriesController.getById));


module.exports = router;
