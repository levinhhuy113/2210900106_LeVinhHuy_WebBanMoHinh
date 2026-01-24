
const Order = require('../../../models/order.model');
const OrderItem = require('../../../models/orderItem.model');
const moment = require('moment-timezone');

class DashboardController {
    async overview(req, res) {
        try {
            const dateRange = resolveDateRange(req.query);

            const [
                pending,
                confirmed,
                preparing,
                shipping,
                delivered,
                cancelled
            ] = await Promise.all([
                Order.countDocuments({ status: 'pending' }),
                Order.countDocuments({ status: 'confirmed' }),
                Order.countDocuments({ status: 'preparing' }),
                Order.countDocuments({ status: 'shipping' }),
                Order.countDocuments({ status: 'delivered' }),
                Order.countDocuments({ status: 'cancelled' })
            ]);

            const [totalOrders, codCount, vnpayCount] = await Promise.all([
                Order.countDocuments(),
                Order.countDocuments({ paymentMethod: 'cod' }),
                Order.countDocuments({ paymentMethod: 'vnpay' })
            ]);

            // const currentMonthRevenue = await calculateCurrentMonthRevenue();
            // const dailyRevenue = await getDailyRevenueForCurrentMonth();
            const totalRevenue = await calculateRevenueByRange(
                dateRange.startMoment.toDate(),
                dateRange.endMoment.toDate()
            );

            const dailyRevenue = await getDailyRevenueByRange(
                dateRange.startMoment.toDate(),
                dateRange.endMoment.toDate()
            );

            const paymentStats = {
                cod: {
                    count: codCount,
                    percent: totalOrders ? ((codCount / totalOrders) * 100).toFixed(2) : 0
                },
                vnpay: {
                    count: vnpayCount,
                    percent: totalOrders ? ((vnpayCount / totalOrders) * 100).toFixed(2) : 0
                }
            };

            res.render('admin/dashboard', {
                title: 'Thống kê',
                stats: {
                    pending,
                    confirmed,
                    preparing,
                    shipping,
                    delivered,
                    cancelled
                },
                paymentStats,
                revenueStats: {
                    currentMonth: totalRevenue,
                    dailyRevenue
                },
                startDate: dateRange.startDate,
                endDate: dateRange.endDate,
                currentMonth: moment().tz('Asia/Ho_Chi_Minh').format('MM/YYYY'),
                dateRangeLabel: dateRange.label
            });

        } catch (err) {
            console.error('Dashboard Error:', err);
            res.render('admin/dashboard', {
                title: 'Thống kê',
                stats: {},
                paymentStats: {},
                revenueStats: {
                    currentMonth: 0,
                    dailyRevenue: []
                }
            });
        }
    }


}
async function getDailyRevenueByRange(startDate, endDate) {
    try {
        const orders = await Order.find({
            status: 'delivered',
            createdAt: {
                $gte: startDate,
                $lte: endDate
            }
        }).select('_id createdAt');

        const orderIds = orders.map(o => o._id);
        if (!orderIds.length) return [];

        return await OrderItem.aggregate([
            { $match: { orderId: { $in: orderIds } } },
            {
                $lookup: {
                    from: 'orders',
                    localField: 'orderId',
                    foreignField: '_id',
                    as: 'orderInfo'
                }
            },
            { $unwind: '$orderInfo' },
            {
                $project: {
                    revenue: { $multiply: ['$price', '$quantity'] },
                    date: {
                        $dateToString: {
                            format: '%Y-%m-%d',
                            date: '$orderInfo.createdAt',
                            timezone: 'Asia/Ho_Chi_Minh'
                        }
                    }
                }
            },
            {
                $group: {
                    _id: '$date',
                    totalRevenue: { $sum: '$revenue' }
                }
            },
            { $sort: { _id: 1 } }
        ]);
    } catch (err) {
        console.error('Daily revenue range error:', err);
        return [];
    }
}

async function calculateRevenueByRange(startDate, endDate) {
    try {
        const orders = await Order.find({
            status: 'delivered',
            createdAt: {
                $gte: startDate,
                $lte: endDate
            }
        }).select('_id');

        const orderIds = orders.map(o => o._id);
        if (!orderIds.length) return 0;

        const result = await OrderItem.aggregate([
            { $match: { orderId: { $in: orderIds } } },
            {
                $group: {
                    _id: null,
                    totalRevenue: {
                        $sum: { $multiply: ['$price', '$quantity'] }
                    }
                }
            }
        ]);

        return result[0]?.totalRevenue || 0;
    } catch (err) {
        console.error('Revenue range error:', err);
        return 0;
    }
}

async function calculateCurrentMonthRevenue() {
    try {
        const now = moment().tz('Asia/Ho_Chi_Minh');
        const startOfMonth = now.clone().startOf('month').toDate();
        const endOfMonth = now.clone().endOf('month').toDate();

        const orders = await Order.find({
            status: 'delivered',
            createdAt: {
                $gte: startOfMonth,
                $lte: endOfMonth
            }
        }).select('_id');

        const orderIds = orders.map(order => order._id);

        if (orderIds.length === 0) {
            return 0;
        }

        const revenueResult = await OrderItem.aggregate([
            {
                $match: {
                    orderId: { $in: orderIds }
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: {
                        $sum: { $multiply: ['$price', '$quantity'] }
                    }
                }
            }
        ]);

        return revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;
    } catch (error) {
        console.error('Error calculating current month revenue:', error);
        return 0;
    }
}

async function getDailyRevenueForCurrentMonth() {
    try {
        const now = moment().tz('Asia/Ho_Chi_Minh');
        const startOfMonth = now.clone().startOf('month').toDate();
        const endOfMonth = now.clone().endOf('month').toDate();
        console.log("Check Date: " + startOfMonth + " - " + endOfMonth);

        const orders = await Order.find({
            status: 'delivered',
            createdAt: {
                $gte: startOfMonth,
                $lte: endOfMonth
            }
        }).select('_id createdAt');

        const orderIds = orders.map(order => order._id);
        if (orderIds.length === 0) {
            return [];
        }

        console.log("orderIds: " + orderIds);

        const dailyRevenue = await OrderItem.aggregate([
            {
                $match: {
                    orderId: { $in: orderIds }
                }
            },
            {
                $lookup: {
                    from: 'orders',
                    localField: 'orderId',
                    foreignField: '_id',
                    as: 'orderInfo'
                }
            },
            {
                $unwind: '$orderInfo'
            },
            {
                $project: {
                    revenue: { $multiply: ['$price', '$quantity'] },
                    date: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: "$orderInfo.createdAt",
                            timezone: "Asia/Ho_Chi_Minh"
                        }
                    }
                }
            },
            {
                $group: {
                    _id: '$date',
                    totalRevenue: { $sum: '$revenue' }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]);

        return dailyRevenue;
    } catch (error) {
        console.error('Error getting daily revenue:', error);
        return [];
    }
}

function resolveDateRange(query) {
    let { startDate, endDate } = query;

    const now = moment().tz('Asia/Ho_Chi_Minh');

    // Không chọn → mặc định tháng hiện tại
    if (!startDate || !endDate) {
        const start = now.clone().startOf('month');
        const end = now.clone().endOf('month');

        return {
            startMoment: start,
            endMoment: end,
            startDate: start.format('YYYY-MM-DD'),
            endDate: end.format('YYYY-MM-DD'),
            label: `Tháng ${now.format('MM/YYYY')}`
        };
    }

    const start = moment.tz(startDate, 'YYYY-MM-DD', 'Asia/Ho_Chi_Minh').startOf('day');
    const end = moment.tz(endDate, 'YYYY-MM-DD', 'Asia/Ho_Chi_Minh').endOf('day');

    return {
        startMoment: start,
        endMoment: end,
        startDate,
        endDate,
        label: `${start.format('DD/MM/YYYY')} - ${end.format('DD/MM/YYYY')}`
    };
}

module.exports = new DashboardController();