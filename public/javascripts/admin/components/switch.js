export default class Switch {
    constructor(element, options = {}) {
        this.el = element;
        if (!this.el) return;

        this.options = {
            onEnable: options.onEnable || (() => Promise.resolve(true)), // phải trả về Promise
            onDisable: options.onDisable || (() => Promise.resolve(true))
        };

        this.init();
    }

    init() {
        const defaultState = this.el.dataset.active === "true";
        this.setState(defaultState);

        this.el.addEventListener("click", () => this.handleClick());
    }

    async handleClick() {
        const prevState = this.getState();
        const newState = !prevState;

        try {
            let success = false;
            if (newState) {
                success = await this.options.onEnable();
            } else {
                success = await this.options.onDisable();
            }

            // chỉ cập nhật giao diện khi success
            if (success) {
                this.setState(newState);
            } else {
                this.setState(prevState); // reset lại
            }
        } catch (err) {
            console.error("Switch action error:", err);
            this.setState(prevState); // reset lại khi lỗi
        }
    }

    setState(state) {
        this.el.classList.toggle("active", state);
    }

    getState() {
        return this.el.classList.contains("active");
    }
}
