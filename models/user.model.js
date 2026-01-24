const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// Định nghĩa schema cho bảng "users"
const UserSchema = new mongoose.Schema({
    // ID người dùng (dạng UUID)
    _id: {
        type: String,
        default: uuidv4,
        required: true
    },

    // ==== Thông tin cá nhân ====
    fullName: {
        type: String,
        required: true,
        trim: true // loại bỏ khoảng trắng đầu/cuối
    },
    email: {
        type: String,
        unique: true, // không được trùng
        required: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Email không hợp lệ (vd: ten@gmail.com)']
    },
    password: {
        type: String,
        required: true,
        maxLength: 255
    },
    avatarUrl: { type: String }, // link ảnh đại diện

    // ==== Thông tin liên hệ (chỉ hiển thị, không dùng để đăng nhập) ====
    phoneNumber: { type: String },
    address: { type: String, trim: true },
    provinceId: { type: String },
    districtId: { type: String },
    wardCode: { type: String },

    // ==== Quyền & trạng thái tài khoản ====
    role: {
        type: Number,
        enum: [0, 1], // 0: Admin | 1: User
        default: 1
    },
    status: {
        type: Number,
        enum: [0, 1, 2], // 0: Vô hiệu hóa | 1: Kích hoạt | 2: Khoá tài khoản
        default: 1
    }
}, {
    versionKey: false,  // tắt trường __v của mongoose
    timestamps: true    // tự động thêm createdAt & updatedAt
});

// Export model
module.exports = mongoose.model('User', UserSchema, 'users');
