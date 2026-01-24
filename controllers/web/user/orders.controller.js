const { success, error } = require('../../../helpers/response');

const Order = require('../../../models/order.model');
const OrderItem = require('../../../models/orderItem.model');
const User = require('../../../models/user.model');
const fs = require('fs');
const path = require('path');

const request = require('request');
const moment = require('moment');


class OrdersController {
    async overview(req, res) {
        try {
            const userId = req.user._id;

            const statusFilter = req.query.status || "";

            const query = { userId };
            if (statusFilter && statusFilter !== "") {
                query.status = statusFilter;
            }

            const orders = await Order.find(query)
                .sort({ createdAt: -1 })
                .lean();

            for (let order of orders) {

                const rawItems = await OrderItem.find({ orderId: order._id })
                    .populate({
                        path: "productId",
                        select: "_id name images categoryId variantCombinations",
                        populate: [
                            {
                                path: "categoryId",
                                select: "name"
                            },
                            {
                                path: "brandId",
                                select: "name"
                            }
                        ]
                    })
                    .lean();


                order.items = rawItems.map(i => {
                    const p = i.productId;

                    const combination = i.variantCombinationId ? p.variantCombinations.find(c => c._id == i.variantCombinationId) : null;

                    return {
                        _id: i._id,
                        productId: p._id,
                        image: i.variantCombinationId ? combination.images[0] : p.images[0],
                        name: p?.name || "",
                        variantKey: combination?.variantKey,
                        categoryName: p?.categoryId?.name || "",
                        price: i.price,
                        qty: i.quantity,
                        total: i.price * i.quantity,
                        reviewed: i.reviewed
                    };
                });

                order.canCancel = order.status === "pending";
                order.canPay = order.status === "pending" && order.paymentMethod === "vnpay";

                if (order.canPay) {
                    let paymentUrl = null
                    if (order.paymentMethod === 'vnpay') {
                        process.env.TZ = 'Asia/Ho_Chi_Minh';
                        let date = new Date();
                        let createDate = moment(date).format('YYYYMMDDHHmmss');
                        let ipAddr = req.headers['x-forwarded-for'] ||
                            req.connection.remoteAddress ||
                            req.socket.remoteAddress ||
                            req.connection.socket.remoteAddress;

                        paymentUrl = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
                        let tmnCode = process.env.VNP_TMN_CODE;
                        let secretKey = process.env.VNP_HASH_SECRET;
                        let returnUrl = process.env.VNP_RETURN_URL;
                        let amount = order.totalPrice * 100;;
                        const orderCode = order.orderCode;
                        let orderId = orderCode;


                        let locale = 'vn'
                        let currCode = 'VND';
                        let vnp_Params = {};
                        vnp_Params['vnp_Version'] = '2.1.0';
                        vnp_Params['vnp_Command'] = 'pay';
                        vnp_Params['vnp_TmnCode'] = tmnCode;
                        vnp_Params['vnp_Locale'] = locale;
                        vnp_Params['vnp_CurrCode'] = currCode;
                        vnp_Params['vnp_TxnRef'] = orderId;
                        vnp_Params['vnp_OrderInfo'] = 'Thanh toan cho ma GD:' + orderId;
                        vnp_Params['vnp_OrderType'] = 'other';
                        vnp_Params['vnp_Amount'] = amount;
                        vnp_Params['vnp_ReturnUrl'] = returnUrl;
                        vnp_Params['vnp_IpAddr'] = ipAddr;
                        vnp_Params['vnp_CreateDate'] = createDate;
                        // if (bankCode !== null && bankCode !== '') {
                        //     vnp_Params['vnp_BankCode'] = bankCode;
                        // }

                        vnp_Params = sortObject(vnp_Params);

                        let querystring = require('qs');
                        let signData = querystring.stringify(vnp_Params, { encode: false });
                        let crypto = require("crypto");
                        let hmac = crypto.createHmac("sha512", secretKey);
                        let signed = hmac.update(new Buffer(signData, 'utf-8')).digest("hex");
                        vnp_Params['vnp_SecureHash'] = signed;
                        paymentUrl += '?' + querystring.stringify(vnp_Params, { encode: false });
                        order.paymentUrl = paymentUrl;
                    }
                }
            }
            res.render("user/orders", {
                title: "Quản lý đơn hàng",
                orders,
                activeStatus: statusFilter
            });

        } catch (err) {
            console.error(err);
            return error(res, 500, 'Có lỗi xảy ra khi lấy danh sách đơn hàng');
        }
    }

    async detail(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user._id;

            const order = await Order.findOne({ _id: id, userId }).lean();
            if (!order) {
                return error(res, 404, "Không tìm thấy đơn hàng hoặc bạn không có quyền truy cập");
            }

            const user = await User.findById(userId)
                .select("-password")
                .lean();

            if (!user) {
                return res.status(404).render('errors/404', { message: 'Người dùng không tồn tại' });
            }
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

            const fullAddress = [
                wardName,
                districtName,
                provinceName,
                user.address
            ].filter(Boolean).join(', ');

            const orderItems = await OrderItem.find({ orderId: id })
                .populate({
                    path: "productId",
                    select: "name images categoryId variantCombinations",
                    populate: [
                        { path: "categoryId", select: "name" },
                        { path: "brandId", select: "name" }
                    ]
                })
                .lean();

            const items = orderItems.map(i => {
                const p = i.productId;

                const combination = i.variantCombinationId ? p.variantCombinations.find(c => c._id == i.variantCombinationId) : null;

                return {
                    image: i.variantCombinationId ? combination.images[0] : p.images[0],
                    name: i.productId?.name || "",
                    variantKey: combination?.variantKey,
                    categoryName: i.productId?.categoryId?.name || "",
                    price: i.price,
                    quantity: i.quantity,
                    total: i.price * i.quantity
                }
            });

            const totalAmount = items.reduce((sum, i) => sum + i.total, 0);
            res.render("user/orders-detail", {
                title: `Chi tiết đơn hàng #${order.orderCode}`,
                order,
                items,
                user,
                totalAmount,
                fullAddress
            });

        } catch (err) {
            console.error(err);
            return error(res, 500, "Có lỗi xảy ra khi lấy chi tiết đơn hàng");
        }
    }
}

function sortObject(obj) {
    let sorted = {};
    let str = [];
    for (let key in obj) {
        if (obj.hasOwnProperty(key)) {
            str.push(encodeURIComponent(key));
        }
    }
    str.sort();
    for (let i = 0; i < str.length; i++) {
        sorted[decodeURIComponent(str[i])] = encodeURIComponent(obj[decodeURIComponent(str[i])]).replace(/%20/g, "+");
    }
    return sorted;
}
module.exports = new OrdersController();
