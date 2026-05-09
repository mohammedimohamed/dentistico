<script lang="ts">
    import { fade, slide, scale } from 'svelte/transition';
    import { AlertCircle, AlertTriangle, Info, Bell, X, Skull, HeartPulse } from 'lucide-svelte';

    interface Alert {
        name: string;
        value: any;
        level: 'info' | 'warning' | 'danger';
    }

    let { definitions = [], values = {}, delayMs = 0 } = $props();
    let modalDismissed = $state(false);
    let isDelayed = $state(delayMs > 0);

    $effect(() => {
        if (delayMs > 0) {
            const timer = setTimeout(() => {
                isDelayed = false;
            }, delayMs);
            return () => clearTimeout(timer);
        }
    });

    const allAlerts = $derived.by(() => {
        const list: Alert[] = [];
        for (const def of definitions) {
            if (def.alert_level && def.alert_level !== 'none' && values[def.name]) {
                list.push({
                    name: def.name,
                    value: values[def.name],
                    level: def.alert_level as any
                });
            }
        }
        return list;
    });

    // Info is only visible in fields, so we filter it out here for the banner
    const bannerAlerts = $derived(allAlerts.filter(a => a.level === 'warning' || a.level === 'danger'));
    
    // Critical alerts for the modal
    const criticalAlerts = $derived(allAlerts.filter(a => a.level === 'danger'));

    function getStyles(level: string) {
        switch (level) {
            case 'danger': return 'bg-rose-50 border-rose-200 text-rose-700 shadow-rose-100/50';
            case 'warning': return 'bg-amber-50 border-amber-200 text-amber-700 shadow-amber-100/50';
            default: return 'bg-slate-50 border-slate-200 text-slate-700';
        }
    }

    function getIcon(level: string) {
        switch (level) {
            case 'danger': return AlertCircle;
            case 'warning': return AlertTriangle;
            default: return Bell;
        }
    }

    function formatValue(value: any) {
        if (typeof value === 'object' && value !== null) {
            return Object.entries(value).map(([k, v]) => `${k}: ${v}`).join(' / ');
        }
        return value;
    }
</script>

<!-- Critical Alert Modal (Danger level only) -->
{#if criticalAlerts.length > 0 && !modalDismissed && !isDelayed}
    <div class="fixed inset-0 z-[1000] flex items-center justify-center p-4">
        <div class="fixed inset-0 bg-rose-950/40 backdrop-blur-md" transition:fade></div>
        
        <div 
            class="relative bg-white w-full max-w-lg rounded-[40px] shadow-2xl border-4 border-rose-100 overflow-hidden"
            transition:scale={{ duration: 400, start: 0.8, opacity: 0 }}
        >
            <div class="bg-rose-600 p-10 text-white text-center relative overflow-hidden">
                <div class="absolute top-0 right-0 p-12 opacity-10 rotate-12 scale-150">
                    <Skull size={120} />
                </div>
                <div class="relative z-10">
                    <div class="w-20 h-20 bg-white/20 backdrop-blur-xl rounded-3xl flex items-center justify-center mx-auto mb-6 border border-white/30 animate-pulse">
                        <HeartPulse size={40} />
                    </div>
                    <h2 class="text-3xl font-black uppercase tracking-tighter mb-2">Alerte Critique</h2>
                    <p class="text-rose-100 font-bold uppercase text-[10px] tracking-[0.2em]">Données médicales vitales détectées</p>
                </div>
            </div>

            <div class="p-10 space-y-6">
                {#each criticalAlerts as alert}
                    <div class="flex items-start gap-4 p-5 bg-rose-50 rounded-[28px] border-2 border-rose-100 animate-in fade-in slide-in-from-bottom-2 duration-700">
                        <div class="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm text-rose-600">
                            <AlertCircle size={20} />
                        </div>
                        <div>
                            <p class="text-[9px] font-black uppercase text-rose-400 tracking-widest leading-none mb-1.5">{alert.name}</p>
                            <p class="text-base font-black text-rose-900 leading-tight">{formatValue(alert.value)}</p>
                        </div>
                    </div>
                {/each}

                <button 
                    onclick={() => modalDismissed = true}
                    class="w-full py-5 bg-slate-900 hover:bg-slate-800 text-white rounded-[24px] font-black uppercase tracking-widest transition-all shadow-xl shadow-slate-200 mt-4 active:scale-95"
                >
                    J'ai pris connaissance
                </button>
            </div>
        </div>
    </div>
{/if}

<!-- Banner (Warning & Danger only) -->
{#if bannerAlerts.length > 0}
    <div class="space-y-3 mb-8" transition:slide>
        {#each bannerAlerts as alert}
            <div 
                class="flex items-center gap-4 p-4 rounded-[24px] border-2 shadow-sm transition-all animate-in fade-in slide-in-from-top-4 duration-500 {getStyles(alert.level)} {alert.level === 'danger' ? 'animate-pulse-subtle' : ''}"
                role="alert"
            >
                <div class="w-10 h-10 rounded-xl bg-white/80 flex items-center justify-center shrink-0 shadow-sm">
                    <svelte:component this={getIcon(alert.level)} size={20} />
                </div>
                
                <div class="flex-1 min-w-0">
                    <p class="text-[10px] font-black uppercase tracking-widest opacity-60 leading-none mb-1.5">Alerte Clinique : {alert.name}</p>
                    <p class="text-sm font-bold truncate">
                        {formatValue(alert.value)}
                    </p>
                </div>

                {#if alert.level === 'danger'}
                    <div class="px-3 py-1 rounded-full bg-rose-500 text-white text-[9px] font-black uppercase tracking-tighter shadow-lg shadow-rose-200">
                        Critique
                    </div>
                {/if}
            </div>
        {/each}
    </div>
{/if}

<style>
    @keyframes pulse-subtle {
        0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(244, 63, 94, 0); }
        50% { transform: scale(1.005); box-shadow: 0 0 20px 0 rgba(244, 63, 94, 0.1); }
    }
    .animate-pulse-subtle {
        animation: pulse-subtle 3s infinite ease-in-out;
    }
</style>
