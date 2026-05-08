<script lang="ts">
    import { enhance } from "$app/forms";
    import { t } from "svelte-i18n";
    import { X, Banknote, CreditCard, Wallet, Landmark, Info, FileText, CheckCircle2, MessageSquare } from "lucide-svelte";
    import { fade, scale } from "svelte/transition";

    interface Props {
        isOpen: boolean;
        patient: any;
        invoices: any[];
        balance: any;
        appConfig: any;
        onClose: () => void;
    }

    let { isOpen, patient, invoices, balance, appConfig, onClose }: Props = $props();

    let isSubmitting = $state(false);
    let selectedInvoiceId = $state("");
    let amount = $state(0);
    let paymentMethod = $state("cash"); // Default to Cash (Algeria context)
    let notes = $state("");
    let generateInvoice = $state(false); // Default to OFF

    const unpaidInvoices = $derived(invoices.filter(inv => inv.status !== 'paid'));

    $effect(() => {
        if (isOpen) {
            amount = balance.balance_due > 0 ? balance.balance_due : 0;
            selectedInvoiceId = ""; // No longer mandatory
            paymentMethod = "cash";
            notes = "";
            generateInvoice = false;
        }
    });

    function formatCurrency(val: number) {
        return new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD' }).format(val).replace('DZD', 'DA');
    }

    const PAYMENT_METHODS = [
        { id: 'cash', label: 'Espèces', icon: Banknote, color: 'emerald' },
        { id: 'card', label: 'Carte/CIB', icon: CreditCard, color: 'blue' },
        { id: 'check', label: 'Chèque', icon: Wallet, color: 'amber' },
        { id: 'bank_transfer', label: 'Virement', icon: Landmark, color: 'slate' }
    ];
</script>

{#if isOpen}
    <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md" transition:fade>
        <div 
            class="bg-white rounded-[32px] w-full max-w-xl overflow-hidden shadow-2xl border border-slate-200"
            transition:scale={{ duration: 300, start: 0.95 }}
        >
            <!-- Header -->
            <div class="p-8 border-b border-slate-100 flex justify-between items-center bg-emerald-50/30">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-100">
                        <Banknote size={24} />
                    </div>
                    <div>
                        <h3 class="text-xl font-black text-slate-900 leading-tight">Simple Pay</h3>
                        <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{patient.full_name}</p>
                    </div>
                </div>
                <button 
                    onclick={onClose} 
                    class="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all"
                >
                    <X size={20} />
                </button>
            </div>

            <form 
                method="POST" 
                action="?/recordPayment" 
                use:enhance={() => {
                    isSubmitting = true;
                    return async ({ result, update }) => {
                        isSubmitting = false;
                        if (result.type === 'success') {
                            const data = (result as any).data;
                            if (generateInvoice && data?.invoiceId) {
                                window.open(`/print/invoice/${data.invoiceId}`, '_blank');
                            }
                            onClose();
                        }
                        await update();
                    };
                }} 
                class="p-8 space-y-8"
            >
                <!-- Method Selection (Tiles) -->
                <div class="space-y-3">
                    <label class="block text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Méthode de Paiement</label>
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {#each PAYMENT_METHODS as method}
                            <button 
                                type="button"
                                onclick={() => paymentMethod = method.id}
                                class="flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2
                                    {paymentMethod === method.id 
                                        ? `border-emerald-600 bg-emerald-50 text-emerald-700 shadow-sm ring-2 ring-emerald-600/10` 
                                        : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200 hover:bg-white hover:text-slate-600'}"
                            >
                                <method.icon size={20} />
                                <span class="text-[10px] font-black uppercase tracking-tight text-center">{method.label}</span>
                            </button>
                        {/each}
                    </div>
                    <input type="hidden" name="payment_method" value={paymentMethod} />
                </div>

                <div class="space-y-6">
                    <!-- Amount Input -->
                    <div class="space-y-3">
                        <label for="amount" class="block text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Montant à Encaisser</label>
                        <div class="relative group">
                            <input 
                                id="amount" 
                                type="number" 
                                name="amount" 
                                step="0.01" 
                                bind:value={amount}
                                required 
                                class="w-full bg-slate-50 border-2 border-slate-100 p-5 pr-14 rounded-2xl font-black text-3xl text-slate-900 focus:bg-white focus:border-emerald-600 transition-all outline-none" 
                            />
                            <span class="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xl">DA</span>
                        </div>
                        {#if balance.balance_due > 0}
                            <button 
                                type="button" 
                                onclick={() => amount = balance.balance_due}
                                class="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 transition-colors flex items-center gap-1.5 ml-1"
                            >
                                <Info size={12} />
                                Tout régler ({formatCurrency(balance.balance_due)})
                            </button>
                        {/if}
                    </div>

                    <!-- Optional Note -->
                    <div class="space-y-3">
                        <label for="notes" class="block text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Note (Optionnel)</label>
                        <div class="relative">
                            <textarea 
                                id="notes" 
                                name="notes" 
                                bind:value={notes}
                                rows="2"
                                placeholder="Ex: Paiement partiel, Avance..."
                                class="w-full bg-slate-50 border-2 border-slate-100 p-4 pl-12 rounded-2xl font-bold text-slate-700 focus:bg-white focus:border-emerald-600 transition-all outline-none resize-none"
                            ></textarea>
                            <div class="absolute left-4 top-4 text-slate-400">
                                <MessageSquare size={20} />
                            </div>
                        </div>
                    </div>

                    <!-- Optional Invoice Link (only if unpaid invoices exist and Advanced Payment Mode is ON) -->
                    {#if appConfig?.payment_mode === 'ADVANCED' && unpaidInvoices.length > 0}
                        <div class="space-y-3">
                            <label for="invoice_id" class="block text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Lier à une facture (Optionnel)</label>
                            <div class="relative">
                                <select 
                                    id="invoice_id" 
                                    name="invoice_id" 
                                    bind:value={selectedInvoiceId}
                                    class="w-full bg-slate-50 border-2 border-slate-100 p-4 pl-12 rounded-2xl font-bold text-slate-700 focus:bg-white focus:border-emerald-600 transition-all outline-none appearance-none"
                                >
                                    <option value="">Ne pas lier (Paiement direct)</option>
                                    {#each unpaidInvoices as inv}
                                        <option value={inv.id.toString()}>#{inv.invoice_number} — {formatCurrency(inv.total_amount)}</option>
                                    {/each}
                                </select>
                                <div class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                    <FileText size={20} />
                                </div>
                            </div>
                        </div>
                    {/if}
                </div>

                <!-- Receipt Toggle -->
                <div class="bg-slate-50 border border-slate-100 p-5 rounded-3xl flex items-center justify-between group hover:bg-indigo-50/30 transition-all">
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:border-indigo-200 transition-all shadow-sm">
                            <FileText size={20} />
                        </div>
                        <div>
                            <p class="text-sm font-black text-slate-900 leading-tight">Imprimer un reçu</p>
                            <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Ouvre l'impression après validation</p>
                        </div>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" bind:checked={generateInvoice} class="sr-only peer">
                        <input type="hidden" name="generate_invoice" value={generateInvoice} />
                        <div class="w-14 h-8 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:start-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                </div>

                <!-- Submit Button -->
                <button 
                    type="submit" 
                    disabled={isSubmitting || amount <= 0}
                    class="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white p-6 rounded-3xl font-black text-xl transition-all shadow-2xl flex items-center justify-center gap-4 group"
                >
                    {#if isSubmitting}
                        <div class="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                    {:else}
                        <CheckCircle2 size={24} class="group-hover:scale-110 transition-transform" />
                        Valider l'Encaissement
                    {/if}
                </button>
            </form>
        </div>
    </div>
{/if}
