import { page } from '$app/state';

class SidebarState {
    #isCollapsed = $state(false);

    get isCollapsed() {
        // Default collapse logic based on path
        const autoCollapse = (
            (page.url.pathname.includes("/journey/") && !page.url.pathname.endsWith("/journey")) ||
            (page.url.pathname.startsWith("/doctor/patients/") && page.url.pathname.split('/').length >= 4)
        );
        return this.#isCollapsed || autoCollapse;
    }

    set isCollapsed(value: boolean) {
        this.#isCollapsed = value;
    }

    toggle() {
        this.#isCollapsed = !this.isCollapsed;
    }

    setCollapsed(value: boolean) {
        this.#isCollapsed = value;
    }
}

export const sidebarState = new SidebarState();
