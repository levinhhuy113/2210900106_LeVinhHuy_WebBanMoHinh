const User = require('../../../models/user.model');

const { error } = require('../../../helpers/response');

class ProfileController {
    async overview(req, res) {
        try {
            const user = await User.findById(req.user._id)
                .select('-password')
                .lean();


            if (!user) {
                return res.status(404).render('errors/404', { message: 'Người dùng không tồn tại' });
            }
            res.render('user/profile', {
                title: 'Profile',
                user
            });
        } catch (err) {
            console.error(err);
            res.status(500).render('errors/500', { message: 'Lỗi khi tải trang profile' });
        }
    }
}

module.exports = new ProfileController();
