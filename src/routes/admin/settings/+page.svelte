<script lang="ts">
    import { enhance } from "$app/forms";
    import { onMount } from "svelte";
    import type { ActionData, PageData } from "./$types";
    import { t } from "svelte-i18n";

    let { data, form }: { data: any; form: any } = $props();

    let isSaving = $state(false);
    let isCreatingTreatmentType = $state(false);
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
    });

    let rooms = $state(data.rooms || []);
    let isRoomModalOpen = $state(false);
    let editingRoom = $state<any>(null);
    let roomForm = $state({
        name: "",
        type: "consultation",
        color: "#3B82F6",
        is_active: 1,
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

    async function loadClinicSettings() {
        loadingClinicSettings = true;
        const res = await fetch("/api/admin/clinic-settings");
        const resData = await res.json();
        if (resData.settings) {
            settings = {
                ...resData.settings,
                shift_start_mandatory:
                    resData.settings.shift_start_mandatory === 1,
                shift_cash_tracking: resData.settings.shift_cash_tracking === 1,
                allow_doctor_create_product:
                    resData.settings.allow_doctor_create_product === 1,
                allow_assistant_create_product:
                    resData.settings.allow_assistant_create_product === 1,
                allow_doctor_create_supplier:
                    resData.settings.allow_doctor_create_supplier === 1,
                allow_assistant_create_supplier:
                    resData.settings.allow_assistant_create_supplier === 1,
                require_room_selection:
                    resData.settings.require_room_selection === 1,
            };
            workingDays = resData.workingDays;
            closures = resData.closures;
        }
        loadingClinicSettings = false;
    }

    async function saveClinicSettings() {
        await fetch("/api/admin/clinic-settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(settings),
        });
        alert("Clinic settings saved successfully!");
    }

    async function saveWorkingDays() {
        await fetch("/api/admin/working-days", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ workingDays }),
        });
        alert("Working days saved successfully!");
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

    async function saveRoom() {
        const method = editingRoom ? "PUT" : "POST";
        const body = editingRoom
            ? { id: editingRoom.id, ...roomForm }
            : roomForm;

        const res = await fetch("/api/admin/rooms", {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        if (res.ok) {
            isRoomModalOpen = false;
            // Reload rooms
            const resRooms = await fetch("/api/admin/rooms");
            const dataRooms = await resRooms.json();
            rooms = dataRooms.rooms;
            editingRoom = null;
            roomForm = {
                name: "",
                type: "consultation",
                color: "#3B82F6",
                is_active: 1,
            };
        }
    }

    function openEditRoom(room: any) {
        editingRoom = room;
        roomForm = { ...room };
        isRoomModalOpen = true;
    }

    async function handleDeleteRoom(id: number) {
        if (!confirm("Delete this room?")) return;
        const res = await fetch(`/api/admin/rooms?id=${id}`, {
            method: "DELETE",
        });
        if (res.ok) {
            rooms = rooms.filter((r: any) => r.id !== id);
        }
    }
</script>

<div class="py-6 min-h-screen bg-gray-50">
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
                <p class="mt-4 text-gray-500 font-bold">Loading settings...</p>
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
                        <span>🏥</span> Clinic Information Settings
                    </h2>
                </div>
                <!-- Facility Manager Banner -->
                <div
                    class="px-8 py-4 bg-indigo-50 border-b border-indigo-100 flex justify-between items-center group"
                >
                    <div class="flex items-center gap-4">
                        <div
                            class="w-12 h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center text-2xl shadow-lg shadow-indigo-200 group-hover:scale-110 transition-transform"
                        >
                            🏢
                        </div>
                        <div>
                            <h3 class="font-black text-indigo-900 leading-none">
                                Gestion des Locaux
                            </h3>
                            <p
                                class="text-xs text-indigo-600/70 mt-1 font-bold"
                            >
                                Bâtiments, Étages et Salles
                            </p>
                        </div>
                    </div>
                    <a
                        href="/admin/settings/facilities"
                        class="px-6 py-3 bg-white text-indigo-600 font-black rounded-xl border border-indigo-200 shadow-sm hover:bg-indigo-600 hover:text-white transition-all uppercase tracking-widest text-[10px]"
                    >
                        Ouvrir le Manager
                    </a>
                </div>
                <div class="p-8">
                    <div class="space-y-6">
                        <div>
                            <label
                                class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1"
                                for="clinic_name">Clinic Name</label
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
                                    >Booking Interval</label
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
                                            >{interval} minutes</option
                                        >
                                    {/each}
                                </select>
                            </div>

                            <div>
                                <label
                                    class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1"
                                    for="work_start_time">Work Start Time</label
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
                                    for="work_end_time">Work End Time</label
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
                                ⏱️ Timer Audio Alerts
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
                                            First Alert (Minutes)
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
                                            Number of Beeps
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
                                            Second Alert (Minutes)
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
                                            Number of Beeps
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
                                for="clinic_address">Clinic Address</label
                            >
                            <input
                                id="clinic_address"
                                type="text"
                                bind:value={settings.address}
                                placeholder="123 Rue de la Santé, 75000 Paris"
                                class="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all text-gray-900 font-medium"
                            />
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label
                                    class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1"
                                    for="phone_number">Phone Number</label
                                >
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
                                    for="clinic_email">Clinic Email</label
                                >
                                <input
                                    id="clinic_email"
                                    type="email"
                                    bind:value={settings.email}
                                    placeholder="contact@clinic.com"
                                    class="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all text-gray-900 font-medium"
                                />
                            </div>
                        </div>

                        <div>
                            <label
                                class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1"
                                for="clinic_logo">Clinic Logo</label
                            >
                            <div class="flex items-center gap-6">
                                <div
                                    class="w-24 h-24 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-center overflow-hidden shrink-0"
                                >
                                    {#if settings.logo_url}
                                        <img
                                            src={settings.logo_url}
                                            alt="Clinic Logo"
                                            class="w-full h-full object-contain"
                                        />
                                    {:else}
                                        <span class="text-3xl text-gray-300"
                                            >🏢</span
                                        >
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
                                        Remove
                                    </button>
                                {/if}
                            </div>
                        </div>

                        <div class="flex justify-end pt-4">
                            <button
                                onclick={saveClinicSettings}
                                class="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-200 active:scale-95"
                            >
                                Save General Settings
                            </button>
                        </div>
                    </div>
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
                        <span>🕒</span> Work Shift & Cash Control
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
                                        Forcer l'ouverture de journée
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
                                        Rendre le choix de la salle obligatoire
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
                                        Suivi du fond de caisse
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
                            Save Shift Settings
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
                        <span>📦</span> Inventory Permissions
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
                                <span>🏷️</span> Catalog Creation (Products)
                            </h3>

                            <div
                                class="flex items-center justify-between p-4 bg-white rounded-2xl border {settings.allow_doctor_create_product
                                    ? 'border-indigo-100'
                                    : 'border-gray-100'}"
                            >
                                <div>
                                    <p class="font-bold text-gray-900 text-sm">
                                        Doctors
                                    </p>
                                    <p class="text-[10px] text-gray-400">
                                        Can add new product references
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
                                        Assistants
                                    </p>
                                    <p class="text-[10px] text-gray-400">
                                        Can add new product references
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
                                <span>🤝</span> Supplier Registry
                            </h3>

                            <div
                                class="flex items-center justify-between p-4 bg-white rounded-2xl border {settings.allow_doctor_create_supplier
                                    ? 'border-indigo-100'
                                    : 'border-gray-100'}"
                            >
                                <div>
                                    <p class="font-bold text-gray-900 text-sm">
                                        Doctors
                                    </p>
                                    <p class="text-[10px] text-gray-400">
                                        Can register new suppliers
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
                                        Assistants
                                    </p>
                                    <p class="text-[10px] text-gray-400">
                                        Can register new suppliers
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
                            Save Inventory Permissions
                        </button>
                    </div>
                </div>
            </div>

            <!-- Rooms Management -->
            <div
                class="bg-white shadow-xl shadow-gray-200/50 rounded-3xl overflow-hidden border border-gray-100"
            >
                <div
                    class="px-8 py-6 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center"
                >
                    <h2
                        class="text-xl font-bold text-gray-900 flex items-center gap-2"
                    >
                        <span>📍</span> Salles / Rooms
                    </h2>
                    <button
                        onclick={() => {
                            editingRoom = null;
                            roomForm = {
                                name: "",
                                type: "consultation",
                                color: "#3B82F6",
                                is_active: 1,
                            };
                            isRoomModalOpen = true;
                        }}
                        class="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-all uppercase tracking-widest shadow-lg shadow-indigo-100"
                    >
                        + Ajouter une salle
                    </button>
                </div>
                <div class="p-8">
                    <div
                        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    >
                        {#each rooms as room}
                            <div
                                class="p-6 bg-gray-50 rounded-3xl border border-gray-100 flex flex-col justify-between"
                            >
                                <div>
                                    <div
                                        class="flex justify-between items-start mb-4"
                                    >
                                        <div
                                            class="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-sm"
                                            style="background-color: {room.color}20; color: {room.color}"
                                        >
                                            {#if room.type === "consultation"}🛋️{:else if room.type === "surgery"}💉{:else}☢️{/if}
                                        </div>
                                        <span
                                            class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest {room.is_active
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-gray-200 text-gray-500'}"
                                        >
                                            {room.is_active
                                                ? "Actif"
                                                : "Inactif"}
                                        </span>
                                    </div>
                                    <h3
                                        class="font-black text-gray-900 text-lg"
                                    >
                                        {room.name}
                                    </h3>
                                    <p
                                        class="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1"
                                    >
                                        {room.type}
                                    </p>
                                </div>
                                <div
                                    class="flex gap-2 mt-6 pt-6 border-t border-gray-100"
                                >
                                    <button
                                        onclick={() => openEditRoom(room)}
                                        class="flex-1 px-4 py-2 bg-white text-indigo-600 text-[10px] font-bold rounded-xl border border-indigo-50 hover:bg-indigo-50 transition-all uppercase tracking-widest"
                                    >
                                        Modifier
                                    </button>
                                    <button
                                        onclick={() =>
                                            handleDeleteRoom(room.id)}
                                        class="px-4 py-2 bg-white text-red-600 text-[10px] font-bold rounded-xl border border-red-50 hover:bg-red-50 transition-all uppercase tracking-widest"
                                    >
                                        Supprimer
                                    </button>
                                </div>
                            </div>
                        {/each}
                    </div>
                    {#if rooms.length === 0}
                        <div class="text-center py-12">
                            <div class="text-4xl mb-4">🏢</div>
                            <h3 class="font-bold text-gray-900">
                                Aucune salle configurée
                            </h3>
                            <p class="text-sm text-gray-500 mt-1">
                                Commencez par ajouter votre première salle de
                                consultation ou de chirurgie.
                            </p>
                        </div>
                    {/if}
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
                        <span>📅</span> Working Days Configuration
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
                                        <span class="text-indigo-300">to</span>
                                        <input
                                            type="time"
                                            bind:value={day.custom_end_time}
                                            placeholder={settings.work_end_time}
                                            class="px-3 py-2 border-none focus:ring-0 text-sm font-mono font-bold bg-transparent"
                                        />
                                    </div>
                                    <span
                                        class="text-[10px] text-gray-400 font-bold uppercase tracking-wider hidden lg:block"
                                        >Leave empty for defaults</span
                                    >
                                {:else}
                                    <span
                                        class="px-4 py-1.5 bg-red-100 text-red-600 rounded-lg text-xs font-bold uppercase tracking-widest"
                                    >
                                        Closed
                                    </span>
                                {/if}
                            </div>
                        {/each}
                    </div>

                    <div class="flex justify-end mt-8">
                        <button
                            onclick={saveWorkingDays}
                            class="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-200 active:scale-95"
                        >
                            Save Working Days
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
                        <span>🏖️</span> Clinic Closures & Holidays
                    </h2>
                    <button
                        onclick={() => (showClosureModal = true)}
                        class="px-5 py-2.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-bold rounded-xl transition-all flex items-center gap-2"
                    >
                        <span>+</span> Add Closure
                    </button>
                </div>
                <div class="p-8">
                    {#if closures.length === 0}
                        <div
                            class="text-center py-12 bg-gray-50 rounded-3xl border border-dashed border-gray-200"
                        >
                            <p class="text-gray-400 font-medium">
                                No closures scheduled
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
                                        title="Delete Closure"
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
                                            >Availability First</span
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
                                            >Doctor Specific</span
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
                                Accepted Payment Methods
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
                                    placeholder="Add method (e.g. BTC)"
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
                                    Add
                                </button>
                            </div>
                            <input
                                type="hidden"
                                name="paymentMethods"
                                value={JSON.stringify(paymentMethods)}
                            />
                        </div>
                    </div>

                    <div class="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={isSaving}
                            class="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-200 active:scale-95 disabled:opacity-50"
                        >
                            {isSaving
                                ? $t("common.loading")
                                : $t("admin.settings.saveButton")}
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
                    <span>🚫</span> Cancellation & Postponement Tracking
                </h2>
            </div>
            <div class="p-8 space-y-8">
                <!-- Requirements Section -->
                <div
                    class="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col md:flex-row justify-between gap-6"
                >
                    <div class="space-y-1">
                        <h3 class="font-bold text-slate-800">
                            Reason Requirements
                        </h3>
                        <p class="text-xs text-slate-500">
                            Configure if doctors must provide a reason when
                            changing appointment status.
                        </p>
                    </div>
                    <form
                        method="POST"
                        action="?/updateReasonRequirements"
                        use:enhance
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
                                >Require for Postpone</span
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
                                >Require for Cancel</span
                            >
                        </label>

                        <button
                            type="submit"
                            class="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-all active:scale-95 ml-2"
                        >
                            Apply
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
                            Add New Reason
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
                                >Reason text</label
                            >
                            <input
                                id="newReasonText"
                                type="text"
                                name="reasonText"
                                bind:value={newReasonText}
                                placeholder="Reason text (e.g. Broken Equipment)"
                                class="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm"
                            />
                            <div class="flex gap-2">
                                <label for="newReasonType" class="sr-only"
                                    >Reason type</label
                                >
                                <select
                                    id="newReasonType"
                                    name="reasonType"
                                    bind:value={newReasonType}
                                    class="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                                >
                                    <option value="cancel">Cancel only</option>
                                    <option value="postpone"
                                        >Postpone only</option
                                    >
                                    <option value="both">Both</option>
                                </select>
                                <button
                                    type="submit"
                                    class="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-md text-sm"
                                >
                                    Add
                                </button>
                            </div>
                        </form>
                    </div>

                    <!-- Reasons List -->
                    <div class="lg:col-span-2 space-y-4">
                        <h3
                            class="text-sm font-black text-slate-400 uppercase tracking-widest"
                        >
                            Configured Reasons
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
                    <span>💾</span> Data & Backup
                </h2>
            </div>
            <div class="p-8">
                <div
                    class="flex items-center justify-between p-6 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex-wrap gap-4"
                >
                    <div>
                        <h3 class="text-lg font-bold text-gray-900">
                            Export Clinic Data
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
                            Download Full Backup
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
                Add Clinic Closure
            </h3>

            <div class="space-y-6">
                <div>
                    <label
                        class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1"
                        for="closure_date">Closure Date</label
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
                        for="closure_reason">Reason</label
                    >
                    <input
                        id="closure_reason"
                        type="text"
                        bind:value={newClosure.reason}
                        class="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all text-gray-900 font-medium"
                        placeholder="e.g., Christmas, Staff Training"
                    />
                </div>
            </div>

            <div class="flex gap-4 mt-10">
                <button
                    onclick={() => (showClosureModal = false)}
                    class="flex-1 py-4 bg-gray-50 hover:bg-gray-100 text-gray-500 font-bold rounded-2xl transition-all active:scale-95"
                >
                    Cancel
                </button>
                <button
                    onclick={addClosure}
                    class="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-200 active:scale-95"
                >
                    Add Closure
                </button>
            </div>
        </div>
    </div>
{/if}

<!-- Deprecated Treatment Type Modals removed -->

<!-- Room Modal -->
{#if isRoomModalOpen}
    <div
        class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
    >
        <div
            class="bg-white rounded-[2rem] shadow-2xl p-8 w-full max-w-md border border-gray-100 animate-in fade-in zoom-in duration-200"
        >
            <h3
                class="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3"
            >
                <span class="p-3 bg-indigo-50 rounded-2xl text-xl"
                    >{#if roomForm.type === "consultation"}🛋️{:else if roomForm.type === "surgery"}💉{:else}☢️{/if}</span
                >
                {editingRoom ? "Modifier la salle" : "Ajouter une salle"}
            </h3>

            <div class="space-y-6">
                <div>
                    <label
                        class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1"
                        for="room_name">Nom de la salle</label
                    >
                    <input
                        id="room_name"
                        type="text"
                        bind:value={roomForm.name}
                        placeholder="ex: Box 1, Salle Chirurgie..."
                        class="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all text-gray-900 font-medium"
                    />
                </div>

                <div>
                    <label
                        class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1"
                        for="room_type">Type de salle</label
                    >
                    <select
                        id="room_type"
                        bind:value={roomForm.type}
                        class="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all text-gray-900 font-medium"
                    >
                        <option value="consultation">Consultation</option>
                        <option value="surgery">Chirurgie</option>
                        <option value="xray">Radiologie</option>
                    </select>
                </div>

                <div class="grid grid-cols-2 gap-6">
                    <div>
                        <label
                            class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1"
                            for="room_color">Couleur UI</label
                        >
                        <div class="flex gap-3 items-center">
                            <input
                                id="room_color"
                                type="color"
                                bind:value={roomForm.color}
                                class="w-12 h-12 rounded-xl border-0 p-0 overflow-hidden cursor-pointer"
                            />
                            <span class="text-xs font-mono text-gray-400"
                                >{roomForm.color.toUpperCase()}</span
                            >
                        </div>
                    </div>
                    <div>
                        <label
                            class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1"
                            for="room_active">Statut</label
                        >
                        <div class="flex items-center mt-3">
                            <label
                                class="relative inline-flex items-center cursor-pointer"
                            >
                                <input
                                    type="checkbox"
                                    bind:checked={
                                        () => roomForm.is_active === 1,
                                        (v) => (roomForm.is_active = v ? 1 : 0)
                                    }
                                    class="sr-only peer"
                                />
                                <div
                                    class="w-12 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"
                                ></div>
                                <span
                                    class="ml-3 text-xs font-bold text-gray-500"
                                    >{roomForm.is_active
                                        ? "Actif"
                                        : "Inactif"}</span
                                >
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            <div class="flex gap-4 mt-10">
                <button
                    onclick={() => (isRoomModalOpen = false)}
                    class="flex-1 py-4 bg-gray-50 hover:bg-gray-100 text-gray-500 font-bold rounded-2xl transition-all active:scale-95"
                >
                    Annuler
                </button>
                <button
                    onclick={saveRoom}
                    disabled={!roomForm.name}
                    class="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-200 active:scale-95"
                >
                    {editingRoom ? "Enregistrer" : "Créer la salle"}
                </button>
            </div>
        </div>
    </div>
{/if}
