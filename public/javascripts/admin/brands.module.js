import Switch from "./components/switch.js";

class Brand {
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
        this.addBrandBtn = document.querySelector('.add-brand-btn');
        this.formAddBrand = document.getElementById('formAddBrand');
        this.formEditBrand = document.getElementById('formEditBrand');
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

        if (this.addBrandBtn) {
            this.addBrandBtn.addEventListener('click', () => {
                this.openModal('modalAddBrand');
            });
        }

        this.formAddBrand?.addEventListener('submit', e => this.handleAdd(e));

        this.formEditBrand?.addEventListener('submit', e => this.handleEdit(e));

        this.bindDeleteButtons();

        this.bindEditButtons();

        document.querySelectorAll('.switch').forEach((s) => {
            new Switch(s, {
                onEnable: async () => {
                    const confirmed = await showConfirm("Bạn có chắc chắn muốn thay đổi trạng thái thương hiệu này không?");
                    if (!confirmed) return false;
                    return await this.updateBrandState(s, true);
                },
                onDisable: async () => {
                    const confirmed = await showConfirm("Bạn có chắc chắn muốn thay đổi trạng thái thương hiệu này không?");
                    if (!confirmed) return false;
                    return await this.updateBrandState(s, false);
                }
            });
        });
    }

    async updateBrandState(el) {
        const id = el.dataset.id;

        try {
            showLoading("Đang cập nhật trạng thái...");
            const res = await fetch(`/api/brands/${id}/toggle`, {
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
        const confirmed = await showConfirm("Bạn có chắc chắn muốn thêm thương hiệu này không?");
        if (!confirmed) return;

        const formData = new FormData(this.formAddBrand);

        try {
            showLoading("Đang thêm thương hiệu...");
            const res = await fetch('/api/brands/add', { method: 'POST', body: formData });
            const result = await res.json();
            hideLoading();

            if (result.success) {
                sessionStorage.setItem('sessionToast', JSON.stringify({
                    message: result.message,
                    type: 'success'
                }));
                window.location.reload();
            } else {
                showToast(result.message || "Thêm thương hiệu thất bại", "error");
            }
        } catch (err) {
            hideLoading();
            showToast("Có lỗi xảy ra khi thêm thương hiệu", "error");
        }
    }

    async bindEditButtons() {
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.closest('tr').querySelector('.delete-btn')?.dataset.id;
                if (!id) return;
                try {
                    showLoading("Đang tải dữ liệu...");
                    const res = await fetch(`/api/brands/${id}`);
                    const result = await res.json();
                    hideLoading();

                    if (result.success) {
                        const brand = result.data;
                        this.fillEditForm(brand);
                        this.openModal('modalEditBrand');
                    } else {
                        showToast(result.message || "Không lấy được dữ liệu thương hiệu", "error");
                    }
                } catch (err) {
                    hideLoading();
                    showToast("Có lỗi xảy ra khi tải thương hiệu", "error");
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
                const confirmed = await showConfirm("Bạn có chắc chắn muốn xóa thương hiệu này?");
                if (!confirmed) return;

                try {
                    showLoading("Đang xóa thương hiệu...");
                    const res = await fetch(`/api/brands/delete/${id}`, { method: 'DELETE' });
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

    fillEditForm(brand) {
        this.formEditBrand.querySelector('#editBrandId').value = brand._id;
        this.formEditBrand.querySelector('#editBrandName').value = brand.name;
    }

    async handleEdit(e) {
        e.preventDefault();
        const confirmed = await showConfirm("Bạn có chắc chắn muốn cập nhật thương hiệu này không?");
        if (!confirmed) return;

        const formData = new FormData(this.formEditBrand);
        const id = formData.get('id');
        try {
            showLoading("Đang cập nhật thương hiệu...");
            const res = await fetch(`/api/brands/edit/${id}`, { method: 'PUT', body: formData });
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
            showToast("Có lỗi xảy ra khi cập nhật thương hiệu", "error");
        }
    }
}

export default new Brand();
