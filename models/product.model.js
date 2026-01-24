const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// Định nghĩa schema cho bảng "products"
const ProductSchema = new mongoose.Schema({
    // ID sản phẩm (UUID)
    _id: {
        type: String,
        default: uuidv4,
        required: true
    },
    // ==== Thông tin cơ bản ====
    name: {
        type: String,
        required: true,
        trim: true
    },

    categoryId: {
        type: String,
        ref: 'Category',
        required: true
    },
    brandId: {
        type: String,
        ref: 'Brand',
        required: true
    },
    productInfo: {       // thông tin sản phẩm
        type: String,
        trim: true,
        default: ''
    },
    usage: {             // công dụng
        type: String,
        trim: true,
        default: ''
    },
    // ==== Giá bán ====
    price: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    hasVariants: { type: Boolean, default: false },
    images: {
        type: [String],
        default: []
    },
    variants: {
        type: [{
            _id: { type: String, default: uuidv4 },
            name: { type: String, required: true },      // tên biến thể, ví dụ "Color", "Size"
            options: { type: [String], required: true }  // các option, ví dụ ["Red","Blue"]
        }],
        default: []
    },

    // Tổ hợp biến thể (SKU-level) quản lý tồn kho và ảnh riêng
    variantCombinations: {
        type: [{
            _id: { type: String, default: uuidv4 },
            variantKey: { type: String, required: true }, // ví dụ "red_S"
            variants: {
                type: [{
                    _id: false,
                    variantId: { type: String, required: true },
                    // name: { type: String, required: true },
                    value: { type: String, required: true }
                }],
                required: true
            },
            images: { type: [String], default: [] }, // ảnh riêng cho combination này
            price: { type: Number, required: true, min: 0, default: 0 },
            stock: { type: Number, default: 0, min: 0 }
        }],
        default: []
    },
    // ==== Trạng thái sản phẩm ====
    isActive: { type: Boolean, default: false },

}, {
    versionKey: false,
    timestamps: true     // tự động thêm createdAt & updatedAt
});

// Export model
module.exports = mongoose.model('Product', ProductSchema, 'products');
