import { page } from '$app/state';

class SidebarState {
    #isCollapsed = $state(false);
    #forceExpand = $state(false);

    get isCollapsed() {
        if (this.#forceExpand) return false;

        // Default collapse logic based on path
        const autoCollapse = (
            (page.url.pathname.includes("/journey/") && !page.url.pathname.endsWith("/journey")) ||
            (page.url.pathname.startsWith("/doctor/patients/") && page.url.pathname.split('/').length >= 4)
        );
        return this.#isCollapsed || autoCollapse;
    }

    set isCollapsed(value: boolean) {
        // If we want to open it (value === false) and it was auto-collapsed, we need to force expand
        if (!value) {
            this.#forceExpand = true;
            this.#isCollapsed = false;
        } else {
            this.#forceExpand = false;
            this.#isCollapsed = true;
        }
    }

    toggle() {
        this.isCollapsed = !this.isCollapsed;
    }

    setCollapsed(value: boolean) {
        this.isCollapsed = value;
    }
}

export const sidebarState = new SidebarState();
