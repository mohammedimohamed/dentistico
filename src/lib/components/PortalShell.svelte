<script lang="ts">
    import type { Snippet } from "svelte";
    import { page } from "$app/state";
    import Sidebar from "./Sidebar.svelte";
    import Header from "./Header.svelte";

    interface Props {
        navItems: any[];
        sidebarTitle?: string;
        userName: string;
        headerTitle: string;
        roleLabel: string;
        children: Snippet;
        headerChildren?: Snippet;
    }

    let {
        navItems,
        sidebarTitle = "Dentistico",
        userName,
        headerTitle,
        roleLabel,
        children,
        headerChildren,
    }: Props = $props();

    let clientLoadTime = $state(0);

    import { onMount } from "svelte";
    onMount(() => {
        // Calculate total page load time from navigation timing
        if (typeof window !== "undefined" && window.performance) {
            const nav = performance.getEntriesByType(
                "navigation",
            )[0] as PerformanceNavigationTiming;
            if (nav) {
                clientLoadTime = Math.round(nav.duration);
            }
        }
    });
</script>

<div class="flex h-full bg-gray-50 overflow-hidden">
    <Sidebar items={navItems} title={sidebarTitle} {userName} />

    <div class="flex flex-col w-0 flex-1 overflow-hidden">
        <Header title={headerTitle} {roleLabel}>
            {#if headerChildren}
                {@render headerChildren()}
            {/if}
        </Header>

        <main
            class="flex-1 overflow-y-auto overflow-x-hidden focus:outline-none flex flex-col"
        >
            <div class="max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 flex-1 w-full">
                {@render children()}
            </div>

            <!-- Debug Footer -->
            {#if page.data.debug}
                <footer
                    class="p-2 bg-gray-100 border-t border-gray-200 text-[10px] text-gray-400 font-mono flex gap-4 justify-center items-center"
                >
                    <span>v{page.data.debug.version}</span>
                    <span class="w-1 h-1 rounded-full bg-gray-300"></span>
                    <span>Load: {clientLoadTime}ms</span>
                    <span class="w-1 h-1 rounded-full bg-gray-300"></span>
                    <span>DB: {page.data.debug.dbSize}KB</span>
                    <span class="w-1 h-1 rounded-full bg-gray-300"></span>
                    <span>Mem: {page.data.debug.memory}MB</span>
                </footer>
            {/if}
        </main>
    </div>
</div>
