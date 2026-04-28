<script lang="ts">
    import type { PageData } from "./$types";
    import { enhance } from "$app/forms";
    import { t } from "svelte-i18n";
    import { calculateAge } from "$lib/dental/tooth-data";
    import OdontogrammePro from "$lib/components/dental-v2/OdontogrammePro.svelte";
    import PrescriptionBuilder from "$lib/components/PrescriptionBuilder.svelte";
    import { page } from "$app/state";

    let { data }: { data: PageData } = $props();
    let activeTab = $state();
    
    // Set initial tab or update if config changes
    $effect(() => {
        if (!activeTab) {
            activeTab = data.config?.module_dental_chart !== 0 ? "odontogramme" : "historique";
        }
    });

    const age = $derived(data.patient.date_of_birth ? calculateAge(data.patient.date_of_birth) : 0);
    const balance = $derived(data.balance);

    // Filter treatments for History & Planning
    const pastTreatments = $derived(data.treatments.filter((t: any) => t.status === 'completed'));
    const plannedTreatments = $derived(data.treatments.filter((t: any) => t.status === 'planned' || t.status === 'pending'));

    // Formatting currency
    function formatCurrency(amount: number) {
        return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'DZD' }).format(amount);
    }

    let isPaymentModalOpen = $state(false);
    let isPrescriptionModalOpen = $state(false);

</script>

<div class="min-h-screen bg-[#f8fafc] font-sans">
    <!-- Main Header -->
    <header class="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div class="max-w-[1600px] mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-6">
            <!-- Patient Profile -->
            <div class="flex items-center gap-4">
                <div class="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 text-2xl font-bold border border-indigo-100 shadow-sm">
                    {data.patient.full_name.charAt(0)}
                </div>
                <div>
                    <h1 class="text-2xl font-black text-slate-900 leading-tight">{data.patient.full_name}</h1>
                    <div class="flex items-center gap-3 mt-1 text-sm font-semibold text-slate-500">
                        <span class="flex items-center gap-1">🎂 {age} ans</span>
                        <span class="w-1 h-1 rounded-full bg-slate-300"></span>
                        <span class="flex items-center gap-1">📞 {data.patient.phone || 'N/A'}</span>
                    </div>
                </div>
            </div>

            <!-- Crucial Alerts (High Visibility) -->
            <div class="flex flex-1 max-w-2xl gap-3">
                {#if data.patient.allergies && data.patient.allergies !== 'None'}
                    <div class="flex-1 bg-red-50 border-2 border-red-200 rounded-2xl p-3 flex items-center gap-3 animate-pulse shadow-sm">
                        <span class="text-2xl">⚠️</span>
                        <div>
                            <p class="text-[10px] font-black uppercase tracking-wider text-red-500">Allergies</p>
                            <p class="text-sm font-bold text-red-900 leading-tight">{data.patient.allergies}</p>
                        </div>
                    </div>
                {/if}
                {#if data.patient.medical_conditions && data.patient.medical_conditions !== 'None'}
                    <div class="flex-1 bg-amber-50 border-2 border-amber-200 rounded-2xl p-3 flex items-center gap-3 shadow-sm">
                        <span class="text-2xl">🩺</span>
                        <div>
                            <p class="text-[10px] font-black uppercase tracking-wider text-amber-500">Notes Médicales</p>
                            <p class="text-sm font-bold text-amber-900 leading-tight">{data.patient.medical_conditions}</p>
                        </div>
                    </div>
                {/if}
            </div>

            <!-- Financial Balance -->
            <div class="bg-slate-900 rounded-2xl p-4 text-white flex items-center gap-8 shadow-xl shadow-slate-200">
                <div class="text-center">
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Dû</p>
                    <p class="text-lg font-black">{formatCurrency(balance.total_billed)}</p>
                </div>
                <div class="w-px h-8 bg-slate-700"></div>
                <div class="text-center">
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Payé</p>
                    <p class="text-lg font-black text-emerald-400">{formatCurrency(balance.total_paid)}</p>
                </div>
                <div class="w-px h-8 bg-slate-700"></div>
                <div class="text-center">
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Solde</p>
                    <p class="text-xl font-black {balance.balance_due > 0 ? 'text-rose-400' : 'text-emerald-400'}">
                        {formatCurrency(balance.balance_due)}
                    </p>
                </div>
            </div>
        </div>
    </header>

    <div class="max-w-[1600px] mx-auto px-6 py-8 flex flex-col lg:flex-row gap-8 items-start">
        <!-- Main Content (Tabs) -->
        <main class="flex-1 min-w-0 w-full order-1 lg:order-1">
            <!-- Tab Switcher -->
            <div class="flex bg-white p-2 rounded-3xl border border-slate-200 mb-8 w-fit shadow-sm overflow-x-auto">
                {#if data.config?.module_dental_chart !== 0}
                    <button 
                        onclick={() => activeTab = "odontogramme"}
                        class="px-8 py-3 rounded-2xl font-bold text-sm transition-all whitespace-nowrap {activeTab === 'odontogramme' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:text-slate-900'}"
                    >
                        Odontogramme
                    </button>
                {/if}
                <button 
                    onclick={() => activeTab = "historique"}
                    class="px-8 py-3 rounded-2xl font-bold text-sm transition-all whitespace-nowrap {activeTab === 'historique' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:text-slate-900'}"
                >
                    Historique & Planning
                </button>
                <button 
                    onclick={() => activeTab = "finances"}
                    class="px-8 py-3 rounded-2xl font-bold text-sm transition-all whitespace-nowrap {activeTab === 'finances' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:text-slate-900'}"
                >
                    Finances
                </button>
            </div>

            <!-- Tab Content -->
            <div class="bg-white rounded-[40px] border border-slate-200 shadow-sm min-h-[600px] overflow-hidden">
                {#if activeTab === "odontogramme" && data.config?.module_dental_chart !== 0}
                    <div class="p-10">
                        <OdontogrammePro 
                            patientId={data.patient.id} 
                            annotations={data.annotations} 
                            treatments={data.treatments} 
                        />
                    </div>
                {:else if activeTab === "historique"}
                    <div class="p-8">
                        <div class="grid grid-cols-2 gap-12">
                            <!-- Planned RoadMap -->
                            <section>
                                <div class="flex items-center justify-between mb-6">
                                    <h2 class="text-lg font-black text-slate-900 flex items-center gap-2">
                                        <span class="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center text-sm">📅</span>
                                        Roadmap (Soins Prévus)
                                    </h2>
                                    <span class="bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-xs font-black">{plannedTreatments.length}</span>
                                </div>
                                <div class="space-y-4">
                                    {#each plannedTreatments as tr}
                                        <div class="bg-white border border-slate-200 rounded-2xl p-5 hover:border-amber-200 transition-colors shadow-sm group">
                                            <div class="flex justify-between items-start">
                                                <div>
                                                    <span class="text-[10px] font-black text-amber-500 uppercase">Dent {tr.tooth_number} • {tr.treatment_type}</span>
                                                    <h4 class="font-bold text-slate-900 mt-0.5">{tr.description || 'Soin sans description'}</h4>
                                                </div>
                                                <div class="text-right">
                                                    <p class="font-black text-slate-900">{formatCurrency(tr.cost)}</p>
                                                    <span class="text-[10px] font-bold text-slate-400">{tr.treatment_date}</span>
                                                </div>
                                            </div>
                                        </div>
                                    {:else}
                                        <div class="py-12 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                                            <p class="text-slate-400 font-bold">Aucun soin planifié</p>
                                        </div>
                                    {/each}
                                </div>
                            </section>

                            <!-- Past History -->
                            <section>
                                <div class="flex items-center justify-between mb-6">
                                    <h2 class="text-lg font-black text-slate-900 flex items-center gap-2">
                                        <span class="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm">✓</span>
                                        Historique des Soins
                                    </h2>
                                    <span class="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-xs font-black">{pastTreatments.length}</span>
                                </div>
                                <div class="space-y-4">
                                    {#each pastTreatments as tr}
                                        <div class="bg-white border border-slate-200 rounded-2xl p-5 hover:border-emerald-200 transition-colors shadow-sm">
                                            <div class="flex justify-between items-start">
                                                <div>
                                                    <span class="text-[10px] font-black text-emerald-500 uppercase">Dent {tr.tooth_number} • {tr.treatment_type}</span>
                                                    <h4 class="font-bold text-slate-900 mt-0.5">{tr.description || 'Soin sans description'}</h4>
                                                </div>
                                                <div class="text-right">
                                                    <p class="font-black text-slate-900">{formatCurrency(tr.cost)}</p>
                                                    <span class="text-[10px] font-bold text-slate-400">{tr.treatment_date}</span>
                                                </div>
                                            </div>
                                        </div>
                                    {:else}
                                        <div class="py-12 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                                            <p class="text-slate-400 font-bold">Historique vide</p>
                                        </div>
                                    {/each}
                                </div>
                            </section>
                        </div>
                    </div>
                {:else if activeTab === "finances"}
                    <div class="p-8">
                        <div class="flex justify-between items-center mb-8">
                            <h2 class="text-xl font-black text-slate-900">Historique des Paiements</h2>
                            <button onclick={() => isPaymentModalOpen = true} class="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all">
                                + Nouveau Paiement
                            </button>
                        </div>

                        <div class="overflow-x-auto rounded-3xl border border-slate-200">
                            <table class="w-full text-left border-collapse">
                                <thead class="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                        <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Méthode</th>
                                        <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Note</th>
                                        <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Montant</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-100 font-medium text-slate-700">
                                    {#each data.payments as payment}
                                        <tr class="hover:bg-slate-50/50 transition-colors">
                                            <td class="px-6 py-4 text-sm">{payment.payment_date}</td>
                                            <td class="px-6 py-4">
                                                <span class="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-wider">
                                                    {payment.payment_method}
                                                </span>
                                            </td>
                                            <td class="px-6 py-4 text-sm text-slate-500">{payment.notes || '—'}</td>
                                            <td class="px-6 py-4 text-right font-black text-slate-900">{formatCurrency(payment.amount)}</td>
                                        </tr>
                                    {:else}
                                        <tr>
                                            <td colspan="4" class="px-6 py-12 text-center text-slate-400 font-bold">Aucun paiement enregistré</td>
                                        </tr>
                                    {/each}
                                </tbody>
                            </table>
                        </div>
                    </div>
                {/if}
            </div>
        </main>

        <!-- Sidebar Quick Actions (Now on the Right and Sticky) -->
        <aside class="w-full lg:w-72 shrink-0 space-y-6 lg:sticky lg:top-28 order-2 lg:order-2">
            <div class="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                <h3 class="text-xs font-black uppercase tracking-widest text-slate-400 mb-6">Actions Rapides</h3>
                <div class="space-y-3">
                    <a href="/doctor/calendar" class="flex items-center gap-3 w-full bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-2xl font-bold transition-all shadow-lg shadow-indigo-100 group">
                        <span class="text-xl group-hover:scale-110 transition-transform">📅</span>
                        Fixer prochain RDV
                    </a>
                    <!-- <button onclick={() => isPrescriptionModalOpen = true} class="flex items-center gap-3 w-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 p-4 rounded-2xl font-bold transition-all">
                        <span class="text-xl">📄</span>
                        Imprimer Ordonnance
                    </button> -->
                    <button onclick={() => isPaymentModalOpen = true} class="flex items-center gap-3 w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 p-4 rounded-2xl font-bold transition-all mt-4">
                        <span class="text-xl">💰</span>
                        Encaisser Paiement
                    </button>
                </div>
            </div>

            <!-- Secondary Info -->
            <div class="bg-slate-100/50 rounded-3xl p-6 border border-slate-200/50">
                <h4 class="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Infos Patient</h4>
                <div class="space-y-4">
                    <div>
                        <p class="text-[10px] font-bold text-slate-400 uppercase">Email</p>
                        <p class="text-sm font-semibold text-slate-700 truncate">{data.patient.email || '—'}</p>
                    </div>
                    <div>
                        <p class="text-[10px] font-bold text-slate-400 uppercase">Adresse</p>
                        <p class="text-sm font-semibold text-slate-700">{data.patient.address || '—'}</p>
                    </div>
                </div>
            </div>
        </aside>
    </div>
</div>

<!-- Modal for New Payment (Simplified) -->
{#if isPaymentModalOpen}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
        <div class="bg-white rounded-[40px] w-full max-w-lg overflow-hidden shadow-2xl border border-slate-200">
            <div class="p-8 border-b border-slate-100 flex justify-between items-center">
                <h3 class="text-2xl font-black text-slate-900">Encaisser Paiement</h3>
                <button onclick={() => isPaymentModalOpen = false} class="text-slate-400 hover:text-slate-900 transition-colors text-2xl font-bold">&times;</button>
            </div>
            <form method="POST" action="?/recordPayment" use:enhance={() => {
                return async ({ result, update }) => {
                    if (result.type === 'success') isPaymentModalOpen = false;
                    await update();
                };
            }} class="p-8 space-y-6">
                <!-- In a real app, we would select an invoice. Here we assume global payment if no invoice specified or we fetch invoices. -->
                 <!-- For brevity, I'll use a hidden input for invoice_id if needed, or just let the server handle it. -->
                 <!-- Looking at server actions, it needs invoice_id. Let's provide a selection if possible or just use the first unpaid invoice. -->
                 
                <div>
                    <label for="invoice_id" class="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Facture Associée</label>
                    <select id="invoice_id" name="invoice_id" required class="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl font-bold focus:ring-2 focus:ring-indigo-500 transition-all outline-none">
                        {#each data.invoices.filter((inv: any) => inv.status !== 'paid') as inv}
                            <option value={inv.id}>#{inv.invoice_number} - {formatCurrency(inv.total_amount)}</option>
                        {/each}
                        {#if data.invoices.filter((inv: any) => inv.status !== 'paid').length === 0}
                            <option value="" disabled>Aucune facture impayée</option>
                        {/if}
                    </select>
                </div>

                <div class="grid grid-cols-2 gap-6">
                    <div>
                        <label for="amount" class="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Montant</label>
                        <input id="amount" type="number" name="amount" step="0.01" required class="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl font-bold focus:ring-2 focus:ring-indigo-500 transition-all outline-none" />
                    </div>
                    <div>
                        <label for="payment_method" class="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Méthode</label>
                        <select id="payment_method" name="payment_method" class="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl font-bold focus:ring-2 focus:ring-indigo-500 transition-all outline-none">
                            <option value="cash">Espèces</option>
                            <option value="card">Carte</option>
                            <option value="check">Chèque</option>
                            <option value="bank_transfer">Virement</option>
                        </select>
                    </div>
                </div>

                <button type="submit" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-5 rounded-2xl font-black text-lg transition-all shadow-xl shadow-indigo-100">
                    Confirmer le Paiement
                </button>
            </form>
        </div>
    </div>
{/if}

<!-- Modal for Prescription -->
<!-- {#if isPrescriptionModalOpen}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
        <div class="bg-white rounded-[40px] w-full max-w-4xl overflow-hidden shadow-2xl border border-slate-200">
            <div class="p-8 border-b border-slate-100 flex justify-between items-center">
                <h3 class="text-2xl font-black text-slate-900">Nouvelle Ordonnance</h3>
                <button onclick={() => isPrescriptionModalOpen = false} class="text-slate-400 hover:text-slate-900 transition-colors text-2xl font-bold">&times;</button>
            </div>
            <div class="p-8 max-h-[80vh] overflow-y-auto">
                <PrescriptionBuilder 
                    medications={data.medications} 
                    patientId={data.patient.id} 
                    doctorId={data.user.id} 
                    onPrescriptionCreated={() => isPrescriptionModalOpen = false} 
                />
            </div>
        </div>
    </div>
{/if} -->

<style>
    /* Custom scrollbar for a cleaner look */
    ::-webkit-scrollbar {
        width: 8px;
    }
    ::-webkit-scrollbar-track {
        background: transparent;
    }
    ::-webkit-scrollbar-thumb {
        background: #e2e8f0;
        border-radius: 20px;
    }
    ::-webkit-scrollbar-thumb:hover {
        background: #cbd5e1;
    }
</style>
