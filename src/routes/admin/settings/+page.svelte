<script lang="ts">
    import { enhance } from "$app/forms";
    import { fly, fade } from "svelte/transition";
    import { onMount } from "svelte";
    import type { ActionData, PageData } from "./$types";
    import { t } from "svelte-i18n";
    import DentalColorModal from "$lib/components/admin/DentalColorModal.svelte";
    import { Puzzle, Building2, ShieldAlert } from "lucide-svelte";

    let { data, form }: { data: any; form: any } = $props();

    let isSaving = $state(false);
    let showDentalColorModal = $state(false);
    let isCreatingTreatmentType = $state(false);

    // ── Cautious Migration Guard state ─────────────────────────────────────
    let showMigrationDialog = $state(false);
    let pendingMigrationSubmit = $state<(() => void) | null>(null);
    let pendingMigrationChanges = $state<{label: string; from: string; to: string}[]>([]);
    let migrationSuccessMsg = $state<string | null>(null);
    let saveSuccessMsg = $state<string | null>(null);
    let globalSaveSuccess = $state(false);
    let scheduleSaveSuccess = $state(false);
    let closuresSaveSuccess = $state(false);
    let inventorySaveSuccess = $state(false);
    let reasonsSaveSuccess = $state(false);
    let isEditingTreatmentType = $state(false);
    let editingTreatmentType = $state<any>(null);

    // General Settings State (from user instructions)
    let settings = $state<any>({
        clinic_name: "",
        booking_interval_minutes: 30,
        work_start_time: "09:00",
        work_end_time: "18:00",
        timezone: "UTC",
        timer_alert_1_minutes: 15,
        timer_alert_1_beeps: 1,
        timer_alert_2_minutes: 30,
        timer_alert_2_beeps: 2,
        require_room_selection: 1,
        module_billing: true,
        module_prescriptions: true,
        module_dental_chart: true,
        module_inventory: true,
        module_dashboard: true,
        module_patients: true,
        module_journey: true,
        module_custom: false,
        module_custom_roles: "doctor",
        financial_mode: "basic",
        treatment_mode: "ADVANCED",
        payment_mode: "ADVANCED",
        invoicing_enabled: true,
    });

    let workingDays = $state<any[]>([]);
    let closures = $state<any[]>([]);
    let loadingClinicSettings = $state(true);
    let showClosureModal = $state(false);

    let newClosure = $state({
        closure_date: "",
        reason: "",
    });

    const dayNames = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
    ];
    const intervalOptions = [15, 30, 45, 60];

    function normalizeSettings(raw: any) {
        if (!raw) return settings; // Keep existing settings if raw is null
        
        return {
            ...settings, // Start with existing settings
            ...raw,      // Override with new ones
            shift_start_mandatory: raw.shift_start_mandatory === 1,
            shift_cash_tracking: raw.shift_cash_tracking === 1,
            allow_doctor_create_product: raw.allow_doctor_create_product === 1,
            allow_assistant_create_product: raw.allow_assistant_create_product === 1,
            allow_doctor_create_supplier: raw.allow_doctor_create_supplier === 1,
            allow_assistant_create_supplier: raw.allow_assistant_create_supplier === 1,
            require_room_selection: raw.require_room_selection === 1,
            module_billing: raw.module_billing === 1,
            module_prescriptions: raw.module_prescriptions === 1,
            module_dental_chart: raw.module_dental_chart === 1,
            module_inventory: raw.module_inventory === 1,
            module_dashboard: raw.module_dashboard === 1,
            module_patients: raw.module_patients === 1,
            module_journey: raw.module_journey === 1,
            module_custom: raw.module_custom === 1,
            module_front_page: raw.module_front_page === 1,
            invoicing_enabled: raw.invoicing_enabled === 1,
            primary_color: raw.primary_color || settings.primary_color || "#002147",
            secondary_color: raw.secondary_color || settings.secondary_color || "#D4AF37",
            font_serif: raw.font_serif || settings.font_serif || "Lora",
            font_sans: raw.font_sans || settings.font_sans || "Inter",
            financial_mode: raw.financial_mode || settings.financial_mode || "basic",
            treatment_mode: raw.treatment_mode || settings.treatment_mode || "ADVANCED",
            payment_mode: raw.payment_mode || settings.payment_mode || "ADVANCED",
        };
    }

    async function loadClinicSettings() {
        loadingClinicSettings = true;
        const res = await fetch("/api/admin/clinic-settings");
        const resData = await res.json();
        if (resData.settings) {
            settings = normalizeSettings(resData.settings);
            workingDays = resData.workingDays;
            closures = resData.closures;
        }
        loadingClinicSettings = false;
    }

    async function saveClinicSettings() {
        try {
            const res = await fetch("/api/admin/clinic-settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(settings),
            });
            
            if (!res.ok) {
                const errData = await res.json();
                alert("Failed to save settings: " + (errData.error || "Unknown error"));
                return;
            }
            
            alert("Clinic settings saved successfully!");
            window.location.reload();
        } catch (e: any) {
            alert("Network error while saving: " + e.message);
        }
    }

    async function saveWorkingDays() {
        isSaving = true;
        try {
            await fetch("/api/admin/working-days", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ workingDays }),
            });
            scheduleSaveSuccess = true;
            setTimeout(() => scheduleSaveSuccess = false, 4000);
        } finally {
            isSaving = false;
        }
    }

    async function addClosure() {
        if (!newClosure.closure_date || !newClosure.reason) {
            alert("Please fill all fields");
            return;
        }

        await fetch("/api/admin/closures", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newClosure),
        });

        newClosure = { closure_date: "", reason: "" };
        closuresSaveSuccess = true;
        setTimeout(() => closuresSaveSuccess = false, 4000);
        showClosureModal = false;
        await loadClinicSettings();
    }

    async function deleteClosure(id: number) {
        if (!confirm("Delete this closure?")) return;

        await fetch(`/api/admin/closures/${id}`, { method: "DELETE" });
        await loadClinicSettings();
    }

    // Treatment Type helper removed (Deprecated)

    // Local state for financial fields
    let currency = $state("");
    let currencySymbol = $state("");
    let bookingMode = $state("");

    onMount(() => {
        loadClinicSettings();
    });

    // Sync if data changes
    $effect(() => {
        if (data.config) {
            currency = data.config.currency;
            currencySymbol = data.config.currencySymbol;
            bookingMode = data.config.bookingMode;
            paymentMethods = data.config.paymentMethods || [];
        }
        if (data.reasonRequirements) {
            postponeRequired = data.reasonRequirements.postponeRequired;
            cancelRequired = data.reasonRequirements.cancelRequired;
        }
    });

    let paymentMethods = $state(data.config.paymentMethods || []);
    let newPaymentMethod = $state("");

    function addPaymentMethod() {
        if (newPaymentMethod.trim()) {
            if (!paymentMethods.includes(newPaymentMethod.trim())) {
                paymentMethods = [...paymentMethods, newPaymentMethod.trim()];
            }
            newPaymentMethod = "";
        }
    }

    function removePaymentMethod(method: string) {
        paymentMethods = paymentMethods.filter((m: string) => m !== method);
    }

    let newReasonText = $state("");
    let newReasonType = $state("both");
    let postponeRequired = $state(
        data.reasonRequirements?.postponeRequired || false,
    );
    let cancelRequired = $state(
        data.reasonRequirements?.cancelRequired || false,
    );
</script>

<div class="py-6 space-y-8 pb-24">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 class="text-3xl font-black text-gray-900 tracking-tight">
            {$t("admin.settings.title")}
        </h1>
        <p class="mt-2 text-sm text-gray-500 font-medium">
            {$t("admin.settings.description")}
        </p>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-10 space-y-10">
        <!-- Clinic Settings (NEW - Step 3) -->
        {#if loadingClinicSettings}
            <div
                class="bg-white shadow-xl shadow-gray-200/50 rounded-3xl p-12 text-center"
            >
                <div
                    class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"
                ></div>
                <p class="mt-4 text-gray-500 font-bold">{$t('admin.settings.loading_settings')}</p>
            </div>
        {:else}
            <!-- General Settings -->
            <div
                class="bg-white shadow-xl shadow-gray-200/50 rounded-3xl overflow-hidden border border-gray-100"
            >
                <div class="px-8 py-6 bg-gray-50/50 border-b border-gray-100">
                    <h2
                        class="text-xl font-bold text-gray-900 flex items-center gap-2"
                    >
                        <span>🏥</span> {$t('admin.settings.clinic_information_settings')}
                    </h2>
                </div>
                <!-- Facility Manager Banner -->
                <div
                    class="px-8 py-4 bg-indigo-50 border-b border-indigo-100 flex justify-between items-center group"
                >
                    <div class="flex items-center gap-4">
                        <div
                            class="w-12 h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 group-hover:scale-110 transition-transform"
                        >
                            <Building2 size={24} />
                        </div>
                        <div>
                            <h3 class="font-black text-indigo-900 leading-none">
                                {$t('admin.settings.gestion_des_locaux')}
                            </h3>
                            <p
                                class="text-xs text-indigo-600/70 mt-1 font-bold"
                            >
                                {$t('admin.settings.b_timents_tages_et_salles')}
                            </p>
                        </div>
                    </div>
                    <a
                        href="/admin/settings/facilities"
                        class="px-6 py-3 bg-white text-indigo-600 font-black rounded-xl border border-indigo-200 shadow-sm hover:bg-indigo-600 hover:text-white transition-all uppercase tracking-widest text-[10px]"
                    >
                        {$t('admin.settings.ouvrir_le_manager')}
                    </a>
                </div>
                <!-- Dental Colors Banner -->
                <div
                    class="px-8 py-4 bg-slate-50 border-b border-gray-100 flex justify-between items-center group"
                >
                    <div class="flex items-center gap-4">
                        <div
                            class="w-12 h-12 bg-slate-800 text-white rounded-xl flex items-center justify-center text-2xl shadow-lg shadow-slate-200 group-hover:scale-110 transition-transform"
                        >
                            🎨
                        </div>
                        <div>
                            <h3 class="font-black text-slate-900 leading-none">
                                {$t('admin.settings.couleurs_de_l_odontogramme')}
                            </h3>
                            <p
                                class="text-xs text-slate-500 mt-1 font-bold"
                            >
                                {$t('admin.settings.personnalisation_visuelle_du_s')}
                            </p>
                        </div>
                    </div>
                    <button
                        onclick={() => (showDentalColorModal = true)}
                        class="px-6 py-3 bg-white text-slate-700 font-black rounded-xl border border-slate-200 shadow-sm hover:bg-slate-800 hover:text-white transition-all uppercase tracking-widest text-[10px]"
                    >
                        {$t('admin.settings.personnaliser_les_couleurs')}
                    </button>
                </div>

                <!-- {$t('admin.settings.branding_aesthetic')} (NEW) -->
                <div class="px-8 py-6 bg-slate-50 border-b border-gray-100">
                    <h2 class="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <span>✨</span> Branding & Aesthetic
                    </h2>
                </div>
                <div class="p-8 border-b border-gray-100">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <!-- Colors -->
                        <div class="space-y-6">
                            <h3 class="text-sm font-black uppercase tracking-widest text-gray-400">{$t('admin.settings.brand_colors')}</h3>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">{$t('admin.settings.primary_color')}</label>
                                    <div class="flex gap-2">
                                        <input type="color" bind:value={settings.primary_color} class="h-12 w-12 rounded-xl border border-gray-200 cursor-pointer p-1 bg-white" />
                                        <input type="text" bind:value={settings.primary_color} class="flex-grow px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm font-mono" />
                                    </div>
                                </div>
                                <div>
                                    <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">{$t('admin.settings.secondary_color')}</label>
                                    <div class="flex gap-2">
                                        <input type="color" bind:value={settings.secondary_color} class="h-12 w-12 rounded-xl border border-gray-200 cursor-pointer p-1 bg-white" />
                                        <input type="text" bind:value={settings.secondary_color} class="flex-grow px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm font-mono" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- {$t('admin.settings.typography')} -->
                        <div class="space-y-6">
                            <h3 class="text-sm font-black uppercase tracking-widest text-gray-400">Typography</h3>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">{$t('admin.settings.heading_font_serif')}</label>
                                    <select bind:value={settings.font_serif} class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold">
                                        <option value="Lora">{$t('admin.settings.lora_classic')}</option>
                                        <option value={$t('admin.settings.playfair_display')}>Playfair Display</option>
                                        <option value={$t('admin.settings.merriweather')}>Merriweather</option>
                                        <option value={$t('admin.settings.cormorant_garamond')}>Cormorant Garamond</option>
                                        <option value={$t('admin.settings.prata')}>Prata</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">{$t('admin.settings.body_font_sans')}</label>
                                    <select bind:value={settings.font_sans} class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold">
                                        <option value="Inter">{$t('admin.settings.inter_modern')}</option>
                                        <option value={$t('admin.settings.montserrat')}>Montserrat</option>
                                        <option value={$t('admin.settings.outfit')}>Outfit</option>
                                        <option value={$t('admin.settings.poppins')}>Poppins</option>
                                        <option value={$t('admin.settings.roboto')}>Roboto</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Preview Box -->
                    <div class="mt-8 p-8 rounded-2xl border border-gray-100 bg-white shadow-inner flex flex-col items-center justify-center text-center space-y-4" 
                         style="--p-color: {settings.primary_color}; --s-color: {settings.secondary_color}; --f-serif: '{settings.font_serif}', serif; --f-sans: '{settings.font_sans}', sans-serif;">
                        <span class="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-300 mb-2">{$t('admin.settings.live_preview')}</span>
                        <h4 class="text-3xl font-bold" style="color: var(--p-color); font-family: var(--f-serif);">
                            {$t('admin.settings.premium')} <span style="color: var(--s-color); font-style: italic; font-weight: normal;">{$t('admin.settings.dental_care')}</span>
                        </h4>
                        <p class="text-sm max-w-xs text-gray-500 font-light" style="font-family: var(--f-sans);">
                            {$t('admin.settings.experience_the_future_of_denti')}
                        </p>
                        <button class="px-6 py-2 text-[10px] font-bold uppercase tracking-widest text-white rounded-sm transition-colors" 
                                style="background-color: var(--p-color); font-family: var(--f-sans);">
                            {$t('admin.settings.book_appointment')}
                        </button>
                    </div>
                </div>
                <div class="p-8">
                    <div class="space-y-6">
                        <div>
                            <label
                                class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1"
                                for="clinic_name">{$t('admin.settings.clinic_name')}</label
                            >
                            <input
                                id="clinic_name"
                                type="text"
                                bind:value={settings.clinic_name}
                                class="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all text-gray-900 font-medium"
                            />
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label
                                    class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1"
                                    for="booking_interval"
                                    >{$t('admin.settings.booking_interval')}</label
                                >
                                <select
                                    id="booking_interval"
                                    bind:value={
                                        settings.booking_interval_minutes
                                    }
                                    class="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all text-gray-900 font-medium"
                                >
                                    {#each intervalOptions as interval}
                                        <option value={interval}
                                            >{interval} {$t('admin.settings.minutes')}</option
                                        >
                                    {/each}
                                </select>
                            </div>
                            <div>
                                <label
                                    class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1"
                                    for="work_start_time">{$t('admin.settings.heure_de_d_but')}</label
                                >
                                <input
                                    id="work_start_time"
                                    type="time"
                                    bind:value={settings.work_start_time}
                                    class="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all text-gray-900 font-medium font-mono"
                                />
                            </div>

                            <div>
                                <label
                                    class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1"
                                    for="work_end_time">{$t('admin.settings.heure_de_fin')}</label
                                >
                                <input
                                    id="work_end_time"
                                    type="time"
                                    bind:value={settings.work_end_time}
                                    class="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all text-gray-900 font-medium font-mono"
                                />
                            </div>
                        </div>

                        <!-- Timer Alerts Configuration -->
                        <div
                            class="p-6 bg-indigo-50/50 rounded-2xl border border-indigo-100"
                        >
                            <h3
                                class="text-sm font-bold text-indigo-900 uppercase tracking-widest mb-2"
                            >
                                {$t('admin.settings.timer_audio_alerts')}
                            </h3>
                            <p
                                class="text-xs text-indigo-900/60 font-medium mb-6 leading-relaxed max-w-2xl"
                            >
                                Configure audible notifications for doctor
                                visits. Set the specific times (in minutes)
                                during a consultation when an audio alert should
                                play, and customize the number of beeps for each
                                alert to help doctors manage their time
                                effectively.
                            </p>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <!-- Alert 1 -->
                                <div class="space-y-4">
                                    <div>
                                        <label
                                            class="block text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2"
                                            for="alert1_time"
                                        >
                                            {$t('admin.settings.first_alert_minutes')}
                                        </label>
                                        <input
                                            id="alert1_time"
                                            type="number"
                                            min="1"
                                            bind:value={
                                                settings.timer_alert_1_minutes
                                            }
                                            class="w-full px-5 py-3 bg-white border border-indigo-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 text-indigo-900 font-bold"
                                        />
                                    </div>
                                    <div>
                                        <label
                                            class="block text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2"
                                            for="alert1_beeps"
                                        >
                                            {$t('admin.settings.number_of_beeps')}
                                        </label>
                                        <input
                                            id="alert1_beeps"
                                            type="number"
                                            min="1"
                                            max="5"
                                            bind:value={
                                                settings.timer_alert_1_beeps
                                            }
                                            class="w-full px-5 py-3 bg-white border border-indigo-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 text-indigo-900 font-bold"
                                        />
                                    </div>
                                </div>

                                <!-- Alert 2 -->
                                <div class="space-y-4">
                                    <div>
                                        <label
                                            class="block text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2"
                                            for="alert2_time"
                                        >
                                            {$t('admin.settings.second_alert_minutes')}
                                        </label>
                                        <input
                                            id="alert2_time"
                                            type="number"
                                            min="1"
                                            bind:value={
                                                settings.timer_alert_2_minutes
                                            }
                                            class="w-full px-5 py-3 bg-white border border-indigo-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 text-indigo-900 font-bold"
                                        />
                                    </div>
                                    <div>
                                        <label
                                            class="block text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2"
                                            for="alert2_beeps"
                                        >
                                            {$t('admin.settings.number_of_beeps')}
                                        </label>
                                        <input
                                            id="alert2_beeps"
                                            type="number"
                                            min="1"
                                            max="5"
                                            bind:value={
                                                settings.timer_alert_2_beeps
                                            }
                                            class="w-full px-5 py-3 bg-white border border-indigo-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 text-indigo-900 font-bold"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label
                                class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1"
                                for="clinic_address"
                            >
                                {$t('admin.settings.clinic_address')}
                            </label>
                            <input
                                id="clinic_address"
                                type="text"
                                bind:value={settings.address}
                                placeholder={$t('admin.settings.123_rue_de_la_sant_75000_paris')}
                                class="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all text-gray-900 font-medium"
                            />
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label
                                    class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1"
                                    for="phone_number"
                                >
                                    {$t('admin.settings.phone_number')}
                                </label>
                                <input
                                    id="phone_number"
                                    type="text"
                                    bind:value={settings.phone}
                                    placeholder="+33 1 23 45 67 89"
                                    class="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all text-gray-900 font-medium"
                                />
                            </div>
                            <div>
                                <label
                                    class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1"
                                    for="clinic_email"
                                >
                                    {$t('admin.settings.clinic_email')}
                                </label>
                                <input
                                    id="clinic_email"
                                    type="email"
                                    bind:value={settings.email}
                                    placeholder={$t('admin.settings.contact_clinic_com')}
                                    class="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all text-gray-900 font-medium"
                                />
                            </div>
                        </div>

                        <div>
                            <label
                                class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1"
                                for="clinic_logo"
                            >
                                {$t('admin.settings.clinic_logo')}
                            </label>
                            <div class="flex items-center gap-6">
                                <div
                                    class="w-24 h-24 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-center overflow-hidden shrink-0"
                                >
                                    {#if settings.logo_url}
                                        <img
                                            src={settings.logo_url}
                                            alt={$t('admin.settings.clinic_logo')}
                                            class="w-full h-full object-contain"
                                        />
                                    {:else}
                                        <Building2 size={32} class="text-gray-300" />
                                    {/if}
                                </div>
                                <div class="flex-grow">
                                    <input
                                        id="clinic_logo"
                                        type="file"
                                        accept="image/*"
                                        onchange={(e) => {
                                            const file =
                                                e.currentTarget.files?.[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onload = (re) => {
                                                    const img = new Image();
                                                    img.onload = () => {
                                                        const canvas =
                                                            document.createElement(
                                                                "canvas",
                                                            );
                                                        const MAX_WIDTH = 400;
                                                        let width = img.width;
                                                        let height = img.height;

                                                        if (width > MAX_WIDTH) {
                                                            height *=
                                                                MAX_WIDTH /
                                                                width;
                                                            width = MAX_WIDTH;
                                                        }

                                                        canvas.width = width;
                                                        canvas.height = height;
                                                        const ctx =
                                                            canvas.getContext(
                                                                "2d",
                                                            );
                                                        ctx?.drawImage(
                                                            img,
                                                            0,
                                                            0,
                                                            width,
                                                            height,
                                                        );
                                                        settings.logo_url =
                                                            canvas.toDataURL(
                                                                "image/png",
                                                            );
                                                    };
                                                    img.src = re.target
                                                        ?.result as string;
                                                };
                                                reader.readAsDataURL(file);
                                            }
                                        }}
                                        class="block w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-all cursor-pointer"
                                    />
                                    <p
                                        class="mt-2 text-[10px] text-gray-400 font-bold uppercase tracking-widest"
                                    >
                                        Recommended: Square PNG. Optimized to
                                        max 400px wide.
                                    </p>
                                </div>
                                {#if settings.logo_url}
                                    <button
                                        onclick={() =>
                                            (settings.logo_url = null)}
                                        class="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-red-100 transition-all"
                                    >
                                        {$t('admin.settings.remove')}
                                    </button>
                                {/if}
                            </div>
                        </div>

                        <div class="flex justify-end pt-4">
                            <button
                                onclick={saveClinicSettings}
                                class="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-200 active:scale-95"
                            >
                                {$t('admin.settings.save_general_settings')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Active Modules Settings -->
            <div
                class="bg-white shadow-xl shadow-gray-200/50 rounded-3xl overflow-hidden border border-gray-100"
            >
                <div class="px-8 py-6 bg-gray-50/50 border-b border-gray-100">
                    <h2
                        class="text-xl font-bold text-gray-900 flex items-center gap-2"
                    >
                        <Puzzle size={24} class="text-indigo-600" /> {$t('admin.settings.modules_actifs')}
                    </h2>
                </div>
                <div class="p-8">
                    <form
                        method="POST"
                        action="?/updateModules"
                        use:enhance={(event) => {
                            // ── Detect if a financial mode migration is about to happen ──
                            const form = event.formElement;
                            const fd = new FormData(form);

                            // Check if this was a manual confirmation from our dialog
                            const isConfirmed = form.dataset.confirmed === 'true';

                            const newTreatment = fd.get('treatment_mode') as string;
                            const newPayment   = fd.get('payment_mode')   as string;
                            const newBilling   = fd.has('module_billing')  ? 'enabled' : 'disabled';
                            const prevTreatment = settings.treatment_mode;
                            const prevPayment   = settings.payment_mode;
                            const prevBilling   = settings.module_billing ? 'enabled' : 'disabled';

                            const changes: {label: string; from: string; to: string}[] = [];
                            if (newTreatment !== prevTreatment)
                                changes.push({ label: 'Mode de Saisie des Soins', from: prevTreatment, to: newTreatment });
                            if (newPayment !== prevPayment)
                                changes.push({ label: 'Mode de Règlement', from: prevPayment, to: newPayment });
                            if (newBilling !== prevBilling)
                                changes.push({ label: 'Module Financier', from: prevBilling, to: newBilling });

                            if (changes.length > 0 && !isConfirmed) {
                                // Cancel the default submission and show guard dialog
                                event.cancel();
                                pendingMigrationChanges = changes;
                                pendingMigrationSubmit = () => {
                                    form.dataset.confirmed = 'true';
                                    form.requestSubmit();
                                };
                                showMigrationDialog = true;
                                return;
                            }

                            // Reset the confirmation flag for the next submit (if any)
                            form.dataset.confirmed = 'false';
                            isSaving = true;

                            return async ({ result, update }) => {
                                isSaving = false;
                                if (result.type === "success") {
                                    const r = result.data as any;
                                    
                                    // 1. Refresh data from server without resetting form inputs
                                    await update({ reset: false });
                                    
                                    // 2. Sync local reactive state with the definitive server values
                                    if (r?.settings) {
                                        settings = normalizeSettings(r.settings);
                                        saveSuccessMsg = "Configuration modulaire enregistrée avec succès !";
                                        setTimeout(() => saveSuccessMsg = null, 4000);
                                    }
                                    
                                    if (r?.migration) {
                                        migrationSuccessMsg = `✅ Migration enregistrée. ${r.integrity?.transactionCount ?? 0} transaction(s) vérifiées — solde cohérent.`;
                                        setTimeout(() => migrationSuccessMsg = null, 8000);
                                    }
                                }
                            };
                        }}
                    >
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <!-- Modular Architecture Pivot (NEW & UNIFIED) -->
                            <div class="col-span-1 md:col-span-2 p-8 rounded-[32px] bg-white border-2 border-slate-100 shadow-sm space-y-8">
                                <div class="flex items-center justify-between gap-4 mb-2">
                                    <div class="flex items-center gap-4">
                                        <div class="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-100">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-layout-grid"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
                                        </div>
                                        <div>
                                            <h3 class="text-xl font-black text-gray-900 uppercase tracking-tight">{$t('admin.settings.configuration_architecture_mod')}</h3>
                                            <p class="text-xs text-gray-400 font-bold uppercase tracking-widest">{$t('admin.settings.contr_le_des_flux_de_travail_e')}</p>
                                        </div>
                                    </div>
                                </div>

                                <!-- Master Financial Toggle -->
                                <div class="p-6 rounded-3xl border-2 {settings.module_billing ? 'bg-indigo-50/20 border-indigo-200' : 'bg-slate-50 border-slate-200'} transition-all">
                                    <div class="flex items-center justify-between mb-6">
                                        <div class="flex items-center gap-4">
                                            <div class="w-12 h-12 rounded-2xl bg-white border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-banknote"><rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>
                                            </div>
                                            <div>
                                                <h4 class="font-black text-slate-900 leading-tight">{$t('admin.settings.module_de_gestion_financi_re')}</h4>
                                                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{$t('admin.settings.active_le_ledger_les_paiements')}</p>
                                            </div>
                                        </div>
                                        <label class="relative inline-flex items-center cursor-pointer scale-110">
                                            <input 
                                                type="checkbox" 
                                                name="module_billing"
                                                bind:checked={settings.module_billing}
                                                class="sr-only peer"
                                            />
                                            <div class="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600"></div>
                                        </label>
                                    </div>

                                    {#if settings.module_billing}
                                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 border-t border-indigo-100 pt-6" in:slide>
                                            <!-- Treatment Mode -->
                                            <div class="p-6 rounded-2xl border-2 {settings.treatment_mode === 'BASIC' ? 'bg-emerald-50/30 border-emerald-100' : 'bg-white border-slate-100'} transition-all shadow-sm">
                                                <h4 class="font-black text-slate-900 mb-1 flex items-center gap-2 text-sm">
                                                    <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                                                    {$t('admin.settings.mode_de_saisie_des_soins')}
                                                </h4>
                                                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">{$t('admin.settings.complexit_de_la_saisie_cliniqu')}</p>
                                                
                                                <div class="flex gap-2">
                                                    <button 
                                                        type="button"
                                                        onclick={() => {
                                                            settings.treatment_mode = 'BASIC';
                                                            settings.payment_mode = 'BASIC';
                                                        }}
                                                        class="flex-1 px-4 py-3 rounded-xl border-2 transition-all text-center {settings.treatment_mode === 'BASIC' ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-200' : 'bg-white border-gray-100 text-gray-400 hover:border-emerald-200'}"
                                                    >
                                                        <div class="text-[10px] font-black uppercase">{$t('admin.settings.fast_track')}</div>
                                                        <div class="text-[8px] font-bold opacity-80 uppercase tracking-tighter">{$t('admin.settings.saisie_libre')}</div>
                                                    </button>
                                                    <button 
                                                        type="button"
                                                        onclick={() => settings.treatment_mode = 'ADVANCED'}
                                                        class="flex-1 px-4 py-3 rounded-xl border-2 transition-all text-center {settings.treatment_mode === 'ADVANCED' ? 'bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-200' : 'bg-white border-gray-100 text-gray-400 hover:border-indigo-200'}"
                                                    >
                                                        <div class="text-[10px] font-black uppercase">{$t('admin.settings.standard')}</div>
                                                        <div class="text-[8px] font-bold opacity-80 uppercase tracking-tighter">{$t('admin.settings.catalogue')}</div>
                                                    </button>
                                                </div>
                                                <input type="hidden" name="treatment_mode" value={settings.treatment_mode} />
                                            </div>

                                            <!-- Payment Mode -->
                                            <div class="p-6 rounded-2xl border-2 {settings.payment_mode === 'BASIC' ? 'bg-blue-50/30 border-blue-100' : 'bg-white border-slate-100'} transition-all shadow-sm">
                                                <h4 class="font-black text-slate-900 mb-1 flex items-center gap-2 text-sm">
                                                    <span class="w-2 h-2 rounded-full bg-blue-500"></span>
                                                    {$t('admin.settings.mode_de_r_glement')}
                                                </h4>
                                                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">{$t('admin.settings.liaison_entre_soins_et_paiemen')}</p>
                                                
                                                <div class="flex gap-2">
                                                    <button 
                                                        type="button"
                                                        onclick={() => settings.payment_mode = 'BASIC'}
                                                        class="flex-1 px-4 py-3 rounded-xl border-2 transition-all text-center {settings.payment_mode === 'BASIC' ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white border-gray-100 text-gray-400 hover:border-blue-200'}"
                                                    >
                                                        <div class="text-[10px] font-black uppercase">{$t('admin.settings.direct')}</div>
                                                        <div class="text-[8px] font-bold opacity-80 uppercase tracking-tighter">{$t('admin.settings.basic_ledger')}</div>
                                                    </button>
                                                    <button 
                                                        type="button"
                                                        disabled={settings.treatment_mode === 'BASIC'}
                                                        onclick={() => settings.payment_mode = 'ADVANCED'}
                                                        class="flex-1 px-4 py-3 rounded-xl border-2 transition-all text-center {settings.payment_mode === 'ADVANCED' ? 'bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-200' : 'bg-white border-gray-100 text-gray-400 hover:border-indigo-200'} disabled:opacity-30 disabled:cursor-not-allowed"
                                                    >
                                                        <div class="text-[10px] font-black uppercase">{$t('admin.settings.advanced')}</div>
                                                        <div class="text-[8px] font-bold opacity-80 uppercase tracking-tighter">{$t('admin.settings.liaison_facture')}</div>
                                                    </button>
                                                </div>
                                                <input type="hidden" name="payment_mode" value={settings.payment_mode} />
                                            </div>
                                        </div>

                                        <!-- Independent Invoicing Toggle -->
                                        <div class="p-6 rounded-2xl bg-amber-50/20 border-2 border-amber-100 flex items-center justify-between group hover:bg-amber-50/40 transition-all mt-6 shadow-sm" in:fade>
                                            <div class="flex items-center gap-4">
                                                <div class="w-12 h-12 rounded-2xl bg-white border-2 border-amber-200 flex items-center justify-center text-amber-600 shadow-sm">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-text"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>
                                                </div>
                                                <div>
                                                    <h4 class="font-black text-slate-900 leading-tight text-sm">{$t('admin.settings.documents_officiels_devis_fact')}</h4>
                                                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{$t('admin.settings.activer_la_g_n_ration_de_pdf_l')}</p>
                                                </div>
                                            </div>
                                            <label class="relative inline-flex items-center cursor-pointer scale-110">
                                                <input 
                                                    type="checkbox" 
                                                    name="invoicing_enabled"
                                                    checked={settings.invoicing_enabled}
                                                    onchange={(e) => settings.invoicing_enabled = e.currentTarget.checked}
                                                    class="sr-only peer"
                                                />
                                                <div class="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-amber-500"></div>
                                            </label>
                                        </div>
                                    {/if}
                                </div>
                            </div>
                            <div
                                class="p-6 rounded-2xl border {settings.module_dental_chart
                                    ? 'bg-indigo-50/30 border-indigo-100'
                                    : 'bg-gray-50 border-gray-100'} transition-all"
                            >
                                <div
                                    class="flex items-start justify-between gap-4"
                                >
                                    <div class="space-y-1">
                                        <h3 class="font-black text-gray-900">
                                            {$t('admin.settings.module_odontogramme_dental_cha')}
                                        </h3>
                                        <p class="text-xs text-gray-500 leading-relaxed">
                                            {$t('admin.settings.activer_ou_d_sactiver_l_outil')}
                                        </p>
                                        
                                        {#if settings.module_dental_chart}
                                            <div class="mt-4 p-4 bg-white rounded-xl border border-indigo-100 space-y-3">
                                                <label class="block text-[10px] font-black text-indigo-400 uppercase tracking-widest">{$t('admin.settings.version_de_l_odontogramme')}</label>
                                                <select 
                                                    name="dental_chart_mode"
                                                    bind:value={settings.dental_chart_mode}
                                                    class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                                >
                                                    <option value="v1">{$t('admin.settings.classique_v1_uniquement')}</option>
                                                    <option value="v2">{$t('admin.settings.anatomique_v2_uniquement')}</option>
                                                    <option value="both">{$t('admin.settings.mixte_proposer_les_deux')}</option>
                                                </select>
                                                <p class="text-[10px] text-slate-400 leading-tight">
                                                    {$t('admin.settings.v1_est_bas_sur_une_grille_sch')}
                                                </p>
                                            </div>
                                        {/if}
                                    </div>
                                    <label class="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            name="module_dental_chart"
                                            checked={settings.module_dental_chart}
                                            onchange={(e) => {
                                                settings.module_dental_chart = e.currentTarget.checked;
                                                if (!e.currentTarget.checked) {
                                                    settings.module_journey = false;
                                                }
                                            }}
                                            class="sr-only peer"
                                        />
                                        <div class="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600"></div>
                                    </label>
                                </div>
                            </div>

                            <div
                                class="p-6 rounded-2xl border {settings.module_journey
                                    ? 'bg-indigo-50/30 border-indigo-100'
                                    : 'bg-gray-50 border-gray-100'} transition-all"
                            >
                                <div class="flex items-start justify-between gap-4">
                                    <div class="space-y-1">
                                        <h3 class="font-black text-gray-900">
                                            {$t('admin.settings.module_journey_doctor_journey')}
                                        </h3>
                                        <p class="text-xs text-gray-500 leading-relaxed">
                                            {$t('admin.settings.activer_ou_d_sactiver_le_hub_c')}
                                        </p>
                                    </div>
                                    <label class="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            name="module_journey"
                                            checked={settings.module_journey}
                                            onchange={(e) => {
                                                settings.module_journey = e.currentTarget.checked;
                                                if (e.currentTarget.checked) {
                                                    settings.module_dental_chart = true;
                                                }
                                            }}
                                            class="sr-only peer"
                                        />
                                        <div class="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600"></div>
                                    </label>
                                </div>
                            </div>


                            <div
                                class="p-6 rounded-2xl border {settings.module_prescriptions
                                    ? 'bg-indigo-50/30 border-indigo-100'
                                    : 'bg-gray-50 border-gray-100'} transition-all"
                            >
                                <div
                                    class="flex items-start justify-between gap-4"
                                >
                                    <div class="space-y-1">
                                        <h3 class="font-black text-gray-900">
                                            {$t('admin.settings.module_ordonnances')}
                                        </h3>
                                        <p
                                            class="text-xs text-gray-500 leading-relaxed"
                                        >
                                            Activer ou désactiver les
                                            prescriptions.
                                        </p>
                                    </div>
                                    <label
                                        class="relative inline-flex items-center cursor-pointer"
                                    >
                                        <input
                                            type="checkbox"
                                            name="module_prescriptions"
                                            bind:checked={
                                                settings.module_prescriptions
                                            }
                                            class="sr-only peer"
                                        />
                                        <div
                                            class="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600"
                                        ></div>
                                    </label>
                                </div>
                            </div>


                            <div
                                class="p-6 rounded-2xl border {settings.module_inventory
                                    ? 'bg-indigo-50/30 border-indigo-100'
                                    : 'bg-gray-50 border-gray-100'} transition-all"
                            >
                                <div
                                    class="flex items-start justify-between gap-4"
                                >
                                    <div class="space-y-1">
                                        <h3 class="font-black text-gray-900">
                                            {$t('admin.settings.module_inventaire')}
                                        </h3>
                                        <p
                                            class="text-xs text-gray-500 leading-relaxed"
                                        >
                                            Activer ou désactiver la gestion de
                                            stock.
                                        </p>
                                    </div>
                                    <label
                                        class="relative inline-flex items-center cursor-pointer"
                                    >
                                        <input
                                            type="checkbox"
                                            name="module_inventory"
                                            bind:checked={
                                                settings.module_inventory
                                            }
                                            class="sr-only peer"
                                        />
                                        <div
                                            class="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600"
                                        ></div>
                                    </label>
                                </div>
                            </div>

                            <div
                                class="p-6 rounded-2xl border {settings.module_dashboard
                                    ? 'bg-indigo-50/30 border-indigo-100'
                                    : 'bg-gray-50 border-gray-100'} transition-all"
                            >
                                <div
                                    class="flex items-start justify-between gap-4"
                                >
                                    <div class="space-y-1">
                                        <h3 class="font-black text-gray-900">
                                            {$t('admin.settings.module_dashboard_tableau_de_bo')}
                                        </h3>
                                        <p
                                            class="text-xs text-gray-500 leading-relaxed"
                                        >
                                            {$t('admin.settings.activer_ou_d_sactiver_l_acc_s')}
                                        </p>
                                    </div>
                                    <label
                                        class="relative inline-flex items-center cursor-pointer"
                                    >
                                        <input
                                            type="checkbox"
                                            name="module_dashboard"
                                            bind:checked={
                                                settings.module_dashboard
                                            }
                                            class="sr-only peer"
                                        />
                                        <div
                                            class="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600"
                                        ></div>
                                    </label>
                                </div>
                            </div>

                            <div
                                class="p-6 rounded-2xl border {settings.module_patients
                                    ? 'bg-indigo-50/30 border-indigo-100'
                                    : 'bg-gray-50 border-gray-100'} transition-all"
                            >
                                <div
                                    class="flex items-start justify-between gap-4"
                                >
                                    <div class="space-y-1">
                                        <h3 class="font-black text-gray-900">
                                            {$t('admin.settings.module_patients_dossiers')}
                                        </h3>
                                        <p
                                            class="text-xs text-gray-500 leading-relaxed"
                                        >
                                            {$t('admin.settings.activer_ou_d_sactiver_l_acc_s')}
                                        </p>
                                    </div>
                                    <label
                                        class="relative inline-flex items-center cursor-pointer"
                                    >
                                        <input
                                            type="checkbox"
                                            name="module_patients"
                                            bind:checked={
                                                settings.module_patients
                                            }
                                            class="sr-only peer"
                                        />
                                        <div
                                            class="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600"
                                        ></div>
                                    </label>
                                </div>
                            </div>
                            
                            <div
                                class="col-span-1 md:col-span-2 p-6 rounded-2xl border {settings.module_custom
                                    ? 'bg-indigo-50/30 border-indigo-100'
                                    : 'bg-gray-50 border-gray-100'} transition-all"
                            >
                                <div
                                    class="flex items-start justify-between gap-4"
                                >
                                    <div class="space-y-3 flex-grow">
                                        <div class="space-y-1">
                                            <h3 class="font-black text-gray-900">
                                                {$t('admin.settings.module_custom_lab_tracking')}
                                            </h3>
                                            <p
                                                class="text-xs text-gray-500 leading-relaxed"
                                            >
                                                Activer ou désactiver le module
                                                personnalisé.
                                            </p>
                                        </div>
                                        {#if settings.module_custom}
                                            <div class="pt-2">
                                                <label class="block text-xs font-bold text-gray-700 uppercase mb-2">{$t('admin.settings.r_les_autoris_s')}</label>
                                                <div class="flex gap-4">
                                                    <label class="flex items-center gap-2">
                                                        <input type="checkbox" name="module_custom_roles[]" value="doctor" class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" checked={settings.module_custom_roles?.includes('doctor')} onchange={(e) => {
                                                            let roles = settings.module_custom_roles ? settings.module_custom_roles.split(',') : [];
                                                            if (e.currentTarget.checked) { if (!roles.includes('doctor')) roles.push('doctor'); }
                                                            else { roles = roles.filter(r => r !== 'doctor'); }
                                                            settings.module_custom_roles = roles.join(',');
                                                        }} />
                                                        <span class="text-sm font-medium">{$t('admin.settings.doctor')}</span>
                                                    </label>
                                                    <label class="flex items-center gap-2">
                                                        <input type="checkbox" name="module_custom_roles[]" value="assistant" class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" checked={settings.module_custom_roles?.includes('assistant')} onchange={(e) => {
                                                            let roles = settings.module_custom_roles ? settings.module_custom_roles.split(',') : [];
                                                            if (e.currentTarget.checked) { if (!roles.includes('assistant')) roles.push('assistant'); }
                                                            else { roles = roles.filter(r => r !== 'assistant'); }
                                                            settings.module_custom_roles = roles.join(',');
                                                        }} />
                                                        <span class="text-sm font-medium">{$t('admin.settings.assistant')}</span>
                                                    </label>
                                                </div>
                                            </div>
                                        {/if}
                                    </div>
                                    <label
                                        class="relative inline-flex items-center cursor-pointer mt-1"
                                    >
                                        <input
                                            type="checkbox"
                                            name="module_custom"
                                            bind:checked={
                                                settings.module_custom
                                            }
                                            class="sr-only peer"
                                        />
                                        <div
                                            class="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600"
                                        ></div>
                                    </label>
                                </div>
                            </div>

                            <!-- Front Page Configuration -->
                            <div
                                class="p-6 rounded-2xl border {settings.module_front_page
                                    ? 'bg-blue-50/30 border-blue-100'
                                    : 'bg-gray-50 border-gray-100'} transition-all"
                            >
                                <div class="flex items-start justify-between gap-4">
                                    <div class="space-y-1">
                                        <h3 class="font-black text-gray-900">
                                            {$t('admin.settings.page_d_accueil_landing_page')}
                                        </h3>
                                        <p
                                            class="text-xs text-gray-500 leading-relaxed"
                                        >
                                            Si activé, la racine du site ('/') affichera la page de présentation. 
                                            Si désactivé, elle redirigera directement vers la page de connexion.
                                        </p>
                                    </div>
                                    <label
                                        class="relative inline-flex items-center cursor-pointer"
                                    >
                                        <input
                                            type="checkbox"
                                            name="module_front_page"
                                            bind:checked={settings.module_front_page}
                                            class="sr-only peer"
                                        />
                                        <div
                                            class="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"
                                        ></div>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {#if saveSuccessMsg}
                            <div 
                                transition:fly={{ y: 20, duration: 300 }}
                                class="mt-6 p-4 bg-green-50 border border-green-200 rounded-2xl flex items-center gap-3 text-green-700"
                            >
                                <div class="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check"><path d="M20 6 9 17l-5-5"/></svg>
                                </div>
                                <p class="text-sm font-bold uppercase tracking-wide">{saveSuccessMsg}</p>
                            </div>
                        {/if}

                        <div class="mt-6 flex justify-end">
                            <button
                                type="submit"
                                disabled={isSaving}
                                class="min-w-[200px] {saveSuccessMsg ? 'bg-green-600' : 'bg-indigo-600 hover:bg-indigo-700'} text-white font-bold py-3 px-8 rounded-2xl shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                {#if isSaving}
                                    <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span>{$t('admin.settings.traitement')}</span>
                                {:else if saveSuccessMsg}
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check"><path d="M20 6 9 17l-5-5"/></svg>
                                    <span>{$t('admin.settings.enregistr')}</span>
                                {:else}
                                    <span>{$t('admin.settings.enregistrer_les_modules')}</span>
                                {/if}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Shift Management Settings -->
            <div
                class="bg-white shadow-xl shadow-gray-200/50 rounded-3xl overflow-hidden border border-gray-100"
            >
                <div class="px-8 py-6 bg-gray-50/50 border-b border-gray-100">
                    <h2
                        class="text-xl font-bold text-gray-900 flex items-center gap-2"
                    >
                        <span>🕒</span> {$t('admin.settings.work_shift_cash_control')}
                    </h2>
                </div>
                <div class="p-8">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <!-- Mandatory Shift Start -->
                        <div
                            class="p-6 rounded-2xl border {settings.shift_start_mandatory
                                ? 'bg-indigo-50/30 border-indigo-100'
                                : 'bg-gray-50 border-gray-100'} transition-all"
                        >
                            <div class="flex items-start justify-between gap-4">
                                <div class="space-y-1">
                                    <h3 class="font-black text-gray-900">
                                        {$t('admin.settings.forcer_l_ouverture_de_journ_e')}
                                    </h3>
                                    <p
                                        class="text-xs text-gray-500 leading-relaxed"
                                    >
                                        Si activé, les assistants sont bloqués
                                        sur un écran de démarrage tant qu'ils
                                        n'ont pas ouvert leur session de
                                        travail.
                                    </p>
                                </div>
                                <label
                                    class="relative inline-flex items-center cursor-pointer"
                                >
                                    <input
                                        type="checkbox"
                                        bind:checked={
                                            settings.shift_start_mandatory
                                        }
                                        class="sr-only peer"
                                    />
                                    <div
                                        class="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600"
                                    ></div>
                                </label>
                            </div>
                        </div>

                        <!-- Require Room Selection -->
                        <div
                            class="p-6 rounded-2xl border {settings.require_room_selection
                                ? 'bg-indigo-50/30 border-indigo-100'
                                : 'bg-gray-50 border-gray-100'} transition-all"
                        >
                            <div class="flex items-start justify-between gap-4">
                                <div class="space-y-1">
                                    <h3 class="font-black text-gray-900">
                                        {$t('admin.settings.rendre_le_choix_de_la_salle_ob')}
                                    </h3>
                                    <p
                                        class="text-xs text-gray-500 leading-relaxed"
                                    >
                                        Si activé, les médecins doivent
                                        sélectionner leur salle avant d'accéder
                                        à leur tableau de bord.
                                    </p>
                                </div>
                                <label
                                    class="relative inline-flex items-center cursor-pointer"
                                >
                                    <input
                                        type="checkbox"
                                        bind:checked={
                                            settings.require_room_selection
                                        }
                                        class="sr-only peer"
                                    />
                                    <div
                                        class="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600"
                                    ></div>
                                </label>
                            </div>
                        </div>

                        <!-- Cash Tracking -->
                        <div
                            class="p-6 rounded-2xl border {settings.shift_cash_tracking
                                ? 'bg-emerald-50/30 border-emerald-100'
                                : 'bg-gray-50 border-gray-100'} transition-all"
                        >
                            <div class="flex items-start justify-between gap-4">
                                <div class="space-y-1">
                                    <h3 class="font-black text-gray-900">
                                        {$t('admin.settings.suivi_du_fond_de_caisse')}
                                    </h3>
                                    <p
                                        class="text-xs text-gray-500 leading-relaxed"
                                    >
                                        Demande aux assistants de compter et
                                        valider leur fond de caisse à
                                        l'ouverture et à la clôture de journée.
                                    </p>
                                </div>
                                <label
                                    class="relative inline-flex items-center cursor-pointer"
                                >
                                    <input
                                        type="checkbox"
                                        bind:checked={
                                            settings.shift_cash_tracking
                                        }
                                        class="sr-only peer"
                                    />
                                    <div
                                        class="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-600"
                                    ></div>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div class="flex justify-end mt-8">
                        <button
                            onclick={saveClinicSettings}
                            class="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-200 active:scale-95"
                        >
                            {$t('admin.settings.save_shift_settings')}
                        </button>
                    </div>
                </div>
            </div>

            <!-- Inventory Permissions Settings -->
            <div
                class="bg-white shadow-xl shadow-gray-200/50 rounded-3xl overflow-hidden border border-gray-100"
            >
                <div class="px-8 py-6 bg-gray-50/50 border-b border-gray-100">
                    <h2
                        class="text-xl font-bold text-gray-900 flex items-center gap-2"
                    >
                        <span>📦</span> {$t('admin.settings.inventory_permissions')}
                    </h2>
                </div>
                <div class="p-8">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <!-- Product Creation -->
                        <div
                            class="p-8 bg-gray-50/50 rounded-3xl border border-gray-100 space-y-6"
                        >
                            <h3
                                class="flex items-center gap-2 text-sm font-black text-gray-900 uppercase tracking-widest border-b pb-4"
                            >
                                <span>🏷️</span> {$t('admin.settings.catalog_creation_products')}
                            </h3>

                            <div
                                class="flex items-center justify-between p-4 bg-white rounded-2xl border {settings.allow_doctor_create_product
                                    ? 'border-indigo-100'
                                    : 'border-gray-100'}"
                            >
                                <div>
                                    <p class="font-bold text-gray-900 text-sm">
                                        {$t('admin.settings.doctors')}
                                    </p>
                                    <p class="text-[10px] text-gray-400">
                                        {$t('admin.settings.can_add_new_product_references')}
                                    </p>
                                </div>
                                <label
                                    class="relative inline-flex items-center cursor-pointer"
                                >
                                    <input
                                        type="checkbox"
                                        bind:checked={
                                            settings.allow_doctor_create_product
                                        }
                                        class="sr-only peer"
                                    />
                                    <div
                                        class="w-12 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"
                                    ></div>
                                </label>
                            </div>

                            <div
                                class="flex items-center justify-between p-4 bg-white rounded-2xl border {settings.allow_assistant_create_product
                                    ? 'border-indigo-100'
                                    : 'border-gray-100'}"
                            >
                                <div>
                                    <p class="font-bold text-gray-900 text-sm">
                                        {$t('admin.settings.assistants')}
                                    </p>
                                    <p class="text-[10px] text-gray-400">
                                        {$t('admin.settings.can_add_new_product_references')}
                                    </p>
                                </div>
                                <label
                                    class="relative inline-flex items-center cursor-pointer"
                                >
                                    <input
                                        type="checkbox"
                                        bind:checked={
                                            settings.allow_assistant_create_product
                                        }
                                        class="sr-only peer"
                                    />
                                    <div
                                        class="w-12 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"
                                    ></div>
                                </label>
                            </div>
                        </div>

                        <!-- Supplier Creation -->
                        <div
                            class="p-8 bg-gray-50/50 rounded-3xl border border-gray-100 space-y-6"
                        >
                            <h3
                                class="flex items-center gap-2 text-sm font-black text-gray-900 uppercase tracking-widest border-b pb-4"
                            >
                                <span>🤝</span> {$t('admin.settings.supplier_registry')}
                            </h3>

                            <div
                                class="flex items-center justify-between p-4 bg-white rounded-2xl border {settings.allow_doctor_create_supplier
                                    ? 'border-indigo-100'
                                    : 'border-gray-100'}"
                            >
                                <div>
                                    <p class="font-bold text-gray-900 text-sm">
                                        {$t('admin.settings.doctors')}
                                    </p>
                                    <p class="text-[10px] text-gray-400">
                                        {$t('admin.settings.can_register_new_suppliers')}
                                    </p>
                                </div>
                                <label
                                    class="relative inline-flex items-center cursor-pointer"
                                >
                                    <input
                                        type="checkbox"
                                        bind:checked={
                                            settings.allow_doctor_create_supplier
                                        }
                                        class="sr-only peer"
                                    />
                                    <div
                                        class="w-12 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"
                                    ></div>
                                </label>
                            </div>

                            <div
                                class="flex items-center justify-between p-4 bg-white rounded-2xl border {settings.allow_assistant_create_supplier
                                    ? 'border-indigo-100'
                                    : 'border-gray-100'}"
                            >
                                <div>
                                    <p class="font-bold text-gray-900 text-sm">
                                        {$t('admin.settings.assistants')}
                                    </p>
                                    <p class="text-[10px] text-gray-400">
                                        {$t('admin.settings.can_register_new_suppliers')}
                                    </p>
                                </div>
                                <label
                                    class="relative inline-flex items-center cursor-pointer"
                                >
                                    <input
                                        type="checkbox"
                                        bind:checked={
                                            settings.allow_assistant_create_supplier
                                        }
                                        class="sr-only peer"
                                    />
                                    <div
                                        class="w-12 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"
                                    ></div>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div class="flex justify-end mt-8">
                        <button
                            onclick={saveClinicSettings}
                            class="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-200 active:scale-95"
                        >
                            {$t('admin.settings.save_inventory_permissions')}
                        </button>
                    </div>
                </div>
            </div>

            <!-- Working Days -->
            <div
                class="bg-white shadow-xl shadow-gray-200/50 rounded-3xl overflow-hidden border border-gray-100"
            >
                <div class="px-8 py-6 bg-gray-50/50 border-b border-gray-100">
                    <h2
                        class="text-xl font-bold text-gray-900 flex items-center gap-2"
                    >
                        <span>📅</span> {$t('admin.settings.working_days_configuration')}
                    </h2>
                </div>
                <div class="p-8">
                    <div class="grid grid-cols-1 gap-4">
                        {#each workingDays as day}
                            <div
                                class="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl border {day.is_working
                                    ? 'bg-indigo-50/30 border-indigo-100'
                                    : 'bg-gray-50 border-gray-100 opacity-60'}"
                            >
                                <label
                                    class="flex items-center gap-4 cursor-pointer min-w-[160px]"
                                >
                                    <div
                                        class="relative inline-flex items-center"
                                    >
                                        <input
                                            type="checkbox"
                                            bind:checked={day.is_working}
                                            class="sr-only peer"
                                        />
                                        <div
                                            class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"
                                        ></div>
                                    </div>
                                    <span class="font-black text-gray-900"
                                        >{dayNames[day.day_of_week]}</span
                                    >
                                </label>

                                {#if day.is_working}
                                    <div
                                        class="flex items-center gap-3 bg-white p-2 rounded-xl border border-indigo-100"
                                    >
                                        <input
                                            type="time"
                                            bind:value={day.custom_start_time}
                                            placeholder={settings.work_start_time}
                                            class="px-3 py-2 border-none focus:ring-0 text-sm font-mono font-bold bg-transparent"
                                        />
                                        <span class="text-indigo-300">{$t('admin.settings.to')}</span>
                                        <input
                                            type="time"
                                            bind:value={day.custom_end_time}
                                            placeholder={settings.work_end_time}
                                            class="px-3 py-2 border-none focus:ring-0 text-sm font-mono font-bold bg-transparent"
                                        />
                                    </div>
                                    <span
                                        class="text-[10px] text-gray-400 font-bold uppercase tracking-wider hidden lg:block"
                                        >{$t('admin.settings.leave_empty_for_defaults')}</span
                                    >
                                {:else}
                                    <span
                                        class="px-4 py-1.5 bg-red-100 text-red-600 rounded-lg text-xs font-bold uppercase tracking-widest"
                                    >
                                        {$t('admin.settings.closed')}
                                    </span>
                                {/if}
                            </div>
                        {/each}
                    </div>

                    <div class="p-8 border-t border-slate-100 flex flex-col items-end gap-3">
                        {#if scheduleSaveSuccess}
                            <div transition:fade class="text-green-600 text-xs font-bold uppercase tracking-widest flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                                {$t('admin.settings.jours_de_travail_mis_jour')}
                            </div>
                        {/if}
                        <button
                            onclick={saveWorkingDays}
                            disabled={isSaving}
                            class="min-w-[200px] px-8 py-4 {scheduleSaveSuccess ? 'bg-green-600' : 'bg-slate-900 hover:bg-black'} text-white font-bold rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2"
                        >
                            {#if isSaving}
                                <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            {:else if scheduleSaveSuccess}
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                                {$t('admin.settings.enregistr')}
                            {:else}
                                {$t('admin.settings.enregistrer_les_jours_de_trava')}
                            {/if}
                        </button>
                    </div>
                </div>
            </div>

            <!-- Closures/Holidays -->
            <div
                class="bg-white shadow-xl shadow-gray-200/50 rounded-3xl overflow-hidden border border-gray-100"
            >
                <div
                    class="px-8 py-6 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center"
                >
                    <h2
                        class="text-xl font-bold text-gray-900 flex items-center gap-2"
                    >
                        <span>🏖️</span> {$t('admin.settings.clinic_closures_holidays')}
                    </h2>
                    <button
                        onclick={() => (showClosureModal = true)}
                        class="px-5 py-2.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-bold rounded-xl transition-all flex items-center gap-2"
                    >
                        <span>+</span> {$t('admin.settings.add_closure')}
                    </button>
                </div>
                <div class="p-8">
                    {#if closures.length === 0}
                        <div
                            class="text-center py-12 bg-gray-50 rounded-3xl border border-dashed border-gray-200"
                        >
                            <p class="text-gray-400 font-medium">
                                {$t('admin.settings.no_closures_scheduled')}
                            </p>
                        </div>
                    {:else}
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {#each closures as closure}
                                <div
                                    class="flex justify-between items-center p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all"
                                >
                                    <div>
                                        <div
                                            class="text-sm font-black text-indigo-600"
                                        >
                                            {new Date(
                                                closure.closure_date,
                                            ).toLocaleDateString(undefined, {
                                                dateStyle: "long",
                                            })}
                                        </div>
                                        <div
                                            class="text-sm text-gray-500 font-bold mt-1"
                                        >
                                            {closure.reason}
                                        </div>
                                    </div>
                                    <button
                                        onclick={() =>
                                            deleteClosure(closure.id)}
                                        class="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                        title={$t('admin.settings.delete_closure')}
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            class="h-5 w-5"
                                            viewBox="0 0 20 20"
                                            fill="currentColor"
                                        >
                                            <path
                                                fill-rule="evenodd"
                                                d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                                                clip-rule="evenodd"
                                            />
                                        </svg>
                                    </button>
                                </div>
                            {/each}
                        </div>
                    {/if}
                </div>
            </div>
        {/if}

        <!-- Financial Settings -->
        <div
            class="bg-white shadow-xl shadow-gray-200/50 rounded-3xl overflow-hidden border border-gray-100"
        >
            <div class="px-8 py-6 bg-gray-50/50 border-b border-gray-100">
                <h2
                    class="text-xl font-bold text-gray-900 flex items-center gap-2"
                >
                    <span>💵</span>
                    {$t("admin.settings.financial.title")}
                </h2>
            </div>
            <div class="p-8">
                <form
                    method="POST"
                    action="?/updateConfig"
                    use:enhance={() => {
                        isSaving = true;
                        return async ({ update, result }) => {
                            if (result.type === "success") {
                                await update({ reset: false });
                                globalSaveSuccess = true;
                                setTimeout(() => globalSaveSuccess = false, 4000);
                            } else {
                                await update();
                            }
                            isSaving = false;
                        };
                    }}
                    class="space-y-6"
                >
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <label
                                for="currency_code"
                                class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1"
                            >
                                {$t("admin.settings.financial.currencyCode")}
                            </label>
                            <input
                                id="currency_code"
                                type="text"
                                name="currency"
                                bind:value={currency}
                                placeholder={$t(
                                    "admin.settings.financial.currencyPlaceholder",
                                )}
                                class="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all text-gray-900 font-medium"
                            />
                        </div>

                        <div>
                            <label
                                for="currency_symbol"
                                class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1"
                            >
                                {$t("admin.settings.financial.currencySymbol")}
                            </label>
                            <input
                                id="currency_symbol"
                                type="text"
                                name="currencySymbol"
                                bind:value={currencySymbol}
                                placeholder={$t(
                                    "admin.settings.financial.symbolPlaceholder",
                                )}
                                class="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all text-gray-900 font-medium"
                            />
                        </div>

                        <div class="md:col-span-2">
                            <label
                                class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 ml-1"
                                for="bookingMode"
                            >
                                {$t("admin.settings.booking.mode")}
                            </label>
                            <div
                                class="grid grid-cols-1 md:grid-cols-2 gap-6"
                                id="bookingMode"
                            >
                                <label
                                    class="flex items-start gap-4 p-4 border-2 rounded-2xl cursor-pointer transition-all {bookingMode ===
                                    'availability'
                                        ? 'border-indigo-600 bg-indigo-50'
                                        : 'border-slate-100 hover:border-slate-200'}"
                                >
                                    <input
                                        type="radio"
                                        name="bookingMode"
                                        value="availability"
                                        bind:group={bookingMode}
                                        class="mt-1 w-4 h-4 text-indigo-600"
                                    />
                                    <div class="space-y-1">
                                        <span
                                            class="block font-bold text-slate-800"
                                            >{$t('admin.settings.availability_first')}</span
                                        >
                                        <p
                                            class="text-xs text-slate-500 leading-relaxed"
                                        >
                                            System searches for free slots
                                            across all doctors.
                                        </p>
                                    </div>
                                </label>

                                <label
                                    class="flex items-start gap-4 p-4 border-2 rounded-2xl cursor-pointer transition-all {bookingMode ===
                                    'doctor'
                                        ? 'border-indigo-600 bg-indigo-50'
                                        : 'border-slate-100 hover:border-slate-200'}"
                                >
                                    <input
                                        type="radio"
                                        name="bookingMode"
                                        value="doctor"
                                        bind:group={bookingMode}
                                        class="mt-1 w-4 h-4 text-indigo-600"
                                    />
                                    <div class="space-y-1">
                                        <span
                                            class="block font-bold text-slate-800"
                                            >{$t('admin.settings.doctor_specific')}</span
                                        >
                                        <p
                                            class="text-xs text-slate-500 leading-relaxed"
                                        >
                                            Appointments are explicitly assigned
                                            to a doctor.
                                        </p>
                                    </div>
                                </label>
                            </div>
                        </div>

                        <div
                            class="md:col-span-2 space-y-4 pt-6 border-t border-slate-100"
                        >
                            <label
                                class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1"
                                for="new-payment-method"
                            >
                                {$t('admin.settings.accepted_payment_methods')}
                            </label>
                            <div class="flex flex-wrap gap-2">
                                {#each paymentMethods as method}
                                    <div
                                        class="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl font-bold text-sm border border-indigo-100 group"
                                    >
                                        {method}
                                        <button
                                            type="button"
                                            class="text-indigo-300 hover:text-red-500 transition-colors"
                                            onclick={() =>
                                                removePaymentMethod(method)}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                {/each}
                            </div>
                            <div class="flex gap-2">
                                <input
                                    id="new-payment-method"
                                    type="text"
                                    bind:value={newPaymentMethod}
                                    placeholder={$t('admin.settings.add_method_e_g_btc')}
                                    class="flex-grow px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-gray-900 font-medium"
                                    onkeydown={(e) =>
                                        e.key === "Enter" &&
                                        (e.preventDefault(),
                                        addPaymentMethod())}
                                />
                                <button
                                    type="button"
                                    class="px-6 py-4 bg-indigo-100 text-indigo-600 font-bold rounded-2xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                    onclick={addPaymentMethod}
                                >
                                    {$t('admin.settings.add')}
                                </button>
                            </div>
                            <input
                                type="hidden"
                                name="paymentMethods"
                                value={JSON.stringify(paymentMethods)}
                            />
                        </div>
                    </div>

                    <div class="flex flex-col items-end gap-3 pt-4">
                        {#if globalSaveSuccess}
                            <div transition:fade class="text-green-600 text-xs font-bold uppercase tracking-widest flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                                {$t('admin.settings.param_tres_enregistr_s')}
                            </div>
                        {/if}
                        <button
                            type="submit"
                            disabled={isSaving}
                            class="min-w-[140px] px-8 py-4 {globalSaveSuccess ? 'bg-green-600' : 'bg-indigo-600 hover:bg-indigo-700'} text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-200 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {#if isSaving}
                                <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            {:else if globalSaveSuccess}
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                                {$t("common.saved") || "Enregistré"}
                            {:else}
                                {$t("admin.settings.saveButton")}
                            {/if}
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Cancellation & Postponement Reasons -->
        <div
            class="bg-white shadow-xl shadow-gray-200/50 rounded-3xl overflow-hidden border border-gray-100"
        >
            <div class="px-8 py-6 bg-gray-50/50 border-b border-gray-100">
                <h2
                    class="text-xl font-bold text-gray-900 flex items-center gap-2"
                >
                    <span>🚫</span> {$t('admin.settings.cancellation_postponement_trac')}
                </h2>
            </div>
            <div class="p-8 space-y-8">
                <!-- Requirements Section -->
                <div
                    class="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col md:flex-row justify-between gap-6"
                >
                    <div class="space-y-1">
                        <h3 class="font-bold text-slate-800">
                            {$t('admin.settings.reason_requirements')}
                        </h3>
                        <p class="text-xs text-slate-500">
                            Configure if doctors must provide a reason when
                            changing appointment status.
                        </p>
                    </div>
                    <form
                        method="POST"
                        action="?/updateReasonRequirements"
                        use:enhance={() => {
                            isSaving = true;
                            return async ({ update, result }) => {
                                if (result.type === "success") {
                                    await update({ reset: false });
                                    reasonsSaveSuccess = true;
                                    setTimeout(() => reasonsSaveSuccess = false, 4000);
                                }
                                isSaving = false;
                            };
                        }}
                        class="flex gap-4 items-center"
                    >
                        <input
                            type="hidden"
                            name="postponeRequired"
                            value={postponeRequired}
                        />
                        <input
                            type="hidden"
                            name="cancelRequired"
                            value={cancelRequired}
                        />

                        <label
                            class="flex items-center gap-2 cursor-pointer group"
                            for="postponeRequired"
                        >
                            <input
                                type="checkbox"
                                id="postponeRequired"
                                bind:checked={postponeRequired}
                                class="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span
                                class="text-sm font-semibold text-slate-700 group-hover:text-indigo-600 transition-colors"
                                >{$t('admin.settings.require_for_postpone')}</span
                            >
                        </label>

                        <label
                            class="flex items-center gap-2 cursor-pointer group"
                            for="cancelRequired"
                        >
                            <input
                                type="checkbox"
                                id="cancelRequired"
                                bind:checked={cancelRequired}
                                class="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span
                                class="text-sm font-semibold text-slate-700 group-hover:text-indigo-600 transition-colors"
                                >{$t('admin.settings.require_for_cancel')}</span
                            >
                        </label>

                        <button
                            type="submit"
                            disabled={isSaving}
                            class="px-6 py-2 {reasonsSaveSuccess ? 'bg-green-600' : 'bg-slate-900'} text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-all active:scale-95 ml-2 flex items-center gap-2"
                        >
                            {#if isSaving}
                                <div class="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            {:else if reasonsSaveSuccess}
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                                {$t('admin.settings.appliqu')}
                            {:else}
                                {$t('admin.settings.appliquer')}
                            {/if}
                        </button>
                    </form>
                </div>

                <!-- Reasons Management -->
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <!-- Add Form -->
                    <div class="space-y-4">
                        <h3
                            class="text-sm font-black text-slate-400 uppercase tracking-widest"
                        >
                            {$t('admin.settings.add_new_reason')}
                        </h3>
                        <form
                            method="POST"
                            action="?/addCancellationReason"
                            use:enhance={({ formElement }) => {
                                return async ({ result, update }) => {
                                    if (result.type === "success") {
                                        newReasonText = "";
                                        await update();
                                    }
                                };
                            }}
                            class="space-y-3"
                        >
                            <label for="newReasonText" class="sr-only"
                                >{$t('admin.settings.reason_text')}</label
                            >
                            <input
                                id="newReasonText"
                                type="text"
                                name="reasonText"
                                bind:value={newReasonText}
                                placeholder={$t('admin.settings.reason_text_e_g_broken_equipme')}
                                class="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm"
                            />
                            <div class="flex gap-2">
                                <label for="newReasonType" class="sr-only"
                                    >{$t('admin.settings.reason_type')}</label
                                >
                                <select
                                    id="newReasonType"
                                    name="reasonType"
                                    bind:value={newReasonType}
                                    class="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                                >
                                    <option value="cancel">{$t('admin.settings.cancel_only')}</option>
                                    <option value="postpone"
                                        >{$t('admin.settings.postpone_only')}</option
                                    >
                                    <option value="both">{$t('admin.settings.both')}</option>
                                </select>
                                <button
                                    type="submit"
                                    class="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-md text-sm"
                                >
                                    {$t('admin.settings.add')}
                                </button>
                            </div>
                        </form>
                    </div>

                    <!-- Reasons List -->
                    <div class="lg:col-span-2 space-y-4">
                        <h3
                            class="text-sm font-black text-slate-400 uppercase tracking-widest"
                        >
                            {$t('admin.settings.configured_reasons')}
                        </h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {#each data.cancellationReasons as any[] as reason}
                                <div
                                    class="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-indigo-200 transition-all group"
                                >
                                    <div class="flex flex-col">
                                        <span class="font-bold text-slate-700"
                                            >{reason.reason_text}</span
                                        >
                                        <span
                                            class="text-[10px] uppercase font-black tracking-widest {reason.reason_type ===
                                            'cancel'
                                                ? 'text-red-400'
                                                : reason.reason_type ===
                                                    'postpone'
                                                  ? 'text-blue-400'
                                                  : 'text-slate-400'}"
                                        >
                                            {reason.reason_type}
                                        </span>
                                    </div>
                                    {#if reason.reason_text !== "Custom/Other"}
                                        <form
                                            method="POST"
                                            action="?/deleteCancellationReason"
                                            use:enhance
                                        >
                                            <input
                                                type="hidden"
                                                name="id"
                                                value={reason.id}
                                            />
                                            <button
                                                type="submit"
                                                class="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                ✕
                                            </button>
                                        </form>
                                    {/if}
                                </div>
                            {/each}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Data Management -->
        <div
            class="bg-white shadow-xl shadow-gray-200/50 rounded-3xl overflow-hidden border border-gray-100"
        >
            <div class="px-8 py-6 bg-gray-50/50 border-b border-gray-100">
                <h2
                    class="text-xl font-bold text-gray-900 flex items-center gap-2"
                >
                    <span>💾</span> {$t('admin.settings.data_backup')}
                </h2>
            </div>
            <div class="p-8">
                <div
                    class="flex items-center justify-between p-6 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex-wrap gap-4"
                >
                    <div>
                        <h3 class="text-lg font-bold text-gray-900">
                            {$t('admin.settings.export_clinic_data')}
                        </h3>
                        <p class="text-sm text-gray-500 mt-1 max-w-lg">
                            Download a complete backup of your data, including
                            the database and all uploaded files (documents,
                            images).
                        </p>
                    </div>
                    <form action="/api/admin/export" method="GET">
                        <button
                            type="submit"
                            class="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-200 active:scale-95 flex items-center gap-2"
                        >
                            <svg
                                class="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                ><path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                                ></path></svg
                            >
                            {$t('admin.settings.download_full_backup')}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Add Closure Modal -->
{#if showClosureModal}
    <div
        class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
    >
        <div
            class="bg-white rounded-[2rem] shadow-2xl p-8 w-full max-w-md border border-gray-100 animate-in fade-in zoom-in duration-200"
        >
            <h3
                class="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3"
            >
                <span class="p-3 bg-indigo-50 rounded-2xl text-xl">🏖️</span>
                {$t('admin.settings.add_clinic_closure')}
            </h3>

            <div class="space-y-6">
                <div>
                    <label
                        class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1"
                        for="closure_date">{$t('admin.settings.closure_date')}</label
                    >
                    <input
                        id="closure_date"
                        type="date"
                        bind:value={newClosure.closure_date}
                        class="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all text-gray-900 font-medium"
                    />
                </div>

                <div>
                    <label
                        class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1"
                        for="closure_reason">{$t('admin.settings.reason')}</label
                    >
                    <input
                        id="closure_reason"
                        type="text"
                        bind:value={newClosure.reason}
                        class="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all text-gray-900 font-medium"
                        placeholder={$t('admin.settings.e_g_christmas_staff_training')}
                    />
                </div>
            </div>

            <div class="flex gap-4 mt-10">
                <button
                    onclick={() => (showClosureModal = false)}
                    class="flex-1 py-4 bg-gray-50 hover:bg-gray-100 text-gray-500 font-bold rounded-2xl transition-all active:scale-95"
                >
                    {$t('admin.settings.cancel')}
                </button>
                <button
                    onclick={addClosure}
                    class="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-200 active:scale-95"
                >
                    {$t('admin.settings.add_closure')}
                </button>
            </div>
        </div>
    </div>
{/if}

<!-- Deprecated Treatment Type Modals removed -->

<DentalColorModal bind:show={showDentalColorModal} colors={data.dentalColors} />

<!-- ══════════════════════════════════════════════════════════════════════════
     🛡️  CAUTIOUS MIGRATION GUARD — Confirmation Dialog
     ══════════════════════════════════════════════════════════════════════════ -->
{#if showMigrationDialog}
    <div class="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/70 backdrop-blur-sm" in:fade>
        <div class="bg-white w-full max-w-lg rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden" in:fly={{ y: 30, duration: 300 }}>
            <!-- Header -->
            <div class="bg-amber-50 border-b border-amber-100 p-8 flex items-start gap-5">
                <div class="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0 shadow-sm">
                    <ShieldAlert size={28} />
                </div>
                <div>
                    <h3 class="text-xl font-black text-slate-900 leading-tight">{$t('admin.settings.migration_de_mode_d_tect_e')}</h3>
                    <p class="text-sm text-amber-700 font-semibold mt-1">
                        {$t('admin.settings.cette_action_modifie_l_archite')} <strong>{$t('admin.settings.jamais_supprim_es')}</strong>.
                    </p>
                </div>
            </div>

            <!-- Change Summary -->
            <div class="p-8 space-y-4">
                <p class="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">{$t('admin.settings.modifications_d_tect_es')}</p>
                {#each pendingMigrationChanges as change}
                    <div class="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div class="flex-1">
                            <p class="text-xs font-black text-slate-500 uppercase tracking-widest">{change.label}</p>
                            <div class="flex items-center gap-3 mt-1">
                                <span class="px-2 py-0.5 rounded-lg bg-rose-50 text-rose-600 text-xs font-black border border-rose-100">{change.from}</span>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="text-slate-400"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                                <span class="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-black border border-emerald-100">{change.to}</span>
                            </div>
                        </div>
                    </div>
                {/each}

                <!-- Data Safety Notice -->
                <div class="mt-6 p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 flex items-start gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-indigo-500 flex-shrink-0 mt-0.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    <p class="text-xs font-bold text-indigo-700 leading-relaxed">
                        <strong>{$t('admin.settings.principe_de_non_destruction')}</strong> Les données avancées (factures, actes liés au catalogue) resteront en base. 
                        Le changement de mode affecte uniquement <em>{$t('admin.settings.l_affichage')}</em> et <em>{$t('admin.settings.les_boutons_d_action')}</em>.
                        Les anciens enregistrements seront marqués comme <strong>{$t('admin.settings.h_ritage')}</strong> {$t('admin.settings.en_lecture_seule')}
                    </p>
                </div>
            </div>

            <!-- Actions -->
            <div class="px-8 pb-8 flex gap-3">
                <button
                    type="button"
                    onclick={() => { showMigrationDialog = false; pendingMigrationSubmit = null; pendingMigrationChanges = []; }}
                    class="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-2xl transition-all active:scale-95 text-sm"
                >
                    {$t('admin.settings.annuler')}
                </button>
                <button
                    type="button"
                    onclick={() => {
                        showMigrationDialog = false;
                        pendingMigrationSubmit?.();
                        pendingMigrationSubmit = null;
                        pendingMigrationChanges = [];
                    }}
                    class="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl transition-all shadow-lg shadow-indigo-100 active:scale-95 text-sm flex items-center justify-center gap-2"
                >
                    <ShieldAlert size={16} />
                    {$t('admin.settings.confirmer_la_migration')}
                </button>
            </div>
        </div>
    </div>
{/if}

<!-- ── Migration Success Toast ──────────────────────────────────────────────── -->
{#if migrationSuccessMsg}
    <div class="fixed bottom-8 left-1/2 -translate-x-1/2 z-[101] px-6 py-4 bg-emerald-600 text-white rounded-2xl shadow-2xl shadow-emerald-200 font-bold text-sm flex items-center gap-3" in:fly={{ y: 20, duration: 300 }} out:fade>
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="flex-shrink-0"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
        {migrationSuccessMsg}
    </div>
{/if}
