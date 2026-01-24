const Cart = require('../../../models/cart.model');
const Product = require('../../../models/product.model');
const StockEntry = require('../../../models/stockEntry.model');
const { success, error } = require('../../../helpers/response');
const MAX_QUANTITY_PER_PRODUCT = 20
class CartController {

    // [POST] /api/user/cart/add
    async addToCart(req, res) {
        try {
            const userId = req.user._id;
            const { productId, quantity, variantCombinationId } = req.body;


            if (!productId || !quantity || quantity <= 0) {
                return error(res, 400, 'Vui lòng cung cấp sản phẩm và số lượng hợp lệ');
            }

            const product = await Product.findById(productId);
            if (!product || !product.isActive) {
                return error(res, 404, 'Sản phẩm không tồn tại hoặc đã ngừng bán');
            }

            let productPrice = product.price;

            if (product.hasVariants) {
                if (!variantCombinationId) {
                    return error(res, 400, 'Vui lòng chọn đầy đủ biến thể trước khi thêm vào giỏ hàng.');
                }

                const validCombination = product.variantCombinations.find(
                    vc => vc._id === variantCombinationId
                );
                if (!validCombination) {
                    return error(res, 400, 'Biến thể bạn chọn hiện không có sẵn. Vui lòng chọn lại.');
                }

                productPrice = validCombination.price;
            }

            let cart = await Cart.findOne({ userId });

            if (!cart) {
                cart = new Cart({ userId, products: [] });
            }

            const existingIndex = cart.products.findIndex(p =>
                p.productId === productId &&
                (p.variantCombinationId || null) === (variantCombinationId || null)
            );

            let newQuantity = quantity;
            if (existingIndex > -1) {
                newQuantity = cart.products[existingIndex].quantity + quantity;
            }

            // Kiểm tra số lượng tối đa
            if (newQuantity > MAX_QUANTITY_PER_PRODUCT) {
                return error(
                    res,
                    401,
                    `Số lượng tối đa cho mỗi sản phẩm là ${MAX_QUANTITY_PER_PRODUCT}. Bạn đã có ${existingIndex > -1 ? cart.products[existingIndex].quantity : 0} sản phẩm trong giỏ hàng.`
                );
            }

            const matchCondition = {
                productId: productId,
                status: 'imported',
                remainingQuantity: { $gt: 0 }
            };

            if (variantCombinationId) {
                matchCondition.variantCombinationId = variantCombinationId;
            }


            const totalStock = await StockEntry.aggregate([
                { $match: matchCondition },
                { $group: { _id: null, total: { $sum: '$remainingQuantity' } } }
            ]);

            const availableQty = totalStock[0]?.total || 0;
            if (availableQty < newQuantity) {
                const variantInfo = variantCombinationId ? ' (biến thể đã chọn)' : '';
                return error(
                    res,
                    400,
                    `Sản phẩm${variantInfo} không đủ hàng trong kho. Số lượng còn lại: ${availableQty}, bạn đang yêu cầu: ${newQuantity}`
                );
            }


            if (existingIndex > -1) {
                cart.products[existingIndex].quantity += quantity;
                // cart.products[existingIndex].price = productPrice;
            } else {
                cart.products.push({
                    productId,
                    variantCombinationId: variantCombinationId || null,
                    quantity,
                    price: productPrice
                });
            }

            cart.totalQuantity = cart.products.reduce((sum, p) => sum + p.quantity, 0);

            await cart.save();

            success(res, 200, 'Thêm sản phẩm vào giỏ hàng thành công', cart);

        } catch (err) {
            console.error(err);
            error(res, 500, 'Có lỗi xảy ra khi thêm sản phẩm vào giỏ hàng');
        }
    }

    // [GET] /api/cart
    async getCart(req, res) {
        try {
            const userId = req.user._id;
            // const cart = await Cart.findOne({ userId })
            //     .populate('products.productId', 'name images price isActive');
            const cart = await Cart.findOne({ userId })
                .populate({
                    path: 'products.productId',
                    select: 'name images price isActive categoryId variantCombinations',
                    populate: {
                        path: 'categoryId',
                        select: 'name'
                    }
                }).lean();

            if (!cart || !cart.products.length) {
                return success(res, 200, 'Giỏ hàng trống', { products: [] });
            }

            for (const item of cart.products) {
                const product = item.productId;

                // Lấy tổ hợp biến thể nếu có
                let combination = null;
                if (product.variantCombinations?.length && item.variantCombinationId) {
                    combination = product.variantCombinations.find(
                        vc => vc._id === item.variantCombinationId
                    );
                }
                item.combination = combination;

                if (!product) continue;

                // Tính tồn kho chính xác cho item này
                const matchCondition = {
                    productId: product._id,
                    status: 'imported',
                    remainingQuantity: { $gt: 0 }
                };
                if (item.variantCombinationId) {
                    matchCondition.variantCombinationId = item.variantCombinationId;
                }

                const totalStock = await StockEntry.aggregate([
                    { $match: matchCondition },
                    { $group: { _id: null, total: { $sum: '$remainingQuantity' } } }
                ]);
                const availableQty = totalStock[0]?.total || 0;

                // Gán riêng cho item
                item.isActive = availableQty > 0;

                // Nếu muốn, gán price của item dựa vào combination
                // if (combination) {
                //     item.price = combination.price;
                // } else {
                //     item.price = product.price;
                // }
            }

            success(res, 200, 'Lấy giỏ hàng thành công', cart);
        } catch (err) {
            console.error(err);
            error(res, 500, 'Có lỗi xảy ra khi lấy giỏ hàng');
        }
    }

    // [DELETE] /api/cart/remove/:productId
    async removeFromCart(req, res) {
        try {
            const userId = req.user._id;
            const { productId } = req.params;
            const { variantCombinationId } = req.query;

            if (!productId) {
                return error(res, 400, "Vui lòng cung cấp productId để xóa");
            }

            const cart = await Cart.findOne({ userId });
            if (!cart) {
                return error(res, 404, "Không tìm thấy giỏ hàng");
            }

            // Lọc bỏ sản phẩm cần xóa
            const initialLength = cart.products.length;

            cart.products = cart.products.filter(p => {
                if (p.productId.toString() !== productId) return true;
                if (variantCombinationId) {
                    return p.variantCombinationId !== variantCombinationId;
                }
                return false; // nếu không có variantCombinationId thì xoá tất cả item cùng productId
            });

            if (cart.products.length === initialLength) {
                return error(res, 404, "Sản phẩm không tồn tại trong giỏ hàng");
            }

            // Cập nhật totalQuantity
            cart.totalQuantity = cart.products.reduce((sum, p) => sum + p.quantity, 0);

            await cart.save();

            success(res, 200, "Đã xóa sản phẩm khỏi giỏ hàng", cart);
        } catch (err) {
            console.error(err);
            error(res, 500, "Có lỗi xảy ra khi xóa sản phẩm khỏi giỏ hàng");
        }
    }


    // [PATCH] /api/cart/update/:productId
    async updateQuantity(req, res) {
        try {
            const userId = req.user._id;
            const { productId } = req.params;
            let { quantity, variantCombinationId } = req.body;

            if (!productId || typeof quantity !== "number" || quantity < 1) {
                return error(res, 400, "Vui lòng cung cấp productId và số lượng hợp lệ");
            }

            // Kiểm tra sản phẩm tồn tại và còn bán
            const product = await Product.findById(productId);
            if (!product || !product.isActive) {
                return error(res, 404, "Sản phẩm không tồn tại hoặc đã ngừng bán");
            }

            const cart = await Cart.findOne({ userId });
            if (!cart) {
                return error(res, 404, "Không tìm thấy giỏ hàng");
            }

            const itemIndex = cart.products.findIndex(p =>
                p.productId.toString() === productId &&
                (variantCombinationId ? p.variantCombinationId === variantCombinationId : true)
            );

            if (itemIndex === -1) {
                return error(res, 404, "Sản phẩm không tồn tại trong giỏ hàng");
            }

            cart.products[itemIndex].quantity = quantity;
            cart.products[itemIndex].price = variantCombinationId
                ? product.variantCombinations.find(vc => vc._id === variantCombinationId)?.price || product.price
                : product.price;

            cart.totalQuantity = cart.products.reduce((sum, p) => sum + p.quantity, 0);

            await cart.save();

            success(res, 200, "Cập nhật số lượng thành công", cart);
        } catch (err) {
            console.error(err);
            error(res, 500, "Có lỗi xảy ra khi cập nhật số lượng");
        }
    }

}

module.exports = new CartController();
