const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const BrandSchema = new mongoose.Schema({
    // ID thương hiệu (UUID)
    _id: {
        type: String,
        default: uuidv4,
        required: true
    },

    // ==== Thông tin thương hiệu ====
    name: {
        type: String,
        required: true,
        trim: true
    },
    // ==== Trạng thái thương hiệu ====
    isActive: {
        type: Boolean,
        default: true,
        index: true
    }

}, {
    versionKey: false,
    timestamps: false
});

module.exports = mongoose.model('Brand', BrandSchema, 'brands');
