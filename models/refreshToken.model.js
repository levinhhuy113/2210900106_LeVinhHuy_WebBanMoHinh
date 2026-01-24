const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// === Refresh Token Schema ===
// Lưu token cấp lại (refresh token) cho mỗi lần đăng nhập
// Giúp người dùng duy trì phiên mà không phải login lại

const RefreshTokenSchema = new mongoose.Schema({
    _id: {
        type: String,
        default: uuidv4, // UUID cho dễ quản lý và tránh trùng
        required: true
    },

    userId: {
        type: String,
        ref: 'User', // tham chiếu tới collection users
        required: true
    },

    token: {
        type: String,
        required: true,
        unique: true, // mỗi token chỉ tồn tại 1 bản
        trim: true
    },

    // Phân biệt đăng nhập đa thiết bị
    userAgent: {
        type: String,
        default: null
    },

    ipAddress: {
        type: String,
        default: null
    },

    // Thời điểm hết hạn token
    expiresAt: {
        type: Date,
        required: true
    }
}, {
    versionKey: false,
    timestamps: true // tự thêm createdAt, updatedAt
});

module.exports = mongoose.model('RefreshToken', RefreshTokenSchema, 'refreshTokens');
