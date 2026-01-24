const Cart = require('../../../models/cart.model');
const Product = require('../../../models/product.model');
const Order = require('../../../models/order.model');
const OrderItem = require('../../../models/orderItem.model');
const User = require('../../../models/user.model');
const StockEntry = require('../../../models/stockEntry.model');

const { success, error } = require('../../../helpers/response');
const request = require('request');
const moment = require('moment');



class PaymentController {
    
    async create(req, res) {
        try {
            const userId = req.user?._id || req.body.userId;
            const { selectedIndexes, paymentType } = req.body;

            let indexes = [];
            try {
                indexes = Array.isArray(selectedIndexes)
                    ? selectedIndexes.map(Number)
                    : JSON.parse(selectedIndexes).map(Number);
            } catch (e) {
                return error(res, 400, 'Dữ liệu sản phẩm không hợp lệ');
            }

            if (!indexes.length) {
                return error(res, 400, 'Bạn chưa chọn sản phẩm để thanh toán');
            }

            const cart = await Cart.findOne({ userId });
            if (!cart || !cart.products.length)
                return error(res, 400, 'Giỏ hàng trống.');

            const selectedItems = indexes
                .map(i => cart.products[i])
                .filter(Boolean);

            if (!selectedItems.length)
                return error(res, 400, 'Không tìm thấy sản phẩm hợp lệ trong giỏ');

            const productDetails = await Product.find({
                _id: { $in: selectedItems.map(p => p.productId) }
            }).lean();

            const productMap = new Map(
                productDetails.map(p => [p._id.toString(), p])
            );
            for (const item of selectedItems) {
                const product = productMap.get(item.productId.toString());
                const variantCombination = item.variantCombinationId ? product.variantCombinations.find(com => com._id == item.variantCombinationId) : null;
                item.variantCombination = variantCombination;
                if (!product || !product.isActive) {
                    return error(
                        res,
                        400,
                        `Sản phẩm "${product?.name || 'Không xác định'}" không còn kinh doanh`
                    );
                }

                const matchStock = {
                    productId: item.productId,
                    status: 'imported',
                    remainingQuantity: { $gt: 0 }
                };

                if (item.variantCombinationId != null) {
                    matchStock.variantCombinationId = item.variantCombinationId;
                }

                const stockAgg = await StockEntry.aggregate([
                    { $match: matchStock },
                    { $group: { _id: null, total: { $sum: '$remainingQuantity' } } }
                ]);

                const availableQty = stockAgg[0]?.total || 0;

                if (availableQty < item.quantity) {
                    return error(
                        res,
                        401,
                        `Sản phẩm "${product.name}"${item.variantCombinationId ? `(${variantCombination.variantKey})` : ''
                        } đã hết hàng/ngừng kinh doanh!`
                    );
                }
            }

            const totalPrice = selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

            const user = await User.findById(req.user._id);
            if (!user) return error(res, 404, 'Người dùng không tồn tại');
            if (
                !user.fullName ||
                !user.phoneNumber ||
                !user.address ||
                !user.provinceId ||
                !user.districtId ||
                !user.wardCode
            ) {
                return error(res, 400, 'Vui lòng cập nhật đầy đủ thông tin nhận hàng trước khi thanh toán.');
            }

            const newOrder = await Order.create({
                userId,
                toName: user.fullName,
                toPhone: user.phoneNumber,
                toAddress: user.address,
                provinceId: user.provinceId,
                districtId: user.districtId,
                wardCode: user.wardCode,
                paymentMethod: paymentType === 'vnpay' ? 'vnpay' : 'cod',
                gateway: paymentType === 'vnpay' ? 'vnpay' : undefined,
                totalPrice,
                status: 'pending',
            });

            // ====== Tạo Order Item cho từng sản phẩm ======
            await Promise.all(
                selectedItems.map(item => {
                    return OrderItem.create({
                        orderId: newOrder._id,
                        productId: item.productId,
                        variantCombinationId: item.variantCombinationId,
                        quantity: item.quantity,
                        price: item.price,
                        batches: []
                    });
                })
            );

            // Xóa các sản phẩm đó khỏi giỏ
            // cart.products = cart.products.filter(p => !productIds.includes(p.productId));
            indexes
                .sort((a, b) => b - a) // xoá từ index lớn xuống
                .forEach(i => {
                    cart.products.splice(i, 1);
                });

            let paymentUrl = null
            if (paymentType === 'vnpay') {
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
                let amount = totalPrice * 100;;
                const orderCode = newOrder.orderCode;
                let orderId = orderCode;

                // let bankCode = req.body.bankCode;

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
            } else if (paymentType === 'cod') {
                paymentUrl = `/payment/result?orderCode=${newOrder.orderCode}&paymentMethod=cod`;
            }

            await cart.save();

            return success(res, 200, 'Tạo đơn hàng thành công', {
                orderId: newOrder._id,
                totalPrice,
                paymentUrl
            });
        } catch (err) {
            console.error(err);
            return error(res, 'Lỗi khi tạo đơn hàng.');
        }
    }


    async buyNow(req, res) {
        try {
            const userId = req.user._id;
            const { productId, quantity = 1, paymentType } = req.body;

            if (!productId)
                return error(res, 400, 'Thiếu productId');

            // Lấy thông tin sản phẩm
            const product = await Product.findById(productId).lean();
            if (!product) return error(res, 404, 'Sản phẩm không tồn tại');

            // Kiểm tra tồn kho
            const stock = await StockEntry.aggregate([
                { $match: { productId, status: 'imported', remainingQuantity: { $gt: 0 } } },
                { $group: { _id: '$productId', totalStock: { $sum: '$remainingQuantity' } } }
            ]);

            if (!stock.length || stock[0].totalStock < quantity)
                return error(res, 400, 'Sản phẩm hết hàng');

            // Lấy info user
            const user = await User.findById(userId);
            if (!user.fullName || !user.phoneNumber || !user.address)
                return error(res, 400, 'Vui lòng cập nhật thông tin nhận hàng trước khi thanh toán.');

            // Tạo đơn
            const newOrder = await Order.create({
                userId,
                toName: user.fullName,
                toPhone: user.phoneNumber,
                toAddress: user.address,
                provinceId: user.provinceId,
                districtId: user.districtId,
                wardCode: user.wardCode,
                paymentMethod: paymentType === 'vnpay' ? 'vnpay' : 'cod',
                totalPrice: product.price * quantity,
                status: 'pending',
            });

            // OrderItem
            await OrderItem.create({
                orderId: newOrder._id,
                productId,
                quantity,
                price: product.price,
                batches: []
            });

            // Xử lý redirect thanh toán
            let paymentUrl = null;

            if (paymentType === 'vnpay') {
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
                let amount = totalPrice * 100;;
                const orderCode = newOrder.orderCode;
                let orderId = orderCode;

                // let bankCode = req.body.bankCode;

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
            } else {
                paymentUrl = `/payment/result?orderCode=${newOrder.orderCode}&paymentMethod=cod`;
            }
            return success(res, 200, 'Tạo đơn BUY NOW thành công', {
                orderId: newOrder._id,
                paymentUrl
            });

        } catch (err) {
            console.error(err);
            return error(res, 500, 'Lỗi khi mua ngay');
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
        // encode value, space => '+', giống demo VNPay
        sorted[decodeURIComponent(str[i])] = encodeURIComponent(obj[decodeURIComponent(str[i])]).replace(/%20/g, "+");
    }
    return sorted;
}
module.exports = new PaymentController();
