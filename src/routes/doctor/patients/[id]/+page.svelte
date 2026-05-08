<script lang="ts">
    import type { PageData } from "./$types";
    import { enhance } from "$app/forms";
    import { t } from "svelte-i18n";
    import { calculateAge } from "$lib/dental/tooth-data";
    import OdontogrammePro from "$lib/components/dental-v2/OdontogrammePro.svelte";
    import PrescriptionBuilder from "$lib/components/PrescriptionBuilder.svelte";
    import { page } from "$app/state";
    import AppointmentModal from "$lib/components/patients/AppointmentModal.svelte";
import QuickPaymentModal from "$lib/components/patients/QuickPaymentModal.svelte";
import PatientMetadataPanel from "$lib/components/patients/PatientMetadataPanel.svelte";
import { 
    Baby, 
    Phone, 
    AlertTriangle, 
    Stethoscope, 
    Calendar, 
    Check, 
    Banknote, 
    MapPin, 
    Mail, 
    X, 
    Smartphone, 
    Clock,
    PanelRightClose,
    PanelRightOpen,
    Menu,
    ChevronRight,
    MoreVertical,
    Archive,
    Trash2,
    Edit2,
    RotateCcw,
    Plus as PlusIcon,
    FileText
} from "lucide-svelte";
import { fly, fade, slide } from "svelte/transition";
import { invalidateAll } from "$app/navigation";
import FullTreatmentForm from "$lib/components/dental-v2/FullTreatmentForm.svelte";
import FastTrackTreatmentModal from "$lib/components/patients/FastTrackTreatmentModal.svelte";
import TimelineContainer from "$lib/components/patients/timeline/TimelineContainer.svelte";
import { formatCurrency } from "$lib/utils/format";


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


    const timelineEvents = $derived.by(() => {
        const events: any[] = [];
        
        // Treatments
        data.treatments.forEach(t => {
            events.push({
                ...t,
                category: 'treatment',
                date: t.treatment_date || t.created_at
            });
        });
        
        // Appointments
        data.appointments.forEach(a => {
            events.push({
                ...a,
                category: 'appointment',
                date: a.start_time
            });
        });
        
        // Transactions
        data.transactions.forEach(tx => {
            events.push({
                ...tx,
                category: 'transaction',
                date: tx.transaction_date
            });
        });
        
        // Clinical Notes
        data.notes.forEach(n => {
            events.push({
                ...n,
                category: 'note',
                date: n.created_at
            });
        });
        
        return events.sort((a, b) => new Date(b.date.replace(' ', 'T')).getTime() - new Date(a.date.replace(' ', 'T')).getTime());
    });


    let isPaymentModalOpen = $state(false);
    let isPrescriptionModalOpen = $state(false);
    let isAppointmentModalOpen = $state(false);
    let isTreatmentModalOpen = $state(false);
    let isFastTrackModalOpen = $state(false);
    let editingTreatment = $state<any>(null);
    let reschedulingAppointment = $state<any>(null);
    let saveSuccess = $state(false);

    async function handleSaveTreatment(treatmentData: any) {
        try {
            if (editingTreatment?.id && editingTreatment.source === 'dental') {
                const res = await fetch(`/api/dental/treatments/${editingTreatment.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(treatmentData)
                });
                if (!res.ok) throw new Error("Failed to update");
            }
            isTreatmentModalOpen = false;
            editingTreatment = null;
            await invalidateAll();
        } catch (e) {
            console.error(e);
        }
    }

    function openEditTreatment(tr: any) {
        if ((tr.paid_amount || 0) > 0) return;
        if (tr.source !== 'dental') return;
        editingTreatment = tr;
        isTreatmentModalOpen = true;
    }

    import { untrack } from "svelte";
    import DynamicFieldGenerator from "$lib/components/patients/DynamicFieldGenerator.svelte";
    
    // Initialize directly from data to avoid initial empty state
    let customFieldsValues = $state<Record<string, any>>(
        data.patient.custom_fields 
            ? (() => { try { return JSON.parse(data.patient.custom_fields); } catch { return {}; } })()
            : {}
    );

    // Keep effect for when data.patient changes (e.g. after a save or navigation)
    $effect(() => {
        // Track data.patient.custom_fields
        const serverData = data.patient.custom_fields;
        
        untrack(() => {
            if (serverData) {
                try {
                    const parsed = JSON.parse(serverData);
                    const currentStr = JSON.stringify($state.snapshot(customFieldsValues));
                    const newStr = JSON.stringify(parsed);
                    
                    if (newStr !== currentStr) {
                        customFieldsValues = parsed;
                    }
                } catch (e) {
                    console.error("Failed to parse custom fields:", e);
                }
            }
        });
    });

    let isSidebarOpen = $state(true);
    let isMobileDrawerOpen = $state(false);

    // Auto-collapse sidebar on smaller screens initially
    $effect(() => {
        if (typeof window !== 'undefined' && window.innerWidth < 1400) {
            isSidebarOpen = false;
        }
    });
</script>

<div class="min-h-screen bg-[#f8fafc] font-sans">
    <!-- Main Header -->
    <header class="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div class="max-w-[1600px] mx-auto px-6 py-2 flex flex-wrap items-center justify-between gap-4">
            <!-- Patient Profile -->
            <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 text-xl font-bold border border-indigo-100 shadow-sm">
                    {data.patient.full_name.charAt(0)}
                </div>
                <div>
                    <h1 class="text-lg font-black text-slate-900 leading-tight">{data.patient.full_name}</h1>
                    <div class="flex items-center gap-3 mt-1 text-sm font-semibold text-slate-500">
                        <span class="flex items-center gap-1"><Baby size={14} class="text-indigo-400" /> {age} ans</span>
                        <span class="w-1 h-1 rounded-full bg-slate-300"></span>
                        <span class="flex items-center gap-1"><Phone size={14} class="text-indigo-400" /> {data.patient.phone || 'N/A'}</span>
                    </div>
                </div>
            </div>

            <!-- Crucial Alerts (High Visibility) -->
            <div class="flex flex-1 max-w-xl gap-2">
                {#if data.patient.allergies && data.patient.allergies !== 'None'}
                    <div class="flex-1 bg-red-50 border border-red-100 rounded-xl p-2 flex items-center gap-2 animate-pulse shadow-sm">
                        <AlertTriangle size={18} class="text-red-500" />
                        <div>
                            <p class="text-[9px] font-black uppercase tracking-wider text-red-500">Allergies</p>
                            <p class="text-xs font-bold text-red-900 leading-tight">{data.patient.allergies}</p>
                        </div>
                    </div>
                {/if}
                {#if data.patient.medical_conditions && data.patient.medical_conditions !== 'None'}
                    <div class="flex-1 bg-amber-50 border border-amber-100 rounded-xl p-2 flex items-center gap-2 shadow-sm">
                        <Stethoscope size={18} class="text-amber-500" />
                        <div>
                            <p class="text-[9px] font-black uppercase tracking-wider text-amber-500">Notes Médicales</p>
                            <p class="text-xs font-bold text-amber-900 leading-tight">{data.patient.medical_conditions}</p>
                        </div>
                    </div>
                {/if}
            </div>

            <!-- Financial Balance -->
            <div class="bg-slate-900 rounded-xl p-2.5 text-white flex items-center gap-6 shadow-xl shadow-slate-200">
                <div class="text-center px-1">
                    <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total Dû</p>
                    <p class="text-base font-black">{formatCurrency(balance.total_billed)}</p>
                </div>
                <div class="w-px h-6 bg-slate-700"></div>
                <div class="text-center px-1">
                    <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total Payé</p>
                    <p class="text-base font-black text-emerald-400">{formatCurrency(balance.total_paid)}</p>
                </div>
                <div class="w-px h-6 bg-slate-700"></div>
                <div class="text-center px-1">
                    <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Solde</p>
                    <p class="text-lg font-black {balance.balance_due > 0 ? 'text-rose-400' : 'text-emerald-400'}">
                        {formatCurrency(balance.balance_due)}
                    </p>
                </div>
            </div>

            <!-- Tab Switcher + Wide Mode Toggle (Moved into Header) -->
            <div class="flex items-center justify-between gap-4 flex-wrap w-full border-t border-slate-100 pt-2 mt-1">
                <div class="flex bg-slate-50 p-1 rounded-xl border border-slate-200 shadow-sm overflow-x-auto no-scrollbar">
                    {#if data.config?.module_dental_chart !== 0}
                        <button 
                            onclick={() => activeTab = "odontogramme"}
                            class="px-5 py-1.5 rounded-lg font-bold text-[11px] transition-all whitespace-nowrap {activeTab === 'odontogramme' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:text-slate-900'}"
                        >
                            Odontogramme
                        </button>
                    {/if}
                    <button 
                        onclick={() => activeTab = "historique"}
                        class="px-5 py-1.5 rounded-lg font-bold text-[11px] transition-all whitespace-nowrap {activeTab === 'historique' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:text-slate-900'}"
                    >
                        Historique & Planning
                    </button>
                    <button 
                        onclick={() => activeTab = "finances"}
                        class="px-5 py-1.5 rounded-lg font-bold text-[11px] transition-all whitespace-nowrap {activeTab === 'finances' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:text-slate-900'}"
                    >
                        Finances
                    </button>
                    <button 
                        onclick={() => activeTab = "admin"}
                        class="px-5 py-1.5 rounded-lg font-bold text-[11px] transition-all whitespace-nowrap {activeTab === 'admin' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:text-slate-900'}"
                    >
                        Dossier Administratif
                    </button>
                </div>

                <button 
                    onclick={() => isSidebarOpen = !isSidebarOpen}
                    class="hidden xl:flex items-center gap-2 bg-white border border-slate-200 px-4 py-1.5 rounded-lg font-bold text-[9px] text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
                    title={isSidebarOpen ? "Fermer le panneau latéral" : "Ouvrir le panneau latéral"}
                >
                    {#if isSidebarOpen}
                        <PanelRightClose size={14} />
                        WIDE CANVAS
                    {:else}
                        <PanelRightOpen size={14} />
                        PANNEAU LATÉRAL
                    {/if}
                </button>
            </div>
        </div>
    </header>

    <div class="max-w-[1800px] mx-auto px-6 py-8">
        <div class="grid grid-cols-1 {isSidebarOpen ? 'xl:grid-cols-12' : 'xl:grid-cols-1'} gap-8 items-start relative">
            <!-- Mobile Toggle / Sub-header -->
            <div class="xl:hidden w-full flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-4">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold border border-indigo-100">
                        {data.patient.full_name.charAt(0)}
                    </div>
                    <span class="font-bold text-slate-900">{data.patient.full_name}</span>
                </div>
                <button 
                    onclick={() => isMobileDrawerOpen = true}
                    class="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-100"
                >
                    <Menu size={16} />
                    ACTIONS
                </button>
            </div>
            <!-- Main Content (Tabs) -->
            <main class="min-w-0 w-full transition-all duration-500 ease-in-out {isSidebarOpen ? 'xl:col-span-9' : 'xl:col-span-12'}">


            <!-- Tab Content -->
            <div class="bg-white rounded-[40px] border border-slate-200 shadow-sm min-h-[600px] overflow-hidden">
                {#if activeTab === "admin"}
                    <div class="p-10 w-full">
                        <div class="flex items-center justify-between mb-10">
                            <div>
                                <h2 class="text-2xl font-black text-slate-900">Champs Personnalisés</h2>
                                <p class="text-sm text-slate-500 font-medium">Informations cliniques et administratives spécifiques</p>
                            </div>
                        </div>

                        <form 
                            method="POST" 
                            action="?/updatePatient" 
                            use:enhance={() => {
                                return async ({ result }) => {
                                    if (result.type === 'success') {
                                        // Patient updated successfully
                                        // SvelteKit will invalidate data automatically
                                        saveSuccess = true;
                                        setTimeout(() => saveSuccess = false, 3000);
                                    }
                                };
                            }}
                        >
                            <input type="hidden" name="full_name" value={data.patient.full_name} />
                            <input type="hidden" name="custom_fields" value={JSON.stringify($state.snapshot(customFieldsValues))} />
                            
                            <div class="bg-slate-50/50 rounded-[32px] p-8 border border-slate-100">
                                <DynamicFieldGenerator 
                                    definitions={data.customFieldDefinitions}
                                    values={customFieldsValues}
                                    patientId={data.patient.id}
                                    onUpdate={(vals) => customFieldsValues = vals}
                                />
                            </div>

                            <div class="mt-8 flex items-center justify-between">
                                <div class="flex-1">
                                    {#if saveSuccess}
                                        <div class="flex items-center gap-2 text-emerald-600 font-bold text-sm" in:fade>
                                            <Check size={18} />
                                            Modifications enregistrées avec succès
                                        </div>
                                    {/if}
                                </div>
                                <button type="submit" class="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2">
                                    <Check size={18} />
                                    ENREGISTRER LES MODIFICATIONS
                                </button>
                            </div>
                        </form>
                    </div>
                {:else if activeTab === "odontogramme" && data.config?.module_dental_chart !== 0}
                    <div class="p-10">
                        <OdontogrammePro 
                            patientId={data.patient.id} 
                            annotations={data.annotations} 
                            treatments={data.treatments} 
                            patientAge={age}
                            treatmentMode={data.appConfig?.treatment_mode}
                        />
                    </div>
                {:else if activeTab === "historique"}
                    <div class="p-10 w-full max-w-4xl mx-auto">
                        <TimelineContainer 
                            events={timelineEvents}
                            user={data.user}
                            appConfig={data.appConfig}
                            onEditTreatment={openEditTreatment}
                            onCancelTreatment={(tr) => {
                                editingTreatment = tr;
                                isTreatmentModalOpen = true;
                            }}
                            onDeleteTreatment={async (tr) => {
                                if(!confirm('Êtes-vous sûr de vouloir supprimer ce soin ?')) return;
                                const formData = new FormData();
                                formData.append('id', tr.id);
                                formData.append('source', tr.source);
                                await fetch('?/hardDeleteTreatment', { method: 'POST', body: formData });
                                await invalidateAll();
                            }}
                            onReverseTransaction={async (tx) => {
                                if(!confirm('Êtes-vous sûr de vouloir annuler cette transaction ?')) return;
                                const formData = new FormData();
                                formData.append('source_type', tx.source_type);
                                formData.append('source_id', tx.source_id);
                                await fetch('?/reverseTransaction', { method: 'POST', body: formData });
                                await invalidateAll();
                            }}
                            onDeleteNote={async (n) => {
                                if(!confirm('Supprimer cette note ?')) return;
                                const formData = new FormData();
                                formData.append('id', n.id);
                                await fetch('?/deleteNote', { method: 'POST', body: formData });
                                await invalidateAll();
                            }}
                            onRescheduleAppointment={(a) => {
                                reschedulingAppointment = a;
                                isAppointmentModalOpen = true;
                            }}
                            onCancelAppointment={async (a) => {
                                if(!confirm('Annuler ce RDV ?')) return;
                                const formData = new FormData();
                                formData.append('id', a.id);
                                await fetch('?/cancelAppointment', { method: 'POST', body: formData });
                                await invalidateAll();
                            }}
                        />
                    </div>

                {:else if activeTab === "finances"}
                    <div class="p-8">
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                            <div class="bg-slate-50 p-6 rounded-[32px] border border-slate-100 shadow-sm">
                                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Facturé</p>
                                <p class="text-2xl font-black text-slate-900">{formatCurrency(data.balance?.total_billed || 0)}</p>
                            </div>
                            <div class="bg-emerald-50/50 p-6 rounded-[32px] border border-emerald-100 shadow-sm">
                                <p class="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Total Réglé</p>
                                <p class="text-2xl font-black text-emerald-600">{formatCurrency(data.balance?.total_paid || 0)}</p>
                            </div>
                            <div class="bg-indigo-600 p-6 rounded-[32px] shadow-xl shadow-indigo-100">
                                <p class="text-[10px] font-black text-indigo-100 uppercase tracking-widest mb-1">Reste à payer</p>
                                <p class="text-2xl font-black text-white">{formatCurrency(data.balance?.balance_due || 0)}</p>
                            </div>
                        </div>

                        <div class="flex justify-between items-center mb-8">
                            <h2 class="text-xl font-black text-slate-900">Journal Financier (Ledger)</h2>
                            <div class="flex gap-3">
                                <button onclick={() => isPaymentModalOpen = true} class="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center gap-2 text-sm">
                                    <PlusIcon size={18} />
                                    ENCAISSER
                                </button>
                            </div>
                        </div>

                        <div class="overflow-x-auto rounded-3xl border border-slate-200">
                            <table class="w-full text-left border-collapse">
                                <thead class="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                        <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                                        <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Désignation</th>
                                        <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Débit</th>
                                        <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Crédit</th>
                                        <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-100 font-medium text-slate-700">
                                    {#each data.transactions as tx}
                                        <tr class="hover:bg-slate-50/50 transition-colors">
                                            <td class="px-6 py-4 text-xs font-bold text-slate-500">
                                                {new Date(tx.transaction_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </td>
                                            <td class="px-6 py-4">
                                                <span class="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider 
                                                    {tx.type === 'charge' ? 'bg-amber-50 text-amber-600' : 
                                                     tx.type === 'payment' ? 'bg-emerald-50 text-emerald-600' : 
                                                     'bg-rose-50 text-rose-600'}">
                                                    {tx.type === 'charge' ? 'DÛ' : tx.type === 'payment' ? 'PAYÉ' : 'AJUST'}
                                                </span>
                                            </td>
                                            <td class="px-6 py-4 text-sm font-bold text-slate-900">
                                                {tx.description}
                                                {#if tx.source_type !== 'manual'}
                                                    <span class="ml-2 px-1.5 py-0.5 rounded bg-slate-100 text-slate-400 text-[8px] uppercase tracking-tighter">
                                                        {tx.source_type} #{tx.source_id}
                                                    </span>
                                                {/if}
                                            </td>
                                            <td class="px-6 py-4 text-right font-black text-slate-400">
                                                {tx.type === 'charge' || (tx.type === 'adjustment' && tx.amount > 0) ? formatCurrency(Math.abs(tx.amount)) : '—'}
                                            </td>
                                            <td class="px-6 py-4 text-right font-black {tx.amount < 0 ? 'text-rose-500' : 'text-emerald-600'}">
                                                {tx.type === 'payment' || (tx.type === 'adjustment' && tx.amount < 0) ? formatCurrency(Math.abs(tx.amount)) : '—'}
                                            </td>
                                            <td class="px-6 py-4 text-center">
                                                {#if tx.type !== 'adjustment' && !data.transactions.some(t => t.source_id === tx.source_id && t.source_type === tx.source_type && t.amount === -tx.amount)}
                                                    <form method="POST" action="?/reverseTransaction" use:enhance>
                                                        <input type="hidden" name="source_type" value={tx.source_type} />
                                                        <input type="hidden" name="source_id" value={tx.source_id} />
                                                        <button type="submit" class="p-2 hover:bg-rose-50 text-slate-300 hover:text-rose-500 rounded-lg transition-all" title="Annuler cette écriture">
                                                            <RotateCcw size={14} />
                                                        </button>
                                                    </form>
                                                {:else if tx.amount < 0 || data.transactions.some(t => t.source_id === tx.source_id && t.source_type === tx.source_type && t.amount === -tx.amount)}
                                                    <span class="text-[9px] font-black text-slate-300 uppercase tracking-tighter">ANNULÉ</span>
                                                {/if}
                                            </td>
                                        </tr>
                                    {:else}
                                        <tr>
                                            <td colspan="6" class="px-6 py-12 text-center text-slate-400 font-bold">Aucune transaction enregistrée</td>
                                        </tr>
                                    {/each}
                                </tbody>
                            </table>
                        </div>

                        <!-- Standalone Invoicing Module -->
                        {#if data.appConfig?.invoicing_enabled}
                            <div class="mt-16 space-y-8" in:fade>
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center gap-3">
                                        <div class="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shadow-sm">
                                            <FileText size={20} />
                                        </div>
                                        <div>
                                            <h2 class="text-xl font-black text-slate-900">Facturation & Devis</h2>
                                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gestion avancée des documents financiers</p>
                                        </div>
                                    </div>
                                    <div class="flex gap-3">
                                        <button class="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-all flex items-center gap-2">
                                            <PlusIcon size={14} />
                                            DEVIS (PROFORMA)
                                        </button>
                                        <button class="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg shadow-slate-200">
                                            <PlusIcon size={14} />
                                            NOUVELLE FACTURE
                                        </button>
                                    </div>
                                </div>

                                {#if data.invoices && data.invoices.length > 0}
                                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {#each data.invoices as inv}
                                            <div class="bg-white border-2 border-slate-100 rounded-3xl p-6 hover:border-amber-200 transition-all shadow-sm group">
                                                <div class="flex justify-between items-start mb-4">
                                                    <div>
                                                        <span class="px-2 py-1 rounded-lg {inv.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'} text-[9px] font-black uppercase tracking-wider">
                                                            {inv.status === 'paid' ? 'Payée' : 'En attente'}
                                                        </span>
                                                        <h4 class="font-bold text-slate-900 mt-2">#{inv.invoice_number}</h4>
                                                    </div>
                                                    <a href="/print/invoice/{inv.id}" target="_blank" class="p-2 bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                                                        <FileText size={18} />
                                                    </a>
                                                </div>
                                                <div class="flex justify-between items-end">
                                                    <div>
                                                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Montant</p>
                                                        <p class="text-lg font-black text-slate-900">{formatCurrency(inv.total_amount)}</p>
                                                    </div>
                                                    <p class="text-[10px] font-bold text-slate-400">{new Date(inv.invoice_date).toLocaleDateString('fr-FR')}</p>
                                                </div>
                                            </div>
                                        {/each}
                                    </div>
                                {:else}
                                    <div class="py-12 text-center bg-slate-50/50 rounded-[32px] border-2 border-dashed border-slate-200">
                                        <p class="text-slate-400 font-bold">Aucune facture générée pour ce patient</p>
                                    </div>
                                {/if}
                            </div>
                        {/if}
                    </div>
                {/if}
            </div>
        </main>

            <!-- Sidebar (Desktop Collapsible) -->
            {#if isSidebarOpen}
                <aside 
                    class="hidden xl:block xl:col-span-3 shrink-0 sticky top-28 transition-all duration-500"
                    transition:fly={{ x: 50, duration: 400 }}
                >
                    <PatientMetadataPanel 
                        patient={data.patient} 
                        onAppointmentClick={() => isAppointmentModalOpen = true}
                        onPaymentClick={() => isPaymentModalOpen = true}
                    />
                </aside>
            {/if}
        </div>
    </div>
</div>

<!-- Mobile Drawer -->
{#if isMobileDrawerOpen}
    <div class="fixed inset-0 z-[100] xl:hidden">
        <!-- Backdrop -->
        <div 
            class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
            onclick={() => isMobileDrawerOpen = false}
            transition:fade
        ></div>
        
        <!-- Drawer -->
        <div 
            class="absolute right-0 top-0 bottom-0 w-80 bg-slate-50 shadow-2xl p-6 flex flex-col"
            transition:fly={{ x: 320, duration: 300 }}
        >
            <div class="flex items-center justify-between mb-8">
                <h3 class="text-xl font-black text-slate-900">Patient & Actions</h3>
                <button 
                    onclick={() => isMobileDrawerOpen = false}
                    class="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-rose-500"
                >
                    <X size={20} />
                </button>
            </div>

            <div class="flex-1 overflow-y-auto custom-scrollbar pr-2">
                <PatientMetadataPanel 
                    patient={data.patient} 
                    onAppointmentClick={() => { isMobileDrawerOpen = false; isAppointmentModalOpen = true; }}
                    onPaymentClick={() => { isMobileDrawerOpen = false; isPaymentModalOpen = true; }}
                />
            </div>

            <div class="mt-8 pt-8 border-t border-slate-200">
                <div class="flex items-center gap-4 mb-4">
                    <div class="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold border border-indigo-100">
                        {data.patient.full_name.charAt(0)}
                    </div>
                    <div>
                        <p class="font-bold text-slate-900">{data.patient.full_name}</p>
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">{age} ans</p>
                    </div>
                </div>
                <button 
                    onclick={() => isMobileDrawerOpen = false}
                    class="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                >
                    FERMER
                </button>
            </div>
        </div>
    </div>
{/if}

<!-- Modal for New Payment handled by QuickPaymentModal -->

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

    <AppointmentModal 
        isOpen={isAppointmentModalOpen} 
        patient={data.patient}
        doctors={data.doctors}
        reschedulingAppointment={reschedulingAppointment}
        onClose={() => {
            isAppointmentModalOpen = false;
            reschedulingAppointment = null;
        }}
        onSubmitSuccess={() => {
            saveSuccess = true;
            setTimeout(() => saveSuccess = false, 3000);
        }}
    />

<QuickPaymentModal 
    isOpen={isPaymentModalOpen}
    patient={data.patient}
    invoices={data.invoices}
    balance={data.balance}
    appConfig={data.appConfig}
    onClose={() => isPaymentModalOpen = false}
/>

<FastTrackTreatmentModal
    isOpen={isFastTrackModalOpen}
    patientId={data.patient.id}
    onClose={() => isFastTrackModalOpen = false}
/>

{#if isTreatmentModalOpen && editingTreatment}
    <FullTreatmentForm 
        patientId={data.patient.id}
        toothNumber={editingTreatment.tooth_number?.toString() || ""}
        initialData={editingTreatment}
        onSave={handleSaveTreatment}
        onClose={() => {
            isTreatmentModalOpen = false;
            editingTreatment = null;
        }}
    />
{/if}

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
