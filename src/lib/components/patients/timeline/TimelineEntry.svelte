<script lang="ts">
    import { fade } from "svelte/transition";
    let { date, isLast = false, children } = $props();

    const d = $derived(new Date(date.replace(' ', 'T')));
    const day = $derived(d.toLocaleDateString('fr-FR', { day: '2-digit' }));
    const month = $derived(d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', ''));
</script>

<div class="relative pl-20 pb-12 group/entry" in:fade>
    <!-- Vertical Line -->
    {#if !isLast}
        <div class="absolute left-[39px] top-10 bottom-0 w-px bg-slate-100 group-hover/entry:bg-indigo-100 transition-colors"></div>
    {/if}

    <!-- Date Bubble -->
    <div class="absolute left-0 top-0 flex flex-col items-center justify-center w-20 h-20 bg-white border border-slate-100 rounded-3xl shadow-sm z-10 group-hover/entry:border-indigo-200 group-hover/entry:shadow-md transition-all">
        <span class="text-xl font-black text-slate-900 leading-none">{day}</span>
        <span class="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">{month}</span>
    </div>

    <!-- Content -->
    <div class="bg-white rounded-[32px] p-6 border border-slate-100 hover:border-slate-200 transition-all shadow-sm">
        {@render children()}
    </div>
</div>
