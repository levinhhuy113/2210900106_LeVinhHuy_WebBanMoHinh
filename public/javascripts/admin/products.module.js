import Switch from "./components/switch.js";

class Product {
    constructor() {
        document.addEventListener("DOMContentLoaded", () => {
            this.init();
        });
    }

    init() {
        this.cacheElements();
        this.applyAnimationDelay("[class*='animate-']", 0.1);
        this.bindEvents();
    }

    cacheElements() {
        this.addProductBtn = document.querySelector('.add-product-btn');
        this.formAddProduct = document.getElementById('formAddProduct');
        this.formEditProduct = document.getElementById('formEditProduct');
        this.hasAddVariantsCheckbox = document.getElementById('addProductHasVariants');
        this.addImagesGroup = document.getElementById('addProductImagesGroup');
        this.addImagesInput = document.getElementById('addProductImages');
        this.hasEditVariantsCheckbox = document.getElementById('editProductHasVariants');
        this.editImagesGroup = document.getElementById('editProductImagesGroup');
        this.editImagesInput = document.getElementById('editProductImages');

    }

    applyAnimationDelay(selector, step = 0.1) {
        const items = document.querySelectorAll(selector);

        items.forEach((el, index) => {
            const delay = index * step;
            el.style.animationDelay = `${delay}s`;
        });
    }

    bindEvents() {
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal-wrapper');
                modal.classList.remove('show');
            });
        });

        if (this.addProductBtn) {
            this.addProductBtn.addEventListener('click', () => {
                this.openModal('modalAddProduct');
            });
        }

        this.formAddProduct?.addEventListener('submit', e => this.handleAdd(e));

        this.formEditProduct?.addEventListener('submit', e => this.handleEdit(e));

        this.bindDeleteButtons();

        this.bindEditButtons();

        document.querySelectorAll('.switch').forEach((s) => {
            new Switch(s, {
                onEnable: async () => {
                    const confirmed = await showConfirm("Bạn có chắc chắn muốn thay đổi trạng thái sản phẩm này không?");
                    if (!confirmed) return false;
                    return await this.updateProductState(s, true); // true = enable
                },
                onDisable: async () => {
                    const confirmed = await showConfirm("Bạn có chắc chắn muốn thay đổi trạng thái sản phẩm này không?");
                    if (!confirmed) return false;
                    return await this.updateProductState(s, false); // false = disable
                }
            });
        });

        // Xử lý preview ảnh (cho cả form thêm và form chỉnh sửa)
        const fileInputs = document.querySelectorAll('input[type="file"][data-preview]');
        fileInputs.forEach(input => {
            const previewSelector = input.getAttribute('data-preview');
            const previewContainer = document.querySelector(previewSelector);

            if (previewContainer) {
                input.addEventListener('change', (e) => this.handleImagePreview(e, previewContainer));
            }
        });

        this.hasAddVariantsCheckbox.addEventListener('change', e => this.toggleImagesField(this.hasAddVariantsCheckbox, this.addImagesGroup, this.addImagesInput));
        this.hasEditVariantsCheckbox.addEventListener('change', e => this.toggleImagesField(this.hasEditVariantsCheckbox, this.editImagesGroup, this.editImagesInput));

        this.toggleImagesField(this.hasAddVariantsCheckbox, this.addImagesGroup, this.addImagesInput)

    }
    handleImagePreview(e, previewContainer) {
        const files = e.target.files;
        previewContainer.innerHTML = '';

        if (!files || files.length === 0) return;

        Array.from(files).forEach(file => {
            if (!file.type.startsWith('image/')) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                const img = document.createElement('img');
                img.src = event.target.result;
                previewContainer.appendChild(img);
            };
            reader.readAsDataURL(file);
        });
    }
    toggleImagesField(cb, group, input) {
        const addPrice = document.getElementById('addProductPrice');
        const editPrice = document.getElementById('editProductPrice');

        if (cb.checked) {
            group.classList.add('hidden');

            addPrice.required = false;
            editPrice.required = false;

            addPrice.disabled = true;
            editPrice.disabled = true;

            document.getElementById('form-group-add-price').classList.add('hidden');
            document.getElementById('form-group-edit-price').classList.add('hidden');
        } else {
            group.classList.remove('hidden');

            addPrice.disabled = false;
            editPrice.disabled = false;

            addPrice.required = true;
            editPrice.required = true;

            document.getElementById('form-group-add-price').classList.remove('hidden');
            document.getElementById('form-group-edit-price').classList.remove('hidden');
        }
    }
    async updateProductState(el) {
        const id = el.dataset.id;

        try {
            showLoading("Đang cập nhật trạng thái...");
            const res = await fetch(`/api/products/${id}/toggle`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" }
            });
            const result = await res.json();
            hideLoading();

            if (result.success) {
                showToast(result.message || "Cập nhật trạng thái thành công", "success");
                return true;
            } else {
                showToast(result.message || "Cập nhật trạng thái thất bại", "error");
                return false;
            }
        } catch (err) {
            hideLoading();
            showToast("Có lỗi xảy ra khi cập nhật trạng thái", "error");
            return false;
        }
    }

    async handleAdd(e) {
        e.preventDefault();
        const confirmed = await showConfirm("Bạn có chắc chắn muốn thêm sản phẩm này không?");
        if (!confirmed) return;

        const formData = new FormData(this.formAddProduct);
        formData.set("hasVariants", this.hasAddVariantsCheckbox.checked ? "true" : "false");

        try {
            showLoading("Đang thêm sản phẩm...");
            const res = await fetch('/api/products/add', { method: 'POST', body: formData });
            const result = await res.json();
            hideLoading();

            if (result.success) {
                sessionStorage.setItem('sessionToast', JSON.stringify({
                    message: result.message,
                    type: 'success'
                }));
                window.location.reload();
            } else {
                showToast(result.message || "Thêm sản phẩm thất bại", "error");
            }
        } catch (err) {
            hideLoading();
            showToast("Có lỗi xảy ra khi thêm sản phẩm", "error");
        }
    }

    async bindEditButtons() {
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.closest('tr').querySelector('.delete-btn')?.dataset.id;
                if (!id) return;
                try {
                    showLoading("Đang tải dữ liệu...");
                    const res = await fetch(`/api/products/${id}`);
                    const result = await res.json();
                    hideLoading();

                    if (result.success) {
                        const product = result.data;
                        this.fillEditForm(product);
                        this.openModal('modalEditProduct');
                    } else {
                        showToast(result.message || "Không lấy được dữ liệu sản phẩm", "error");
                    }
                } catch (err) {
                    hideLoading();
                    showToast("Có lỗi xảy ra khi tải sản phẩm", "error");
                }
            });
        });
    }

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.add('show');
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.remove('show');
    }

    bindDeleteButtons() {
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                const confirmed = await showConfirm("Bạn có chắc chắn muốn xóa sản phẩm này?");
                if (!confirmed) return;

                try {
                    showLoading("Đang xóa sản phẩm...");
                    const res = await fetch(`/api/products/delete/${id}`, { method: 'DELETE' });
                    const result = await res.json();
                    hideLoading();

                    if (result.success) {
                        sessionStorage.setItem('sessionToast', JSON.stringify({
                            message: result.message,
                            type: 'success'
                        }));

                        window.location.reload();
                    } else {
                        showToast(result.message || "Xóa thất bại", "error");
                    }
                } catch (err) {
                    hideLoading();
                    showToast("Có lỗi xảy ra khi xóa", "error");
                }
            });
        });
    }

    fillEditForm(product) {
        if (!product) return;

        const form = this.formEditProduct;
        form.querySelector('#editProductId').value = product._id || '';
        form.querySelector('#editProductName').value = product.name || '';
        form.querySelector('#editProductPrice').value = product.price || 0;
        form.querySelector('#editProductCategory').value = product.categoryId._id || '';
        form.querySelector('#editProductBrand').value = product.brandId._id || '';
        form.querySelector('#editProductInfo').value = product.productInfo;
        form.querySelector('#editProductUsage').value = product.usage;

        // form.querySelector('#editProductHasVariants').value = product.hasVariants;
        form.querySelector('#editProductHasVariants').checked = product.hasVariants === true;

        this.toggleImagesField(this.hasEditVariantsCheckbox, this.editImagesGroup, this.editImagesInput)

        if (product.hasVariants && product.variants.length > 0 || product.hasStockEntry) {
            form.querySelector('#editProductHasVariants').disabled = true
        } else {
            form.querySelector('#editProductHasVariants').disabled = false
        }

        // --- Hiển thị preview ảnh ---
        const previewContainer = form.querySelector('#previewEditProductImages');
        previewContainer.innerHTML = ''; // clear cũ

        if (product.images && product.images.length > 0) {
            product.images.forEach(imgUrl => {
                const img = document.createElement('img');
                img.src = imgUrl;
                img.alt = 'Ảnh sản phẩm';
                img.className = 'preview-image';
                previewContainer.appendChild(img);
            });
        } else {
            previewContainer.innerHTML = '<p class="text-muted">Chưa có ảnh</p>';
        }
    }


    async handleEdit(e) {
        e.preventDefault();
        const confirmed = await showConfirm("Bạn có chắc chắn muốn cập nhật sản phẩm này không?");
        if (!confirmed) return;

        const formData = new FormData(this.formEditProduct);
        const id = formData.get('id');
        formData.set("hasVariants", this.hasEditVariantsCheckbox.checked ? "true" : "false");
        try {
            showLoading("Đang cập nhật sản phẩm...");
            const res = await fetch(`/api/products/edit/${id}`, { method: 'PUT', body: formData });
            const result = await res.json();
            hideLoading();

            if (result.success) {
                sessionStorage.setItem('sessionToast', JSON.stringify({
                    message: result.message,
                    type: 'success'
                }));
                window.location.reload();
            } else {
                showToast(result.message || "Cập nhật thất bại", "error");
            }
        } catch (err) {
            hideLoading();
            showToast("Có lỗi xảy ra khi cập nhật sản phẩm", "error");
        }
    }
}

export default new Product();
