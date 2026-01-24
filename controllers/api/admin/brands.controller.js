const { success, error } = require('../../../helpers/response');
const Brand = require('../../../models/brand.model');

class BrandController {
    async add(req, res) {
        try {
            const { name } = req.body;

            const newBrand = new Brand({
                name
            });

            await newBrand.save();

            success(res, 200, 'Thêm thương hiệu thành công', newBrand);

        } catch (err) {
            console.error(err);
            if (err.status) return error(res, err.status, err.message);

            error(res, 500, 'Có lỗi xảy ra');
        }
    }

    async edit(req, res) {
        try {
            const { id } = req.params;
            const { name } = req.body;

            const brand = await Brand.findById(id);
            if (!brand) return error(res, 404, 'Thương hiệu không tồn tại');

            brand.name = name;

            await brand.save();

            success(res, 200, 'Cập nhật thương hiệu thành công', brand);
        } catch (err) {
            console.error(err);
            if (err.status) return error(res, err.status, err.message);
            error(res, 500, 'Có lỗi xảy ra khi cập nhật thương hiệu');
        }
    }

    async delete(req, res) {
        try {
            const { id } = req.params;

            const brand = await Brand.findById(id);
            if (!brand) {
                return error(res, 404, 'Thương hiệu không tồn tại');
            }

            await Brand.findByIdAndDelete(id);

            success(res, 200, 'Xóa thương hiệu thành công');
        } catch (err) {
            console.error(err);
            error(res, 500, 'Có lỗi xảy ra khi xóa thương hiệu');
        }
    }

    async toggle(req, res) {
        try {
            const { id } = req.params;

            const brand = await Brand.findById(id);
            if (!brand) {
                return error(res, 404, 'Thương hiệu không tồn tại');
            }

            brand.isActive = !brand.isActive;
            await brand.save();

            success(res, 200, 'Cập nhật trạng thái thành công', {
                id: brand._id,
                isActive: brand.isActive
            });
        } catch (err) {
            console.error(err);
            error(res, 500, 'Có lỗi xảy ra khi cập nhật trạng thái thương hiệu');
        }
    }

    async getById(req, res) {
        try {
            const { id } = req.params;
            const brand = await Brand.findById(id).lean();
            if (!brand) return error(res, 404, 'Thương hiệu không tồn tại');

            success(res, 200, 'Lấy thông tin thương hiệu thành công', brand);
        } catch (err) {
            console.error(err);
            error(res, 500, 'Có lỗi xảy ra khi lấy thương hiệu');
        }
    }
}

module.exports = new BrandController();
