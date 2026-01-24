const StockEntry = require('../../../models/stockEntry.model');
const Product = require('../../../models/product.model');
const { success, error } = require('../../../helpers/response');

const VALID_TRANSITIONS = {
    draft: ['imported', 'cancelled', 'discontinued'],       // draft có thể chuyển sang tất cả ngoại trừ chính nó
    imported: ['cancelled', 'discontinued'],    // imported có thể hủy, dừng bán, hoặc hết hàng
    cancelled: ['imported', 'discontinued'],                // cancelled có thể phục hồi hoặc dừng bán
    discontinued: [],                                       // discontinued không thể chuyển
    sold_out: [],                                           // sold_out không thể chuyển
};

class StockEntriesController {
    async add(req, res) {
        try {
            const { productId, variantCombinationId, batchCode, importPrice, quantity, note } = req.body;

            const product = req.product;
            if (product.hasVariants && !variantCombinationId) {
                return error(res, 400, 'Vui lòng chọn tổ hợp biến thể.');
            }

            const newStockEntry = new StockEntry({
                productId,
                batchCode,
                variantCombinationId,
                importPrice,
                quantity,
                remainingQuantity: quantity,
                note: note || '',
                status: 'draft',
                statusHistory: [
                    {
                        status: 'draft',
                        changedAt: new Date(),
                        changedBy: req.user?._id || null,
                        reason: 'Tạo mới lô hàng (chưa nhập kho)'
                    }
                ]
            });

            await newStockEntry.save();

            success(res, 201, 'Tạo lô hàng thành công (chờ nhập kho)', newStockEntry);

        } catch (err) {
            console.error(err);
            error(res, 500, 'Không thể thêm lô hàng');
        }
    }

    async edit(req, res) {
        try {
            const { id } = req.params;
            const { batchCode, variantCombinationId, importPrice, quantity, note, status } = req.body;
            const stockEntry = req.stockEntry;

            stockEntry.batchCode = batchCode || stockEntry.batchCode;
            stockEntry.variantCombinationId = variantCombinationId;
            stockEntry.importPrice = importPrice ?? stockEntry.importPrice;
            stockEntry.quantity = quantity ?? stockEntry.quantity;
            stockEntry.remainingQuantity = quantity;
            stockEntry.note = note || stockEntry.note;

            // if (status && status !== stockEntry.status) {
            //     stockEntry.status = status;
            // }

            await stockEntry.save();
            success(res, 200, 'Cập nhật lô hàng thành công', stockEntry);
        } catch (err) {
            console.error(err);
            error(res, 500, 'Không thể sửa lô hàng');
        }
    }

    async updateStatus(req, res) {
        try {
            const { id } = req.params;
            const { newStatus, reason } = req.body;

            if (newStatus === 'sold_out') {
                return error(res, 400, `Không thể chuyển trạng thái sang "Hết hàng"`);
            }

            const stockEntry = await StockEntry.findById(id);
            if (!stockEntry) return error(res, 404, 'Không tìm thấy lô hàng');

            const current = stockEntry.status;

            if (!VALID_TRANSITIONS[current]?.includes(newStatus)) {
                return error(
                    res,
                    400,
                    `Không thể chuyển trạng thái từ "${current}" sang "${newStatus}"`
                );
            }

            stockEntry.status = newStatus;

            await stockEntry.save();

            const nextOptions = VALID_TRANSITIONS[newStatus] || [];

            success(res, 200, 'Cập nhật trạng thái thành công', {
                updatedStatus: newStatus,
                nextOptions,
                stockEntry,
            });
        } catch (err) {
            console.error(err);
            error(res, 500, 'Không thể cập nhật trạng thái lô hàng');
        }
    }

    async delete(req, res) {
        try {
            const { id } = req.params;

            const stockEntry = await StockEntry.findById(id);
            if (!stockEntry) return error(res, 404, 'Không tìm thấy lô hàng');

            if (stockEntry.status !== 'draft') {
                return error(res, 400, 'Chỉ có thể xoá lô hàng đang ở trạng thái "Nháp" (draft)');
            }

            await StockEntry.deleteOne({ _id: id });

            success(res, 200, 'Xoá lô hàng thành công');
        } catch (err) {
            console.error(err);
            error(res, 500, 'Không thể xoá lô hàng');
        }
    }

    async getById(req, res) {
        try {
            const { id } = req.params;

            const stockEntry = await StockEntry.findById(id, { statusHistory: 0, remainingQuantity: 0 })
                .lean();

            if (!stockEntry) {
                return error(res, 404, 'Lô hàng không tồn tại');
            }

            success(res, 200, 'Lấy thông tin lô hàng thành công', stockEntry);
        } catch (err) {
            console.error(err);
            error(res, 500, 'Có lỗi xảy ra khi lấy thông tin lô hàng');
        }
    }

}

module.exports = new StockEntriesController();
