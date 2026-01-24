const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

// === Email Verification Schema ===
// Lưu token xác nhận email
const UserTokenSchema = new mongoose.Schema({
    _id: {
        type: String,
        default: uuidv4,
        required: true
    },

    userId: {
        type: String,
        ref: 'User', // liên kết tới user cần xác minh
        required: true
    },

    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },

    // Token xác nhận (ngẫu nhiên 32 ký tự)
    token: {
        type: String,
        required: true,
        unique: true,
        default: () => crypto.randomBytes(16).toString('hex')
    },

    // === Thời hạn của token ===
    expiresAt: {
        type: Date,
        required: true
    },
    type: {
        type: String,
        enum: [
            'verify_email',
            'reset_password',
        ],
        required: true
    },
    // === Trạng thái xác nhận ===
    verified: {
        type: Boolean,
        default: false
    },
}, {
    versionKey: false,
    timestamps: true // tự thêm createdAt, updatedAt
});

module.exports = mongoose.model('UserToken', UserTokenSchema, 'userTokens');
