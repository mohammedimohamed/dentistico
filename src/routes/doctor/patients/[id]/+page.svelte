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

    // Hybrid Continuity: detect Basic mode
    const isBasicMode = $derived(
        data.appConfig?.treatment_mode === 'BASIC' && data.appConfig?.payment_mode === 'BASIC'
    );
    // A catalog-linked treatment created before a Basic migration → read-only "Legacy" item
    function isLegacyItem(tr: any): boolean {
        return isBasicMode && tr.source === 'dental' && (tr.cdt_code != null || tr.tooth_number != null);
    }

    // Formatting currency
    function formatCurrency(amount: number) {
        return new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD' }).format(amount).replace('DZD', 'DA');
    }

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
    import AlertBanner from "$lib/components/patients/AlertBanner.svelte";
    
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
    let isEditingCustomFields = $state(false);

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
                            <p class="text-[9px] font-black uppercase tracking-wider text-amber-500">{$t('doctor.patients.medical_notes')}</p>
                            <p class="text-xs font-bold text-amber-900 leading-tight">{data.patient.medical_conditions}</p>
                        </div>
                    </div>
                {/if}
            </div>

            <!-- Financial Balance -->
            <div class="bg-slate-900 rounded-xl p-2.5 text-white flex items-center gap-6 shadow-xl shadow-slate-200">
                <div class="text-center px-1">
                    <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{$t('doctor.patients.total_due')}</p>
                    <p class="text-base font-black">{formatCurrency(balance.total_billed)}</p>
                </div>
                <div class="w-px h-6 bg-slate-700"></div>
                <div class="text-center px-1">
                    <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{$t('doctor.patients.total_paid')}</p>
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
                        {$t('doctor.patients.history_planning')}
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
                        {$t('doctor.patients.custom_record')}
                    </button>
                </div>

                <button 
                    onclick={() => isSidebarOpen = !isSidebarOpen}
                    class="hidden xl:flex items-center gap-2 bg-white border border-slate-200 px-4 py-1.5 rounded-lg font-bold text-[9px] text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
                    title={isSidebarOpen ? "Fermer le panneau latéral" : "Ouvrir le panneau latéral"}
                >
                    {#if isSidebarOpen}
                        <PanelRightClose size={14} />
                        {$t('doctor.patients.wide_canvas')}
                    {:else}
                        <PanelRightOpen size={14} />
                        {$t('doctor.patients.sidebar_uppercase')}
                    {/if}
                </button>
            </div>
        </div>
    </header>

    <div class="max-w-[1800px] mx-auto px-6 py-8">
        <!-- Global Clinical Alerts -->
        <AlertBanner 
            definitions={data.customFieldDefinitions} 
            values={customFieldsValues} 
            delayMs={2000}
        />

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
                                <h2 class="text-2xl font-black text-slate-900">{$t('doctor.patients.medical_record')}</h2>
                                <p class="text-sm text-slate-500 font-medium">{$t('doctor.patients.clinical_info_desc')}</p>
                            </div>
                            <button 
                                type="button"
                                onclick={() => isEditingCustomFields = !isEditingCustomFields}
                                class="px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all
                                    {isEditingCustomFields ? 'bg-slate-100 text-slate-600' : 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 hover:bg-indigo-700'}"
                            >
                                {isEditingCustomFields ? 'Annuler' : 'Modifier la fiche'}
                            </button>
                        </div>

                        {#if !isEditingCustomFields}
                            <div class="space-y-6" in:fade>
                                <DynamicFieldGenerator 
                                    definitions={data.customFieldDefinitions}
                                    values={customFieldsValues}
                                    patientId={data.patient.id}
                                    readonly={true}
                                    onUpdate={() => {}}
                                />
                            </div>
                        {:else}

                        <form 
                            method="POST" 
                            action="?/updatePatient" 
                            use:enhance={() => {
                                return async ({ result }) => {
                                    if (result.type === 'success') {
                                        isEditingCustomFields = false;
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
                                            {$t('common.success_messages.changes_saved')}
                                        </div>
                                    {/if}
                                </div>
                                <button type="submit" class="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2">
                                    <Check size={18} />
                                    {$t('common.save_changes_uppercase')}
                                </button>
                            </div>
                        </form>
                    {/if}
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
                                            {$t('doctor.patients.upcoming_appointments')}
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
                                                            <h4 class="font-bold text-slate-900 text-lg">{$t('common.dr')} {rdv.doctor_name || 'Médecin'}</h4>
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
                                                        <button 
                                                            onclick={() => {
                                                                reschedulingAppointment = rdv;
                                                                isAppointmentModalOpen = true;
                                                            }}
                                                            class="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-all"
                                                        >
                                                            {$t('common.move')}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        {:else}
                                            <div class="py-16 text-center bg-slate-50/50 rounded-[40px] border-2 border-dashed border-slate-200">
                                                <div class="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-slate-200 mx-auto mb-4 border border-slate-100 shadow-sm">
                                                    <Calendar size={32} />
                                                </div>
                                                <p class="text-slate-400 font-bold">{$t('doctor.patients.no_appointments_scheduled')}</p>
                                                <button onclick={() => isAppointmentModalOpen = true} class="mt-4 text-indigo-600 font-black text-sm hover:underline">{$t('doctor.patients.book_appointment')}</button>
                                            </div>
                                        {/each}
                                    </div>
                                </section>

                                <!-- Past Appointments -->
                                <section>
                                    <h2 class="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                        {$t('doctor.patients.past_appointments')}
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
                                                        <p class="text-sm font-bold text-slate-900">{$t('common.dr')} {rdv.doctor_name}</p>
                                                        <p class="text-[10px] font-bold text-slate-400 uppercase">{rdv.appointment_type}</p>
                                                    </div>
                                                </div>
                                                <div class="flex items-center gap-3">
                                                    <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-600">{$t('assistant.dashboard.appointment.status.honored')}</span>
                                                </div>
                                            </div>
                                        {/each}
                                    </div>
                                </section>

                                <!-- Cancelled Appointments -->
                                {#if cancelledAppointments.length > 0}
                                <section>
                                    <h2 class="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                        {$t('common.status.cancelled_plural')}
                                        <div class="h-px flex-1 bg-slate-100 ml-2"></div>
                                    </h2>
                                    <div class="space-y-2 opacity-60">
                                        {#each cancelledAppointments as rdv}
                                            <div class="flex items-center justify-between p-3 bg-slate-50/30 rounded-xl border border-slate-100 grayscale">
                                                <div class="text-xs font-bold text-slate-500">
                                                    {new Date(rdv.start_time.replace(' ', 'T')).toLocaleDateString('fr-FR')} — Dr. {rdv.doctor_name}
                                                </div>
                                                <span class="text-[10px] font-black uppercase text-rose-500">{$t('common.status.cancelled')}</span>
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
                                            {$t('doctor.patients.treatment_plan')}
                                        </h2>
                                        <div class="flex items-center gap-3">
                                            {#if data.appConfig?.treatment_mode === 'BASIC'}
                                                <button 
                                                    onclick={() => isFastTrackModalOpen = true}
                                                    class="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-100"
                                                >
                                                    <PlusIcon size={14} />
                                                    {$t('doctor.patients.add_act_button')}
                                                </button>
                                            {/if}
                                            <span class="bg-amber-50 text-amber-600 px-4 py-1.5 rounded-2xl text-xs font-black uppercase tracking-wider">{plannedTreatments.length}</span>
                                        </div>
                                    </div>
                                    <div class="space-y-4">
                                        {#each plannedTreatments as tr}
                                            <!-- svelte-ignore a11y_click_events_have_key_events -->
                                            <!-- svelte-ignore a11y_no_static_element_interactions -->
                                            <div class="bg-white border-2 {isLegacyItem(tr) ? 'border-slate-200 opacity-80' : 'border-slate-100'} rounded-3xl p-6 transition-all shadow-sm group {!isLegacyItem(tr) && !(tr.paid_amount > 0) && tr.source === 'dental' ? 'cursor-pointer hover:border-amber-100 hover:shadow-md' : 'hover:border-slate-200'}" onclick={(e) => { if (isLegacyItem(tr)) return; if ((tr.paid_amount || 0) > 0) return; if (!e.target?.closest?.('details')) openEditTreatment(tr); }}>
                                                <div class="flex justify-between items-start">
                                                    <div>
                                                        <span class="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-600 text-[10px] font-black uppercase">Dent {tr.tooth_number} • {tr.treatment_type}</span>
                                                        {#if isLegacyItem(tr)}
                                                            <span class="ml-2 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-400 text-[9px] font-black uppercase tracking-widest border border-slate-200" title={$t('doctor.patients.advanced_read_only')}>
                                                                {$t('doctor.patients.legacy_data')}
                                                            </span>
                                                        {/if}
                                                        <h4 class="font-bold text-slate-900 mt-2 text-base leading-tight">{tr.description || 'Soin sans description'}</h4>
                                                    </div>
                                                    <div class="text-right flex flex-col items-end gap-2">
                                                        <div class="flex items-center gap-2">
                                                            {#if (tr.paid_amount || 0) > 0}
                                                                <span class="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">{$t('common.status.paid_uppercase')}</span>
                                                            {:else}
                                                                <details class="relative group/menu">
                                                                    <summary class="list-none cursor-pointer p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600">
                                                                        <MoreVertical size={16} />
                                                                    </summary>
                                                                    
                                                                    <div class="absolute right-0 top-full mt-1 w-52 bg-white rounded-2xl shadow-2xl border border-slate-100 py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                                                        <div class="px-4 py-2 border-b border-slate-50 mb-1">
                                                                            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">{$t('doctor.patients.treatment_actions')}</p>
                                                                        </div>

                                                                        {#if tr.source === 'dental'}
                                                                        <button onclick={() => openEditTreatment(tr)} class="w-full px-4 py-2.5 text-left text-xs font-bold text-indigo-600 hover:bg-indigo-50 flex items-center gap-2 transition-colors">
                                                                            <Edit2 size={14} />
                                                                            {$t('doctor.patients.edit_treatment')}
                                                                        </button>
                                                                        {/if}

                                                                        <form method="POST" action="?/softDeleteTreatment" use:enhance>
                                                                            <input type="hidden" name="id" value={tr.id} />
                                                                            <input type="hidden" name="source" value={tr.source} />
                                                                            <input type="hidden" name="type" value="cancelled" />
                                                                            <button type="submit" class="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-600 hover:bg-amber-50 hover:text-amber-600 flex items-center gap-2 transition-colors">
                                                                                <Archive size={14} />
                                                                                {$t('doctor.patients.cancel_treatment')}
                                                                            </button>
                                                                        </form>
                                                                        
                                                                        {#if data.user.role === 'admin' || data.user.role === 'doctor'}
                                                                            <form method="POST" action="?/hardDeleteTreatment" use:enhance={() => {
                                                                                if(!confirm($t('doctor.patients.confirm_delete_treatment_irreversible'))) return;
                                                                                return async ({ update }) => { await update(); };
                                                                            }}>
                                                                                <input type="hidden" name="id" value={tr.id} />
                                                                                <input type="hidden" name="source" value={tr.source} />
                                                                                <button type="submit" class="w-full px-4 py-2.5 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors mt-1 border-t border-slate-50 pt-3">
                                                                                    <Trash2 size={14} />
                                                                                    {$t('common.permanent_deletion')}
                                                                                </button>
                                                                            </form>
                                                                        {/if}
                                                                    </div>
                                                                </details>
                                                            {/if}
                                                        </div>
                                                        <p class="font-black text-slate-900">{formatCurrency(tr.cost)}</p>
                                                        <span class="text-[10px] font-bold text-slate-400">{tr.treatment_date}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        {:else}
                                            <div class="py-12 text-center bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
                                                <p class="text-slate-400 font-bold">{$t('doctor.patients.no_treatments_scheduled')}</p>
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
                                            {$t('doctor.patients.acts_performed')}
                                        </h2>
                                        <span class="bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-2xl text-xs font-black uppercase tracking-wider">{pastTreatments.length}</span>
                                    </div>
                                    <div class="space-y-3">
                                        {#each pastTreatments as tr}
                                            <!-- svelte-ignore a11y_click_events_have_key_events -->
                                            <!-- svelte-ignore a11y_no_static_element_interactions -->
                                            <div class="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 transition-all group/item relative {!(tr.paid_amount > 0) && tr.source === 'dental' ? 'cursor-pointer hover:border-emerald-200 hover:bg-white hover:shadow-sm' : ''}" onclick={(e) => { if ((tr.paid_amount || 0) > 0) return; if (!e.target?.closest?.('details')) openEditTreatment(tr); }}>
                                                <div class="flex justify-between items-center">
                                                    <div>
                                                        <p class="text-xs font-bold text-slate-900">{tr.description || tr.treatment_type}</p>
                                                        <p class="text-[10px] font-bold text-slate-400">Dent {tr.tooth_number} • {tr.treatment_date}</p>
                                                    </div>
                                                    <div class="flex items-center gap-4">
                                                        <p class="font-black text-slate-600 text-sm">{formatCurrency(tr.cost)}</p>
                                                        
                                                        <div class="flex items-center gap-2">
                                                            {#if (tr.paid_amount || 0) > 0}
                                                                <span class="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">{$t('common.status.paid_uppercase')}</span>
                                                            {:else}
                                                                <details class="relative group/menu">
                                                                    <summary class="list-none cursor-pointer p-1.5 hover:bg-white rounded-lg transition-colors text-slate-300 hover:text-slate-600">
                                                                        <MoreVertical size={14} />
                                                                    </summary>
                                                                    
                                                                    <div class="absolute right-0 top-full mt-1 w-52 bg-white rounded-2xl shadow-2xl border border-slate-100 py-3 z-50">
                                                                        <div class="px-4 py-2 border-b border-slate-50 mb-1">
                                                                            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">{$t('doctor.patients.treatment_actions')}</p>
                                                                        </div>

                                                                        {#if tr.source === 'dental'}
                                                                        <button onclick={() => openEditTreatment(tr)} class="w-full px-4 py-2.5 text-left text-xs font-bold text-indigo-600 hover:bg-indigo-50 flex items-center gap-2 transition-colors">
                                                                            <Edit2 size={14} />
                                                                            {$t('doctor.patients.edit_treatment')}
                                                                        </button>
                                                                        {/if}

                                                                        <form method="POST" action="?/softDeleteTreatment" use:enhance>
                                                                            <input type="hidden" name="id" value={tr.id} />
                                                                            <input type="hidden" name="source" value={tr.source} />
                                                                            <input type="hidden" name="type" value="deleted" />
                                                                            <button type="submit" class="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2 transition-colors">
                                                                                <Archive size={14} />
                                                                                {$t('doctor.patients.archive_treatment')}
                                                                            </button>
                                                                        </form>
                                                                        
                                                                        {#if data.user.role === 'admin' || data.user.role === 'doctor'}
                                                                            <form method="POST" action="?/hardDeleteTreatment" use:enhance={() => {
                                                                                if(!confirm($t('doctor.patients.confirm_delete_treatment'))) return;
                                                                                return async ({ update }) => { await update(); };
                                                                            }}>
                                                                                <input type="hidden" name="id" value={tr.id} />
                                                                                <input type="hidden" name="source" value={tr.source} />
                                                                                <button type="submit" class="w-full px-4 py-2.5 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors mt-1 border-t border-slate-50 pt-3">
                                                                                    <Trash2 size={14} />
                                                                                    {$t('common.permanent_deletion')}
                                                                                </button>
                                                                            </form>
                                                                        {/if}
                                                                    </div>
                                                                </details>
                                                            {/if}
                                                        </div>
                                                    </div>
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
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                            <div class="bg-slate-50 p-6 rounded-[32px] border border-slate-100 shadow-sm">
                                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{$t('doctor.patients.total_billed')}</p>
                                <p class="text-2xl font-black text-slate-900">{formatCurrency(data.balance?.total_billed || 0)}</p>
                            </div>
                            <div class="bg-emerald-50/50 p-6 rounded-[32px] border border-emerald-100 shadow-sm">
                                <p class="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">{$t('doctor.patients.total_settled')}</p>
                                <p class="text-2xl font-black text-emerald-600">{formatCurrency(data.balance?.total_paid || 0)}</p>
                            </div>
                            <div class="bg-indigo-600 p-6 rounded-[32px] shadow-xl shadow-indigo-100">
                                <p class="text-[10px] font-black text-indigo-100 uppercase tracking-widest mb-1">{$t('doctor.patients.remaining_to_pay')}</p>
                                <p class="text-2xl font-black text-white">{formatCurrency(data.balance?.balance_due || 0)}</p>
                            </div>
                        </div>

                        <div class="flex justify-between items-center mb-8">
                            <h2 class="text-xl font-black text-slate-900">{$t('doctor.patients.financial_ledger')}</h2>
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
                                        <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{$t('common.designation')}</th>
                                        <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">{$t('common.debit')}</th>
                                        <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">{$t('common.credit')}</th>
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
                                                        <button type="submit" class="p-2 hover:bg-rose-50 text-slate-300 hover:text-rose-500 rounded-lg transition-all" title={$t('doctor.patients.cancel_entry')}>
                                                            <RotateCcw size={14} />
                                                        </button>
                                                    </form>
                                                {:else if tx.amount < 0 || data.transactions.some(t => t.source_id === tx.source_id && t.source_type === tx.source_type && t.amount === -tx.amount)}
                                                    <span class="text-[9px] font-black text-slate-300 uppercase tracking-tighter">{$t('common.status.cancelled_uppercase')}</span>
                                                {/if}
                                            </td>
                                        </tr>
                                    {:else}
                                        <tr>
                                            <td colspan="6" class="px-6 py-12 text-center text-slate-400 font-bold">{$t('doctor.patients.no_transactions')}</td>
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
                                            <h2 class="text-xl font-black text-slate-900">{$t('doctor.patients.billing_quotes')}</h2>
                                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{$t('doctor.patients.billing_desc')}</p>
                                        </div>
                                    </div>
                                    <div class="flex gap-3">
                                        <button class="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-all flex items-center gap-2">
                                            <PlusIcon size={14} />
                                            {$t('doctor.patients.proforma_invoice')}
                                        </button>
                                        <button class="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg shadow-slate-200">
                                            <PlusIcon size={14} />
                                            {$t('doctor.patients.new_invoice_button')}
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
                                        <p class="text-slate-400 font-bold">{$t('doctor.patients.no_invoices')}</p>
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
                <h3 class="text-xl font-black text-slate-900">{$t('doctor.patients.patient_actions')}</h3>
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
