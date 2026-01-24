export default class Select {
    constructor(element, options = {}) {
        this.el = element;
        if (!this.el) return;

        this.options = {
            onChange: options.onChange || (() => Promise.resolve(true))
        };

        this.trigger = this.el.querySelector('.cs-trigger');
        this.label = this.el.querySelector('.cs-label');
        this.optionsBox = this.el.querySelector('.cs-options');
        this.optionEls = Array.from(this.el.querySelectorAll('.cs-option'));
        this.value = this.el.dataset.value || null;


        this.init();
    }

    init() {
        // Đặt option hiện tại
        const activeOption = this.optionEls.find(opt => opt.dataset.value === this.value);
        if (activeOption) this.setActiveOption(activeOption);

        // Toggle mở/đóng
        this.trigger.addEventListener('click', (e) => {
            e.stopPropagation();

            document.querySelectorAll('.custom-select.open').forEach(sel => {
                if (sel !== this.el) sel.classList.remove('open');
            });

            this.toggleOptions();
        });

        // Chọn option
        this.optionEls.forEach(opt => {
            opt.addEventListener('click', async (e) => {
                e.stopPropagation();
                const newVal = opt.dataset.value;
                const oldVal = this.value;
                if (newVal === oldVal) return this.closeOptions();

                const success = await this.options.onChange(newVal, oldVal);
                if (success) this.setActiveOption(opt);
                this.closeOptions();
            });
        });

        // Click ra ngoài đóng lại
        document.addEventListener('click', (e) => {
            if (!this.el.contains(e.target)) this.closeOptions();
        });
    }

    toggleOptions() {
        if (!this.optionEls.length) return;

        const isOpen = this.el.classList.toggle('open');
        this.optionsBox.setAttribute('aria-hidden', !isOpen);
        this.trigger.setAttribute('aria-expanded', isOpen);
    }

    closeOptions() {
        this.el.classList.remove('open');
        this.optionsBox.setAttribute('aria-hidden', true);
        this.trigger.setAttribute('aria-expanded', false);
    }

    setActiveOption(opt) {
        this.optionEls.forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        this.value = opt.dataset.value;
        this.el.dataset.value = this.value;
        this.label.textContent = opt.textContent.trim();
    }

    getValue() {
        return this.value;
    }

    setValue(value) {
        const opt = this.optionEls.find(o => o.dataset.value === value);
        if (opt) this.setActiveOption(opt);
    }

    setOptions(items) {
        this.optionsBox.innerHTML = '';
        this.optionEls = items.map(item => {
            const div = document.createElement('div');
            div.className = 'cs-option';
            div.dataset.value = item.value;
            div.textContent = item.label;
            if (item.value === this.value) div.classList.add('active');
            this.optionsBox.appendChild(div);
            div.addEventListener('click', async (e) => {
                e.stopPropagation();
                const newVal = div.dataset.value;
                const oldVal = this.value;
                if (newVal === oldVal) return this.closeOptions();

                const success = await this.options.onChange(newVal, oldVal);
                if (success) this.setActiveOption(div);
                this.closeOptions();
            });
            return div;
        });
    }
}
