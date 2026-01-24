class Cart {
    constructor() {
        this.selectedItems = new Set();
        this.selectedItemsIndex = new Set();
        document.addEventListener("DOMContentLoaded", () => {
            this.init();
        });
    }

    async init() {
        this.cacheElements();
        this.bindEvents();

        await this.loadCart();
    }

    cacheElements() {
        this.cartItemsContainer = document.getElementById("cartItems");
        this.totalQuantityEl = document.getElementById("totalQuantity");
        this.totalPriceEl = document.getElementById("totalPrice");
    }


    bindEvents() {
        document.getElementById("checkoutBtn").addEventListener("click", () => {
            if (!this.selectedItems.size) {
                showToast("Bạn chưa chọn sản phẩm nào", "warning");
                return;
            }
            const form = document.createElement("form");
            form.method = "POST";
            form.action = "/payment";

            const input = document.createElement("input");
            input.type = "hidden";
            input.name = "selectedIndexes";
            input.value = JSON.stringify(Array.from(this.selectedItemsIndex));

            form.appendChild(input);
            document.body.appendChild(form);

            form.submit();
        });

    }

    async loadCart() {
        try {
            const res = await fetch("/api/cart");
            const result = await res.json();

            if (!res.ok || !result.success) {
                showToast(result.message || "Không thể tải giỏ hàng", "error");
                return;
            }

            const cart = result.data;
            this.renderCart(cart.products || []);

        } catch (err) {
            console.error(err);
            showToast("Lỗi khi tải giỏ hàng", "error");
        }
    }

    renderCart(items) {
        if (!items.length) {
            this.cartItemsContainer.innerHTML = `
            <div style="padding: 32px; text-align: center; color: #555; font-size: 1.1rem;">
                <i class="bi bi-cart-x" style="font-size: 2rem; color: #ff6b6b;"></i>
                <p style="margin: 16px 0 8px;">Giỏ hàng của bạn hiện đang trống</p>
                <p style="font-size: 0.9rem; color: #888;">Hãy thêm sản phẩm yêu thích vào giỏ hàng để tiếp tục!</p>
            </div>
            `;
            this.totalQuantityEl.textContent = "0";
            this.totalPriceEl.textContent = this.formatCurrency(0);
            return;
        }

        const rows = items.map((item, index) => {
            const { _id, name, images } = item.productId || {};
            const isActive = item.isActive;
            const combination = item.combination;
            const image = combination ? combination.images[0] : images?.[0] || "/images/no-image.png";
            const quantity = item.quantity || 0;

            const itemId = `${_id}${item.variantCombinationId ? `_${item.variantCombinationId}` : ``}`;

            return `
        <tr data-id="${_id}" data-price="${item.price}" data-quantity="${quantity}">
            <td class="center">
             ${isActive
                    ?
                    `
                <input type="checkbox" id="item-${itemId}" class="item-checkbox" data-id="${_id}" data-index="${index}">
                <label for="item-${itemId}" class="custom-checkbox">
                    <i class="bi bi-circle"></i>
                </label>
                `
                    :
                    `
                `
                }
            </td>
            <td class="item-product">
                <div class="product-info">
                    <img src="${image}" alt="${name}" class="product-thumb">
                    <div class="product-details">
                        <span class="product-name">${name}</span>
                        ${combination ? `<span class="product-variant">${combination.variantKey}</span>` : ``}
                        <span class="product-category">Danh mục: ${item.productId.categoryId.name}</span>
                    </div>
                </div>
            </td>
            ${isActive
                    ?
                    `
                <td class="item-quantity center">
                    <div class="quantity-control">
                        <button class="btn-decrease" data-id="${_id}" data-variant-combination-id="${item.variantCombinationId ? item.variantCombinationId : ``}">-</button>
                        <input type="number" min="1" value="${quantity}" class="quantity-input" data-id="${itemId}">
                        <button class="btn-increase" data-id="${_id}" data-variant-combination-id="${item.variantCombinationId ? item.variantCombinationId : ``}">+</button>
                    </div>
                </td>
                <td class="item-price center">${this.formatCurrency(item.price)}</td>
                `
                    :
                    `
                <td colspan="2">
                    <div>Sản phẩm tạm ngừng kinh doanh / hết hàng, vui lòng chọn sản phẩm khác</div>
                </td>
                `
                }
           


            <td class="center">
                <button class="remove-item icon-btn" data-id="${_id}" data-variant-combination-id="${item.variantCombinationId ? item.variantCombinationId : ``}">
                    <i class="bi bi-x-lg"></i></button>
                </button>
            </td>
        </tr>
        `;
        }).join("");

        this.cartItemsContainer.innerHTML = `
        <table class="cart-table">
            <thead>
                <tr>
                    <th>
                        <input type="checkbox" id="selectAll" class="item-checkbox">
                        <label for="selectAll" class="custom-checkbox">
                            <i class="bi bi-circle"></i>
                        </label>
                    </th>
                    <th style="text-align: start;">Tên sản phẩm</th>
                    <th>Số lượng</th>
                    <th>Giá</th>
                    <th>Xóa</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>
    `;

        // Khi checkbox thay đổi, tính tổng
        const updateTotals = () => {
            let totalQuantity = 0;
            let totalPrice = 0;
            this.cartItemsContainer.querySelectorAll('tbody tr').forEach(tr => {
                const checkbox = tr.querySelector('.item-checkbox');
                if (checkbox && checkbox.checked) {
                    const qty = parseInt(tr.querySelector('.quantity-input').value) || 0;
                    const price = parseFloat(tr.dataset.price) || 0;
                    totalQuantity += qty;
                    totalPrice += price * qty;
                }
            });
            this.totalQuantityEl.textContent = totalQuantity;
            this.totalPriceEl.textContent = this.formatCurrency(totalPrice);
        };

        // Bắt event cho từng checkbox
        this.cartItemsContainer.querySelectorAll('tbody .item-checkbox').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const icon = cb.nextElementSibling.querySelector('i');
                if (cb.checked) {
                    icon.classList.remove('bi-circle');
                    icon.classList.add('bi-check-circle');
                    this.selectedItems.add(cb.dataset.id);
                    this.selectedItemsIndex.add(cb.dataset.index)
                } else {
                    icon.classList.remove('bi-check-circle');
                    icon.classList.add('bi-circle');
                    this.selectedItems.delete(cb.dataset.id);
                    this.selectedItemsIndex.delete(cb.dataset.index)
                }
                updateTotals();
            });
        });

        // Checkbox chọn tất cả
        const selectAll = this.cartItemsContainer.querySelector('#selectAll');
        if (selectAll) {
            selectAll.addEventListener('change', (e) => {
                const checked = selectAll.checked;

                const selectAllIcon = selectAll.nextElementSibling.querySelector('i');
                if (checked) {
                    selectAllIcon.classList.remove('bi-circle');
                    selectAllIcon.classList.add('bi-check-circle');
                } else {
                    selectAllIcon.classList.remove('bi-check-circle');
                    selectAllIcon.classList.add('bi-circle');
                }

                this.cartItemsContainer.querySelectorAll('tbody .item-checkbox').forEach(cb => {
                    cb.checked = checked;
                    const icon = cb.nextElementSibling.querySelector('i');
                    if (checked) {
                        icon.classList.remove('bi-circle');
                        icon.classList.add('bi-check-circle');
                        this.selectedItems.add(cb.dataset.id);
                        this.selectedItemsIndex.add(cb.dataset.index)

                    } else {
                        icon.classList.remove('bi-check-circle');
                        icon.classList.add('bi-circle');
                        this.selectedItems.delete(cb.dataset.id);
                        this.selectedItemsIndex.delete(cb.dataset.index)

                    }
                });
                updateTotals();
            });
        }

        this.bindCartActions();
        updateTotals(); // ban đầu tính 0 hoặc tổng các item checked
    }

    bindCartActions() {
        this.updateTimers = {};
        const MAX_QUANTITY = 20;

        this.cartItemsContainer.querySelectorAll('.btn-increase').forEach(btn => {
            btn.addEventListener('click', () => {
                const productId = btn.dataset.id;
                const variantCombinationId = btn.dataset.variantCombinationId;

                const input = this.cartItemsContainer.querySelector(`.quantity-input[data-id="${productId}${variantCombinationId ? `_${variantCombinationId}` : ``}"]`);
                let quantity = parseInt(input.value) || 1;
                quantity += 1;

                if (quantity > MAX_QUANTITY) {
                    quantity = MAX_QUANTITY;
                    showToast(`Bạn chỉ có thể đặt tối đa ${MAX_QUANTITY} sản phẩm cho mỗi mặt hàng. Nếu muốn mua nhiều hơn, vui lòng liên hệ trực tiếp với chúng tôi.`, 'warning');
                    return;
                }

                input.value = quantity;

                this.debouncedUpdate(productId, variantCombinationId);
            });
        });

        // Giảm số lượng
        this.cartItemsContainer.querySelectorAll('.btn-decrease').forEach(btn => {
            btn.addEventListener('click', () => {
                const productId = btn.dataset.id;
                const variantCombinationId = btn.dataset.variantCombinationId;

                const input = this.cartItemsContainer.querySelector(`.quantity-input[data-id="${productId}${variantCombinationId ? `_${variantCombinationId}` : ``}"]`);
                let quantity = parseInt(input.value) || 1;
                if (quantity > 1) quantity -= 1;
                input.value = quantity;

                this.debouncedUpdate(productId, variantCombinationId);
            });
        });

        // Nhập số lượng trực tiếp
        this.cartItemsContainer.querySelectorAll('.quantity-input').forEach(input => {
            input.addEventListener('change', () => {
                const productId = input.dataset.id;
                const variantCombinationId = btn.dataset.variantCombinationId;

                let quantity = parseInt(input.value) || 1;
                input.value = quantity;

                this.debouncedUpdate(productId, variantCombinationId);
            });
        });

        // Xóa sản phẩm
        this.cartItemsContainer.querySelectorAll('.remove-item').forEach(btn => {
            btn.addEventListener('click', async () => {
                const productId = btn.dataset.id;
                const variantCombinationId = btn.dataset.variantCombinationId;
                // const confirmed = await showConfirm("Bạn có chắc chắn muốn xóa sản phẩm này?");
                // if (!confirmed) return;
                await this.removeItem(productId, variantCombinationId);
            });
        });
    }

    debouncedUpdate(productId, variantCombinationId) {

        if (this.updateTimers[productId]) clearTimeout(this.updateTimers[productId]);

        this.updateTimers[productId] = setTimeout(() => {
            const input = this.cartItemsContainer.querySelector(`.quantity-input[data-id="${productId}${variantCombinationId ? `_${variantCombinationId}` : ``}"]`);
            const quantity = parseInt(input.value) || 1;
            this.updateQuantity(productId, quantity, variantCombinationId);
            delete this.updateTimers[productId];
        }, 300);
    }

    async updateQuantity(productId, quantity, variantCombinationId) {
        showLoading("Đang cập nhật số lượng...");
        try {
            const res = await fetch(`/api/cart/update/${productId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ quantity, variantCombinationId })
            });
            const result = await res.json();
            if (!res.ok || !result.success) {
                showToast(result.message || "Cập nhật thất bại", "error");
                return;
            }
            this.loadCart(); // tải lại giỏ hàng để cập nhật UI
        } catch (err) {
            console.error(err);
            showToast("Lỗi khi cập nhật số lượng", "error");
        } finally {
            hideLoading();
        }
    }

    // Gọi API xóa sản phẩm
    async removeItem(productId, variantCombinationId) {

        const confirmed = await showConfirm("Bạn có chắc chắn muốn xoá sản phẩm này khỏi giỏ hàng không?");
        if (!confirmed) return;
        showLoading();
        try {
            const query = variantCombinationId ? `?variantCombinationId=${variantCombinationId}` : '';
            const res = await fetch(`/api/cart/remove/${productId}${query}`, { method: 'DELETE' });
            const result = await res.json();
            if (result.success) {
                showToast(result.message || "Xóa sản phẩm thành công khỏi giỏ hàng.", "success");
            } else {
                showToast(result.message || "Xóa thất bại", "error");
                return;
            }

            this.loadCart(); // tải lại giỏ hàng
        } catch (err) {
            console.error(err);
            showToast("Lỗi khi xóa sản phẩm", "error");
        } finally {
            hideLoading();
        }
    }

    formatCurrency(num) {
        return num?.toLocaleString("vi-VN", { style: "currency", currency: "VND" }) || "0₫";
    }
}

export default new Cart();
