const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const CartSchema = new mongoose.Schema({
    _id: {
        type: String,
        default: uuidv4,
        required: true
    },

    // Người dùng sở hữu giỏ
    userId: {
        type: String,
        required: true,
        ref: 'User'
    },

    // Danh sách sản phẩm trong giỏ
    products: [
        {
            _id: false,
            productId: {
                type: String,
                required: true,
                ref: 'Product'
            },
            variantCombinationId: {
                type: String,
                default: null
            },
            quantity: {
                type: Number,
                required: true,
                min: 1
            },
            price: {
                type: Number,
                required: true,
                min: 0
            }
        }
    ],

    // Tổng số lượng sản phẩm (tính từ products array khi query)
    totalQuantity: {
        type: Number,
        default: 0
    },
}, {
    versionKey: false,
    timestamps: false
});

// Export model
module.exports = mongoose.model('Cart', CartSchema, 'carts');
