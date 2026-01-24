import Switch from "./components/switch.js";

class Category {
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
        this.addCategoryBtn = document.querySelector('.add-category-btn');
        this.formAddCategory = document.getElementById('formAddCategory');
        this.formEditCategory = document.getElementById('formEditCategory');
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

        if (this.addCategoryBtn) {
            this.addCategoryBtn.addEventListener('click', () => {
                this.openModal('modalAddCategory');
            });
        }

        this.formAddCategory?.addEventListener('submit', e => this.handleAdd(e));

        this.formEditCategory?.addEventListener('submit', e => this.handleEdit(e));

        this.bindDeleteButtons();

        this.bindEditButtons();

        document.querySelectorAll('.switch').forEach((s) => {
            new Switch(s, {
                onEnable: async () => {
                    const confirmed = await showConfirm("Bạn có chắc chắn muốn thay đổi trạng thái danh mục này không?");
                    if (!confirmed) return false;
                    return await this.updateCategoryState(s, true); // true = enable
                },
                onDisable: async () => {
                    const confirmed = await showConfirm("Bạn có chắc chắn muốn thay đổi trạng thái danh mục này không?");
                    if (!confirmed) return false;
                    return await this.updateCategoryState(s, false); // false = disable
                }
            });
        });
    }

    async updateCategoryState(el) {
        const id = el.dataset.id;

        try {
            showLoading("Đang cập nhật trạng thái...");
            const res = await fetch(`/api/categories/${id}/toggle`, {
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
        const confirmed = await showConfirm("Bạn có chắc chắn muốn thêm danh mục này không?");
        if (!confirmed) return;

        const formData = new FormData(this.formAddCategory);

        try {
            showLoading("Đang thêm danh mục...");
            const res = await fetch('/api/categories/add', { method: 'POST', body: formData });
            const result = await res.json();
            hideLoading();

            if (result.success) {
                sessionStorage.setItem('sessionToast', JSON.stringify({
                    message: result.message,
                    type: 'success'
                }));
                window.location.reload();
            } else {
                showToast(result.message || "Thêm danh mục thất bại", "error");
            }
        } catch (err) {
            hideLoading();
            showToast("Có lỗi xảy ra khi thêm danh mục", "error");
        }
    }

    async bindEditButtons() {
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.closest('tr').querySelector('.delete-btn')?.dataset.id;
                if (!id) return;
                try {
                    showLoading("Đang tải dữ liệu...");
                    const res = await fetch(`/api/categories/${id}`);
                    const result = await res.json();
                    hideLoading();

                    if (result.success) {
                        const category = result.data;
                        this.fillEditForm(category);
                        this.openModal('modalEditCategory');
                    } else {
                        showToast(result.message || "Không lấy được dữ liệu danh mục", "error");
                    }
                } catch (err) {
                    hideLoading();
                    showToast("Có lỗi xảy ra khi tải danh mục", "error");
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
                const confirmed = await showConfirm("Bạn có chắc chắn muốn xóa danh mục này?");
                if (!confirmed) return;

                try {
                    showLoading("Đang xóa danh mục...");
                    const res = await fetch(`/api/categories/delete/${id}`, { method: 'DELETE' });
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

    fillEditForm(category) {
        this.formEditCategory.querySelector('#editCategoryId').value = category._id;
        this.formEditCategory.querySelector('#editCategoryName').value = category.name;
    }

    async handleEdit(e) {
        e.preventDefault();
        const confirmed = await showConfirm("Bạn có chắc chắn muốn cập nhật danh mục này không?");
        if (!confirmed) return;

        const formData = new FormData(this.formEditCategory);
        const id = formData.get('id');
        try {
            showLoading("Đang cập nhật danh mục...");
            const res = await fetch(`/api/categories/edit/${id}`, { method: 'PUT', body: formData });
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
            showToast("Có lỗi xảy ra khi cập nhật danh mục", "error");
        }
    }
}

export default new Category();
