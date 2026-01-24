const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { v4: uuidv4 } = require('uuid');


const OrderItems = new Schema({
    _id: {
        type: String,
        default: uuidv4,
        required: true
    },
    orderId: { type: String, ref: "Order", required: true },
    productId: { type: String, ref: "Product", required: true },
    variantCombinationId: { type: String, default: null },
    batches: [{
        _id: false,
        batchCode: { type: String },
        quantity: { type: Number }
    }],
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    reviewed: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});
module.exports = mongoose.model('OrderItem', OrderItems, 'orderItems');
