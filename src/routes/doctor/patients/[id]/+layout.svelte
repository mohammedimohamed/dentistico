<script lang="ts">
    import { sidebarState } from "$lib/stores/ui.svelte";
    import { onMount } from "svelte";

    let { children } = $props();

    onMount(() => {
        // Force collapse when entering any patient-related page
        sidebarState.isCollapsed = true;
    });
</script>

{@render children()}
