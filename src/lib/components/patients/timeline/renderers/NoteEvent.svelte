<script lang="ts">
    import { MessageSquare, Trash2, AlertCircle } from "lucide-svelte";

    let { event, user, onDelete } = $props();

    const isImportant = $derived(event.importance === 'high');
</script>

<div class="flex items-start gap-4 group/event">
    <div class="w-10 h-10 rounded-xl {isImportant ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'} flex items-center justify-center shadow-sm shrink-0">
        {#if isImportant}
            <AlertCircle size={20} />
        {:else}
            <MessageSquare size={20} />
        {/if}
    </div>
    
    <div class="flex-1 min-w-0">
        <div class="flex items-center justify-between gap-2">
            <div>
                <span class="px-2 py-0.5 rounded-lg {isImportant ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'} text-[10px] font-black uppercase">
                    Note Clinique {#if isImportant}• Importante{/if}
                </span>
            </div>
        </div>

        <div class="mt-2 text-sm text-slate-700 bg-slate-50/50 p-4 rounded-2xl border border-slate-100 italic leading-relaxed">
            "{event.content}"
        </div>
        
        <p class="text-[9px] font-bold text-slate-400 mt-2 uppercase tracking-widest">
            Rédigé par Dr. {event.doctor_name || 'Médecin'}
        </p>
    </div>

    <div class="opacity-0 group-hover/event:opacity-100 transition-opacity">
        <button 
            onclick={() => onDelete(event)}
            class="p-2 hover:bg-rose-50 text-slate-300 hover:text-rose-500 rounded-lg transition-all"
        >
            <Trash2 size={14} />
        </button>
    </div>
</div>
