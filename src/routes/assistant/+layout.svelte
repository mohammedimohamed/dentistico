<script lang="ts">
    import { page } from "$app/state";
    import type { Snippet } from "svelte";
    import PortalShell from "$lib/components/PortalShell.svelte";
    import { NAVIGATION } from "$lib/config/navigation";
    let { children, data }: { children: Snippet; data: any } = $props();

    const navItems = NAVIGATION.assistant;
    const currentTitle = $derived(
        navItems.find((i) => page.url.pathname.startsWith(i.href))?.label ||
            "common.portal",
    );
</script>

<PortalShell
    {navItems}
    userName={data?.user?.full_name || "Assistant"}
    headerTitle={currentTitle}
    roleLabel="common.assistant"
>
    {@render children()}
</PortalShell>
