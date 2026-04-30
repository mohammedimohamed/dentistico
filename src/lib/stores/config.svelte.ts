import { browser } from '$app/environment';

class ConfigStore {
    #config = $state<any>(null);

    get modules() {
        if (!this.#config) return {};
        return {
            billing: this.#config.module_billing !== 0,
            prescriptions: this.#config.module_prescriptions !== 0,
            dental_chart: this.#config.module_dental_chart !== 0,
            inventory: this.#config.module_inventory !== 0,
            dashboard: this.#config.module_dashboard !== 0,
            patients: this.#config.module_patients !== 0,
            journey: this.#config.module_journey !== 0,
            custom: this.#config.module_custom !== 0,
        };
    }

    get raw() {
        return this.#config;
    }

    init(config: any) {
        this.#config = config;
    }

    update(key: string, value: any) {
        if (this.#config) {
            this.#config[key] = value;
        }
    }
}

export const configStore = new ConfigStore();
