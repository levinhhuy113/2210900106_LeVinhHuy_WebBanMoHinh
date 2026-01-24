import Switch from "./components/switch.js";
import Select from "./components/select.js";
import VariantManager from "./variantManager.js";
class ProductDetail {
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
        this.variants = [];
        this.variantCombinations = [];
        this.variantManager = new VariantManager(this, this.variants, this.variantCombinations);

        this.addStockEntryBtn = document.querySelector('.add-stockEntry-btn');
        this.formAddStockEntry = document.getElementById('formAddStockEntry');
        this.formEditStockEntry = document.getElementById('formEditStockEntry');

        this.variantSwitch = document.getElementById('hasVariants');
        this.variantsSection = document.querySelector('.variants-section');


        this.variantNameInput = document.getElementById('variantNameInput');
        this.variantOptionsInput = document.getElementById('variantOptionsInput');
        this.btnSaveVariant = document.getElementById('btnSaveVariant');
        this.variantList = document.getElementById('variantList');
        this.btnAddCombination = document.getElementById('btnAddCombination')

        this.addStockEntryVariantCombination = document.getElementById("addVariantCombinationSelect");
        this.editStockEntryVariantCombination = document.getElementById("editVariantCombinationSelect");

    }

    applyAnimationDelay(selector, step = 0.1) {
        const items = document.querySelectorAll(selector);

        items.forEach((el, index) => {
            const delay = index * step;
            el.style.animationDelay = `${delay}s`;
        });
    }

    bindEvents() {

        this.fetchVariants(document.querySelector('.productDetail-page').dataset.id);

        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal-wrapper');
                modal.classList.remove('show');
            });
        });

        if (this.addStockEntryBtn) {
            this.addStockEntryBtn.addEventListener('click', () => {
                this.openModal('modalAddStockEntry');
                document.getElementById('addBatchCode').value = this.generateBatchCode(document.getElementById('product-name').textContent);
            });
        }

        this.formAddStockEntry?.addEventListener('submit', e => this.handleAdd(e));

        this.formEditStockEntry?.addEventListener('submit', e => this.handleEdit(e));

        if (this.btnSaveVariant) {
            this.btnSaveVariant.addEventListener('click', e => this.handleAddVariant(e));
        }

        // document.getElementById('add-combination-form').addEventListener("click", () => this.variantManager.handleAddCombination());
        document.getElementById('add-combination-form')
            .addEventListener("submit", (e) => this.variantManager.handleAddCombination(e));

        this.bindDeleteButtons();

        this.bindEditButtons();


        if (this.variantSwitch) {
            new Switch(this.variantSwitch, {
                onEnable: async () => {
                    const confirmed = await showConfirm("Bạn có chắc chắn muốn bật biến thể cho sản phẩm này không?");
                    if (!confirmed) return false;

                    const success = await this.updateVariantState(this.variantSwitch, true);
                    if (success) {
                        document.querySelector('.variants-section')?.classList.remove('hidden');
                    }
                    return success;
                },
                onDisable: async () => {
                    const confirmed = await showConfirm("Bạn có chắc chắn muốn tắt biến thể cho sản phẩm này không?");
                    if (!confirmed) return false;

                    const success = await this.updateVariantState(this.variantSwitch, false);
                    if (success) {
                        document.querySelector('.variants-section')?.classList.add('hidden');
                    }
                    return success;
                }
            });

            const initialHasVariants = this.variantSwitch.dataset.active === 'true';
            if (initialHasVariants) {
                this.variantsSection?.classList.remove('hidden');
            } else {
                this.variantsSection?.classList.add('hidden');
            }
        }

        document.querySelectorAll('.switch').forEach((s) => {
            if (this.variantSwitch && s === this.variantSwitch) return;

            new Switch(s, {
                onEnable: async () => {
                    const confirmed = await showConfirm("Bạn có chắc chắn muốn thay đổi trạng thái lô hàng này không?");
                    if (!confirmed) return false;
                    return await this.updateStockEntryState(s, true); // true = enable
                },
                onDisable: async () => {
                    const confirmed = await showConfirm("Bạn có chắc chắn muốn tắt biến thể cho lô hàng này không?");
                    if (!confirmed) return false;
                    return await this.updateStockEntryState(s, false); // false = disable
                }
            });
        });

        document.querySelectorAll('.custom-select').forEach((el) => {
            const select = new Select(el, {
                onChange: async (newVal, oldVal) => {
                    if (oldVal === 'sold_out') return false;

                    const confirmed = await showConfirm(
                        `Bạn có chắc chắn muốn chuyển trạng thái từ "${oldVal}" sang "${newVal}" không?`
                    );
                    if (!confirmed) return false;

                    const stockId = el.id.replace('stockSelect_', '');
                    try {
                        const res = await fetch(`/api/stock-entries/${stockId}/update-status`, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                newStatus: newVal,
                                reason: `Chuyển từ ${oldVal} sang ${newVal}`,
                            }),
                        });

                        const result = await res.json();

                        if (!res.ok) {
                            showToast(result.message || "Lỗi cập nhật trạng thái", "error");
                            return false;
                        }

                        const { updatedStatus, nextOptions } = result.data;

                        select.setValue(updatedStatus);

                        el.querySelector('.cs-trigger').classList.remove(oldVal)
                        el.querySelector('.cs-trigger').classList.add(newVal)

                        const translateMap = {
                            draft: 'Nháp',
                            imported: 'Đã nhập kho',
                            cancelled: 'Đã hủy/Tạm dừng',
                            discontinued: 'Ngừng bán'
                        };
                        const newItems = [
                            { value: updatedStatus, label: translateMap[updatedStatus] || updatedStatus },
                            ...nextOptions.map(st => ({
                                value: st,
                                label: translateMap[st] || st
                            }))
                        ];

                        select.setOptions(newItems);

                        const td = el.closest('td');
                        const tr = td?.closest('tr');
                        const actionGroup = tr?.querySelector('.action-group');
                        const editBtn = actionGroup?.querySelector('.edit-btn');
                        const deleteBtn = actionGroup?.querySelector('.delete-btn');

                        if (['draft'].includes(updatedStatus)) {
                            editBtn?.classList.remove('disabled');
                            deleteBtn?.classList.remove('disabled');
                        } else {
                            editBtn?.classList.add('disabled');
                            deleteBtn?.classList.add('disabled');
                        }

                        return true;
                    } catch (err) {
                        console.error(err);
                        alert('Lỗi khi gọi API');
                        return false;
                    }
                }
            });
        });

        document.querySelector('.btn-back').addEventListener('click', function (e) {
            e.preventDefault();

            if (document.referrer) {
                window.history.back();
            } else {
                window.location.href = '/admin/products';
            }
        });


        const fileInputs = document.querySelectorAll('input[type="file"][data-preview]');
        fileInputs.forEach(input => {
            const previewSelector = input.getAttribute('data-preview');
            const previewContainer = document.querySelector(previewSelector);

            if (previewContainer) {
                input.addEventListener('change', (e) => this.handleImagePreview(e, previewContainer));
            }
        });
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

    async updateStockEntryState(el) {
        const id = el.dataset.id;

        try {
            showLoading("Đang cập nhật trạng thái...");
            const res = await fetch(`/api/stock-entries/${id}/toggle`, {
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

    async updateVariantState(el, enable) {
        const id = el.dataset.id;
        showLoading("Đang cập nhật...");
        try {
            const res = await fetch(`/api/products/${id}/toggleVariant`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json();

            if (!res.ok) {
                showToast(data.message || 'Có lỗi xảy ra', 'error');
                return false;
            }

            showToast(data.message, 'success');
            return true;
        } catch (err) {
            console.error(err);
            showToast('Không thể cập nhật trạng thái biến thể', 'error');
            return false;
        } finally {
            hideLoading();
        }
    }

    async handleAdd(e) {
        e.preventDefault();
        const confirmed = await showConfirm("Bạn có chắc chắn muốn thêm sản phẩm này không?");
        if (!confirmed) return;

        const formData = new FormData(this.formAddStockEntry);

        try {
            showLoading("Đang thêm sản phẩm...");
            const res = await fetch('/api/stock-entries/add', { method: 'POST', body: formData });
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
                    const res = await fetch(`/api/stock-entries/${id}`);
                    const result = await res.json();
                    hideLoading();

                    if (result.success) {
                        const StockEntry = result.data;
                        this.fillEditForm(StockEntry);
                        this.openModal('modalEditStockEntry');
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
                    const res = await fetch(`/api/stock-entries/delete/${id}`, { method: 'DELETE' });
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

    fillEditForm(stockEntry) {
        if (!stockEntry) return;
        const form = this.formEditStockEntry;
        form.querySelector('#editStockEntryId').value = stockEntry._id || '';
        form.querySelector('#editProductId').value = stockEntry.productId || '';
        form.querySelector('#editBatchCode').value = stockEntry.batchCode || '';
        form.querySelector('#editVariantCombinationSelect').value = stockEntry.variantCombinationId || '';
        form.querySelector('#editImportPrice').value = stockEntry.importPrice || 0;
        form.querySelector('#editQuantity').value = stockEntry.quantity || '';
        form.querySelector('#editNote').value = stockEntry.note || '';
    }


    async handleEdit(e) {
        e.preventDefault();
        const confirmed = await showConfirm("Bạn có chắc chắn muốn cập nhật sản phẩm này không?");
        if (!confirmed) return;

        const formData = new FormData(this.formEditStockEntry);
        const id = formData.get('id');
        try {
            showLoading("Đang cập nhật sản phẩm...");
            const res = await fetch(`/api/stock-entries/edit/${id}`, { method: 'PUT', body: formData });
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


    async fetchVariants(productId) {
        const res = await fetch(`/api/products/${productId}/variants`);
        const result = await res.json();
        if (result.success) {
            this.variantCombinations = result.data.variantCombinations;
            this.renderVariantList(result.data.variants);

            // console.log(result.data.variants);

            // console.log(result.data.variantCombinations);
            // console.log(this.variants)
            // console.log(this.variantCombinations)

        }
    }


    // ==============================
    // === Xử lý thêm biến thể ===
    // ==============================
    async handleAddVariant(e) {
        e.preventDefault();
        const name = this.variantNameInput?.value.trim();
        const options = this.variantOptionsInput?.value
            .split(',')
            .map(o => o.trim())
            .filter(o => o !== '');

        if (!name || options.length === 0) {
            showToast('Vui lòng nhập tên và các tùy chọn hợp lệ', 'error');
            return;
        }

        const productId = this.btnSaveVariant.dataset.id;
        if (!productId) {
            showToast('Không xác định được sản phẩm hiện tại', 'error');
            return;
        }

        try {
            showLoading('Đang thêm biến thể...');
            const res = await fetch(`/api/products/${productId}/variant/add`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, options })
            });
            const result = await res.json();
            hideLoading();
            if (result.success) {
                showToast('Thêm biến thể thành công', 'success');
                this.variantNameInput.value = '';
                this.variantOptionsInput.value = '';
                this.renderVariantList(result.data);
            } else {
                showToast(result.message || 'Thêm biến thể thất bại', 'error');
            }
        } catch (err) {
            hideLoading();
            showToast('Có lỗi xảy ra khi thêm biến thể', 'error');
        }
    }

    // ==============================
    // === Hiển thị danh sách biến thể ===
    // ==============================
    // renderVariantList(variants = []) {
    //     if (!this.variantList) return;
    //     if (variants.length === 0) {
    //         this.variantList.innerHTML = `<p class="text-muted">Chưa có biến thể nào</p>`;
    //         return;
    //     }

    //     this.variantList.innerHTML = variants.map(v => `
    //         <div class="variant-type-card">
    //             <div class="variant-type-header">
    //                 <div class="variant-type-info">
    //                     <span class="variant-type-name">${v.name}</span>
    //                     <span class="variant-count">${v.options.length} tùy chọn</span>
    //                 </div>
    //                 <div class="variant-type-actions">
    //                     <button class="btn btn-sm btn-outline btn-edit-variant" data-id="${v._id}">
    //                         <i class="bi bi-pencil"></i> Sửa
    //                     </button>
    //                     <button class="btn btn-sm btn-danger btn-delete-variant" data-id="${v._id}">
    //                         <i class="bi bi-trash"></i> Xóa
    //                     </button>
    //                 </div>
    //             </div>
    //             <div class="variant-type-content">
    //                 <div class="options-list">
    //                     ${v.options.map(o => `
    //                         <div class="option-tag">
    //                             ${o}
    //                             <button class="remove-option" data-variant-id="${v._id}" data-option="${o}">
    //                                 <i class="bi bi-x"></i>
    //                             </button>
    //                         </div>
    //                     `).join('')}
    //                 </div>
    //                 <div class="add-option-form">
    //                     <input type="text" class="form-control-sm new-option-input" 
    //                         data-variant-id="${v._id}" placeholder="Nhập tùy chọn mới">
    //                     <button class="btn btn-success btn-sm btn-add-option" data-variant-id="${v._id}">
    //                         <i class="bi bi-plus"></i> Thêm
    //                     </button>
    //                 </div>
    //             </div>
    //         </div>
    //     `).join('');

    //     this.bindVariantEvents();

    // }

    renderVariantList(variants = []) {
        if (!this.variantList) return;

        const addVariantForm = document.querySelector('.add-variant-form');
        const hasCombinations =
            Array.isArray(this.variantCombinations) &&
            this.variantCombinations.length > 0;

        if (addVariantForm) {
            if (hasCombinations) {
                addVariantForm.style.display = 'none';
            } else {
                addVariantForm.style.display = '';
            }
        }

        if (variants.length === 0) {
            this.variantList.innerHTML = `<p class="text-muted">Chưa có biến thể nào</p>`;
            return;
        }
        this.variants = variants;
        this.variantManager.variants = variants;
        this.variantManager.updateVariantCombinations(this.variantCombinations);
        this.populateVariantSelect(this.addStockEntryVariantCombination, this.variantCombinations)
        this.populateVariantSelect(this.editStockEntryVariantCombination, this.variantCombinations)

        // console.log(variants);
        this.variantList.innerHTML = variants.map(v => `
        <div class="variant-type-card" data-id="${v._id}">
            <div class="variant-type-header">
                <div class="variant-type-info">
                    <input type="text" 
                        class="variant-name-input" 
                        value="${v.name}" 
                        data-variant-id="${v._id}"
                        ${v.isLocked ? 'disabled' : ''}>
                    <span class="variant-count">${v.options.length} tùy chọn</span>
                </div>

                ${!v.isLocked ? `
                <div class="variant-type-actions">
                    <button class="btn btn-sm btn-primary btn-save-variant" data-id="${v._id}">
                        <i class="bi bi-check-lg"></i> Cập nhật
                    </button>
                    <button class="btn btn-sm btn-danger btn-delete-variant" data-id="${v._id}">
                        <i class="bi bi-trash"></i> Xóa
                    </button>
                </div>
                ` : ''}
            </div>

            <div class="variant-type-content">

                <div class="options-list">
                    ${v.options.map(o => `
                        <div class="option-tag ${o.isLocked ? 'option-locked' : ''}">
                            <input type="text" 
                                class="option-input" 
                                value="${o.value}"
                                data-variant-id="${v._id}"
                                data-original="${o.value}"
                                ${o.isLocked ? 'disabled' : ''}>
                            
                            ${!o.isLocked ? `
                                <button class="update-option" 
                                    data-variant-id="${v._id}" 
                                    data-original="${o.value}" 
                                    style="display:none;">
                                    <i class="bi bi-check-lg"></i>
                                </button>
                                <button class="remove-option" 
                                    data-variant-id="${v._id}" 
                                    data-option="${o.value}">
                                    <i class="bi bi-x"></i>
                                </button>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>

                <div class="add-option-form">
                    <input type="text" 
                        class="form-control-sm new-option-input" 
                        data-variant-id="${v._id}" 
                        placeholder="Nhập tùy chọn mới">

                    <button class="btn btn-success btn-sm btn-add-option" data-variant-id="${v._id}">
                        <i class="bi bi-plus"></i> Thêm
                    </button>
                </div>
            </div>
        </div>
    `).join('');

        this.bindVariantEvents();
        this.variantManager.renderVariantSelectors();
    }



    bindVariantEvents() {
        // Toggle mở/đóng panel
        this.variantList.querySelectorAll(".variant-toggle").forEach(el => {
            el.addEventListener("click", () => {
                const content = el.nextElementSibling;
                content.classList.toggle("open");
            });
        });

        // Xóa cả biến thể
        this.variantList.querySelectorAll(".btn-delete-variant").forEach(btn => {
            btn.addEventListener("click", async () => {
                const variantId = btn.dataset.id;
                const productId = this.btnSaveVariant.dataset.id;

                const ok = await showConfirm("Xóa biến thể này?");
                if (!ok) return;

                const res = await fetch(`/api/products/${productId}/variant/${variantId}`, {
                    method: "DELETE"
                });

                const data = await res.json();
                if (data.success) {
                    showToast("Đã xoá biến thể", "success");
                    this.renderVariantList(data.data);
                } else {
                    showToast(data.message, "error");
                }
            });
        });

        // Xóa option
        this.variantList.querySelectorAll(".remove-option").forEach(btn => {
            btn.addEventListener("click", async () => {
                const variantId = btn.dataset.variantId;
                const option = btn.dataset.option;
                const productId = this.btnSaveVariant.dataset.id;

                const ok = await showConfirm(`Xóa tùy chọn "${option}"?`);
                if (!ok) return;

                const res = await fetch(`/api/products/${productId}/variant/${variantId}/option/${encodeURIComponent(option)}`, {
                    method: "DELETE"
                });

                const data = await res.json();
                if (data.success) {
                    showToast("Đã xóa tùy chọn", "success");
                    this.renderVariantList(data.data);
                } else {
                    showToast(data.message, "error");
                }
            });
        });

        // Thêm option mới
        this.variantList.querySelectorAll(".btn-add-option").forEach(btn => {
            btn.addEventListener("click", async () => {
                const variantId = btn.dataset.variantId;
                const input = this.variantList.querySelector(`.new-option-input[data-variant-id="${variantId}"]`);
                const newOpt = input.value.trim();
                const productId = this.btnSaveVariant.dataset.id;

                if (!newOpt) {
                    showToast("Nhập giá trị tùy chọn", "error");
                    return;
                }

                const res = await fetch(`/api/products/${productId}/variant/${variantId}/option/add`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ value: newOpt })
                });

                const data = await res.json();
                if (data.success) {
                    input.value = "";
                    showToast("Đã thêm tùy chọn", "success");
                    this.renderVariantList(data.data);
                } else {
                    showToast(data.message, "error");
                }
            });
        });


        // Cập nhật biến thể (tên + các option đã chỉnh sửa)
        this.variantList.querySelectorAll(".btn-save-variant").forEach(btn => {
            btn.addEventListener("click", async () => {
                const variantId = btn.dataset.id;
                const productId = this.btnSaveVariant.dataset.id;

                // Lấy name mới
                const nameInput = this.variantList.querySelector(`.variant-name-input[data-variant-id="${variantId}"]`);
                const newName = nameInput.value.trim();

                // Lấy toàn bộ option input của biến thể
                // const optionInputs = this.variantList.querySelectorAll(`.option-input[data-variant-id="${variantId}"]`);

                // const newOptions = [];
                // optionInputs.forEach(input => {
                //     const val = input.value.trim();
                //     if (val) newOptions.push(val);
                // });

                // Gửi API update
                const res = await fetch(`/api/products/${productId}/variant/${variantId}/update`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name: newName,
                        // options: newOptions
                    })
                });

                const data = await res.json();

                if (data.success) {
                    showToast("Đã cập nhật biến thể", "success");
                    this.renderVariantList(data.data);
                } else {
                    showToast(data.message, "error");
                }
            });
        });




        this.variantList.querySelectorAll('.option-input').forEach(input => {
            const container = input.closest('.option-tag');
            const removeBtn = container.querySelector('.remove-option');
            const updateBtn = container.querySelector('.update-option');
            const originalValue = input.dataset.original;

            input.addEventListener('input', () => {
                if (!updateBtn || !removeBtn) return;
                const currentValue = input.value.trim();

                if (currentValue !== originalValue) {
                    // Hiển thị update, ẩn remove
                    updateBtn.style.display = 'inline-block';
                    removeBtn.style.display = 'none';
                } else {
                    // Trở về giá trị gốc: ẩn update, hiện remove
                    updateBtn.style.display = 'none';
                    removeBtn.style.display = 'inline-block';
                }
            });

            updateBtn?.addEventListener('click', async () => {
                const newValue = input.value.trim();
                const variantId = input.dataset.variantId;
                // Gọi API update option ở đây
                const oldValue = input.dataset.original;

                if (!newValue || newValue === oldValue) return;
                const productId = this.btnSaveVariant.dataset.id;

                const res = await fetch(`/api/products/${productId}/variant/${variantId}/option/update`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ oldValue, newValue })
                });

                const data = await res.json();

                if (data.success) {
                    showToast(data.message || "Đã cập nhật giá trị thành công!", "success");
                    this.renderVariantList(data.data);
                } else {
                    showToast(data.message || "Lỗi khi cập nhật giá trị!", "error");
                    input.value = oldValue;

                }
                // e.target.dataset.original = newValue;

                // this.fetchVariants();
                // // Sau khi update thành công
                // input.dataset.original = newValue;
                // updateBtn.style.display = 'none';
                // removeBtn.style.display = 'inline-block';
            });
        });



        // this.variantList.querySelectorAll(".option-input").forEach(input => {
        //     input.addEventListener("change", async (e) => {
        //         const variantId = e.target.dataset.variantId;
        //         const oldValue = e.target.dataset.original;
        //         const newValue = e.target.value.trim();

        //         if (!newValue || newValue === oldValue) return;
        //         const productId = this.btnSaveVariant.dataset.id;

        //         const res = await fetch(`/api/products/${productId}/variant/${variantId}/option/update`, {
        //             method: "PUT",
        //             headers: { "Content-Type": "application/json" },
        //             body: JSON.stringify({ oldValue, newValue })
        //         });

        //         const data = await res.json();
        //         if (!res.ok) {
        //             e.target.value = oldValue;
        //             return;
        //         }
        //         showToast("Đã cập nhật giá trị thành công!", "success");
        //         e.target.dataset.original = newValue;

        //         this.fetchVariants();
        //     });
        // });


    }


    populateVariantSelect(selectElement, variantCombinations = []) {
        if (!selectElement) return;

        // Xóa hết option cũ, giữ option mặc định
        selectElement.innerHTML = `<option value="">-- Không chọn --</option>`;

        variantCombinations.forEach(vc => {
            const option = document.createElement("option");
            option.value = vc._id;

            // Lọc trùng value, bỏ khoảng trắng, nối với "/"
            const valuesText = vc.variants
                .map(v => v.value.trim())
                .filter((v, i, arr) => v && arr.indexOf(v) === i)
                .join(" / ");

            option.textContent = valuesText || vc.variantKey;
            selectElement.appendChild(option);
        });
    }
    generateBatchCode(productName) {
        if (!productName || typeof productName !== 'string') return '';

        return productName
            .trim()
            .split(/\s+/)                 // tách theo khoảng trắng
            .map(word => word[0])          // lấy chữ cái đầu
            .join('')
            .toUpperCase();
    }

}

export default new ProductDetail();
