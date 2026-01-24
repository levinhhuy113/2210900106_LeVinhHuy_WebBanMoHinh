const Category = require('../models/category.model');
const Product = require('../models/product.model');
const { error } = require('../helpers/response');

async function validateAddCategory(req, res, next) {
    try {
        const { name } = req.body;

        if (!name || !name.trim()) {
            return error(res, 400, 'Tên danh mục là bắt buộc');
        }

        const exists = await Category.findOne({
            name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
        });

        if (exists) {
            return error(res, 400, 'Tên danh mục đã tồn tại');
        }

        next();
    } catch (err) {
        console.error(err);
        return error(res, 500, 'Lỗi khi validate danh mục');
    }
}


async function validateEditCategory(req, res, next) {
    try {
        const { id } = req.params;
        const { name } = req.body;

        if (!name || !name.trim()) {
            return error(res, 400, 'Tên danh mục là bắt buộc');
        }

        const exists = await Category.findOne({
            _id: { $ne: id },
            name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
        });

        if (exists) {
            return error(res, 400, 'Tên danh mục đã tồn tại');
        }

        next();
    } catch (err) {
        console.error(err);
        return error(res, 500, 'Lỗi khi validate chỉnh sửa danh mục');
    }
}

async function validateDeleteCategory(req, res, next) {
    try {
        const { id } = req.params;

        const category = await Category.findById(id);
        if (!category) {
            return error(res, 404, 'Danh mục không tồn tại');
        }

        const existingProduct = await Product.findOne({ categoryId: id });
        if (existingProduct) {
            return error(res, 400, 'Danh mục đã có sản phẩm, không thể xoá');
        }

        next();
    } catch (err) {
        return error(res, 500, 'Lỗi validate khi xoá danh mục', err.message);
    }
}


module.exports = {
    validateAddCategory,
    validateEditCategory,
    validateDeleteCategory
};
