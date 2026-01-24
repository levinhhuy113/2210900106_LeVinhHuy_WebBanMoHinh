const Brand = require('../models/brand.model');
const Product = require('../models/product.model');
const { error } = require('../helpers/response');

async function validateAddBrand(req, res, next) {
    try {
        const { name } = req.body;

        if (!name || !name.trim()) {
            return error(res, 400, 'Tên thương hiệu là bắt buộc');
        }

        const exists = await Brand.findOne({
            name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
        });

        if (exists) {
            return error(res, 400, 'Tên thương hiệu đã tồn tại');
        }

        next();
    } catch (err) {
        console.error(err);
        return error(res, 500, 'Lỗi khi validate thương hiệu');
    }
}

async function validateEditBrand(req, res, next) {
    try {
        const { id } = req.params;
        const { name } = req.body;

        if (!name || !name.trim()) {
            return error(res, 400, 'Tên thương hiệu là bắt buộc');
        }

        const exists = await Brand.findOne({
            _id: { $ne: id },
            name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
        });

        if (exists) {
            return error(res, 400, 'Tên thương hiệu đã tồn tại');
        }

        next();
    } catch (err) {
        console.error(err);
        return error(res, 500, 'Lỗi khi validate chỉnh sửa thương hiệu');
    }
}

async function validateDeleteBrand(req, res, next) {
    try {
        const { id } = req.params;

        const brand = await Brand.findById(id);
        if (!brand) {
            return error(res, 404, 'Thương hiệu không tồn tại');
        }

        const existingProduct = await Product.findOne({ brandId: id });
        if (existingProduct) {
            return error(res, 400, 'Thương hiệu đã có sản phẩm, không thể xoá');
        }

        next();
    } catch (err) {
        return error(res, 500, 'Lỗi validate khi xoá thương hiệu', err.message);
    }
}

module.exports = {
    validateAddBrand,
    validateEditBrand,
    validateDeleteBrand
};
