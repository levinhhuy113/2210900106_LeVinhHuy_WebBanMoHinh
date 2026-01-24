const { success, error } = require('../../../helpers/response');

const Order = require('../../../models/order.model');
const OrderItem = require('../../../models/orderItem.model');
const User = require('../../../models/user.model');
const fs = require('fs');
const path = require('path');


class OrderController {
    async overview(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = 10;


            const { status, paymentMethod, q } = req.query;
            const filter = {};

            if (status) filter.status = status;
            if (paymentMethod) filter.paymentMethod = paymentMethod;

            if (q) {
                const regex = new RegExp(q.trim(), 'i');

                const matchedUsers = await User.find({ fullName: regex }).select('_id').lean();
                const matchedUserIds = matchedUsers.map(u => u._id);

                filter.$or = [
                    { orderCode: regex },
                    { userId: { $in: matchedUserIds } }
                ];
            }

            const totalItems = await Order.countDocuments();
            const totalPages = Math.ceil(totalItems / limit);

            const orders = await Order.find(filter)
                .sort({ createdAt: -1 }) 
                .skip((page - 1) * limit)
                .limit(limit)
                .lean();

            const userIds = orders.map(o => o.userId);
            const users = await User.find({ _id: { $in: userIds } })
                // .select('_id')
                .lean();

            // Map user vào order
            const userMap = {};
            users.forEach(u => {
                userMap[u._id] = u;
            });

            const enhancedOrders = orders.map(o => ({
                ...o,
                user: userMap[o.userId] || null,
            }));

            // Tính toán phân trang
            const startIndex = (page - 1) * limit;
            const endIndex = Math.min(startIndex + enhancedOrders.length, totalItems);

            res.render('admin/orders', {
                title: 'Quản lý đơn hàng',
                orders: enhancedOrders,
                currentFilters: { status, paymentMethod, q },
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
            console.error(err);
            return error(res, 500, 'Có lỗi xảy ra khi lấy danh sách đơn hàng');
        }
    }

    async detail(req, res) {
        try {
            const { id } = req.params;

            const order = await Order.findById(id)
                .populate({ path: 'userId', select: 'fullName email' })
                .lean();

            if (!order) {
                return res.status(404).render('admin/404', { title: 'Không tìm thấy đơn hàng' });
            }

            const orderItems = await OrderItem.find({ orderId: id })
                .populate({ path: 'productId', select: 'name images variantCombinations' })
                .sort({ createdAt: -1 })
                .lean();

            let totalQuantity = 0;
            let totalPrice = 0;
            orderItems.forEach(item => {
                const product = item.productId;
                const combination = item.variantCombinationId ? product.variantCombinations.find(c => c._id == item.variantCombinationId) : null;
                item.productId.images = item.variantCombinationId ? combination.images : item.productId.images;
                item.variantKey = combination?.variantKey
                totalQuantity += item.quantity;
                totalPrice += item.price * item.quantity;
            });

            const user = await User.findById(order.userId._id).lean();

            const locations = JSON.parse(
                fs.readFileSync(path.join(__dirname, '../../../data.json'), 'utf-8')
            );

            const getNameById = () => {
                const province = locations.find(p => p.Id === user.provinceId);
                if (!province) return {};

                const district = province.Districts.find(d => d.Id === user.districtId);
                const ward = district?.Wards.find(w => w.Id === user.wardCode);

                return {
                    provinceName: province?.Name || '',
                    districtName: district?.Name || '',
                    wardName: ward?.Name || ''
                };
            };

            const { provinceName, districtName, wardName } = getNameById();

            // Build full address
            const fullAddress = [
                wardName,
                districtName,
                provinceName,
                user.address
            ].filter(Boolean).join(', ');
            const allowedTransitions = {
                pending: ['confirmed', 'cancelled'],
                confirmed: ['preparing', 'cancelled'],
                preparing: ['shipping', 'cancelled'],
                shipping: ['delivered'],
                delivered: [],
                cancelled: []
                // returned: []
            };
            res.render('admin/orderDetail', {
                title: `Chi tiết đơn hàng`,
                order,
                orderItems,
                totalQuantity,
                totalPrice,
                fullAddress,
                allowedTransitions
            });

        } catch (err) {
            console.error(err);
            error(res, 500, 'Có lỗi xảy ra khi lấy chi tiết đơn hàng');
        }
    }

}

module.exports = new OrderController();
