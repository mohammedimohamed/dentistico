<script lang="ts">
    import { Banknote, ArrowUpRight, ArrowDownLeft, RotateCcw } from "lucide-svelte";
    import { formatCurrency } from "$lib/utils/format";

    let { event, user, onReverse } = $props();

    const isPayment = $derived(event.type === 'payment' || (event.type === 'adjustment' && event.amount < 0));
    const isCharge = $derived(event.type === 'charge' || (event.type === 'adjustment' && event.amount > 0));
</script>

<div class="flex items-start gap-4 group/event">
    <div class="w-10 h-10 rounded-xl {isPayment ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-500'} flex items-center justify-center shadow-sm shrink-0">
        {#if isPayment}
            <ArrowDownLeft size={20} />
        {:else}
            <ArrowUpRight size={20} />
        {/if}
    </div>
    
    <div class="flex-1 min-w-0">
        <div class="flex items-center justify-between gap-2">
            <div>
                <span class="px-2 py-0.5 rounded-lg {isPayment ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-500'} text-[10px] font-black uppercase">
                    {isPayment ? 'Encaissement' : 'Facturation'} • {event.payment_method || 'Interne'}
                </span>
                <h4 class="font-bold text-slate-900 mt-1 text-sm">{event.description}</h4>
            </div>
            
            <div class="text-right">
                <p class="font-black {isPayment ? 'text-emerald-600' : 'text-slate-900'} text-sm">
                    {isPayment ? '-' : '+'}{formatCurrency(Math.abs(event.amount))}
                </p>
                <span class="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                    {event.type === 'adjustment' ? 'Ajustement' : (isPayment ? 'Paiement' : 'Débit')}
                </span>
            </div>
        </div>
    </div>

    {#if user.role === 'doctor' && event.source_type !== 'manual'}
        <div class="opacity-0 group-hover/event:opacity-100 transition-opacity">
            <button 
                onclick={() => onReverse(event)}
                class="p-2 hover:bg-rose-50 text-slate-300 hover:text-rose-500 rounded-lg transition-all"
                title="Annuler cette écriture"
            >
                <RotateCcw size={14} />
            </button>
        </div>
    {/if}
</div>
