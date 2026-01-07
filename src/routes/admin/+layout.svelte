<script lang="ts">
    import { page } from "$app/state";
    import type { Snippet } from "svelte";
    import Header from "$lib/components/Header.svelte";
    import Sidebar from "$lib/components/Sidebar.svelte";
    import { NAVIGATION } from "$lib/config/navigation";

    let { children, data }: { children: Snippet; data: any } = $props();

    const navItems = NAVIGATION.admin;
    const currentTitle = $derived(
        navItems.find((i) => page.url.pathname.startsWith(i.href))?.label ||
            "admin.nav.dashboard",
    );
</script>

<div class="flex h-screen bg-gray-50 overflow-hidden">
    <Sidebar
        items={navItems}
        title="Dentistico Admin"
        userName={data?.user?.full_name || "Admin"}
    />

    <!-- Main Column -->
    <div class="flex flex-col w-0 flex-1 overflow-hidden">
        <Header title={currentTitle} roleLabel="common.admin" />
        <main
            class="flex-1 relative z-0 overflow-y-auto focus:outline-none py-6"
        >
            <div class="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                {@render children()}
            </div>
        </main>
    </div>
</div>
