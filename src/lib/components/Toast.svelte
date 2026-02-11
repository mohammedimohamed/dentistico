<script lang="ts">
    import { fly } from "svelte/transition";
    import { onMount } from "svelte";

    let { message = "", type = "info", duration = 3000, onclose } = $props();

    onMount(() => {
        if (duration > 0) {
            const timer = setTimeout(() => {
                if (onclose) onclose();
            }, duration);
            return () => clearTimeout(timer);
        }
    });

    function getBgColor() {
        switch (type) {
            case "success":
                return "bg-green-600";
            case "error":
                return "bg-red-600";
            case "warning":
                return "bg-amber-500";
            default:
                return "bg-gray-800";
        }
    }
</script>

<div
    in:fly={{ y: -20, duration: 300 }}
    out:fly={{ y: -20, duration: 300 }}
    class="fixed top-24 right-8 z-[60] px-6 py-4 rounded-xl shadow-2xl text-white font-bold flex items-center gap-3 {getBgColor()}"
>
    {#if type === "success"}
        <span>✅</span>
    {:else if type === "error"}
        <span>❌</span>
    {:else}
        <span>🔔</span>
    {/if}
    <p>{message}</p>
    <button
        onclick={onclose}
        class="ml-2 hover:bg-white/20 rounded-full p-1 transition">✕</button
    >
</div>
