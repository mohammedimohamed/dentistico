<script lang="ts">
    import { page } from "$app/state";
    import type { Snippet } from "svelte";
    import PortalShell from "$lib/components/PortalShell.svelte";
    import { NAVIGATION } from "$lib/config/navigation";
    let { children, data }: { children: Snippet; data: any } = $props();

    const navItems = $derived(NAVIGATION.doctor);
    const currentTitle = $derived(
        navItems.find((i) => page.url.pathname.startsWith(i.href))?.label ||
            "common.portal",
    );
</script>

<PortalShell
    {navItems}
    sidebarTitle={data.config?.clinicName || "Dentistico"}
    userName={data?.user?.full_name || "Doctor"}
    headerTitle={currentTitle}
    roleLabel="common.doctor"
>
    {@render children()}
</PortalShell>
