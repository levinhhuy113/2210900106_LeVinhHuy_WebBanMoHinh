const StockEntry = require('../models/stockEntry.model');
const Product = require('../models/product.model');
const { error } = require('../helpers/response');


async function validateAddStockEntry(req, res, next) {
    try {
        const { productId, batchCode, importPrice, quantity } = req.body;

        if (!productId) return error(res, 400, 'Sản phẩm là bắt buộc');
        if (!batchCode) return error(res, 400, 'Mã lô hàng là bắt buộc');
        if (!importPrice) return error(res, 400, 'Giá nhập là bắt buộc');
        if (!quantity) return error(res, 400, 'Số lượng là bắt buộc');

        const product = await Product.findById(productId);
        if (!product) return error(res, 404, 'Không tìm thấy sản phẩm');

        const exists = await StockEntry.findOne({ productId, batchCode });
        if (exists) return error(res, 400, 'Mã lô hàng đã tồn tại cho sản phẩm này');

        req.product = product;

        next();
    } catch (err) {
        console.error(err);
        return error(res, 500, 'Lỗi khi validate lô hàng');
    }
}


async function validateEditStockEntry(req, res, next) {
    try {
        const { id } = req.params;
        const { batchCode, importPrice, quantity, note, status } = req.body;

        const stockEntry = await StockEntry.findById(id);
        if (!stockEntry) return error(res, 404, 'Không tìm thấy lô hàng');

        if (stockEntry.status !== 'draft') {
            return error(res, 400, 'Chỉ có thể sửa khi lô hàng đang ở trạng thái "Nháp"');
        }

        if (batchCode !== undefined && !batchCode.trim()) {
            return error(res, 400, 'Mã lô hàng là bắt buộc');
        }
        if (importPrice !== undefined && importPrice === null) {
            return error(res, 400, 'Giá nhập là bắt buộc');
        }
        if (quantity !== undefined && quantity === null) {
            return error(res, 400, 'Số lượng là bắt buộc');
        }

        if (batchCode && batchCode !== stockEntry.batchCode) {
            const duplicate = await StockEntry.findOne({
                productId: stockEntry.productId,
                batchCode,
                _id: { $ne: id },
            });
            if (duplicate) return error(res, 400, 'Mã lô hàng này đã tồn tại cho sản phẩm');
        }

        req.stockEntry = stockEntry;

        next();
    } catch (err) {
        console.error(err);
        return error(res, 500, 'Lỗi khi validate lô hàng');
    }
}



module.exports = {
    validateAddStockEntry,
    validateEditStockEntry
};
