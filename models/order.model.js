// models/Order.js
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const OrderSchema = new mongoose.Schema({
    // id đơn hàng (UUID)
    _id: {
        type: String,
        default: uuidv4,
        required: true
    },

    // Ai đặt
    userId: {
        type: String,
        ref: 'User',
        required: true
    },

    // Mã đơn hiển thị
    orderCode: {
        type: String,
        default: () => 'ORD-' + Math.floor(100000 + Math.random() * 900000),
        unique: true,
        required: true
    },

    // Thông tin nhận hàng (to = người nhận)
    toName: { type: String, required: true },
    toPhone: { type: String, required: true },
    toAddress: { type: String, required: true },
    provinceId: { type: String },
    districtId: { type: String },   // ví dụ: '077' hoặc UUID tùy cách bạn lưu
    wardCode: { type: String },     // ví dụ: '00123' hoặc mã xã/phường

    // Thanh toán
    paymentMethod: {
        type: String,
        enum: ['cod', 'vnpay', 'momo', 'zalopay'],
        default: 'cod'
    },
    gateway: { type: String },      // vnpay | momo | zalopay
    transactionId: { type: String },// mã giao dịch từ cổng thanh toán
    // (Tuỳ) trạng thái thanh toán riêng để biết đã pay online hay chưa
    paymentStatus: {
        type: String,
        enum: ['unpaid', 'paid', 'refunded'],
        default: 'unpaid'
    },

    // Tổng tiền đơn (tính trước thuế/ship nếu cần)
    totalPrice: {
        type: Number,
        required: true
    },

    // Trạng thái cho toàn bộ đơn hàng (một trường duy nhất như bạn yêu cầu)
    status: {
        type: String,
        enum: [
            'pending',      // chờ duyệt (khách đã đặt)
            'confirmed',    // admin đã xác nhận
            'preparing',    // đang chuẩn bị / đóng gói
            'shipping',     // đang giao (nếu có)
            'delivered',    // đã giao / hoàn tất
            'cancelled',    // bị hủy
        ],
        default: 'pending'
    },

    // Ghi chú (khách / admin)
    note: { type: String, trim: true }
}, {
    versionKey: false,
    timestamps: true
});

module.exports = mongoose.model('Order', OrderSchema, 'orders');
