import Switch from "./components/switch.js";

class Customers {
    constructor() {
        document.addEventListener("DOMContentLoaded", () => {
            this.init();
        });
    }

    init() {
        this.applyAnimationDelay("[class*='animate-']", 0.1);
        this.bindEvents();
    }

    applyAnimationDelay(selector, step = 0.1) {
        document.querySelectorAll(selector).forEach((el, index) => {
            el.style.animationDelay = `${index * step}s`;
        });
    }

    bindEvents() {
        document.querySelectorAll('.switch').forEach((s) => {
            new Switch(s, {
                onEnable: async () => {
                    const confirmed = await showConfirm(
                        "Bạn có chắc chắn muốn MỞ KHÓA tài khoản người dùng này không?"
                    );
                    if (!confirmed) return false;

                    return await this.toggleUserStatus(s, false); // false = unlock
                },
                onDisable: async () => {
                    const confirmed = await showConfirm(
                        "Bạn có chắc chắn muốn KHÓA tài khoản người dùng này không?\nNgười dùng sẽ không thể đăng nhập."
                    );
                    if (!confirmed) return false;

                    return await this.toggleUserStatus(s, true); // true = lock
                }
            });
        });
    }

    /**
     * @param {HTMLElement} el switch element
     * @param {boolean} isLocked true = lock | false = unlock
     */
    async toggleUserStatus(el, isLocked) {
        const userId = el.dataset.id;

        try {
            showLoading(isLocked ? "Đang khóa tài khoản..." : "Đang mở khóa tài khoản...");

            const res = await fetch(`/api/customers/toggle/${userId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isLocked })
            });

            const result = await res.json();
            hideLoading();

            if (result.success) {
                showToast(
                    result.message ||
                        (isLocked
                            ? "Đã khóa tài khoản người dùng"
                            : "Đã mở khóa tài khoản người dùng"),
                    "success"
                );
                return true;
            }

            showToast(result.message || "Cập nhật trạng thái thất bại", "error");
            return false;
        } catch (err) {
            hideLoading();
            showToast("Có lỗi xảy ra khi cập nhật trạng thái tài khoản", "error");
            return false;
        }
    }
}

export default new Customers();
