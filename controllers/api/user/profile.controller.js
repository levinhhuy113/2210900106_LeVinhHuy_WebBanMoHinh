const User = require('../../../models/user.model');
const RefreshToken = require('../../../models/refreshToken.model');
const { success, error } = require('../../../helpers/response');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
class ProfileController {
    async updateProfile(req, res) {
        try {
            const userId = req.user._id;
            const { fullName, phoneNumber, address, provinceId, districtId, wardCode } = req.body;

            // Kiểm tra thông tin bắt buộc
            if (!fullName || !phoneNumber || !address || !provinceId || !districtId || !wardCode) {
                return error(res, 400, 'Vui lòng điền đầy đủ thông tin');
            }

            // Lấy user hiện tại
            const user = await User.findById(userId);
            if (!user) return error(res, 404, 'Người dùng không tồn tại');

            // Xử lý avatar nếu có file mới
            if (req.file) {
                const newAvatarPath = `/uploads/common/${req.file.filename}`;

                // Xóa file cũ nếu có
                if (user.avatarUrl) {
                    const oldPath = path.join('public', user.avatarUrl);
                    if (fs.existsSync(oldPath)) {
                        try {
                            fs.unlinkSync(oldPath);
                        } catch (err) {
                            console.warn(`Không thể xoá ảnh cũ: ${user.avatarUrl}`, err.message);
                        }
                    }
                }

                // Gán ảnh mới
                user.avatarUrl = newAvatarPath;
            }


            // Cập nhật thông tin khác
            user.fullName = fullName.trim();
            user.phoneNumber = phoneNumber.trim();
            user.address = address.trim();
            user.provinceId = provinceId;
            user.districtId = districtId;
            user.wardCode = wardCode;

            await user.save();

            success(res, 200, 'Cập nhật thông tin thành công', {
                fullName: user.fullName,
                phoneNumber: user.phoneNumber,
                address: user.address,
                provinceId: user.provinceId,
                districtId: user.districtId,
                wardCode: user.wardCode,
                avatarUrl: user.avatarUrl
            });

        } catch (err) {
            console.error(err);
            error(res, 500, 'Lỗi khi cập nhật thông tin');
        }
    }
    async getLocations(req, res) {
        try {
            const filePath = path.join(__dirname, '../../../data.json');
            const data = fs.readFileSync(filePath, 'utf-8');
            const locations = JSON.parse(data);
            success(res, 200, 'Danh sách địa phương', locations);
        } catch (err) {
            console.error(err);
            error(res, 500, 'Lỗi khi lấy danh sách địa phương');
        }
    }

    // [GET] /api/location/:provinceId/districts
    async getDistricts(req, res) {
        try {
            const { provinceId } = req.params;
            const filePath = path.join(__dirname, '../../../data.json');
            const data = fs.readFileSync(filePath, 'utf-8');
            const locations = JSON.parse(data);
            const province = locations.find(p => p.Id === provinceId);
            if (!province) return error(res, 404, 'Không tìm thấy tỉnh/thành phố');
            success(res, 200, 'Danh sách quận/huyện', province.Districts);
        } catch (err) {
            console.error(err);
            error(res, 500, 'Lỗi khi lấy danh sách quận/huyện');
        }
    }

    // [GET] /api/location/:provinceId/districts/:districtId/wards
    async getWards(req, res) {
        try {
            const { provinceId, districtId } = req.params;
            const filePath = path.join(__dirname, '../../../data.json');
            const data = fs.readFileSync(filePath, 'utf-8');
            const locations = JSON.parse(data);
            const province = locations.find(p => p.Id === provinceId);
            if (!province) return error(res, 404, 'Không tìm thấy tỉnh/thành phố');
            const district = province.Districts.find(d => d.Id === districtId);
            if (!district) return error(res, 404, 'Không tìm thấy quận/huyện');
            success(res, 200, 'Danh sách phường/xã', district.Wards);
        } catch (err) {
            console.error(err);
            error(res, 500, 'Lỗi khi lấy danh sách phường/xã');
        }
    }

    // [POST] /api/profile/change-password
    async changePassword(req, res) {
        try {
            const userId = req.user._id;
            const { oldPassword, newPassword, confirmPassword } = req.body;

            if (!oldPassword || !newPassword || !confirmPassword) {
                return error(res, 400, 'Vui lòng điền đầy đủ các trường');
            }

            if (newPassword !== confirmPassword) {
                return error(res, 400, 'Mật khẩu mới và xác nhận mật khẩu không khớp');
            }

            const user = await User.findById(userId);
            if (!user) return error(res, 404, 'Người dùng không tồn tại');

            const isMatch = await bcrypt.compare(oldPassword, user.password);
            if (!isMatch) return error(res, 400, 'Mật khẩu hiện tại không đúng');

            const hashedPassword = await bcrypt.hash(newPassword, 10);
            user.password = hashedPassword;
            await user.save();

            await RefreshToken.deleteMany({ userId });

            // Xoá cookie refresh token hiện tại (nếu lưu trên cookie)
            res.clearCookie('refreshToken', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                path: '/' // nếu cookie đặt path khác thì sửa lại
            });

            res.clearCookie('accessToken', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                path: '/'
            });

            success(res, 200, 'Đổi mật khẩu thành công');
        } catch (err) {
            console.error(err);
            error(res, 500, 'Có lỗi xảy ra khi đổi mật khẩu');
        }
    }
}

module.exports = new ProfileController();
