class VariantManager {
    constructor(variants = [], variantCombinations = []) {
        this.variants = variants;
        this.variantCombinations = variantCombinations;
        this.selectedValues = new Map();

        this.handleVariantSelectChange = this.handleVariantSelectChange.bind(this);
        this.handleAddCombination = this.handleAddCombination.bind(this);
        this.renderCombinationsTable();
    }

    renderVariantSelectors() {
        const container = document.getElementById("variantSelectors");
        container.innerHTML = "";

        this.variants.forEach((variant, index) => {
            // console.log(variant);
            const wrapper = document.createElement("div");
            wrapper.classList.add("select-wrapper");

            const select = document.createElement("select");
            select.dataset.variantId = variant._id;
            select.dataset.variantIndex = index;
            select.classList.add("form-control", "variant-select");
            select.dataset.form = "add-combination";

            const defaultOption = document.createElement("option");
            defaultOption.value = "";
            defaultOption.textContent = `Chọn ${variant.name}`;
            select.appendChild(defaultOption);

            // Sử dụng hàm chung để lấy options hợp lệ
            const validOptions = this.getValidOptionsForSelect(index, null);
            validOptions.forEach(opt => {
                const optionEl = document.createElement("option");
                optionEl.value = opt;
                optionEl.textContent = opt;
                select.appendChild(optionEl);
            });

            if (this.selectedValues.has(variant._id)) {
                select.value = this.selectedValues.get(variant._id);
            }

            const label = document.createElement("label");
            label.classList.add("form-label");
            label.textContent = variant.name;

            wrapper.appendChild(label);
            wrapper.appendChild(select);
            container.appendChild(wrapper);
        });

        this.attachSelectEvents();
    }

    attachSelectEvents() {
        const selects = document.getElementById("variantSelectors").querySelectorAll(".variant-select");
        selects.forEach(select => {
            select.removeEventListener("change", this.handleVariantSelectChange);
            select.addEventListener("change", this.handleVariantSelectChange);
        });
    }

    handleVariantSelectChange(event) {
        const select = event.target;
        const variantId = select.dataset.variantId;
        const selectedIndex = parseInt(select.dataset.variantIndex);
        const selectedValue = select.value;

        if (selectedValue) {
            this.selectedValues.set(variantId, selectedValue);
        } else {
            this.selectedValues.delete(variantId);
        }

        this.resetSelectsAfterIndex(selectedIndex);
        this.updateSelectsAfterIndex(selectedIndex);
    }

    resetSelectsAfterIndex(index) {
        const selects = document.getElementById("variantSelectors").querySelectorAll(".variant-select");
        selects.forEach(sel => {
            const selIndex = parseInt(sel.dataset.variantIndex);
            if (selIndex > index) {
                sel.value = "";
                const variantId = sel.dataset.variantId;
                this.selectedValues.delete(variantId);
            }
        });
    }

    updateSelectsAfterIndex(index) {
        const selects = document.getElementById("variantSelectors").querySelectorAll(".variant-select");
        selects.forEach(sel => {
            const selIndex = parseInt(sel.dataset.variantIndex);
            // if (selIndex > index && sel.dataset.form == "add-combination") {
            //     this.updateSelectOptions(sel, selIndex);
            // }
            if (selIndex > index) {
                this.updateSelectOptions(sel, selIndex);
            }
        });
    }

    updateSelectOptions(selectElement, index) {
        const variantId = selectElement.dataset.variantId;
        const currentValue = selectElement.value;

        // Lấy combinationId nếu đang update (trong bảng)
        const excludeCombinationId = selectElement.dataset.combinationId || null;
        const validOptions = this.getValidOptionsForSelect(index, excludeCombinationId);

        const defaultOption = selectElement.options[0];

        while (selectElement.options.length > 1) {
            selectElement.removeChild(selectElement.options[1]);
        }

        validOptions.forEach(opt => {
            const optionEl = document.createElement("option");
            optionEl.value = opt;
            optionEl.textContent = opt;
            selectElement.appendChild(optionEl);
        });

        if (currentValue && !validOptions.includes(currentValue)) {
            selectElement.value = "";
            this.selectedValues.delete(variantId);
        }
    }

    /**
     * Lấy danh sách options hợp lệ cho select tại vị trí index
     * @param {number} index - Vị trí của variant trong mảng variants
     * @param {string|null} excludeCombinationId - ID của tổ hợp cần loại trừ khi kiểm tra (dùng cho update)
     * @returns {Array} Danh sách options hợp lệ
     */
    // getValidOptionsForSelect(index, excludeCombinationId = null) {
    //     const currentVariant = this.variants[index];

    //     // Select đầu tiên: trả về toàn bộ options
    //     if (index === 0) {
    //         return currentVariant.options;
    //     }

    //     // Lấy các giá trị đã chọn từ các select trước đó
    //     const selectedBefore = this.getSelectedValuesBeforeIndex(index, excludeCombinationId);

    //     // Chưa chọn đủ các select trước đó
    //     if (selectedBefore.length < index) {
    //         return [];
    //     }

    //     const allOptions = currentVariant.options;

    //     // Lọc các option chưa tồn tại trong tổ hợp nào
    //     // const validOptions = allOptions.filter(option => {
    //     //     const hypotheticalCombo = [...selectedBefore, option];
    //     //     return !this.isCombinationExists(hypotheticalCombo, index + 1, excludeCombinationId);
    //     // });
    //     const validOptions = allOptions.filter(option => {
    //         // Nếu là select cuối cùng: kiểm tra tổ hợp đầy đủ
    //         if (index === this.variants.length - 1) {
    //             const fullCombo = [...selectedBefore, option];
    //             return !this.isExactCombinationExists(fullCombo, excludeCombinationId);
    //         }

    //         // Nếu KHÔNG phải select cuối: kiểm tra xem có TỒN TẠI ít nhất 1 cách hoàn thành hợp lệ
    //         return this.hasValidCompletions(selectedBefore, option, index, excludeCombinationId);
    //     });

    //     return validOptions;
    // }

    getValidOptionsForSelect(index, excludeCombinationId = null) {
        const currentVariant = this.variants[index];
        const allOptions = currentVariant.options;

        // Nếu chỉ có 1 biến thể duy nhất
        if (this.variants.length === 1) {
            // Lọc các option chưa tồn tại trong tổ hợp nào
            return allOptions.filter(option => {
                const fullCombo = [option];
                return !this.isExactCombinationExists(fullCombo, excludeCombinationId);
            });
        }

        // Select đầu tiên (khi có >= 2 biến thể): trả về toàn bộ options
        if (index === 0) {
            return allOptions;
        }

        // Lấy các giá trị đã chọn từ các select trước đó
        const selectedBefore = this.getSelectedValuesBeforeIndex(index, excludeCombinationId);

        // Chưa chọn đủ các select trước đó
        if (selectedBefore.length < index) {
            return [];
        }

        // Lọc các option hợp lệ
        const validOptions = allOptions.filter(option => {
            // Nếu là select cuối cùng: kiểm tra tổ hợp đầy đủ
            if (index === this.variants.length - 1) {
                const fullCombo = [...selectedBefore, option];
                return !this.isExactCombinationExists(fullCombo, excludeCombinationId);
            }

            // Nếu KHÔNG phải select cuối: kiểm tra xem có TỒN TẠI ít nhất 1 cách hoàn thành hợp lệ
            return this.hasValidCompletions(selectedBefore, option, index, excludeCombinationId);
        });

        return validOptions;
    }

    hasValidCompletions(selectedBefore, currentOption, currentIndex, excludeCombinationId) {
        const partialCombo = [...selectedBefore, currentOption];

        // Hàm đệ quy để thử tất cả các cách hoàn thành
        const tryComplete = (combo, fromIndex) => {
            // Đã đủ số lượng variant -> kiểm tra xem tổ hợp này có tồn tại chưa
            if (fromIndex === this.variants.length) {
                return !this.isExactCombinationExists(combo, excludeCombinationId);
            }

            // Thử từng option của variant tiếp theo
            const nextVariant = this.variants[fromIndex];
            for (const opt of nextVariant.options) {
                if (tryComplete([...combo, opt], fromIndex + 1)) {
                    return true; // Tìm thấy 1 cách hoàn thành hợp lệ
                }
            }
            return false;
        };

        return tryComplete(partialCombo, currentIndex + 1);
    }

    /**
     * Kiểm tra tổ hợp ĐẦY ĐỦ có tồn tại hay không
     */
    isExactCombinationExists(fullCombo, excludeCombinationId = null) {
        return this.variantCombinations.some(combo => {
            if (excludeCombinationId && combo._id === excludeCombinationId) {
                return false;
            }

            const comboValues = this.getComboValuesInOrder(combo);

            // So sánh TẤT CẢ các giá trị
            if (comboValues.length !== fullCombo.length) {
                return false;
            }

            return comboValues.every((val, idx) => val === fullCombo[idx]);
        });
    }

    /**
     * Lấy các giá trị đã chọn trước index
     * @param {number} index - Vị trí cần lấy
     * @param {string|null} excludeCombinationId - ID tổ hợp cần loại trừ (dùng cho update)
     * @returns {Array} Mảng các giá trị đã chọn
     */
    getSelectedValuesBeforeIndex(index, excludeCombinationId = null) {
        const selected = [];

        // Nếu đang trong context update (có excludeCombinationId)
        if (excludeCombinationId) {
            const combo = this.variantCombinations.find(c => c._id === excludeCombinationId);
            if (combo) {
                const comboValues = this.getComboValuesInOrder(combo);
                for (let i = 0; i < index; i++) {
                    if (comboValues[i]) {
                        selected.push(comboValues[i]);
                    } else {
                        break;
                    }
                }
                return selected;
            }
        }

        // Context add mới: lấy từ selectedValues
        for (let i = 0; i < index; i++) {
            const variant = this.variants[i];
            if (this.selectedValues.has(variant._id)) {
                selected.push(this.selectedValues.get(variant._id));
            } else {
                break;
            }
        }
        return selected;
    }

    /**
     * Kiểm tra xem tổ hợp đã tồn tại chưa
     * @param {Array} values - Mảng giá trị cần kiểm tra
     * @param {number} lengthToCheck - Số lượng giá trị cần so sánh
     * @param {string|null} excludeCombinationId - ID tổ hợp cần loại trừ
     * @returns {boolean}
     */
    isCombinationExists(values, lengthToCheck, excludeCombinationId = null) {
        return this.variantCombinations.some(combo => {
            // Bỏ qua tổ hợp đang được update
            if (excludeCombinationId && combo._id === excludeCombinationId) {
                return false;
            }

            const comboValues = this.getComboValuesInOrder(combo);

            for (let i = 0; i < lengthToCheck; i++) {
                if (comboValues[i] !== values[i]) {
                    return false;
                }
            }
            return true;
        });
    }

    getComboValuesInOrder(combo) {
        const values = [];
        this.variants.forEach(variant => {
            const variantInCombo = combo.variants.find(v => v.variantId === variant._id);
            values.push(variantInCombo ? variantInCombo.value : null);
        });
        return values;
    }

    async handleAddCombination(e) {
        if (e) e.preventDefault();

        const selects = document.querySelectorAll(".variant-select");
        let newCombo = [];
        let keyParts = [];

        for (const sel of selects) {
            const vid = sel.dataset.variantId;
            const val = sel.value.trim();
            if (!val) {
                showToast("Vui lòng chọn đủ tất cả biến thể!", 'error');
                return;
            }

            newCombo.push({ variantId: vid, value: val });
            keyParts.push(val);
        }

        const variantKey = keyParts.join("-");
        const productId = document.getElementById("btnAddCombination").dataset.productId;

        if (this.variantCombinations.some(c => c.variantKey === variantKey)) {
            showToast("Tổ hợp đã tồn tại!", 'error');
            return;
        }

        const imageFiles = document.getElementById("addCombinationImages").files;
        if (imageFiles.length === 0) {
            showToast("Vui lòng chọn ít nhất 1 ảnh!", 'error');
            return;
        }

        // const data = {
        //     variantKey,
        //     variants: newCombo,
        //     stock: 0,
        //     images: []
        // };
        const formData = new FormData();
        formData.append("variantKey", variantKey);
        formData.append("variants", JSON.stringify(newCombo));
        formData.append("stock", 0);

        // Thêm tất cả ảnh vào formData
        for (let i = 0; i < imageFiles.length; i++) {
            formData.append("images", imageFiles[i]);
        }

        showLoading("Đang thêm tổ hợp...");
        try {
            const res = await fetch(`/api/products/${productId}/variant-combinations/add`, {
                method: "POST",
                // headers: { "Content-Type": "application/json" },
                // body: JSON.stringify(data)
                body: formData
            });

            const result = await res.json();

            if (!res.ok) {
                showToast(result.message || "Thêm tổ hợp thất bại", "error");
                return;
            }

            this.variantCombinations = result.data;
            this.resetForm();
            this.renderCombinationsTable();
            showToast(result.message || "Thêm tổ hợp thành công", "success");


        } catch (err) {
            console.error(err);
            showToast(err.message || "Thêm tổ hợp thất bại", "error");
        } finally {
            hideLoading();
        }
    }

    resetForm() {
        this.selectedValues.clear();
        this.renderVariantSelectors();
    }

    updateVariantCombinations(newCombinations) {
        this.variantCombinations = newCombinations;
        this.renderVariantSelectors();
        this.renderCombinationsTable();
    }

    renderCombinationsTable() {
        const tbody = document.querySelector('.combinations-table tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (this.variantCombinations.length === 0) {
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = `
                <td colspan="4" class="text-center py-4 text-muted">
                    <i class="bi bi-inbox"></i> Chưa có tổ hợp biến thể nào
                </td>
            `;
            tbody.appendChild(emptyRow);
            return;
        }

        this.variantCombinations.forEach((combo, index) => {
            if (!combo.deletedImages) {
                combo.deletedImages = [];
            }

            const row = this.createCombinationRow(combo, index);
            tbody.appendChild(row);
        });

        this.attachTableEvents();
    }

    createCombinationRow(combo, index) {
        const row = document.createElement('tr');
        row.dataset.combinationId = combo._id;
        row.dataset.combinationIndex = index;

        const variantCell = document.createElement('td');
        variantCell.className = 'variant-tags-cell';
        variantCell.innerHTML = this.createVariantSelectorsHTML(combo);
        row.appendChild(variantCell);

        // const imagesCell = document.createElement('td');
        // imagesCell.className = 'images-cell';
        // imagesCell.innerHTML = this.createImagesHTML(combo.images);
        // row.appendChild(imagesCell);

        const imagesCell = document.createElement('td');
        imagesCell.className = 'images-cell';
        imagesCell.innerHTML = this.createImagesHTML(combo.images || [], combo._id); // Truyền combinationId
        row.appendChild(imagesCell);

        const stockCell = document.createElement('td');
        stockCell.className = 'stock-cell';
        stockCell.innerHTML = this.createStockHTML(combo.stock);
        row.appendChild(stockCell);

        const actionsCell = document.createElement('td');
        // actionsCell.className = 'actions-cell';
        actionsCell.innerHTML = this.createActionsHTML();
        row.appendChild(actionsCell);

        return row;
    }

    createVariantSelectorsHTML(combo) {
        let html = '<div class="variant-select-cell">';
        const sortedVariants = this.getSortedVariants(combo.variants);

        sortedVariants.forEach((variant, variantIndex) => {
            const variantConfig = this.variants.find(v => v._id === variant.variantId);
            if (!variantConfig) return;

            const variantName = variantConfig.name;
            const selectedValue = variant.value;

            // Lấy options hợp lệ cho select này trong context update
            const validOptions = this.getValidOptionsForSelect(variantIndex, combo._id);

            html += `<select class="variant-select form-control form-control-sm" 
                              data-variant-id="${variant.variantId}"
                              data-variant-index="${variantIndex}"
                              data-combination-id="${combo._id}">`;
            html += `<option value="">Chọn ${variantName}</option>`;

            // Chỉ hiển thị các options hợp lệ
            validOptions.forEach(option => {
                const selected = option.name === selectedValue ? 'selected' : '';
                html += `<option value="${option.name}" ${selected}>${option.name}</option>`;
            });

            // Nếu giá trị hiện tại không nằm trong validOptions, vẫn hiển thị nó
            if (selectedValue && !validOptions.includes(selectedValue)) {
                html += `<option value="${selectedValue}" selected>${selectedValue}</option>`;
            }

            html += '</select>';
        });

        html += '</div>';
        return html;
    }

    getSortedVariants(comboVariants) {
        return this.variants
            .map(variant => {
                const found = comboVariants.find(v => v.variantId === variant._id);
                return found ? found : null;
            })
            .filter(v => v !== null);
    }

    // createImagesHTML(images) {
    //     // if (!images || images.length === 0) {
    //     //     return '<div class="text-muted small"><i class="bi bi-image"></i> Chưa có ảnh</div>';
    //     // }

    //     let html = `<div class="image-preview" style="display:flex; gap:4px; align-items:center;">`;

    //     // const displayImages = images.slice(0, 3);

    //     // thêm các <img> vào trong image-preview
    //     images.forEach(img => {
    //         html += `
    //         <img src="${img}" alt="Ảnh biến thể"
    //              style="width:50px; height:50px;">
    //     `;
    //     });

    //     // nếu nhiều hơn 3 thì thêm dấu +n
    //     // if (images.length > 3) {
    //     //     html += `
    //     //     <span style="font-size:12px; background:#f1f1f1; padding:2px 4px; border-radius:4px;">
    //     //         +${images.length - 3}
    //     //     </span>
    //     // `;
    //     // }

    //     html += `
    //      <input class="mt-1" type="file" id="addCombinationImages" name="images" multiple accept="image/*"
    //                             data-preview="#previewAddCombinationImages" />
    //                         <div id="previewAddCombinationImages" class="image-preview"></div>
    //     <div class="image-preview add-image-btn" title="Thêm ảnh">
    //         <i class="bi bi-plus"></i>
    //     </div>
    //     `;

    //     html += `</div>`;

    //     return html;
    // }

    createImagesHTML(images, combinationId) {
        let html = `<div class="image-preview-container" data-combination-id="${combinationId}">`;

        // Container cho ảnh hiện tại
        html += `<div class="current-images" style="display:flex; gap:4px; align-items:center; flex-wrap:wrap;">`;

        // Hiển thị ảnh hiện có
        if (images && images.length > 0) {
            images.forEach((img, idx) => {
                html += `
                <div class="image-item" style="position:relative;">
                    <img src="${img}" alt="Ảnh biến thể" style="width:50px; height:50px; object-fit:cover; border-radius:4px;">
                    <button type="button" class="btn-remove-image" data-image-index="${idx}" 
                            style="position:absolute; top:-5px; right:-5px; width:20px; height:20px; 
                            border-radius:50%; background:red; color:white; border:none; cursor:pointer; 
                            display:flex; align-items:center; justify-content:center; font-size:12px;">
                        ×
                    </button>
                </div>
            `;
            });
        }

        html += `</div>`;

        // Input file và preview cho ảnh mới
        html += `
        <div class="new-images-section" style="margin-top:8px;">
              <div id="preview-${combinationId}" class="image-preview-new" 
                 style="display:flex; gap:4px; flex-wrap:wrap;"></div>
            <input class="combination-image-input" type="file" 
                   id="images-${combinationId}" 
                   name="images" 
                   multiple 
                   accept="image/*"
                   data-combination-id="${combinationId}"
                   style="display:none;" />
            <label for="images-${combinationId}" class="add-image-btn" >
                <i class="bi bi-plus" style="font-size:20px;"></i>
            </label>
        </div>
    `;

        html += `</div>`;

        return html;
    }

    createStockHTML(stock) {
        const stockClass = stock > 0 ? 'stock-in' : 'stock-out';
        return `<span class="${stockClass}">${stock}</span>`;
    }

    createActionsHTML() {
        return `
        
           <div class="actions-cell">
            <button class="btn btn-sm btn-primary btn-update">
                <i class="bi bi-check-lg"></i> Cập nhật
            </button>
            <button class="btn btn-sm btn-danger btn-delete">
                <i class="bi bi-trash"></i> Xóa
            </button>
            </div>
        `;
    }

    attachTableEvents() {
        document.querySelectorAll('.variant-select-cell select').forEach(select => {
            select.addEventListener('change', (e) => {
                const combinationId = select.dataset.combinationId;
                const variantIndex = parseInt(select.dataset.variantIndex);
                this.handleTableVariantChange(combinationId, select, variantIndex);
            });
        });

        // document.querySelectorAll('.btn-update').forEach(btn => {
        //     btn.addEventListener('click', async (e) => {
        //         const row = btn.closest('tr');
        //         const combinationId = row.dataset.combinationId;
        //         const productId = document.getElementById("btnAddCombination").dataset.productId;

        //         // Lấy dữ liệu các select trong row
        //         const selects = row.querySelectorAll('.variant-select-cell select');
        //         const variants = Array.from(selects).map(s => ({
        //             variantId: s.dataset.variantId,
        //             value: s.value
        //         }));
        //         showLoading("Đang cập nhật thông tin...");
        //         // Gọi API update
        //         try {
        //             const res = await fetch(`/api/products/${productId}/variant-combinations/${combinationId}`, {
        //                 method: 'PUT',
        //                 headers: { 'Content-Type': 'application/json' },
        //                 body: JSON.stringify({
        //                     variantKey: variants.map(v => v.value).join('_'),
        //                     variants
        //                 })
        //             });
        //             const data = await res.json();
        //             if (res.ok) {
        //                 showToast(data.message || "Cập nhật tổ hợp thành công", "success");
        //                 // Nếu muốn cập nhật lại table
        //                 this.variantCombinations = data.data;
        //                 this.renderCombinationsTable();
        //             } else {
        //                 showToast(data.message || "Cập nhật tổ hợp thất bại", "error");
        //             }
        //         } catch (err) {
        //             console.error(err);
        //             showToast(err.message || "Cập nhật tổ hợp thất bại", "error");
        //         } finally {
        //             hideLoading();
        //         }
        //     });
        // });

        document.querySelectorAll('.btn-update').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const row = btn.closest('tr');
                const combinationId = row.dataset.combinationId;
                const productId = document.getElementById("btnAddCombination").dataset.productId;

                const combo = this.variantCombinations.find(c => c._id === combinationId);
                if (!combo) {
                    showToast("Không tìm thấy tổ hợp", "error");
                    return;
                }

                // Lấy dữ liệu variants
                const selects = row.querySelectorAll('.variant-select-cell select');
                const variants = Array.from(selects).map(s => ({
                    variantId: s.dataset.variantId,
                    value: s.value
                }));

                // Lấy file ảnh mới (nếu có)
                const fileInput = document.querySelector(`#images-${combinationId}`);
                const newImages = fileInput ? fileInput.files : null;

                const deletedImagesList = combo.deletedImages || [];

                showLoading("Đang cập nhật thông tin...");

                try {
                    // Tạo FormData để gửi cả file và data
                    const formData = new FormData();
                    formData.append('variantKey', variants.map(v => v.value).join('_'));
                    formData.append('variants', JSON.stringify(variants));

                    if (deletedImagesList.length > 0) {
                        formData.append('deletedImages', JSON.stringify(deletedImagesList));
                    }

                    // Thêm ảnh mới nếu có
                    if (newImages && newImages.length > 0) {
                        Array.from(newImages).forEach(file => {
                            formData.append('images', file);
                        });
                    }

                    const res = await fetch(`/api/products/${productId}/variant-combinations/${combinationId}`, {
                        method: 'PUT',
                        body: formData // Không set Content-Type, để browser tự set
                    });

                    const data = await res.json();
                    if (res.ok) {
                        showToast(data.message || "Cập nhật tổ hợp thành công", "success");
                        this.variantCombinations = data.data;
                        this.renderCombinationsTable();
                    } else {
                        showToast(data.message || "Cập nhật tổ hợp thất bại", "error");
                    }
                } catch (err) {
                    console.error(err);
                    showToast(err.message || "Cập nhật tổ hợp thất bại", "error");
                } finally {
                    hideLoading();
                }
            });
        });

        // Bắt sự kiện cho nút Xóa
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const confirmed = await showConfirm("Bạn có chắc chắn muốn xoá tổ hợp này");
                if (!confirmed) return;

                const row = btn.closest('tr');
                const combinationId = row.dataset.combinationId;
                const productId = document.getElementById("btnAddCombination").dataset.productId;
                showLoading("Đang xoá tổ hợp...");
                try {
                    const res = await fetch(`/api/products/${productId}/variant-combinations/${combinationId}`, {
                        method: 'DELETE'
                    });
                    const data = await res.json();
                    if (res.ok) {
                        showToast(data.message || "Xoá trạng thái thành công", "success");
                        this.variantCombinations = data.data;
                        this.renderCombinationsTable();
                    } else {
                        showToast(data.message || "Xoá tổ hợp thất bại", "error");
                    }
                } catch (err) {
                    console.error(err);
                    showToast(err.message || "Xoá tổ hợp thất bại", "error");
                } finally {
                    hideLoading();
                }
            });
        });


        document.querySelectorAll('.combination-image-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const combinationId = input.dataset.combinationId;
                const previewContainer = document.querySelector(`#preview-${combinationId}`);
                this.handleCombinationImagePreview(e, previewContainer, combinationId);
            });
        });

        // Bắt sự kiện xóa ảnh cũ
        document.querySelectorAll('.btn-remove-image').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const container = btn.closest('.image-preview-container');
                const combinationId = container.dataset.combinationId;
                const imageIndex = parseInt(btn.dataset.imageIndex);
                this.handleRemoveOldImage(combinationId, imageIndex);
            });
        });
    }

    handleCombinationImagePreview(e, previewContainer, combinationId) {
        const files = e.target.files;
        previewContainer.innerHTML = '';

        if (!files || files.length === 0) return;

        Array.from(files).forEach(file => {
            if (!file.type.startsWith('image/')) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                const imgWrapper = document.createElement('div');
                imgWrapper.className = 'preview-image-item';
                imgWrapper.style.cssText = 'position:relative; display:inline-block;';

                const img = document.createElement('img');
                img.src = event.target.result;
                img.style.cssText = 'width:50px; height:50px; object-fit:cover; border-radius:4px;';

                imgWrapper.appendChild(img);
                previewContainer.appendChild(imgWrapper);
            };
            reader.readAsDataURL(file);
        });
    }

    handleRemoveOldImage(combinationId, imageIndex) {
        // Tìm combination trong mảng
        const combo = this.variantCombinations.find(c => c._id === combinationId);
        if (!combo || !combo.images) return;

        if (!combo.deletedImages) {
            combo.deletedImages = [];
        }

        combo.deletedImages.push(combo.images[imageIndex]);

        // Xóa ảnh khỏi mảng
        combo.images.splice(imageIndex, 1);

        // Re-render lại table
        this.renderCombinationsTable();
    }

    handleTableVariantChange(combinationId, changedSelect, variantIndex) {
        const combo = this.variantCombinations.find(c => c._id === combinationId);
        if (!combo) return;

        const row = changedSelect.closest('tr');
        const selects = row.querySelectorAll('.variant-select');

        const variantId = changedSelect.dataset.variantId;
        const newValue = changedSelect.value;

        // Cập nhật giá trị mới
        const variantIndexInCombo = combo.variants.findIndex(v => v.variantId === variantId);
        if (variantIndexInCombo !== -1) {
            combo.variants[variantIndexInCombo].value = newValue;
        }

        // Reset các select phía sau
        selects.forEach(sel => {
            const selIndex = parseInt(sel.dataset.variantIndex);
            if (selIndex > variantIndex) {
                sel.value = "";
                const vId = sel.dataset.variantId;
                const vIndex = combo.variants.findIndex(v => v.variantId === vId);
                if (vIndex !== -1) {
                    combo.variants[vIndex].value = "";
                }
            }
        });

        // Cập nhật options cho các select phía sau
        selects.forEach(sel => {
            const selIndex = parseInt(sel.dataset.variantIndex);
            if (selIndex > variantIndex) {
                this.updateTableSelectOptions(sel, selIndex, combinationId);
            }
        });

        // Cập nhật variantKey
        combo.variantKey = combo.variants.map(v => v.value).join('-');

        row.classList.add('row-changed');
    }

    updateTableSelectOptions(selectElement, index, combinationId) {
        const currentValue = selectElement.value;
        const validOptions = this.getValidOptionsForSelect(index, combinationId);

        const defaultOption = selectElement.options[0];

        while (selectElement.options.length > 1) {
            selectElement.removeChild(selectElement.options[1]);
        }

        validOptions.forEach(opt => {
            const optionEl = document.createElement("option");
            optionEl.value = opt;
            optionEl.textContent = opt;
            selectElement.appendChild(optionEl);
        });

        if (currentValue && !validOptions.includes(currentValue)) {
            selectElement.value = "";
        }
    }
}

export default VariantManager;