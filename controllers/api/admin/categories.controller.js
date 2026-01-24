const { success, error } = require('../../../helpers/response');

const Category = require('../../../models/category.model');

class CategoryController {
    async add(req, res) {
        try {
            const { name, parentId, description } = req.body;

            const newCategory = new Category({
                name,
                parentId,
                description: description || null,
            });

            await newCategory.save();

            success(res, 200, 'Thêm danh mục thành công', newCategory);

        } catch (err) {
            console.error(err);
            if (err.status) return error(res, err.status, err.message);

            error(res, 500, 'Có lỗi xảy ra');
        }
    }

    async edit(req, res) {
        try {
            const { id } = req.params;
            const { name, parentId, description } = req.body;
            const slug = req.slug;

            const category = await Category.findById(id);
            if (!category) return error(res, 404, 'Danh mục không tồn tại');

            category.name = name;
            category.parentId = parentId || null;
            category.description = description || null;
            category.slug = slug;

            await category.save();

            success(res, 200, 'Cập nhật danh mục thành công', category);
        } catch (err) {
            console.error(err);
            if (err.status) return error(res, err.status, err.message);
            error(res, 500, 'Có lỗi xảy ra khi cập nhật danh mục');
        }
    }


    async delete(req, res) {
        try {
            const { id } = req.params;

            const category = await Category.findById(id);
            if (!category) {
                return error(res, 404, 'Danh mục không tồn tại');
            }

            await Category.findByIdAndDelete(id);

            success(res, 200, 'Xóa danh mục thành công');
        } catch (err) {
            console.error(err);
            error(res, 500, 'Có lỗi xảy ra khi xóa danh mục');
        }
    }

    async toggle(req, res) {
        try {
            const { id } = req.params;

            const category = await Category.findById(id);
            if (!category) {
                return error(res, 404, 'Danh mục không tồn tại');
            }

            category.isActive = !category.isActive;
            await category.save();

            success(res, 200, 'Cập nhật trạng thái thành công', {
                id: category._id,
                isActive: category.isActive
            });
        } catch (err) {
            console.error(err);
            error(res, 500, 'Có lỗi xảy ra khi cập nhật trạng thái danh mục');
        }
    }


    async getById(req, res) {
        try {
            const { id } = req.params;
            const size = await Category.findById(id).lean();
            if (!size) return error(res, 404, 'Danh mục không tồn tại');

            success(res, 200, 'Lấy thông tin danh mục thành công', size);
        } catch (err) {
            console.error(err);
            error(res, 500, 'Có lỗi xảy ra khi lấy danh mục');
        }
    }
}

module.exports = new CategoryController();
