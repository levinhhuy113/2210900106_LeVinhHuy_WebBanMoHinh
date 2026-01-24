const User = require('../../../models/user.model');

class CustomersController {
    async overview(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = 10;

            const q = req.query.q?.trim() || null;
            const roleFilter = req.query.role;
            const statusFilter = req.query.status;

            let matchCondition = {};

            if (q) {
                matchCondition.$or = [
                    { fullName: { $regex: q, $options: 'i' } },
                    { email: { $regex: q, $options: 'i' } }
                ];
            }

            if (roleFilter !== undefined && roleFilter !== '') {
                matchCondition.role = Number(roleFilter);
            }

            if (statusFilter !== undefined && statusFilter !== '') {
                matchCondition.status = Number(statusFilter);
            }

            const totalItems = await User.countDocuments(matchCondition);
            const totalPages = Math.ceil(totalItems / limit);

            const users = await User.find(matchCondition)
                .select('-password')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean();

            const startIndex = (page - 1) * limit;
            const endIndex = Math.min(startIndex + users.length, totalItems);
 
            res.render('admin/customers', {
                title: 'Quản lý người dùng',
                users,
                q,
                roleFilter,
                statusFilter,
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
                }
            });

        } catch (err) {
            console.error('Customers Error:', err);
            res.render('admin/customers', {
                title: 'Quản lý người dùng',
                users: [],
                pagination: null
            });
        }
    }
}

module.exports = new CustomersController();
