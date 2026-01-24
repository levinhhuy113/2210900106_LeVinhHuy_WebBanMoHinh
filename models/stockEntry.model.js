const mongoose = require('mongoose');
const { Schema } = mongoose;

const StockEntrySchema = new Schema(
    {
        // Mã lô hàng (auto hoặc nhập tay)
        batchCode: {
            type: String,
            required: true,
            trim: true,
        },

        // Sản phẩm thuộc lô hàng
        productId: {
            type: String,
            ref: 'Product',
            required: true,
        },
        variantCombinationId: {
            type: String,
            default: null,
        },
        // Giá nhập 1 sản phẩm
        importPrice: {
            type: Number,
            required: true,
            min: 0,
        },

        // Số lượng nhập
        quantity: {
            type: Number,
            required: true,
            min: 1,
        },

        // Số lượng còn lại trong kho
        remainingQuantity: {
            type: Number,
            required: true,
            min: 0,
        },

        // Ngày nhập
        importDate: {
            type: Date,
            default: Date.now,
        },

        // Ghi chú (ví dụ: nhập từ xưởng A, hàng lỗi, v.v.)
        note: {
            type: String,
            trim: true,
            default: '',
        },

        // Trạng thái lô hàng
        status: {
            type: String,
            enum: [
                'draft',         // Tạo mới, chưa nhập kho
                'imported',      // Đã nhập kho, có thể bán
                'cancelled',     // Ngừng bán tạm thời hoặc do lỗi, có thể khôi phục
                'discontinued',  // Dừng bán lô này vĩnh viễn
                'sold_out'       // Hết hàng
            ],
            default: 'draft'
        },
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('StockEntry', StockEntrySchema, 'stockEntries');
