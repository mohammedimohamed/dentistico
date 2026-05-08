<script lang="ts">
    import { Calendar, Clock, MapPin, MoreVertical, Edit2, XCircle } from "lucide-svelte";

    let { event, onReschedule, onCancel } = $props();

    const date = $derived(new Date(event.start_time.replace(' ', 'T')));
    const isCancelled = $derived(event.status === 'cancelled');
    const isPast = $derived(date < new Date());
</script>

<div class="flex items-start gap-4 group/event {isCancelled ? 'opacity-50 grayscale' : ''}">
    <div class="w-10 h-10 rounded-xl {isPast ? 'bg-slate-100 text-slate-400' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'} flex items-center justify-center shrink-0">
        <Calendar size={20} />
    </div>
    
    <div class="flex-1 min-w-0">
        <div class="flex items-center justify-between gap-2">
            <div>
                <span class="px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase">
                    Rendez-vous • {event.appointment_type}
                </span>
                <h4 class="font-bold text-slate-900 mt-1 text-sm">
                    {isPast ? 'Passé: ' : 'Prévu: '} Dr. {event.doctor_name || 'Médecin'}
                </h4>
            </div>
            
            <div class="text-right">
                <div class="flex items-center gap-1 justify-end text-slate-900 font-black text-sm">
                    <Clock size={12} class="text-slate-400" />
                    {date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <span class="text-[9px] font-black {isCancelled ? 'text-rose-500' : (isPast ? 'text-slate-400' : 'text-indigo-600')} uppercase tracking-tighter">
                    {isCancelled ? 'Annulé' : (isPast ? 'Honoré' : 'À venir')}
                </span>
            </div>
        </div>

        {#if event.notes}
            <p class="text-xs text-slate-500 mt-2">{event.notes}</p>
        {/if}
    </div>

    {#if !isPast && !isCancelled}
        <div class="opacity-0 group-hover/event:opacity-100 transition-opacity">
            <details class="relative group/menu">
                <summary class="list-none cursor-pointer p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400">
                    <MoreVertical size={16} />
                </summary>
                
                <div class="absolute right-0 top-full mt-1 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-50">
                    <button onclick={() => onReschedule(event)} class="w-full px-4 py-2 text-left text-xs font-bold text-slate-900 hover:bg-slate-50 flex items-center gap-2">
                        <Edit2 size={14} /> Déplacer
                    </button>
                    <button onclick={() => onCancel(event)} class="w-full px-4 py-2 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 border-t border-slate-50 mt-1 pt-2">
                        <XCircle size={14} /> Annuler
                    </button>
                </div>
            </details>
        </div>
    {/if}
</div>
