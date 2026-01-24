const { success, error } = require('../../../helpers/response');
const Order = require('../../../models/order.model');
const OrderItem = require('../../../models/orderItem.model');
const StockEntry = require('../../../models/stockEntry.model');

class OrderController {

    // [PATCH] /api/admin/orders/:id/status
    async updateStatus(req, res) {
        try {
            const { id } = req.params;
            const { status } = req.body;

            const order = await Order.findById(id);
            if (!order) return error(res, 404, 'Đơn hàng không tồn tại');

            // Quy tắc 1 chiều (ví dụ: pending -> confirmed -> preparing -> shipping -> delivered)
            const allowedTransitions = {
                pending: ['confirmed', 'cancelled'],
                confirmed: ['preparing'],
                preparing: ['shipping'],
                shipping: ['delivered'],
                delivered: [],
                cancelled: []
                // returned: []
            };

            // Kiểm tra nếu trạng thái mới hợp lệ theo luồng
            const validNextStatuses = allowedTransitions[order.status] || [];
            if (!validNextStatuses.includes(status)) {
                return error(res, 400, `Không thể chuyển từ "${order.status}" sang "${status}"`);
            }

            // Khi admin xác nhận đơn
            if (status === 'confirmed') {
                if (order.paymentMethod !== 'cod' && order.paymentStatus !== 'paid') {
                    return error(
                        res,
                        400,
                        `Đơn này thanh toán qua ${order.paymentMethod.toUpperCase()} nhưng chưa thanh toán thành công. Không thể xác nhận đơn hàng.`
                    );
                }

                const items = await OrderItem.find({ orderId: order._id });

                // Kiểm tra đủ hàng trước khi trừ
                for (const item of items) {
                    // Xây dựng điều kiện match dựa trên việc có biến thể hay không
                    const matchCondition = {
                        productId: item.productId,
                        status: 'imported',
                        remainingQuantity: { $gt: 0 }
                    };

                    // Nếu có biến thể thì thêm điều kiện variantCombinationId
                    if (item.variantCombinationId) {
                        matchCondition.variantCombinationId = item.variantCombinationId;
                    }
                    const totalStock = await StockEntry.aggregate([
                        { $match: matchCondition },
                        { $group: { _id: null, total: { $sum: '$remainingQuantity' } } }
                    ]);

                    const availableQty = totalStock[0]?.total || 0;
                    console.log(totalStock);
                    if (availableQty < item.quantity) {
                        const variantInfo = item.variantCombinationId ? ` (biến thể ${item.variantCombinationId})` : '';
                        return error(
                            res,
                            400,
                            `Sản phẩm ${item.productId}${variantInfo} không đủ hàng trong kho (cần ${item.quantity}, còn ${availableQty})`
                        );
                    }
                }
                // Nếu tất cả đủ hàng -> tiến hành trừ
                for (const item of items) {
                    // Xây dựng điều kiện match giống như trên
                    const matchCondition = {
                        productId: item.productId,
                        status: 'imported',
                        remainingQuantity: { $gt: 0 }
                    };

                    if (item.variantCombinationId) {
                        matchCondition.variantCombinationId = item.variantCombinationId;
                    }
                    let needQty = item.quantity;
                    const batches = await StockEntry.find(matchCondition).sort({ importDate: 1 }); // FIFO

                    const usedBatches = [];

                    for (const batch of batches) {
                        if (needQty <= 0) break;
                        const take = Math.min(batch.remainingQuantity, needQty);

                        batch.remainingQuantity -= take;
                        if (batch.remainingQuantity === 0) batch.status = 'sold_out';
                        await batch.save();

                        usedBatches.push({
                            batchCode: batch.batchCode,
                            quantity: take
                        });

                        needQty -= take;
                    }

                    item.batches = usedBatches;
                    await item.save();
                }
            }

            order.status = status;
            await order.save();

            success(res, 200, 'Cập nhật trạng thái đơn hàng thành công', {
                orderId: order._id,
                orderCode: order.orderCode,
                status: order.status,
                allowedNextStatuses: allowedTransitions[order.status] // trả luôn danh sách trạng thái tiếp theo
            });

        } catch (err) {
            console.error(err);
            error(res, 500, 'Có lỗi xảy ra khi cập nhật trạng thái đơn hàng');
        }
    }
}

module.exports = new OrderController();
