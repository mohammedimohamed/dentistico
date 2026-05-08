<script lang="ts">
    import { page } from "$app/state";
    import type { Snippet } from "svelte";
    import PortalShell from "$lib/components/PortalShell.svelte";
    import { NAVIGATION } from "$lib/config/navigation";
    import { configStore } from "$lib/stores/config.svelte";
    let { children, data }: { children: Snippet; data: any } = $props();

    const navItems = $derived(
        NAVIGATION.assistant.filter((item) => {
            if (item.href === "/lab-tracking") {
                const allowedRoles = (configStore.raw?.module_custom_roles || 'doctor').split(',');
                if (!allowedRoles.includes(data.user?.role)) return false;
            }
            if (item.href === "/assistant/invoices" && data.config?.invoicing_enabled === 0) {
                return false;
            }
            return true;
        }),
    );
    const currentTitle = $derived(
        navItems.find((i) => page.url.pathname.startsWith(i.href))?.label ||
            "common.portal",
    );
</script>

<PortalShell
    {navItems}
    sidebarTitle={data.config?.clinicName || "Dentistico"}
    userName={data?.user?.full_name || "Assistant"}
    headerTitle={currentTitle}
    roleLabel="common.assistant"
    noPadding={page.url.pathname.includes("/journey/")}
>
    {@render children()}
</PortalShell>
