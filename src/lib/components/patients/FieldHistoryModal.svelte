<script lang="ts">
    import { fade, scale } from 'svelte/transition';
    import { X, Clock, User, Calendar, FileText, ChevronRight } from 'lucide-svelte';
    import { onMount } from 'svelte';

    let { isOpen = false, onClose, patientId, fieldName } = $props();
    let history = $state<any[]>([]);
    let isLoading = $state(true);

    $effect(() => {
        if (isOpen && patientId && fieldName) {
            fetchHistory();
        }
    });

    async function fetchHistory() {
        isLoading = true;
        try {
            const res = await fetch(`/api/fields/history?patient_id=${patientId}&field_name=${encodeURIComponent(fieldName)}`);
            if (res.ok) {
                history = await res.json();
            }
        } catch (e) {
            console.error('Failed to fetch history:', e);
        } finally {
            isLoading = false;
        }
    }

    function formatValue(val: any) {
        if (!val) return '---';
        try {
            const parsed = JSON.parse(val);
            if (typeof parsed === 'object' && parsed !== null && parsed.name && parsed.data) {
                return { type: 'file', name: parsed.name, data: parsed.data };
            }
        } catch {
            // Not JSON, return as string
        }
        return { type: 'text', value: val };
    }

    function formatDate(dateStr: string) {
        return new Intl.DateTimeFormat('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(dateStr));
    }
</script>

{#if isOpen}
    <div class="fixed inset-0 z-[110] flex items-center justify-center p-4">
        <div 
            class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" 
            onclick={onClose}
            transition:fade
        ></div>
        
        <div 
            class="relative bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden border border-slate-100"
            transition:scale={{ duration: 300, start: 0.95 }}
        >
            <div class="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 border border-amber-100">
                        <Clock size={24} />
                    </div>
                    <div>
                        <h2 class="text-xl font-black text-slate-900">Historique : {fieldName}</h2>
                        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Audit des modifications</p>
                    </div>
                </div>
                <button 
                    onclick={onClose}
                    class="w-10 h-10 rounded-full hover:bg-rose-50 hover:text-rose-500 flex items-center justify-center text-slate-400 transition-all"
                >
                    <X size={20} />
                </button>
            </div>

            <div class="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                {#if isLoading}
                    <div class="flex flex-col items-center justify-center py-12 gap-4">
                        <div class="w-8 h-8 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                        <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">Chargement de l'historique...</p>
                    </div>
                {:else if history.length === 0}
                    <div class="flex flex-col items-center justify-center py-12 text-center">
                        <div class="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-300 mb-4">
                            <Clock size={32} />
                        </div>
                        <p class="text-sm font-bold text-slate-900">Aucune modification enregistrée</p>
                        <p class="text-xs text-slate-400 mt-1">Les changements futurs seront trackés ici.</p>
                    </div>
                {:else}
                    <div class="space-y-6">
                        {#each history as item}
                            {@const old = formatValue(item.old_value)}
                            {@const newV = formatValue(item.new_value)}
                            <div class="flex gap-6 group">
                                <div class="flex flex-col items-center gap-2">
                                    <div class="w-2 h-2 rounded-full bg-indigo-500 mt-2 ring-4 ring-indigo-50"></div>
                                    <div class="w-0.5 flex-1 bg-slate-100 rounded-full"></div>
                                </div>
                                <div class="flex-1 pb-6 border-b border-slate-50 group-last:border-none">
                                    <div class="flex items-center justify-between mb-3">
                                        <div class="flex items-center gap-2 text-slate-400">
                                            <Calendar size={14} />
                                            <span class="text-[11px] font-black uppercase tracking-tight">{formatDate(item.changed_at)}</span>
                                        </div>
                                        <div class="flex items-center gap-2 px-2 py-1 bg-slate-100 rounded-lg text-slate-600">
                                            <User size={12} />
                                            <span class="text-[10px] font-bold">{item.changed_by}</span>
                                        </div>
                                    </div>
                                    
                                    <div class="grid grid-cols-2 gap-4">
                                        <div class="p-3 bg-slate-50 rounded-xl border border-slate-100/50">
                                            <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Ancienne valeur</p>
                                            {#if old.type === 'file'}
                                                <a href={old.data} download={old.name} class="flex items-center gap-2 text-xs font-bold text-indigo-600 hover:underline">
                                                    <FileText size={12} /> {old.name}
                                                </a>
                                            {:else}
                                                <p class="text-xs font-bold text-slate-600 line-through decoration-slate-300">{old.value}</p>
                                            {/if}
                                        </div>
                                        <div class="p-3 bg-indigo-50 rounded-xl border border-indigo-100/50">
                                            <p class="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1">Nouvelle valeur</p>
                                            {#if newV.type === 'file'}
                                                <a href={newV.data} download={newV.name} class="flex items-center gap-2 text-xs font-bold text-indigo-600 hover:underline">
                                                    <FileText size={12} /> {newV.name}
                                                </a>
                                            {:else}
                                                <p class="text-xs font-bold text-indigo-900">{newV.value}</p>
                                            {/if}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>
        </div>
    </div>
{/if}

<style>
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
</style>
