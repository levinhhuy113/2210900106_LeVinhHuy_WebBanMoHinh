const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const CategorySchema = new mongoose.Schema({
    // ID danh mục (UUID)
    _id: {
        type: String,
        default: uuidv4,
        required: true
    },

    // ==== Thông tin danh mục ====
    name: {
        type: String,
        required: true,
        trim: true
    },
    // ==== Trạng thái danh mục ====
    isActive: {
        type: Boolean,
        default: true,
        index: true
    }

}, {
    versionKey: false,
    timestamps: false
});
module.exports = mongoose.model('Category', CategorySchema, 'categories');
