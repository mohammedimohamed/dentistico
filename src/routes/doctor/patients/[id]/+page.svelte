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
    ChevronRight
} from "lucide-svelte";
import { fly, fade, slide } from "svelte/transition";

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

    // Appointments grouping
    const now = new Date();
    const futureAppointments = $derived(data.appointments.filter((a: any) => new Date(a.start_time.replace(' ', 'T')) >= now && a.status !== 'cancelled'));
    const pastAppointments = $derived(data.appointments.filter((a: any) => new Date(a.start_time.replace(' ', 'T')) < now && a.status !== 'cancelled'));
    const cancelledAppointments = $derived(data.appointments.filter((a: any) => a.status === 'cancelled'));

    // Filter treatments for History & Planning
    const pastTreatments = $derived(data.treatments.filter((t: any) => t.status === 'completed'));
    const plannedTreatments = $derived(data.treatments.filter((t: any) => t.status === 'planned' || t.status === 'pending'));

    // Formatting currency
    function formatCurrency(amount: number) {
        return new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD' }).format(amount).replace('DZD', 'DA');
    }

    let isPaymentModalOpen = $state(false);
    let isPrescriptionModalOpen = $state(false);
    let isAppointmentModalOpen = $state(false);
    let saveSuccess = $state(false);

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
        <div class="max-w-[1600px] mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-6">
            <!-- Patient Profile -->
            <div class="flex items-center gap-4">
                <div class="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 text-2xl font-bold border border-indigo-100 shadow-sm">
                    {data.patient.full_name.charAt(0)}
                </div>
                <div>
                    <h1 class="text-2xl font-black text-slate-900 leading-tight">{data.patient.full_name}</h1>
                    <div class="flex items-center gap-3 mt-1 text-sm font-semibold text-slate-500">
                        <span class="flex items-center gap-1"><Baby size={14} class="text-indigo-400" /> {age} ans</span>
                        <span class="w-1 h-1 rounded-full bg-slate-300"></span>
                        <span class="flex items-center gap-1"><Phone size={14} class="text-indigo-400" /> {data.patient.phone || 'N/A'}</span>
                    </div>
                </div>
            </div>

            <!-- Crucial Alerts (High Visibility) -->
            <div class="flex flex-1 max-w-2xl gap-3">
                {#if data.patient.allergies && data.patient.allergies !== 'None'}
                    <div class="flex-1 bg-red-50 border-2 border-red-200 rounded-2xl p-3 flex items-center gap-3 animate-pulse shadow-sm">
                        <AlertTriangle size={24} class="text-red-500" />
                        <div>
                            <p class="text-[10px] font-black uppercase tracking-wider text-red-500">Allergies</p>
                            <p class="text-sm font-bold text-red-900 leading-tight">{data.patient.allergies}</p>
                        </div>
                    </div>
                {/if}
                {#if data.patient.medical_conditions && data.patient.medical_conditions !== 'None'}
                    <div class="flex-1 bg-amber-50 border-2 border-amber-200 rounded-2xl p-3 flex items-center gap-3 shadow-sm">
                        <Stethoscope size={24} class="text-amber-500" />
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

    <div class="max-w-[1800px] mx-auto px-6 py-8">
        <div class="flex flex-col xl:flex-row gap-8 items-start relative">
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
            <main class="flex-1 min-w-0 w-full transition-all duration-500 ease-in-out {isSidebarOpen ? 'xl:pr-0' : 'xl:pr-0'}">
                <!-- Tab Switcher + Wide Mode Toggle -->
                <div class="flex items-center justify-between mb-8 gap-4 flex-wrap">
                    <div class="flex bg-white p-2 rounded-3xl border border-slate-200 shadow-sm overflow-x-auto no-scrollbar">
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
                        <button 
                            onclick={() => activeTab = "admin"}
                            class="px-8 py-3 rounded-2xl font-bold text-sm transition-all whitespace-nowrap {activeTab === 'admin' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:text-slate-900'}"
                        >
                            Dossier Administratif
                        </button>
                    </div>

                    <button 
                        onclick={() => isSidebarOpen = !isSidebarOpen}
                        class="hidden xl:flex items-center gap-2 bg-white border border-slate-200 px-6 py-3 rounded-2xl font-bold text-xs text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
                        title={isSidebarOpen ? "Fermer le panneau latéral" : "Ouvrir le panneau latéral"}
                    >
                        {#if isSidebarOpen}
                            <PanelRightClose size={18} />
                            WIDE CANVAS
                        {:else}
                            <PanelRightOpen size={18} />
                            PANNEAU LATÉRAL
                        {/if}
                    </button>
                </div>

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
                        />
                    </div>
                {:else if activeTab === "historique"}
                    <div class="p-8">
                        <div class="grid grid-cols-1 xl:grid-cols-12 gap-12">
                            <!-- Left Column: Appointments Timeline -->
                            <div class="xl:col-span-7 space-y-12">
                                <!-- Future Appointments -->
                                <section>
                                    <div class="flex items-center justify-between mb-6">
                                        <h2 class="text-lg font-black text-slate-900 flex items-center gap-3">
                                            <div class="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-sm">
                                                <Calendar size={20} />
                                            </div>
                                            Rendez-vous à venir
                                        </h2>
                                        <span class="bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-2xl text-xs font-black uppercase tracking-wider">{futureAppointments.length}</span>
                                    </div>
                                    <div class="space-y-4">
                                        {#each futureAppointments as rdv}
                                            <div class="bg-white border-2 border-slate-100 rounded-[32px] p-6 hover:border-indigo-100 transition-all shadow-sm group relative overflow-hidden">
                                                <div class="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-500"></div>
                                                <div class="flex flex-col sm:flex-row justify-between items-start gap-4">
                                                    <div class="flex gap-4">
                                                        <div class="flex flex-col items-center justify-center bg-slate-50 rounded-2xl p-3 min-w-[70px] border border-slate-100">
                                                            <span class="text-[10px] font-black text-slate-400 uppercase">{new Date(rdv.start_time.replace(' ', 'T')).toLocaleDateString('fr-FR', { month: 'short' })}</span>
                                                            <span class="text-2xl font-black text-slate-900">{new Date(rdv.start_time.replace(' ', 'T')).getDate()}</span>
                                                        </div>
                                                        <div>
                                                            <div class="flex items-center gap-2 mb-1">
                                                                <span class="px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase">{rdv.appointment_type}</span>
                                                                <span class="text-xs font-bold text-slate-400 flex items-center gap-1"><Clock size={12} /> {new Date(rdv.start_time.replace(' ', 'T')).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                                                            </div>
                                                            <h4 class="font-bold text-slate-900 text-lg">Dr. {rdv.doctor_name || 'Médecin'}</h4>
                                                            <p class="text-sm text-slate-500 font-medium mt-1">{rdv.notes || 'Aucune note particulière'}</p>
                                                        </div>
                                                    </div>
                                                    <div class="flex gap-2 w-full sm:w-auto">
                                                        <form method="POST" action="?/cancelAppointment" use:enhance>
                                                            <input type="hidden" name="id" value={rdv.id} />
                                                            <button type="submit" class="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 transition-all">
                                                                Annuler
                                                            </button>
                                                        </form>
                                                        <button class="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-all">
                                                            Déplacer
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        {:else}
                                            <div class="py-16 text-center bg-slate-50/50 rounded-[40px] border-2 border-dashed border-slate-200">
                                                <div class="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-slate-200 mx-auto mb-4 border border-slate-100 shadow-sm">
                                                    <Calendar size={32} />
                                                </div>
                                                <p class="text-slate-400 font-bold">Aucun rendez-vous planifié</p>
                                                <button onclick={() => isAppointmentModalOpen = true} class="mt-4 text-indigo-600 font-black text-sm hover:underline">Fixer un rendez-vous</button>
                                            </div>
                                        {/each}
                                    </div>
                                </section>

                                <!-- Past Appointments -->
                                <section>
                                    <h2 class="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                        Rendez-vous Passés
                                        <div class="h-px flex-1 bg-slate-100 ml-2"></div>
                                    </h2>
                                    <div class="space-y-3">
                                        {#each pastAppointments as rdv}
                                            <div class="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100 group hover:bg-white hover:shadow-md transition-all">
                                                <div class="flex items-center gap-4">
                                                    <div class="text-center min-w-[50px]">
                                                        <p class="text-[10px] font-black text-slate-400 uppercase">{new Date(rdv.start_time.replace(' ', 'T')).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</p>
                                                    </div>
                                                    <div>
                                                        <p class="text-sm font-bold text-slate-900">Dr. {rdv.doctor_name}</p>
                                                        <p class="text-[10px] font-bold text-slate-400 uppercase">{rdv.appointment_type}</p>
                                                    </div>
                                                </div>
                                                <div class="flex items-center gap-3">
                                                    <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-600">Honoré</span>
                                                </div>
                                            </div>
                                        {/each}
                                    </div>
                                </section>

                                <!-- Cancelled Appointments -->
                                {#if cancelledAppointments.length > 0}
                                <section>
                                    <h2 class="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                        Annulés
                                        <div class="h-px flex-1 bg-slate-100 ml-2"></div>
                                    </h2>
                                    <div class="space-y-2 opacity-60">
                                        {#each cancelledAppointments as rdv}
                                            <div class="flex items-center justify-between p-3 bg-slate-50/30 rounded-xl border border-slate-100 grayscale">
                                                <div class="text-xs font-bold text-slate-500">
                                                    {new Date(rdv.start_time.replace(' ', 'T')).toLocaleDateString('fr-FR')} — Dr. {rdv.doctor_name}
                                                </div>
                                                <span class="text-[10px] font-black uppercase text-rose-500">Annulé</span>
                                            </div>
                                        {/each}
                                    </div>
                                </section>
                                {/if}
                            </div>

                            <!-- Right Column: Treatments -->
                            <div class="xl:col-span-5 space-y-12">
                                <!-- Planned RoadMap -->
                                <section>
                                    <div class="flex items-center justify-between mb-6">
                                        <h2 class="text-lg font-black text-slate-900 flex items-center gap-2">
                                            <div class="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shadow-sm">
                                                <Stethoscope size={20} />
                                            </div>
                                            Plan de Traitement
                                        </h2>
                                        <span class="bg-amber-50 text-amber-600 px-4 py-1.5 rounded-2xl text-xs font-black uppercase tracking-wider">{plannedTreatments.length}</span>
                                    </div>
                                    <div class="space-y-4">
                                        {#each plannedTreatments as tr}
                                            <div class="bg-white border-2 border-slate-100 rounded-3xl p-6 hover:border-amber-100 transition-all shadow-sm group">
                                                <div class="flex justify-between items-start">
                                                    <div>
                                                        <span class="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-600 text-[10px] font-black uppercase">Dent {tr.tooth_number} • {tr.treatment_type}</span>
                                                        <h4 class="font-bold text-slate-900 mt-2 text-base leading-tight">{tr.description || 'Soin sans description'}</h4>
                                                    </div>
                                                    <div class="text-right">
                                                        <p class="font-black text-slate-900">{formatCurrency(tr.cost)}</p>
                                                        <span class="text-[10px] font-bold text-slate-400">{tr.treatment_date}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        {:else}
                                            <div class="py-12 text-center bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
                                                <p class="text-slate-400 font-bold">Aucun soin planifié</p>
                                            </div>
                                        {/each}
                                    </div>
                                </section>

                                <!-- Past Treatments -->
                                <section>
                                    <div class="flex items-center justify-between mb-6">
                                        <h2 class="text-lg font-black text-slate-900 flex items-center gap-2">
                                            <div class="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-sm">
                                                <Check size={20} />
                                            </div>
                                            Actes Réalisés
                                        </h2>
                                        <span class="bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-2xl text-xs font-black uppercase tracking-wider">{pastTreatments.length}</span>
                                    </div>
                                    <div class="space-y-3">
                                        {#each pastTreatments as tr}
                                            <div class="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 transition-all">
                                                <div class="flex justify-between items-center">
                                                    <div>
                                                        <p class="text-xs font-bold text-slate-900">{tr.description || tr.treatment_type}</p>
                                                        <p class="text-[10px] font-bold text-slate-400">Dent {tr.tooth_number} • {tr.treatment_date}</p>
                                                    </div>
                                                    <p class="font-black text-slate-600 text-sm">{formatCurrency(tr.cost)}</p>
                                                </div>
                                            </div>
                                        {/each}
                                    </div>
                                </section>
                            </div>
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

            <!-- Sidebar (Desktop Collapsible) -->
            {#if isSidebarOpen}
                <aside 
                    class="hidden xl:block w-80 shrink-0 sticky top-28 transition-all duration-500"
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
    onClose={() => isAppointmentModalOpen = false}
/>

<QuickPaymentModal 
    isOpen={isPaymentModalOpen}
    patient={data.patient}
    invoices={data.invoices}
    balance={data.balance}
    onClose={() => isPaymentModalOpen = false}
/>

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
