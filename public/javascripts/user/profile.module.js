
class Profile {
    constructor() {
        document.addEventListener("DOMContentLoaded", () => {
            this.init();
        });
    }

    init() {
        this.cacheElements();
        this.bindEvents();
        this.loadProvinces();
    }

    cacheElements() {
        this.profileForm = document.querySelector("#profileForm");

        // Avatar
        this.avatarBtn = this.profileForm.querySelector(".change-avatar-btn");
        this.avatarInput = this.profileForm.querySelector("#avatarInput");
        this.avatarImg = this.profileForm.querySelector("#profileAvatar");

        // Shipping inputs
        this.shippingPhone = this.profileForm.querySelector("#shippingPhoneInput");
        this.shippingProvince = this.profileForm.querySelector("#shippingProvinceSelect");
        this.shippingDistrict = this.profileForm.querySelector("#shippingDistrictSelect");
        this.shippingWard = this.profileForm.querySelector("#shippingWardSelect");
        this.shippingAddress = this.profileForm.querySelector("#shippingAddressInput");

        this.passwordForm = document.querySelector("#changePasswordForm");
        if (this.passwordForm) {
            this.oldPassword = this.passwordForm.querySelector('input[name="oldPassword"]');
            this.newPassword = this.passwordForm.querySelector('input[name="newPassword"]');
            this.confirmPassword = this.passwordForm.querySelector('input[name="confirmPassword"]');
        }
    }

    bindEvents() {
        this.avatarBtn.addEventListener("click", () => this.avatarInput.click());

        // Preview avatar
        this.avatarInput.addEventListener("change", () => this.previewAvatar());

        // Submit form
        this.profileForm.addEventListener("submit", (e) => this.submitForm(e));

        this.shippingProvince.addEventListener("change", () => this.loadDistricts(this.shippingProvince.value));

        // khi chọn district, load wards
        this.shippingDistrict.addEventListener("change", () => this.loadWards(this.shippingDistrict.value));

        if (this.passwordForm) {
            this.passwordForm.addEventListener("submit", (e) => this.submitPasswordForm(e));
        }
    }
    async submitPasswordForm(e) {
        e.preventDefault();

        const payload = {
            oldPassword: this.oldPassword.value,
            newPassword: this.newPassword.value,
            confirmPassword: this.confirmPassword.value
        };

        try {
            showLoading("Đang cập nhật mật khẩu...");
            const res = await fetch("/api/profile/change-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const result = await res.json();
            hideLoading();

            if (res.ok && result.success) {
                setSessionToast(result.message || "Đổi mật khẩu thành công!", "success");
                window.location.reload();
            } else {
                showToast(result.message || "Đổi mật khẩu thất bại!", "error");
            }
        } catch (err) {
            hideLoading();
            console.error("Lỗi khi đổi mật khẩu:", err);
            showToast("Có lỗi xảy ra khi đổi mật khẩu!", "error");
        }
    }

    previewAvatar() {
        const file = this.avatarInput.files[0];
        if (!file) return;

        const url = URL.createObjectURL(file);

        if (this.avatarImg.tagName === "IMG") {
            this.avatarImg.src = url;
        } else {
            const img = document.createElement("img");
            img.id = "profileAvatar";
            img.src = url;
            img.alt = "Avatar";
            this.avatarImg.replaceWith(img);
            this.avatarImg = img;
        }
    }

    async submitForm(e) {
        e.preventDefault();

        const formData = new FormData(this.profileForm);
        try {
            showLoading("Đang cập nhật thông tin...");
            const res = await fetch("/api/profile", {
                method: "PUT",
                body: formData,
            });

            const result = await res.json();
            hideLoading();

            if (res.ok && result.success) {
                setSessionToast(result.message || "Cập nhật thành công!", "success");

                const params = new URLSearchParams(window.location.search);
                if (params.get("from") === "payment") {
                    window.history.back();
                } else {
                    window.location.reload();
                }

            } else {
                showToast(result.message || "Cập nhật thất bại!", "error");
            }
        } catch (err) {
            hideLoading();
            console.error("Lỗi khi cập nhật thông tin:", err);
            showToast("Có lỗi xảy ra khi cập nhật thông tin!", "error");
        }
    }

    async loadProvinces() {
        try {
            const res = await fetch("/api/profile/locations");
            const result = await res.json();
            if (!res.ok || !result.success) throw new Error(result.message);

            const provinces = result.data || [];
            if (!provinces.length) return;

            const userProvinceId = this.shippingProvince.dataset.userValue || null;
            this.shippingProvince.innerHTML = provinces.map(p => {
                const selected = userProvinceId === p.Id ? "selected" : "";
                return `<option value="${p.Id}" ${selected}>${p.Name}</option>`;
            }).join("");

            // nếu user đã chọn province, load districts theo province đó
            const selectedProvinceId = userProvinceId || provinces[0].Id;
            await this.loadDistricts(selectedProvinceId);

        } catch (err) {
            console.error("Lỗi khi load provinces:", err);
        }
    }

    // Load districts theo provinceId
    async loadDistricts(provinceId) {
        if (!provinceId) {
            this.shippingDistrict.innerHTML = '<option value="">Chọn quận/huyện</option>';
            return;
        }

        try {
            const res = await fetch(`/api/profile/locations/${provinceId}/districts`);
            const result = await res.json();
            if (!res.ok || !result.success) throw new Error(result.message);

            const districts = result.data || [];
            const userDistrictId = this.shippingDistrict.dataset.userValue || null;
            this.shippingDistrict.innerHTML = districts.map(d => {
                const selected = userDistrictId === d.Id ? "selected" : "";
                return `<option value="${d.Id}" ${selected}>${d.Name}</option>`;
            }).join("");

            const selectedDistrictId = userDistrictId || (districts[0] ? districts[0].Id : null);
            await this.loadWards(selectedDistrictId);

        } catch (err) {
            console.error("Lỗi khi load districts:", err);
        }
    }

    // Load wards theo provinceId + districtId
    async loadWards(districtId) {
        if (!districtId) {
            this.shippingWard.innerHTML = '<option value="">Chọn phường/xã</option>';
            return;
        }

        const provinceId = this.shippingProvince.value; // lấy provinceId hiện tại

        if (!provinceId) {
            this.shippingWard.innerHTML = '<option value="">Chọn phường/xã</option>';
            return;
        }

        try {
            const res = await fetch(`/api/profile/locations/${provinceId}/districts/${districtId}/wards`);
            const result = await res.json();
            if (!res.ok || !result.success) throw new Error(result.message);

            const wards = result.data || [];
            const userWardCode = this.shippingWard.dataset.userValue || null;
            this.shippingWard.innerHTML = wards.map(w => {
                const selected = userWardCode === w.Id ? "selected" : "";
                return `<option value="${w.Id}" ${selected}>${w.Name}</option>`;
            }).join("");

        } catch (err) {
            console.error("Lỗi khi load wards:", err);
            this.shippingWard.innerHTML = '<option value="">Chọn phường/xã</option>';
        }
    }

}

export default new Profile();
