const Product = require('../models/product.model');
const Category = require('../models/category.model');
const Brand = require('../models/brand.model');
const StockEntry = require('../models/stockEntry.model');
const { error } = require('../helpers/response');

async function validateAddProduct(req, res, next) {
    try {
        const { name, price, categoryId, brandId, hasVariants } = req.body;
        // const files = req.files;
        console.log(hasVariants)
        // Kiểm tra tên
        if (!name || !name.trim()) {
            // deleteTempFiles(req.files);
            return error(res, 400, 'Tên sản phẩm là bắt buộc');
        }

        // Kiểm tra giá
        if (!hasVariants && (price == null || isNaN(price) || Number(price) < 0)) {
            // deleteTempFiles(req.files);
            return error(res, 400, 'Giá bán không hợp lệ');
        }

        // Kiểm tra danh mục
        if (!categoryId) {
            // deleteTempFiles(req.files);
            return error(res, 400, 'Danh mục là bắt buộc');
        }

        if (!brandId) {
            // deleteTempFiles(req.files);
            return error(res, 400, 'Thương hiệu là bắt buộc');
        }
        // --- Kiểm tra ảnh ---
        // if (!files || files.length === 0) {
        //     deleteTempFiles(req.files);
        //     return error(res, 400, 'Cần chọn ít nhất 1 hình ảnh cho sản phẩm');
        // }

        const category = await Category.findById(categoryId);
        if (!category) {
            // deleteTempFiles(req.files);
            return error(res, 404, 'Danh mục không tồn tại');
        }
        const brand = await Brand.findById(brandId);
        if (!brand) {
            // deleteTempFiles(req.files);
            return error(res, 404, 'Thương hiệu không tồn tại');
        }
        // Kiểm tra trùng tên sản phẩm trong cùng danh mục
        const exists = await Product.findOne({
            categoryId,
            brandId,
            name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
        });

        if (exists) {
            // deleteTempFiles(req.files);
            return error(res, 400, 'Sản phẩm cùng tên đã tồn tại trong danh mục và thương hiệu này');
        }

        next();
    } catch (err) {
        console.error(err);
        // deleteTempFiles(req.files);
        return error(res, 500, 'Lỗi khi validate sản phẩm');
    }
}


async function validateEditProduct(req, res, next) {
    try {
        const { name, price, categoryId, brandId, hasVariants } = req.body;
        const { id } = req.params; // id của sản phẩm hiện tại

        // Kiểm tra tên
        if (!name || !name.trim()) {
            // deleteTempFiles(req.files);
            return error(res, 400, 'Tên sản phẩm là bắt buộc');
        }

        // Kiểm tra giá
        if (!hasVariants && (price == null || isNaN(price) || Number(price) < 0)) {
            // deleteTempFiles(req.files);
            return error(res, 400, 'Giá bán không hợp lệ');
        }

        // Kiểm tra danh mục
        if (!categoryId) {
            // deleteTempFiles(req.files);
            return error(res, 400, 'Danh mục là bắt buộc');
        }

        if (!brandId) {
            // deleteTempFiles(req.files);
            return error(res, 400, 'Thương hiệu là bắt buộc');
        }

        // Kiểm tra danh mục có tồn tại
        const category = await Category.findById(categoryId);
        if (!category) {
            // deleteTempFiles(req.files);
            return error(res, 404, 'Danh mục không tồn tại');
        }

        const brand = await Brand.findById(brandId);
        if (!brand) {
            // deleteTempFiles(req.files);
            return error(res, 404, 'Thương hiệu không tồn tại');
        }

        // Kiểm tra trùng tên trong cùng danh mục, bỏ qua sản phẩm hiện tại
        const duplicate = await Product.findOne({
            categoryId,
            brandId,
            name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
            _id: { $ne: id }
        });

        if (duplicate) {
            // deleteTempFiles(req.files);
            return error(res, 400, 'Sản phẩm cùng tên đã tồn tại trong danh mục và thương hiệu này');
        }

        // Không yêu cầu file ảnh nếu không có file mới
        // => Nếu có file thì xử lý ở controller
        next();
    } catch (err) {
        console.error(err);
        // deleteTempFiles(req.files);
        return error(res, 500, 'Lỗi khi validate sản phẩm');
    }
}

async function validateDeleteProduct(req, res, next) {
    try {
        const { id } = req.params;

        const product = await Product.findById(id);
        if (!product) {
            return error(res, 404, 'Sản phẩm không tồn tại');
        }

        const existingBatch = await StockEntry.findOne({ productId: id });
        if (existingBatch) {
            return error(res, 400, 'Sản phẩm đã có lô hàng, không thể xoá');
        }

        next();
    } catch (err) {
        return error(res, 500, 'Lỗi validate khi xoá sản phẩm', err.message);
    }
}



function deleteTempFiles(files) {
    if (!files || files.length === 0) return;
    for (const f of files) {
        try {
            const filePath = path.join(__dirname, '../public/uploads/products', f.filename);
            fs.unlink(filePath, (err) => {
                if (err && err.code !== 'ENOENT') {
                    console.error('Không thể xoá file tạm:', filePath, err.message);
                }
            });
        } catch (e) {
            console.error('Lỗi khi xoá file tạm:', e.message);
        }
    }
}

module.exports = {
    validateAddProduct,
    validateEditProduct,
    validateDeleteProduct
};