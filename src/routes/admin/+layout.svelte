<script lang="ts">
    import { page } from "$app/state";
    import type { Snippet } from "svelte";
    import PortalShell from "$lib/components/PortalShell.svelte";
    import { NAVIGATION } from "$lib/config/navigation";

    let { children, data }: { children: Snippet; data: any } = $props();

    const navItems = $derived(
        NAVIGATION.admin.filter((item) => {
            if (
                item.href === "/inventory" &&
                data.config?.module_inventory === 0
            )
                return false;
            if (
                item.href?.includes("/spending") &&
                data.config?.module_billing === 0
            )
                return false;
            if (
                item.href === "/admin/cdt-codes" &&
                data.config?.module_dental_chart === 0
            )
                return false;
            if (
                item.href === "/admin/templates" &&
                data.config?.module_billing === 0 &&
                data.config?.module_prescriptions === 0
            )
                return false;
            return true;
        }),
    );
    const currentTitle = $derived(
        navItems.find((i) => page.url.pathname.startsWith(i.href))?.label ||
            "admin.nav.dashboard",
    );
</script>

<PortalShell
    {navItems}
    sidebarTitle={data.config?.clinicName
        ? `${data.config.clinicName} Admin`
        : "Dentistico Admin"}
    userName={data?.user?.full_name || "Admin"}
    headerTitle={currentTitle}
    roleLabel="common.admin"
>
    {@render children()}
</PortalShell>
