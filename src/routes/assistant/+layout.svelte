<script lang="ts">
    import { page } from "$app/state";
    import type { Snippet } from "svelte";
    import Sidebar from "$lib/components/Sidebar.svelte";
    import Header from "$lib/components/Header.svelte";
    import { NAVIGATION } from "$lib/config/navigation";
    let { children, data }: { children: Snippet; data: any } = $props();

    const navItems = NAVIGATION.assistant;
    const currentTitle = $derived(
        navItems.find((i) => page.url.pathname.startsWith(i.href))?.label ||
            "common.portal",
    );
</script>

<div class="flex h-screen bg-gray-50 overflow-hidden">
    <Sidebar
        items={navItems}
        title="Dentistico"
        userName={data?.user?.full_name || "Assistant"}
    />

    <div class="flex flex-col w-0 flex-1 overflow-hidden">
        <Header title={currentTitle} roleLabel="common.assistant" />

        <main class="flex-1 overflow-y-auto">
            {@render children()}
        </main>
    </div>
</div>
```
