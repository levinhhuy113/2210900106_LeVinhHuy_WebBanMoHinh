const { success, error } = require('../../../helpers/response');

const Category = require('../../../models/category.model');
const Product = require('../../../models/product.model');

class CategoryController {
    async overview(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = 10;

            const totalItems = await Category.countDocuments();
            const totalPages = Math.ceil(totalItems / limit);

            // Lấy danh mục với phân trang
            let categories = await Category.find()
                .sort({ name: 1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean();

            // === Lấy danh mục đang có trong Product ===
            const productCategories = await Product.distinct('categoryId'); // trả về mảng id string

            // Thêm isDelete (true nếu chưa có trong product, false nếu đang được dùng)
            categories = categories.map(c => ({
                ...c,
                isDelete: !productCategories.includes(c._id)
            }));

            const startIndex = (page - 1) * limit;
            const endIndex = Math.min(startIndex + categories.length, totalItems);

            res.render('admin/categories', {
                title: 'Quản lý danh mục',
                categories,
                pagination: {
                    startIndex: startIndex + (totalItems > 0 ? 1 : 0),
                    endIndex,
                    totalItems,
                    currentPage: page,
                    totalPages,
                    hasPrevPage: page > 1,
                    hasNextPage: page < totalPages,
                    prevPage: page - 1,
                    nextPage: page + 1
                },
            });
        } catch (err) {
            console.error(err);
            error(res, 500, 'Có lỗi xảy ra khi lấy danh sách danh mục');
        }
    }
}

module.exports = new CategoryController();
