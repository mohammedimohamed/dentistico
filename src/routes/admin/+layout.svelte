<script lang="ts">
    import { page } from "$app/state";
    import type { Snippet } from "svelte";
    import PortalShell from "$lib/components/PortalShell.svelte";
    import { NAVIGATION } from "$lib/config/navigation";

    let { children, data }: { children: Snippet; data: any } = $props();

    const navItems = NAVIGATION.admin;
    const currentTitle = $derived(
        navItems.find((i) => page.url.pathname.startsWith(i.href))?.label ||
            "admin.nav.dashboard",
    );
</script>

<PortalShell
    {navItems}
    sidebarTitle="Dentistico Admin"
    userName={data?.user?.full_name || "Admin"}
    headerTitle={currentTitle}
    roleLabel="common.admin"
>
    {@render children()}
</PortalShell>
