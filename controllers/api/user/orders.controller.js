const Order = require('../../../models/order.model');
const OrderItem = require('../../../models/orderItem.model');
const Review = require('../../../models/review.model');
const { success, error } = require('../../../helpers/response');
const fs = require('fs');
const path = require('path');
class OrdersController {
    // [PATCH] /api/orders/:id/cancel
    async cancelOrderByUser(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user._id; // lấy user hiện tại từ middleware xác thực

            const order = await Order.findById(id);
            if (!order) return error(res, 404, 'Đơn hàng không tồn tại');

            // Chỉ cho phép huỷ đơn của chính mình
            if (order.userId.toString() !== userId.toString()) {
                return error(res, 403, 'Bạn không có quyền huỷ đơn hàng này');
            }

            // Chỉ được huỷ khi trạng thái đang là pending
            if (order.status !== 'pending') {
                return error(res, 400, 'Chỉ có thể huỷ đơn hàng khi đang chờ xác nhận');
            }

            order.status = 'cancelled';
            await order.save();

            success(res, 200, 'Huỷ đơn hàng thành công', {
                orderId: order._id,
                orderCode: order.orderCode,
                status: order.status
            });

        } catch (err) {
            console.error(err);
            error(res, 500, 'Có lỗi xảy ra khi huỷ đơn hàng');
        }
    }
    // [POST] /api/orders/:orderId/items/:itemId/review
    async reviewProduct(req, res) {
        try {
            const { orderId, itemId } = req.params;
            const userId = req.user._id;

            // Lấy order item
            const orderItem = await OrderItem.findById(itemId);
            if (!orderItem) return error(res, 404, 'Không tìm thấy sản phẩm trong đơn hàng');

            // Kiểm tra quyền của user
            if (orderItem.orderId.toString() !== orderId.toString()) {
                return error(res, 403, 'Bạn không có quyền đánh giá sản phẩm này');
            }

            // Kiểm tra đã đánh giá chưa
            if (orderItem.reviewed) {
                return error(res, 400, 'Sản phẩm đã được đánh giá');
            }

            // Lấy dữ liệu từ body
            const { rating, comment, variantCombinationId } = req.body;

            if (!rating || rating < 1 || rating > 5) {
                return error(res, 400, 'Điểm đánh giá không hợp lệ');
            }

            if (
                variantCombinationId &&
                orderItem.variantCombinationId &&
                variantCombinationId !== orderItem.variantCombinationId
            ) {
                return error(res, 400, 'Biến thể sản phẩm không khớp');
            }

            // Xử lý ảnh upload (đã có ở req.files từ route)
            let images = [];
            if (req.files && req.files.length > 0) {
                images = req.files.map(f => {
                    const relativePath = path.join('/uploads/reviews', f.filename).replace(/\\/g, '/');
                    return relativePath;
                });
            }

            // Tạo review
            const review = new Review({
                userId,
                orderItemId: orderItem._id,        // ✅ QUAN TRỌNG
                productId: orderItem.productId,    // denormalize
                variantCombinationId: orderItem.variantCombinationId || null,
                rating,
                comment,
                images
            });
            await review.save();

            // Cập nhật orderItem đã đánh giá
            orderItem.reviewed = true;
            await orderItem.save();

            success(res, 201, 'Đánh giá sản phẩm thành công', { reviewId: review._id });

        } catch (err) {
            console.error(err);
            error(res, 500, 'Có lỗi xảy ra khi đánh giá sản phẩm');
        }
    }
}

module.exports = new OrdersController();
