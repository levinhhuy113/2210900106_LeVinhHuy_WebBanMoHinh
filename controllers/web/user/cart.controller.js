const Cart = require('../../../models/cart.model');
const Product = require('../../../models/product.model');
const { error } = require('../../../helpers/response');

class CartController {
    async overview(req, res) {
        try {
            res.render('user/cart', {
                title: 'Giỏ hàng'
            });
        } catch (err) {
            console.error(err);
            res.status(500).render('errors/500', { message: 'Lỗi khi tải trang giỏ hàng' });
        }
    }
}

module.exports = new CartController();
