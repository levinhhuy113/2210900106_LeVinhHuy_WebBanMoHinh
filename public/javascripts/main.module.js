class Main {
    constructor() {
        document.addEventListener("DOMContentLoaded", () => {
            this.init();
            this.showSessionToast();
        });
    }

    init() {
        this.cacheElements();
        this.setupGlobalUI();
        this.bindEvents();
    }

    cacheElements() {
        // Toast
        this.toastEl = document.getElementById('globalToast');
        this.toastMessage = document.getElementById('globalToastMessage');
        this.toastCloseBtn = document.getElementById('globalToastClose');

        // Loading
        this.loadingWrapper = document.getElementById('globalLoadingWrapper');
        this.loadingMessageEl = document.getElementById('globalLoadingMessage');

        // Confirm
        this.confirmWrapper = document.getElementById('globalConfirmWrapper');
        this.confirmMessageEl = document.getElementById('globalConfirmMessage');
        this.confirmOkBtn = document.getElementById('globalConfirmOk');
        this.confirmCancelBtn = document.getElementById('globalConfirmCancel');
    }

    bindEvents() {
        // Toast close
        if (this.toastCloseBtn) {
            this.toastCloseBtn.addEventListener('click', () => {
                this.toastEl.classList.remove('show');
            });
        }

        // Confirm cancel
        if (this.confirmCancelBtn) {
            this.confirmCancelBtn.addEventListener('click', () => {
                this.confirmWrapper.classList.add('d-none');
                if (this._confirmReject) this._confirmReject(false);
            });
        }

        const mainLayout = document.querySelector('.wrapper-layout');
        const layoutType = mainLayout.dataset.layout;

        const modals = document.querySelectorAll('#globalToast, #globalLoadingWrapper, #globalConfirmWrapper');
        modals.forEach(modal => {
            modal.dataset.layout = layoutType;
        });


        window.formatPrice = (price, currency = '₫') => {
            if (typeof price !== 'number') return '';
            return price.toLocaleString('vi-VN') + ' ' + currency;
        }

        document.querySelector('.logout')?.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await fetch('/api/logout', {
                    method: 'POST',
                    credentials: 'include'
                });
                window.location.href = '/';
            } catch (err) {
                console.error('Logout error:', err);
            }
        });
    }

    showSessionToast() {
        const toastData = sessionStorage.getItem('sessionToast');
        if (toastData) {
            const { message, type } = JSON.parse(toastData);
            showToast(message, type);
            sessionStorage.removeItem('sessionToast');
        }
    }

    setupGlobalUI() {
        const self = this;

        window.setSessionToast = (message, type = 'success') => {
            sessionStorage.setItem(
                'sessionToast',
                JSON.stringify({ message, type })
            );
        };
        window.showToast = (message, type = 'success', delay = 3000) => {
            const iconEl = self.toastEl.querySelector('#globalToastIcon');

            self.toastEl.classList.remove('toast-success', 'toast-error', 'toast-warning');
            iconEl.className = 'toast-icon bi';

            switch (type) {
                case 'success':
                    self.toastEl.classList.add('toast-success');
                    iconEl.classList.add('bi-check-circle');
                    break;
                case 'error':
                    self.toastEl.classList.add('toast-error');
                    iconEl.classList.add('bi-x-circle');
                    break;
                case 'warning':
                    self.toastEl.classList.add('toast-warning');
                    iconEl.classList.add('bi-exclamation-triangle');
                    break;
            }

            self.toastMessage.innerText = message;
            self.toastEl.classList.add('show');

            if (self.toastTimeout) {
                clearTimeout(self.toastTimeout);
            }

            self.toastTimeout = setTimeout(() => {
                self.toastEl.classList.remove('show');
                self.toastTimeout = null;
            }, delay);
        };



        // ===== Loading =====
        window.showLoading = (message = 'Đang tải...') => {
            self.loadingMessageEl.innerText = message;
            self.loadingWrapper.classList.remove('d-none');
        };
        window.hideLoading = () => {
            self.loadingWrapper.classList.add('d-none');
        };

        // ===== Confirm =====
        window.showConfirm = (message) => {
            const confirmWrapper = document.querySelector('.confirm-wrapper');
            const confirmMessageEl = document.getElementById('globalConfirmMessage');
            const confirmOkBtn = document.getElementById('globalConfirmOk');

            return new Promise((resolve) => {
                confirmMessageEl.innerText = message;
                confirmWrapper.classList.remove('d-none');

                const cleanup = () => {
                    confirmWrapper.classList.add('d-none');
                    confirmOkBtn.removeEventListener('click', onClick);
                };

                const onClick = () => {
                    cleanup();
                    resolve(true);
                };

                confirmOkBtn.addEventListener('click', onClick);
            });
        };
    }

}

export default new Main();
