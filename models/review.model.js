const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// Model đánh giá sản phẩm
const ReviewSchema = new mongoose.Schema({
    _id: {
        type: String,
        default: uuidv4,
        required: true
    },

    // User đánh giá
    userId: {
        type: String,
        required: true,
        ref: 'User'
    },

    // Sản phẩm được đánh giá
    productId: {
        type: String,
        required: true,
        ref: 'Product'
    },

    orderItemId: {
        type: String,
        required: true,
        ref: 'OrderItem'
    },
    variantCombinationId: { type: String, default: null },
    // Điểm số từ 1 -> 5
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },

    // Nội dung đánh giá
    comment: {
        type: String,
        trim: true,
        maxlength: 1000
    },

    // Hình ảnh đính kèm đánh giá (nếu có)
    images: {
        type: [String], // mảng URL
        default: []
    },

    // Trạng thái hiển thị (có thể dùng để duyệt trước khi public)
    status: {
        type: Number,
        enum: [0, 1], // 0: ẩn / 1: hiển thị
        default: 1
    }
}, {
    versionKey: false,
    timestamps: true // createdAt & updatedAt
});

module.exports = mongoose.model('Review', ReviewSchema, 'reviews');
