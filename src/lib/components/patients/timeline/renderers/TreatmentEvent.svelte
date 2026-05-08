<script lang="ts">
    import { Stethoscope, MoreVertical, Edit2, Archive, Trash2 } from "lucide-svelte";
    import { formatCurrency } from "$lib/utils/format";

    let { event, user, appConfig, onEdit, onCancel, onDelete } = $props();

    // Lazy parsing of metadata if needed (though treatments are usually flat)
    const metadata = $derived(event.metadata ? (typeof event.metadata === 'string' ? JSON.parse(event.metadata) : event.metadata) : {});
</script>

<div class="flex items-start gap-4 group/event">
    <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-sm shrink-0">
        <Stethoscope size={20} />
    </div>
    
    <div class="flex-1 min-w-0">
        <div class="flex items-center justify-between gap-2">
            <div>
                <span class="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-600 text-[10px] font-black uppercase">
                    Dent {event.tooth_number || 'N/A'} • {event.treatment_type}
                </span>
                <h4 class="font-bold text-slate-900 mt-1 text-sm">{event.description || 'Soin sans description'}</h4>
            </div>
            
            <div class="text-right">
                <p class="font-black text-slate-900 text-sm">{formatCurrency(event.cost || event.amount || 0)}</p>
                {#if event.status === 'completed'}
                    <span class="text-[9px] font-black text-emerald-600 uppercase tracking-tighter">Terminé</span>
                {:else if event.status === 'planned'}
                    <span class="text-[9px] font-black text-indigo-600 uppercase tracking-tighter">Planifié</span>
                {/if}
            </div>
        </div>

        {#if event.notes}
            <p class="text-xs text-slate-500 mt-2 line-clamp-2">{event.notes}</p>
        {/if}
    </div>

    <!-- Actions Menu -->
    <div class="opacity-0 group-hover/event:opacity-100 transition-opacity">
        <details class="relative group/menu">
            <summary class="list-none cursor-pointer p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400">
                <MoreVertical size={16} />
            </summary>
            
            <div class="absolute right-0 top-full mt-1 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-50">
                <button onclick={() => onEdit(event)} class="w-full px-4 py-2 text-left text-xs font-bold text-indigo-600 hover:bg-indigo-50 flex items-center gap-2">
                    <Edit2 size={14} /> Modifier
                </button>
                <button onclick={() => onCancel(event)} class="w-full px-4 py-2 text-left text-xs font-bold text-amber-600 hover:bg-amber-50 flex items-center gap-2">
                    <Archive size={14} /> Annuler
                </button>
                {#if user.role === 'admin' || user.role === 'doctor'}
                    <button onclick={() => onDelete(event)} class="w-full px-4 py-2 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 border-t border-slate-50 mt-1 pt-2">
                        <Trash2 size={14} /> Supprimer
                    </button>
                {/if}
            </div>
        </details>
    </div>
</div>
