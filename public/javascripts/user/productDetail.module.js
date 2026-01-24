class Product {
    constructor() {
        document.addEventListener("DOMContentLoaded", () => {
            this.init();
        });
    }

    init() {
        this.cacheElements();
        this.bindEvents();
    }

    cacheElements() {
        this.mainImage = document.getElementById("mainProductImage");
        this.thumbnails = document.querySelectorAll(".thumbnail-images .thumbnail");

        // Quantity elements
        this.qtyInput = document.getElementById("productQty");
        this.btnIncrease = document.getElementById("increaseQty");
        this.btnDecrease = document.getElementById("decreaseQty");

        // Add to cart button
        this.btnAddToCart = document.getElementById("addToCart");
        this.btnBuyNow = document.getElementById("buyNow");

        if (this.btnAddToCart) {
            this.productId = this.btnAddToCart.dataset.id;      // data-id
            this.price = parseFloat(this.btnAddToCart.dataset.price) || 0; // data-price
        }
    }


    bindEvents() {

        if (!this.thumbnails.length || !this.mainImage) return;

        // Gắn active cho ảnh đầu tiên
        this.thumbnails[0].classList.add("active");

        this.thumbnails.forEach((thumb) => {
            thumb.addEventListener("click", () => this.handleThumbnailClick(thumb));
        });

        // Tăng giảm số lượng
        if (this.btnIncrease && this.btnDecrease && this.qtyInput) {
            this.btnIncrease.addEventListener("click", () => this.changeQuantity(1));
            this.btnDecrease.addEventListener("click", () => this.changeQuantity(-1));
        }

        // Add to cart
        if (this.btnAddToCart) {
            this.btnAddToCart.addEventListener("click", () => this.addToCart());
        }
        if (this.btnBuyNow) {
            this.btnBuyNow.addEventListener("click", () => this.buyNow());
        }
    }
    handleThumbnailClick(thumb) {
        // Bỏ active cũ
        this.thumbnails.forEach((t) => t.classList.remove("active"));

        // Gắn active mới
        thumb.classList.add("active");

        // Đổi ảnh chính
        this.mainImage.src = thumb.src;

        // Tuỳ chọn: thêm hiệu ứng fade mượt hơn
        this.mainImage.classList.add("fade");
        setTimeout(() => this.mainImage.classList.remove("fade"), 200);
    }
    changeQuantity(delta) {
        let qty = parseInt(this.qtyInput.value) || 1;
        qty += delta;
        if (qty < 1) qty = 1;
        this.qtyInput.value = qty;
    }
    async addToCart() {
        const quantity = parseInt(this.qtyInput.value) || 1;
        if (!this.productId) return;

        try {
            showLoading("Đang thêm sản phẩm vào giỏ...");

            const res = await fetch("/api/cart/add", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productId: this.productId, quantity, variantCombinationId: window.matchingCombo?._id })
            });

            const result = await res.json();
            hideLoading();

            if (result.success) {
                showToast(result.message || "Đã thêm vào giỏ hàng!", "success");
            } else {
                console.log(result)
                if (result.code == 401) {
                    showToast(result.message || "Thêm giỏ hàng thất bại!", "warning");
                } else {
                    showToast(result.message || "Thêm giỏ hàng thất bại!", "error");
                }
            }
        } catch (err) {
            hideLoading();
            console.error("Lỗi khi thêm vào giỏ hàng:", err);
            showToast("Có lỗi xảy ra khi thêm giỏ hàng!", "error");
        }
    }
    buyNow() {
        const quantity = parseInt(this.qtyInput.value) || 1;
        const productId = this.btnBuyNow.dataset.id;
        if (!productId) return;

        showLoading("Đang xử lý mua ngay...");

        const form = document.createElement("form");
        form.method = "POST";
        form.action = "/payment/buy-now";

        form.innerHTML = `
        <input type="hidden" name="productId" value="${productId}">
        <input type="hidden" name="quantity" value="${quantity}">
    `;

        document.body.appendChild(form);

        form.submit();
    }




}

export default new Product();
