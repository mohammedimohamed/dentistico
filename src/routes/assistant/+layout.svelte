<script lang="ts">
    import { page } from "$app/state";
    import type { Snippet } from "svelte";
    import PortalShell from "$lib/components/PortalShell.svelte";
    import { NAVIGATION } from "$lib/config/navigation";
    let { children, data }: { children: Snippet; data: any } = $props();

    const navItems = $derived(
        NAVIGATION.assistant.filter((item) => {
            if (
                item.href === "/inventory" &&
                data.config?.module_inventory === 0
            )
                return false;
            if (
                (item.href?.includes("/spending") ||
                    item.href?.includes("/invoices")) &&
                data.config?.module_billing === 0
            )
                return false;
            if (item.href === "/lab-tracking") {
                if (data.config?.module_custom === 0) return false;
                const allowedRoles = (data.config?.module_custom_roles || 'doctor').split(',');
                if (!allowedRoles.includes(data.user?.role)) return false;
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
