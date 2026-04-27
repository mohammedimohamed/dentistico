<script lang="ts">
    import type { Snippet } from "svelte";
    let { children, data }: { children: Snippet; data: any } = $props();
</script>

{@render children()}
