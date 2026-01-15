<script lang="ts">
    import type { PageData } from "./$types";
    import { enhance } from "$app/forms";
    import { APP_CONFIG } from "$lib/config/app.config";
    import { t } from "svelte-i18n";

    let { data }: { data: PageData } = $props();
    let activeTab = $state("overview");
    let isEditModalOpen = $state(false);
    let isTreatmentModalOpen = $state(false);
    let formError = $state<string | null>(null);
    let formSuccess = $state<string | null>(null);

    const tabs = $derived([
        { id: "overview", label: $t("patient_details.overview") },
        { id: "medical", label: $t("patient_details.medical_history") },
        { id: "dental", label: $t("patient_details.dental_records") },
        { id: "appointments", label: $t("patient_details.appointments") },
        { id: "prescriptions", label: $t("patient_details.prescriptions") },
        { id: "documents", label: "Documents & Imagerie" },
        { id: "financial", label: $t("patient_details.financial") },
    ]);

    import PrescriptionBuilder from "$lib/components/PrescriptionBuilder.svelte";
    import ToothSelector from "$lib/components/ToothSelector.svelte";
    import DentalChart from "$lib/components/dental/DentalChart.svelte";
    import { calculateAge } from "$lib/dental/tooth-data";
    let showPrescriptionBuilder = $state(false);
    let selectedTreatmentsForInvoice = $state<number[]>([]);
    let isInvoiceModalOpen = $state(false);
    let isPaymentModalOpen = $state(false);
    let selectedInvoice = $state<any>(null);
    let previewFile = $state<any>(null);
    let previewDicom = $state<any>(null);
    let DicomViewer = $state<any>(null);

    async function openDicom(file: any) {
        if (!DicomViewer) {
            const module = await import("$lib/components/DicomViewer.svelte");
            DicomViewer = module.default;
        }
        previewDicom = file;
    }

    let isToothModalOpen = $state(false);
    let selectedTooth = $state<string | null>(null);
    let toothForm = $state({
        treatments: "",
        color: "#ffffff",
        notes: "",
    });

    let selectedTeeth = $state<string[]>([]);
    function toggleTooth(tooth: string) {
        if (selectedTeeth.includes(tooth)) {
            selectedTeeth = selectedTeeth.filter((t) => t !== tooth);
        } else {
            selectedTeeth = [...selectedTeeth, tooth];
        }
    }

    const age = $derived(
        data.patient.date_of_birth
            ? calculateAge(data.patient.date_of_birth)
            : 0,
    );
    const isChild = $derived(age < 18);

    function openToothModal(toothNum: string) {
        selectedTooth = toothNum;
        const currentData =
            JSON.parse(data.patient.teeth_treatments || "{}")[
                `tooth_${toothNum}`
            ] || {};
        toothForm = {
            treatments: (currentData.treatments || []).join(", "),
            color: currentData.color || "#ffffff",
            notes: currentData.notes || "",
        };
        isToothModalOpen = true;
    }
</script>

<div class="min-h-screen bg-gray-50 pb-12">
    <!-- Header -->
    <header class="bg-white shadow">
        <div
            class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
        >
            <div class="text-start">
                <div class="flex items-center gap-2">
                    <a
                        href="/doctor/patients"
                        class="text-sm font-bold text-indigo-600 hover:text-indigo-800 flex items-center group"
                    >
                        <span
                            class="margin-inline-end-2 group-hover:-translate-x-1 rtl:group-hover:translate-x-1 transition-transform inline-block"
                            >&larr;</span
                        >
                        {$t("patient_details.back_to_list")}
                    </a>
                </div>
                <div class="flex items-center gap-3 mt-4">
                    <h1
                        class="text-3xl font-bold text-gray-900 flex items-center gap-2"
                    >
                        {#if data.patient.gender === "Male"}
                            <span
                                class="text-blue-500"
                                title={$t("patients.male")}>♂️</span
                            >
                        {:else if data.patient.gender === "Female"}
                            <span
                                class="text-pink-500"
                                title={$t("patients.female")}>♀️</span
                            >
                        {:else if data.patient.gender === "Other"}
                            <span
                                class="text-purple-500"
                                title={$t("patients.other")}>⚧️</span
                            >
                        {/if}
                        {data.patient.full_name}
                    </h1>
                    {#if data.patient.is_archived}
                        <span
                            class="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-800 border border-gray-200 uppercase tracking-wider"
                        >
                            {$t("patient_details.archived")}
                        </span>
                    {/if}
                    <span
                        class="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold {isChild
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'} uppercase tracking-wider"
                    >
                        {isChild
                            ? $t("patient_details.child")
                            : $t("patient_details.adult")}
                    </span>
                </div>
                <p class="text-sm text-gray-500 font-medium mt-2">
                    {$t("patients.patient_id")}: #{data.patient.id} • {$t(
                        "patients.date_of_birth",
                    )}: {data.patient.date_of_birth} ({age}
                    {$t("patients.age")})
                </p>
            </div>
            <div class="flex flex-wrap gap-3">
                <button
                    onclick={() => (isTreatmentModalOpen = true)}
                    class="bg-indigo-600 text-white px-6 py-2.5 rounded-xl hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-100 transition-all text-sm"
                >
                    + Acte Général
                </button>
                <button
                    onclick={() => (isEditModalOpen = true)}
                    class="bg-white text-gray-700 border border-gray-200 px-6 py-2.5 rounded-xl hover:bg-gray-50 font-bold shadow-sm transition-all text-sm"
                >
                    {$t("patient_details.edit_profile")}
                </button>
                {#if data.patient.is_archived}
                    <form method="POST" action="?/unarchivePatient" use:enhance>
                        <button
                            type="submit"
                            class="bg-green-50 text-green-700 border border-green-200 px-6 py-2.5 rounded-xl hover:bg-green-100 font-bold transition-all text-sm"
                        >
                            {$t("patient_details.unarchive")}
                        </button>
                    </form>
                {:else}
                    <form
                        method="POST"
                        action="?/archivePatient"
                        use:enhance={() => {
                            return async ({ result, update }) => {
                                if (result.type === "failure") {
                                    alert(
                                        (result.data as any)?.error ||
                                            $t("common.error"),
                                    );
                                }
                                await update();
                            };
                        }}
                    >
                        <button
                            type="submit"
                            class="bg-red-50 text-red-700 border border-red-200 px-6 py-2.5 rounded-xl hover:bg-red-100 font-bold transition-all text-sm"
                            onclick={(e) =>
                                !confirm(
                                    $t("patient_details.archive_confirm"),
                                ) && e.preventDefault()}
                        >
                            {$t("patient_details.archive")}
                        </button>
                    </form>
                {/if}
            </div>
        </div>

        <!-- Tabs -->
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
            <nav
                class="-mb-px flex space-x-1 sm:space-x-8 overflow-x-auto no-scrollbar"
                aria-label="Tabs"
            >
                {#each tabs as tab}
                    <button
                        class="{activeTab === tab.id
                            ? 'border-indigo-600 text-indigo-600'
                            : 'border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-200'} whitespace-nowrap py-4 px-1 border-b-2 font-bold text-sm transition-all"
                        onclick={() => (activeTab = tab.id)}
                    >
                        {tab.label}
                    </button>
                {/each}
            </nav>
        </div>
    </header>

    <main class="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 text-start">
        <!-- OVERVIEW TAB -->
        {#if activeTab === "overview"}
            <div class="grid grid-cols-1 gap-8 md:grid-cols-2">
                <!-- Personal Info -->
                <div
                    class="bg-white shadow-sm overflow-hidden rounded-3xl border border-gray-100"
                >
                    <div
                        class="px-6 py-5 sm:px-8 border-b border-gray-50 bg-gray-50/30"
                    >
                        <h3 class="text-lg font-bold text-gray-900">
                            {$t("patient_details.personal_info")}
                        </h3>
                    </div>
                    <div class="px-6 py-6 sm:px-8">
                        <dl class="divide-y divide-gray-100">
                            <div class="py-4 grid grid-cols-3 gap-4">
                                <dt
                                    class="text-sm font-bold text-gray-400 uppercase tracking-wider"
                                >
                                    {$t("patients.full_name")}
                                </dt>
                                <dd
                                    class="text-sm text-gray-900 col-span-2 font-medium"
                                >
                                    {data.patient.full_name}
                                </dd>
                            </div>
                            <div class="py-4 grid grid-cols-3 gap-4">
                                <dt
                                    class="text-sm font-bold text-gray-400 uppercase tracking-wider"
                                >
                                    {$t("patients.gender")}
                                </dt>
                                <dd
                                    class="text-sm text-gray-900 col-span-2 font-medium"
                                >
                                    {data.patient.gender || "N/A"}
                                </dd>
                            </div>
                            <div class="py-4 grid grid-cols-3 gap-4">
                                <dt
                                    class="text-sm font-bold text-gray-400 uppercase tracking-wider"
                                >
                                    {$t("patients.phone")}
                                </dt>
                                <dd
                                    class="text-sm text-gray-900 col-span-2 font-medium"
                                >
                                    {#if data.patient.phone}
                                        <a
                                            href="tel:{data.patient.phone}"
                                            class="text-indigo-600 hover:underline"
                                            >{data.patient.phone}</a
                                        >
                                    {:else}
                                        <span class="text-gray-400"
                                            >{$t("common.none")}</span
                                        >
                                    {/if}

                                    {#if data.patient.secondary_phone}
                                        <div
                                            class="mt-2 flex items-center gap-2"
                                        >
                                            <span
                                                class="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-bold uppercase tracking-tighter"
                                                >{$t(
                                                    "patients.secondary_phone",
                                                )}</span
                                            >
                                            <a
                                                href="tel:{data.patient
                                                    .secondary_phone}"
                                                class="text-indigo-600 hover:underline text-sm"
                                                >{data.patient
                                                    .secondary_phone}</a
                                            >
                                        </div>
                                    {/if}
                                </dd>
                            </div>
                            <div class="py-4 grid grid-cols-3 gap-4">
                                <dt
                                    class="text-sm font-bold text-gray-400 uppercase tracking-wider"
                                >
                                    {$t("common.email")}
                                </dt>
                                <dd
                                    class="text-sm text-gray-900 col-span-2 font-medium truncate"
                                >
                                    {#if data.patient.email}
                                        <a
                                            href="mailto:{data.patient.email}"
                                            class="text-indigo-600 hover:underline"
                                            >{data.patient.email}</a
                                        >
                                    {:else}
                                        <span class="text-gray-400"
                                            >{$t("common.none")}</span
                                        >
                                    {/if}

                                    {#if data.patient.secondary_email}
                                        <div
                                            class="mt-2 flex items-center gap-2"
                                        >
                                            <span
                                                class="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-bold uppercase tracking-tighter"
                                                >{$t(
                                                    "patients.secondary_email",
                                                )}</span
                                            >
                                            <a
                                                href="mailto:{data.patient
                                                    .secondary_email}"
                                                class="text-indigo-600 hover:underline text-sm"
                                                >{data.patient
                                                    .secondary_email}</a
                                            >
                                        </div>
                                    {/if}
                                </dd>
                            </div>
                            <div class="py-4 grid grid-cols-3 gap-4">
                                <dt
                                    class="text-sm font-bold text-gray-400 uppercase tracking-wider"
                                >
                                    {$t("patients.address")}
                                </dt>
                                <dd
                                    class="text-sm text-gray-900 col-span-2 font-medium"
                                >
                                    {data.patient.address || ""}<br />
                                    {data.patient.city || ""}
                                    {data.patient.postal_code || ""}
                                </dd>
                            </div>
                            <div class="py-4 grid grid-cols-3 gap-4">
                                <dt
                                    class="text-sm font-bold text-gray-400 uppercase tracking-wider"
                                >
                                    {$t("patients.emergency_contact")}
                                </dt>
                                <dd
                                    class="text-sm text-gray-900 col-span-2 font-medium"
                                >
                                    {data.patient.emergency_contact_name ||
                                        "N/A"}
                                    {#if data.patient.emergency_contact_relationship}
                                        <span class="text-gray-400 font-normal">
                                            ({data.patient
                                                .emergency_contact_relationship})</span
                                        >
                                    {/if}
                                    <br />
                                    <span class="text-gray-500"
                                        >{data.patient
                                            .emergency_contact_phone ||
                                            ""}</span
                                    >
                                </dd>
                            </div>
                            <div class="py-4 grid grid-cols-3 gap-4">
                                <dt
                                    class="text-sm font-bold text-gray-400 uppercase tracking-wider"
                                >
                                    {$t("patients.insurance")}
                                </dt>
                                <dd
                                    class="text-sm text-gray-900 col-span-2 font-medium"
                                >
                                    {#if data.patient.insurance_provider}
                                        {data.patient.insurance_provider}
                                        {#if data.patient.insurance_number}
                                            <span
                                                class="text-gray-400 font-normal"
                                            >
                                                - {data.patient
                                                    .insurance_number}</span
                                            >
                                        {/if}
                                    {:else}
                                        <span class="text-gray-400"
                                            >{$t("common.none")}</span
                                        >
                                    {/if}
                                </dd>
                            </div>
                        </dl>
                    </div>
                </div>

                <!-- Snapshot / Alerts -->
                <div class="space-y-8">
                    <div
                        class="bg-white shadow-sm overflow-hidden rounded-3xl border border-gray-100"
                    >
                        <div
                            class="px-6 py-5 sm:px-8 border-b border-gray-50 bg-gray-50/30"
                        >
                            <h3 class="text-lg font-bold text-gray-900">
                                {$t("patient_details.medical_alerts")}
                            </h3>
                        </div>
                        <div class="px-6 py-6 sm:px-8">
                            {#if data.patient.allergies && data.patient.allergies !== "None"}
                                <div
                                    class="bg-red-50 border border-red-100 rounded-2xl p-5 mb-6"
                                >
                                    <div class="flex items-start gap-4">
                                        <div class="flex-shrink-0 text-xl">
                                            ⚠️
                                        </div>
                                        <div>
                                            <h3
                                                class="text-sm font-bold text-red-800"
                                            >
                                                {$t(
                                                    "patient_details.allergies",
                                                )}
                                            </h3>
                                            <div
                                                class="mt-2 text-sm text-red-700 font-medium"
                                            >
                                                <p>{data.patient.allergies}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            {:else}
                                <div
                                    class="flex items-center gap-3 text-green-600 font-bold text-sm mb-6"
                                >
                                    <span class="text-lg">✓</span>
                                    {$t("patient_details.no_allergies")}
                                </div>
                            {/if}

                            {#if data.patient.medical_conditions && data.patient.medical_conditions !== "None"}
                                <div class="space-y-2">
                                    <h4
                                        class="text-xs font-bold text-gray-400 uppercase tracking-wider"
                                    >
                                        {$t("patient_details.conditions")}
                                    </h4>
                                    <p
                                        class="text-sm text-gray-900 font-medium bg-gray-50 p-4 rounded-xl border border-gray-100"
                                    >
                                        {data.patient.medical_conditions}
                                    </p>
                                </div>
                            {/if}
                        </div>
                    </div>

                    <div
                        class="bg-white shadow-sm overflow-hidden rounded-3xl border border-gray-100 font-inter"
                    >
                        <div
                            class="px-6 py-5 sm:px-8 border-b border-gray-50 bg-gray-50/30"
                        >
                            <h3 class="text-lg font-bold text-gray-900">
                                {$t("patient_details.financial_snapshot")}
                            </h3>
                        </div>
                        <div class="px-6 py-8 sm:px-8">
                            <dl class="grid grid-cols-1 gap-8 sm:grid-cols-2">
                                <div>
                                    <dt
                                        class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2"
                                    >
                                        {$t("patient_details.total_billed")}
                                    </dt>
                                    <dd
                                        class="text-3xl font-black text-gray-900 tracking-tight"
                                    >
                                        {data.appConfig
                                            .currencySymbol}{data.balance.total_billed.toFixed(
                                            2,
                                        )}
                                    </dd>
                                </div>
                                <div>
                                    <dt
                                        class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2"
                                    >
                                        {$t("patient_details.balance_due")}
                                    </dt>
                                    <dd
                                        class="text-3xl font-black tracking-tight {data
                                            .balance.balance_due > 0
                                            ? 'text-red-600'
                                            : 'text-green-600'}"
                                    >
                                        {data.appConfig
                                            .currencySymbol}{data.balance.balance_due.toFixed(
                                            2,
                                        )}
                                    </dd>
                                </div>
                            </dl>
                        </div>
                    </div>
                </div>
            </div>
        {/if}

        <!-- MEDICAL TAB -->
        {#if activeTab === "medical"}
            <div
                class="bg-white shadow-sm overflow-hidden rounded-3xl border border-gray-100"
            >
                <div
                    class="px-6 py-5 sm:px-8 border-b border-gray-50 bg-gray-50/30"
                >
                    <h3 class="text-lg font-bold text-gray-900">
                        {$t("patient_details.medical_history")}
                    </h3>
                </div>
                <div class="px-6 py-8 sm:px-8 space-y-10">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div class="space-y-2">
                            <h4
                                class="text-xs font-bold text-gray-400 uppercase tracking-wider"
                            >
                                {$t("patient_details.blood_type")}
                            </h4>
                            <p class="text-lg text-gray-900 font-black">
                                {data.patient.blood_type || $t("common.none")}
                            </p>
                        </div>
                        <div class="space-y-2">
                            <h4
                                class="text-xs font-bold text-gray-400 uppercase tracking-wider"
                            >
                                {$t("patients.gender")}
                            </h4>
                            <p class="text-lg text-gray-900 font-black">
                                {data.patient.gender || $t("common.none")}
                            </p>
                        </div>
                        {#if data.patient.pregnancy_status === 1}
                            <div class="md:col-span-2">
                                <div
                                    class="bg-amber-50 border border-amber-100 rounded-2xl p-5 flex items-center gap-4"
                                >
                                    <span class="text-2xl">🤰</span>
                                    <div>
                                        <p
                                            class="text-sm font-bold text-amber-900 uppercase tracking-wider"
                                        >
                                            {$t(
                                                "patient_details.pregnancy_status",
                                            )}
                                        </p>
                                        <p
                                            class="text-lg font-black text-amber-700"
                                        >
                                            {$t("patient_details.active")}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        {/if}
                    </div>
                    <div class="space-y-4">
                        <div class="space-y-2 text-start">
                            <h4
                                class="text-xs font-bold text-gray-400 uppercase tracking-wider"
                            >
                                {$t("patient_details.allergies")}
                            </h4>
                            <div
                                class="p-5 bg-gray-50 rounded-2xl border border-gray-100 font-medium text-gray-900 whitespace-pre-line"
                            >
                                {data.patient.allergies || $t("common.none")}
                            </div>
                        </div>
                        <div class="space-y-2 text-start">
                            <h4
                                class="text-xs font-bold text-gray-400 uppercase tracking-wider"
                            >
                                {$t("patient_details.current_medications")}
                            </h4>
                            <div
                                class="p-5 bg-gray-50 rounded-2xl border border-gray-100 font-medium text-gray-900 whitespace-pre-line"
                            >
                                {data.patient.current_medications ||
                                    $t("common.none")}
                            </div>
                        </div>
                        <div class="space-y-2 text-start">
                            <h4
                                class="text-xs font-bold text-gray-400 uppercase tracking-wider"
                            >
                                {$t("patient_details.conditions")}
                            </h4>
                            <div
                                class="p-5 bg-gray-50 rounded-2xl border border-gray-100 font-medium text-gray-900 whitespace-pre-line"
                            >
                                {data.patient.medical_conditions ||
                                    $t("common.none")}
                            </div>
                        </div>
                        {#if data.patient.surgical_history}
                            <div class="space-y-2 text-start">
                                <h4
                                    class="text-xs font-bold text-gray-400 uppercase tracking-wider"
                                >
                                    {$t("patient_details.surgical_history")}
                                </h4>
                                <div
                                    class="p-5 bg-gray-50 rounded-2xl border border-gray-100 font-medium text-gray-900 whitespace-pre-line"
                                >
                                    {data.patient.surgical_history}
                                </div>
                            </div>
                        {/if}
                        {#if data.patient.family_medical_history}
                            <div class="space-y-2 text-start">
                                <h4
                                    class="text-xs font-bold text-gray-400 uppercase tracking-wider"
                                >
                                    {$t("patient_details.family_history")}
                                </h4>
                                <div
                                    class="p-5 bg-gray-50 rounded-2xl border border-gray-100 font-medium text-gray-900 whitespace-pre-line"
                                >
                                    {data.patient.family_medical_history}
                                </div>
                            </div>
                        {/if}
                        {#if data.patient.oral_habits}
                            <div class="space-y-2 text-start">
                                <h4
                                    class="text-xs font-bold text-gray-400 uppercase tracking-wider"
                                >
                                    {$t("patient_details.oral_habits")}
                                </h4>
                                <div
                                    class="p-5 bg-gray-50 rounded-2xl border border-gray-100 font-medium text-gray-900 whitespace-pre-line"
                                >
                                    {data.patient.oral_habits}
                                </div>
                            </div>
                        {/if}
                        {#if data.patient.substance_use}
                            <div class="space-y-2 text-start">
                                <h4
                                    class="text-xs font-bold text-gray-400 uppercase tracking-wider"
                                >
                                    {$t("patient_details.substance_use")}
                                </h4>
                                <div
                                    class="p-5 bg-gray-50 rounded-2xl border border-gray-100 font-medium text-gray-900 whitespace-pre-line"
                                >
                                    {data.patient.substance_use}
                                </div>
                            </div>
                        {/if}
                    </div>
                </div>
            </div>
        {/if}

        <!-- DENTAL TAB -->
        {#if activeTab === "dental"}
            <div class="space-y-8">
                <div
                    class="bg-white shadow-sm overflow-hidden rounded-3xl border border-gray-100"
                >
                    <div
                        class="px-6 py-5 sm:px-8 border-b border-gray-50 bg-gray-50/30"
                    >
                        <h3 class="text-lg font-bold text-gray-900">
                            {$t("patient_details.dental_info")}
                        </h3>
                    </div>
                    <div
                        class="px-6 py-8 sm:px-8 grid grid-cols-1 md:grid-cols-2 gap-8"
                    >
                        <div class="space-y-2">
                            <h4
                                class="text-xs font-bold text-gray-400 uppercase tracking-wider"
                            >
                                {$t("patient_details.previous_dentist")}
                            </h4>
                            <p class="text-lg text-gray-900 font-black">
                                {data.patient.previous_dentist ||
                                    $t("common.none")}
                            </p>
                        </div>
                        <div class="space-y-2">
                            <h4
                                class="text-xs font-bold text-gray-400 uppercase tracking-wider"
                            >
                                {$t("patient_details.last_visit")}
                            </h4>
                            <p class="text-lg text-gray-900 font-black">
                                {data.patient.last_visit_date ||
                                    $t("common.none")}
                            </p>
                        </div>
                        <div class="md:col-span-2 space-y-2 text-start">
                            <h4
                                class="text-xs font-bold text-gray-400 uppercase tracking-wider"
                            >
                                {$t("patient_details.dental_notes")}
                            </h4>
                            <div
                                class="p-5 bg-gray-50 rounded-2xl border border-gray-100 font-medium text-gray-900 whitespace-pre-line"
                            >
                                {data.patient.dental_notes || $t("common.none")}
                            </div>
                        </div>
                    </div>
                </div>

                <div
                    class="bg-white shadow-sm overflow-hidden rounded-3xl border border-gray-100 p-8"
                >
                    <h3 class="text-lg font-bold text-gray-900 mb-6">
                        {$t("patient_details.odontogram")}
                    </h3>
                    <div
                        class="bg-gray-50 rounded-2xl p-6 border border-gray-100 overflow-x-auto"
                    >
                        <DentalChart
                            patientId={data.patient.id}
                            patientAge={age}
                            readOnly={false}
                        />
                    </div>
                </div>

                <div
                    class="bg-white shadow-sm overflow-hidden rounded-3xl border border-gray-100"
                >
                    <div
                        class="px-6 py-5 sm:px-8 border-b border-gray-50 bg-gray-50/30"
                    >
                        <h3 class="text-lg font-bold text-gray-900">
                            {$t("patient_details.treatment_history")}
                        </h3>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-100">
                            <thead class="bg-gray-50/50">
                                <tr>
                                    <th
                                        class="px-6 py-4 text-inline-start text-[10px] font-bold text-gray-400 uppercase tracking-widest"
                                        >{$t("patient_details.date")}</th
                                    >
                                    <th
                                        class="px-6 py-4 text-inline-start text-[10px] font-bold text-gray-400 uppercase tracking-widest"
                                        >{$t("patient_details.tooth")}</th
                                    >
                                    <th
                                        class="px-6 py-4 text-inline-start text-[10px] font-bold text-gray-400 uppercase tracking-widest"
                                        >{$t("patient_details.type")}</th
                                    >
                                    <th
                                        class="px-6 py-4 text-inline-start text-[10px] font-bold text-gray-400 uppercase tracking-widest"
                                        >{$t("patient_details.description")}</th
                                    >
                                    <th
                                        class="px-6 py-4 text-inline-start text-[10px] font-bold text-gray-400 uppercase tracking-widest"
                                        >{$t("patient_details.cost")}</th
                                    >
                                    <th
                                        class="px-6 py-4 text-inline-start text-[10px] font-bold text-gray-400 uppercase tracking-widest"
                                        >{$t("common.status")}</th
                                    >
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-100 bg-white">
                                {#each data.treatments as treatment}
                                    <tr
                                        class="hover:bg-gray-50/50 transition-colors"
                                    >
                                        <td
                                            class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900"
                                            >{treatment.treatment_date}</td
                                        >
                                        <td
                                            class="px-6 py-4 whitespace-nowrap text-sm font-bold text-indigo-600"
                                            >{treatment.source === "general"
                                                ? "Général"
                                                : treatment.tooth_number ||
                                                  "-"}</td
                                        >
                                        <td
                                            class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-700 capitalize"
                                            >{$t(
                                                `patient_details.${treatment.treatment_type}`,
                                            )}</td
                                        >
                                        <td
                                            class="px-6 py-4 text-sm text-gray-500 font-medium max-w-xs"
                                            >{treatment.description}</td
                                        >
                                        <td
                                            class="px-6 py-4 whitespace-nowrap text-sm font-black text-gray-900"
                                            >{data.appConfig
                                                .currencySymbol}{treatment.cost.toFixed(
                                                2,
                                            )}</td
                                        >
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            <span
                                                class="px-3 py-1 inline-flex text-[10px] leading-5 font-bold rounded-full uppercase tracking-wider
                                                {treatment.status ===
                                                'completed'
                                                    ? 'bg-green-100 text-green-700'
                                                    : treatment.status ===
                                                        'planned'
                                                      ? 'bg-blue-100 text-blue-700'
                                                      : treatment.status ===
                                                          'existing'
                                                        ? 'bg-gray-100 text-gray-700'
                                                        : 'bg-amber-100 text-amber-700'}"
                                            >
                                                {$t(
                                                    `dashboard.status_${treatment.status}`,
                                                )}
                                            </span>
                                        </td>
                                    </tr>
                                {:else}
                                    <tr>
                                        <td
                                            colspan="6"
                                            class="px-6 py-24 text-center text-sm font-bold text-gray-400"
                                        >
                                            <p class="mb-2 text-2xl opacity-20">
                                                📄
                                            </p>
                                            {$t(
                                                "patient_details.treatment_history",
                                            )}
                                        </td>
                                    </tr>
                                {/each}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        {/if}

        <!-- APPOINTMENTS TAB -->
        {#if activeTab === "appointments"}
            <div
                class="bg-white shadow-sm overflow-hidden rounded-3xl border border-gray-100"
            >
                <ul class="divide-y divide-gray-100">
                    {#each data.appointments as appt}
                        <li class="hover:bg-gray-50/50 transition-all">
                            <div class="px-6 py-6 sm:px-8">
                                <div class="flex items-center justify-between">
                                    <p
                                        class="text-sm font-bold text-indigo-600 truncate"
                                    >
                                        {#if appt.start_time.includes("T")}
                                            {appt.start_time.split("T")[0]}
                                            {appt.start_time
                                                .split("T")[1]
                                                .substring(0, 5)}
                                        {:else}
                                            {appt.start_time.substring(0, 16)}
                                        {/if}
                                    </p>
                                    <div class="ml-2 flex-shrink-0 flex">
                                        <span
                                            class="px-3 py-1 inline-flex text-[10px] leading-5 font-bold rounded-full uppercase tracking-wider
                                            {appt.status === 'confirmed'
                                                ? 'bg-green-100 text-green-700'
                                                : appt.status === 'cancelled'
                                                  ? 'bg-red-100 text-red-700'
                                                  : 'bg-blue-100 text-blue-700'}"
                                        >
                                            {$t(
                                                `dashboard.status_${appt.status}`,
                                            )}
                                        </span>
                                    </div>
                                </div>
                                <div
                                    class="mt-4 sm:flex sm:justify-between items-center text-start"
                                >
                                    <div class="sm:flex">
                                        <p
                                            class="flex items-center text-sm text-gray-500 font-medium"
                                        >
                                            <span class="margin-inline-end-2">
                                                <svg
                                                    class="h-4 w-4 text-gray-400"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        stroke-linecap="round"
                                                        stroke-linejoin="round"
                                                        stroke-width="2"
                                                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                                    />
                                                </svg>
                                            </span>
                                            {appt.appointment_type} ({appt.duration_minutes}
                                            {$t("common.minutes_short")}) {$t(
                                                "common.doctor",
                                            )}
                                            {appt.doctor_name}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </li>
                    {:else}
                        <li
                            class="px-6 py-24 text-center text-sm font-bold text-gray-400"
                        >
                            <p class="mb-2 text-2xl opacity-20">📅</p>
                            {$t("dashboard.no_appointments", {
                                values: { tab: $t("dashboard.upcoming") },
                            })}
                        </li>
                    {/each}
                </ul>
            </div>
        {/if}

        <!-- PRESCRIPTIONS TAB -->
        {#if activeTab === "prescriptions"}
            <div class="space-y-8">
                <div class="flex justify-between items-center px-4 sm:px-0">
                    <h2 class="text-xl font-bold text-gray-900">
                        {$t("patient_details.prescriptions")}
                    </h2>
                    <button
                        onclick={() =>
                            (showPrescriptionBuilder =
                                !showPrescriptionBuilder)}
                        class="inline-flex items-center px-6 py-2.5 rounded-xl shadow-lg font-bold text-sm transition-all {showPrescriptionBuilder
                            ? 'bg-gray-600 text-white hover:bg-gray-700'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100'}"
                    >
                        {showPrescriptionBuilder
                            ? $t("common.cancel")
                            : "+ " + $t("patient_details.new_prescription")}
                    </button>
                </div>

                {#if showPrescriptionBuilder}
                    <div
                        class="bg-white rounded-3xl shadow-xl border border-gray-100 p-2 overflow-hidden"
                    >
                        <PrescriptionBuilder
                            medications={data.medications}
                            patientId={data.patient.id}
                            doctorId={data.user.id}
                            onPrescriptionCreated={() =>
                                (showPrescriptionBuilder = false)}
                        />
                    </div>
                {/if}

                <div
                    class="bg-white shadow-sm overflow-hidden rounded-3xl border border-gray-100"
                >
                    <table class="min-w-full divide-y divide-gray-100">
                        <thead class="bg-gray-50/50">
                            <tr>
                                <th
                                    class="px-6 py-4 text-inline-start text-[10px] font-bold text-gray-400 uppercase tracking-widest"
                                    >{$t("patient_details.date")}</th
                                >
                                <th
                                    class="px-6 py-4 text-inline-start text-[10px] font-bold text-gray-400 uppercase tracking-widest"
                                    >Type</th
                                >
                                <th
                                    class="px-6 py-4 text-inline-start text-[10px] font-bold text-gray-400 uppercase tracking-widest"
                                    >Médicaments</th
                                >
                                <th
                                    class="px-6 py-4 text-inline-start text-[10px] font-bold text-gray-400 uppercase tracking-widest"
                                    >{$t("patient_details.recorded_by")}</th
                                >
                                <th
                                    class="px-6 py-4 text-inline-start text-[10px] font-bold text-gray-400 uppercase tracking-widest"
                                    >{$t("common.actions")}</th
                                >
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100 bg-white">
                            {#each data.prescriptions as prescription}
                                <tr
                                    class="hover:bg-gray-50/50 transition-colors"
                                >
                                    <td
                                        class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900"
                                    >
                                        <div class="flex flex-col">
                                            <span
                                                >{new Date(
                                                    prescription.prescription_date,
                                                ).toLocaleDateString()}</span
                                            >
                                            <span
                                                class="text-[10px] text-gray-400 font-mono"
                                                >{prescription.prescription_number}</span
                                            >
                                        </div>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <span
                                            class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider {prescription.prescription_type ===
                                            'Urgent'
                                                ? 'bg-red-50 text-red-600'
                                                : prescription.prescription_type ===
                                                    'Chronic'
                                                  ? 'bg-blue-50 text-blue-600'
                                                  : 'bg-gray-50 text-gray-600'}"
                                        >
                                            {prescription.prescription_type}
                                        </span>
                                    </td>
                                    <td
                                        class="px-6 py-4 text-sm text-gray-600 max-w-[200px] truncate font-medium"
                                        title={prescription.meds_summary}
                                    >
                                        <div class="truncate">
                                            {prescription.meds_summary || "---"}
                                        </div>
                                    </td>
                                    <td
                                        class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500"
                                    >
                                        {prescription.doctor_name}
                                    </td>
                                    <td
                                        class="px-6 py-4 whitespace-nowrap text-inline-end"
                                    >
                                        <a
                                            href="/print/prescription/{prescription.id}"
                                            target="_blank"
                                            class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-50 text-indigo-700 text-sm font-bold hover:bg-indigo-100 transition-colors"
                                        >
                                            <svg
                                                class="h-4 w-4"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    stroke-linecap="round"
                                                    stroke-linejoin="round"
                                                    stroke-width="2"
                                                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 012-2H5a2 2 0 012 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                                                />
                                            </svg>
                                            {$t("patient_details.print")}
                                        </a>
                                    </td>
                                </tr>
                            {:else}
                                <tr>
                                    <td
                                        colspan="3"
                                        class="px-6 py-24 text-center text-sm font-bold text-gray-400"
                                    >
                                        <p
                                            class="mb-2 opacity-20 flex justify-center"
                                        >
                                            <svg
                                                class="w-12 h-12 text-gray-400"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    stroke-linecap="round"
                                                    stroke-linejoin="round"
                                                    stroke-width="1.5"
                                                    d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L5.605 15.13a2 2 0 00-1.022.547l-2.387 2.387a2 2 0 000 2.828l.647.646a2 2 0 002.828 0l2.387-2.387a2 2 0 011.022-.547l2.387-.477a6 6 0 013.86-.517l.318-.158a6 6 0 003.86-.517l2.387-.477a2 2 0 011.022.547l2.387 2.387a2 2 0 010 2.828l-.647.646a2 2 0 01-2.828 0l-2.387-2.387z"
                                                />
                                            </svg>
                                        </p>
                                        {$t("patient_details.no_prescriptions")}
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            </div>
        {/if}

        <!-- DOCUMENTS TAB -->
        {#if activeTab === "documents"}
            <div class="space-y-8">
                <!-- Upload Area -->
                <div
                    class="bg-white p-8 rounded-3xl border border-dashed border-gray-300 text-center hover:border-indigo-500 transition-colors group relative"
                >
                    <form
                        method="POST"
                        action="?/uploadAttachment"
                        enctype="multipart/form-data"
                        use:enhance={() => {
                            return async ({ update }) => {
                                await update();
                            };
                        }}
                        class="flex flex-col items-center justify-center gap-4 cursor-pointer"
                    >
                        <div
                            class="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center group-hover:bg-indigo-50 transition-colors"
                        >
                            <svg
                                class="w-8 h-8 text-gray-400 group-hover:text-indigo-600 transition-colors"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                ></path>
                            </svg>
                        </div>
                        <div>
                            <p class="text-lg font-bold text-gray-900">
                                Click to upload or drag and drop
                            </p>
                            <p class="text-sm text-gray-500">
                                SVG, PNG, JPG, PDF up to 10MB
                            </p>
                        </div>
                        <input
                            type="file"
                            name="file"
                            class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onchange={(e) =>
                                e.currentTarget.form?.requestSubmit()}
                            accept=".jpg,.jpeg,.png,.gif,.pdf,.svg,.dcm"
                        />
                    </form>
                </div>

                <!-- Gallery -->
                {#if data.attachments && data.attachments.length > 0}
                    <div
                        class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6"
                    >
                        {#each data.attachments as file}
                            <div
                                class="group relative bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden aspect-square flex flex-col"
                            >
                                <!-- Preview/Thumbnail -->
                                <!-- Preview/Thumbnail -->
                                <div
                                    class="flex-1 w-full flex items-center justify-center bg-gray-50 overflow-hidden relative"
                                >
                                    {#if file.file_type?.startsWith("image/")}
                                        <img
                                            src={file.file_path}
                                            alt={file.file_name}
                                            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    {:else if file.file_name
                                        ?.toLowerCase()
                                        .endsWith(".dcm")}
                                        <div
                                            class="flex flex-col items-center bg-gray-900 w-full h-full justify-center"
                                        >
                                            <div class="relative">
                                                <svg
                                                    class="w-16 h-16 text-indigo-500"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        stroke-linecap="round"
                                                        stroke-linejoin="round"
                                                        stroke-width="1.5"
                                                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                                    ></path>
                                                </svg>
                                                <span
                                                    class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[8px] font-black text-white bg-indigo-600 px-1 rounded"
                                                    >DICOM</span
                                                >
                                            </div>
                                            <span
                                                class="text-[10px] font-bold text-gray-400 mt-2 uppercase tracking-tight"
                                                >Medical Imaging</span
                                            >
                                        </div>
                                    {:else}
                                        <div class="flex flex-col items-center">
                                            <svg
                                                class="w-12 h-12 text-gray-400"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    stroke-linecap="round"
                                                    stroke-linejoin="round"
                                                    stroke-width="2"
                                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                                ></path>
                                            </svg>
                                            <span
                                                class="text-xs font-bold text-gray-500 mt-2 uppercase"
                                                >{file.file_type?.split(
                                                    "/",
                                                )[1] || "FILE"}</span
                                            >
                                        </div>
                                    {/if}

                                    <!-- Clickable Preview Layer (Z-10) -->
                                    <button
                                        type="button"
                                        class="absolute inset-0 w-full h-full cursor-pointer focus:outline-none z-10"
                                        aria-label="Preview file"
                                        onclick={() => {
                                            if (
                                                file.file_type?.startsWith(
                                                    "image/",
                                                )
                                            ) {
                                                previewFile = file;
                                            } else if (
                                                file.file_name
                                                    ?.toLowerCase()
                                                    .endsWith(".dcm")
                                            ) {
                                                openDicom(file);
                                            } else {
                                                window.open(
                                                    file.file_path,
                                                    "_blank",
                                                );
                                            }
                                        }}
                                    ></button>

                                    <!-- Actions Overlay (Z-20) -->
                                    <div
                                        class="absolute inset-0 pointer-events-none z-20 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2"
                                    >
                                        <a
                                            href={file.file_path}
                                            download
                                            class="pointer-events-auto p-2 bg-white rounded-full text-gray-700 hover:text-indigo-600 transition-colors shadow-sm"
                                            title="Download"
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
                                        </a>

                                        <form
                                            method="POST"
                                            action="?/deleteAttachment"
                                            use:enhance
                                            class="pointer-events-auto"
                                        >
                                            <input
                                                type="hidden"
                                                name="id"
                                                value={file.id}
                                            />
                                            <button
                                                type="submit"
                                                class="p-2 bg-white rounded-full text-gray-700 hover:text-red-600 transition-colors shadow-sm"
                                                title="Delete"
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
                                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                    ></path></svg
                                                >
                                            </button>
                                        </form>
                                    </div>
                                </div>

                                <!-- Footer -->
                                <div class="p-3 bg-white relative z-10">
                                    <p
                                        class="text-sm font-bold text-gray-900 truncate"
                                        title={file.file_name}
                                    >
                                        {file.file_name}
                                    </p>
                                    <p class="text-xs text-gray-500 mt-0.5">
                                        {new Date(
                                            file.upload_date,
                                        ).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        {/each}
                    </div>
                {:else}
                    <div class="text-center py-12">
                        <div
                            class="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4"
                        >
                            <svg
                                class="w-8 h-8 text-gray-300"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                ><path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                ></path></svg
                            >
                        </div>
                        <h3 class="text-lg font-bold text-gray-900">
                            No documents yet
                        </h3>
                        <p class="text-gray-500 max-w-sm mx-auto mt-1">
                            Upload X-rays, medical records, or other documents
                            to keep them organized.
                        </p>
                    </div>
                {/if}
            </div>

            <!-- Image Preview Modal -->
            {#if previewFile}
                <div
                    class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                    onclick={() => (previewFile = null)}
                >
                    <div
                        class="relative max-w-5xl max-h-[90vh] w-full bg-transparent flex flex-col items-center"
                        onclick={(e) => e.stopPropagation()}
                    >
                        <img
                            src={previewFile.file_path}
                            alt={previewFile.file_name}
                            class="max-w-full max-h-[85vh] rounded-lg shadow-2xl"
                        />
                        <button
                            class="absolute -top-12 right-0 text-white/70 hover:text-white"
                            onclick={() => (previewFile = null)}
                        >
                            <svg
                                class="w-8 h-8"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                ><path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M6 18L18 6M6 6l12 12"
                                ></path></svg
                            >
                        </button>
                        <div class="mt-4 text-center">
                            <p class="text-white font-bold text-lg">
                                {previewFile.file_name}
                            </p>
                        </div>
                    </div>
                </div>
            {/if}

            <!-- DICOM Viewer Overlay -->
            {#if previewDicom && DicomViewer}
                <DicomViewer
                    fileUrl={previewDicom.file_path}
                    fileName={previewDicom.file_name}
                    onClose={() => (previewDicom = null)}
                />
            {/if}
        {/if}

        <!-- FINANCIAL TAB -->
        {#if activeTab === "financial"}
            <div class="space-y-12">
                <!-- Invoices -->
                <div>
                    <div
                        class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8"
                    >
                        <div>
                            <h2 class="text-xl font-bold text-gray-900">
                                {$t("patient_details.invoices")}
                            </h2>
                        </div>
                        <button
                            onclick={() => (isInvoiceModalOpen = true)}
                            class="bg-indigo-600 text-white px-6 py-2.5 rounded-xl hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-100 transition-all text-sm"
                        >
                            {$t("patient_details.generate_invoice")}
                        </button>
                    </div>

                    <div
                        class="bg-white shadow-sm overflow-hidden rounded-3xl border border-gray-100 font-inter text-start"
                    >
                        <table class="min-w-full divide-y divide-gray-100">
                            <thead class="bg-gray-50/50">
                                <tr>
                                    <th
                                        class="px-6 py-4 text-inline-start text-[10px] font-bold text-gray-400 uppercase tracking-widest"
                                        >{$t("patient_details.invoice_no")}</th
                                    >
                                    <th
                                        class="px-6 py-4 text-inline-start text-[10px] font-bold text-gray-400 uppercase tracking-widest"
                                        >{$t("patient_details.date")}</th
                                    >
                                    <th
                                        class="px-6 py-4 text-inline-start text-[10px] font-bold text-gray-400 uppercase tracking-widest"
                                        >{$t("patient_details.cost")}</th
                                    >
                                    <th
                                        class="px-6 py-4 text-inline-start text-[10px] font-bold text-gray-400 uppercase tracking-widest"
                                        >{$t("common.status")}</th
                                    >
                                    <th
                                        class="px-6 py-4 text-inline-start text-[10px] font-bold text-gray-400 uppercase tracking-widest"
                                        >{$t("common.actions")}</th
                                    >
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-100 bg-white">
                                {#each data.invoices as invoice}
                                    <tr
                                        class="hover:bg-gray-50/50 transition-colors"
                                    >
                                        <td
                                            class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900"
                                            >#{invoice.invoice_number}</td
                                        >
                                        <td
                                            class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500"
                                            >{new Date(
                                                invoice.invoice_date,
                                            ).toLocaleDateString()}</td
                                        >
                                        <td
                                            class="px-6 py-4 whitespace-nowrap text-sm font-black text-gray-900"
                                            >{data.appConfig
                                                .currencySymbol}{invoice.total_amount.toFixed(
                                                2,
                                            )}</td
                                        >
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            <span
                                                class="px-3 py-1 inline-flex text-[10px] leading-5 font-bold rounded-full uppercase tracking-wider
                                                {invoice.status === 'paid'
                                                    ? 'bg-green-100 text-green-700'
                                                    : invoice.status ===
                                                        'cancelled'
                                                      ? 'bg-red-100 text-red-700'
                                                      : 'bg-yellow-100 text-yellow-800'}"
                                            >
                                                {$t(
                                                    `dashboard.status_${invoice.status}`,
                                                )}
                                            </span>
                                        </td>
                                        <td
                                            class="px-6 py-4 whitespace-nowrap text-inline-end text-sm font-bold"
                                        >
                                            <a
                                                href="/print/invoice/{invoice.id}"
                                                target="_blank"
                                                class="text-indigo-600 hover:underline margin-inline-end-4"
                                                >{$t(
                                                    "patient_details.print",
                                                )}</a
                                            >
                                            {#if invoice.status !== "paid"}
                                                <button
                                                    onclick={() => {
                                                        selectedInvoice =
                                                            invoice;
                                                        isPaymentModalOpen = true;
                                                    }}
                                                    class="text-green-600 hover:underline"
                                                >
                                                    {$t("patient_details.pay")}
                                                </button>
                                            {/if}
                                        </td>
                                    </tr>
                                {:else}
                                    <tr>
                                        <td
                                            colspan="5"
                                            class="px-6 py-24 text-center text-sm font-bold text-gray-400"
                                        >
                                            <p
                                                class="mb-2 opacity-20 flex justify-center"
                                            >
                                                <svg
                                                    class="w-12 h-12 text-gray-400"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        stroke-linecap="round"
                                                        stroke-linejoin="round"
                                                        stroke-width="1.5"
                                                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                                    />
                                                </svg>
                                            </p>
                                            {$t("patient_details.no_invoices")}
                                        </td>
                                    </tr>
                                {/each}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Payments Table -->
                <div class="mt-12">
                    <h2 class="text-xl font-bold text-gray-900 mb-8">
                        {$t("patient_details.encaissements")}
                    </h2>
                    <div
                        class="bg-white shadow-sm overflow-hidden rounded-3xl border border-gray-100 text-start"
                    >
                        <table class="min-w-full divide-y divide-gray-100">
                            <thead class="bg-gray-50/50">
                                <tr>
                                    <th
                                        class="px-6 py-4 text-inline-start text-[10px] font-bold text-gray-400 uppercase tracking-widest"
                                        >{$t("patient_details.date")}</th
                                    >
                                    <th
                                        class="px-6 py-4 text-inline-start text-[10px] font-bold text-gray-400 uppercase tracking-widest"
                                        >{$t("patient_details.cost")}</th
                                    >
                                    <th
                                        class="px-6 py-4 text-inline-start text-[10px] font-bold text-gray-400 uppercase tracking-widest"
                                        >{$t("patient_details.method")}</th
                                    >
                                    <th
                                        class="px-6 py-4 text-inline-start text-[10px] font-bold text-gray-400 uppercase tracking-widest"
                                        >{$t("patient_details.recorded_by")}</th
                                    >
                                    <th
                                        class="px-6 py-4 text-inline-start text-[10px] font-bold text-gray-400 uppercase tracking-widest"
                                        >{$t("patient_details.notes")}</th
                                    >
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-100 bg-white">
                                {#each data.payments as payment}
                                    <tr
                                        class="hover:bg-gray-50/50 transition-colors"
                                    >
                                        <td
                                            class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500"
                                            >{payment.payment_date}</td
                                        >
                                        <td
                                            class="px-6 py-4 whitespace-nowrap text-sm font-black text-green-600"
                                            >+{data.appConfig
                                                .currencySymbol}{payment.amount.toFixed(
                                                2,
                                            )}</td
                                        >
                                        <td
                                            class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-700 capitalize"
                                            >{payment.payment_method}</td
                                        >
                                        <td
                                            class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500"
                                            >{payment.recorded_by_name}</td
                                        >
                                        <td
                                            class="px-6 py-4 text-sm text-gray-500 font-medium"
                                            >{payment.notes || "-"}</td
                                        >
                                    </tr>
                                {:else}
                                    <tr>
                                        <td
                                            colspan="5"
                                            class="px-6 py-24 text-center text-sm font-bold text-gray-400"
                                        >
                                            <p class="mb-2 text-2xl opacity-20">
                                                💰
                                            </p>
                                            {$t("patient_details.no_payments")}
                                        </td>
                                    </tr>
                                {/each}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        {/if}
    </main>

    <!-- Invoice Modal -->
    {#if isInvoiceModalOpen}
        <div class="relative z-50" role="dialog" aria-modal="true">
            <div
                class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"
                aria-hidden="true"
                onclick={() => (isInvoiceModalOpen = false)}
            ></div>
            <div class="fixed inset-0 z-50 w-screen overflow-y-auto">
                <div class="flex min-h-full items-center justify-center p-4">
                    <div
                        class="relative w-full max-w-2xl transform overflow-hidden rounded-3xl bg-white shadow-2xl transition-all"
                    >
                        <form
                            method="POST"
                            action="?/createInvoice"
                            use:enhance={() => {
                                return async ({ result, update }) => {
                                    if (result.type === "success") {
                                        isInvoiceModalOpen = false;
                                        selectedTreatmentsForInvoice = [];
                                    }
                                    await update();
                                };
                            }}
                        >
                            <div class="px-8 pt-8 pb-6">
                                <h3
                                    class="text-2xl font-black text-gray-900 mb-2"
                                >
                                    {$t("patient_details.generate_invoice")}
                                </h3>
                                <p class="text-sm text-gray-500 font-medium">
                                    {$t(
                                        "patient_details.select_treatments_invoice",
                                    )}
                                </p>
                            </div>

                            <div class="px-8 py-2">
                                <div
                                    class="max-h-80 overflow-y-auto border border-gray-100 rounded-2xl overflow-hidden"
                                >
                                    <table
                                        class="min-w-full divide-y divide-gray-100"
                                    >
                                        <thead class="bg-gray-50/50">
                                            <tr>
                                                <th
                                                    class="px-6 py-3 text-inline-start text-[10px] font-bold text-gray-400 uppercase tracking-widest w-12"
                                                ></th>
                                                <th
                                                    class="px-6 py-3 text-inline-start text-[10px] font-bold text-gray-400 uppercase tracking-widest"
                                                    >{$t(
                                                        "patient_details.type",
                                                    )}</th
                                                >
                                                <th
                                                    class="px-6 py-3 text-inline-end text-[10px] font-bold text-gray-400 uppercase tracking-widest"
                                                    >{$t(
                                                        "patient_details.cost",
                                                    )}</th
                                                >
                                            </tr>
                                        </thead>
                                        <tbody
                                            class="divide-y divide-gray-100 bg-white"
                                        >
                                            {#each data.treatments as treatment}
                                                <tr
                                                    class="hover:bg-gray-50/50 transition-colors"
                                                >
                                                    <td class="px-6 py-4">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedTreatmentsForInvoice.includes(
                                                                treatment.id,
                                                            )}
                                                            onchange={(e) => {
                                                                if (
                                                                    e
                                                                        .currentTarget
                                                                        .checked
                                                                ) {
                                                                    selectedTreatmentsForInvoice.push(
                                                                        treatment.id,
                                                                    );
                                                                } else {
                                                                    selectedTreatmentsForInvoice =
                                                                        selectedTreatmentsForInvoice.filter(
                                                                            (
                                                                                id,
                                                                            ) =>
                                                                                id !==
                                                                                treatment.id,
                                                                        );
                                                                }
                                                            }}
                                                            class="h-5 w-5 rounded-lg border-gray-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
                                                        />
                                                    </td>
                                                    <td
                                                        class="px-6 py-4 text-sm font-bold text-gray-900"
                                                    >
                                                        <div>
                                                            {treatment.treatment_type}
                                                        </div>
                                                        <div
                                                            class="text-[10px] text-gray-400 font-medium"
                                                        >
                                                            {treatment.treatment_date}
                                                        </div>
                                                    </td>
                                                    <td
                                                        class="px-6 py-4 text-sm font-black text-gray-900 text-inline-end"
                                                        >{data.appConfig
                                                            .currencySymbol}{treatment.cost.toFixed(
                                                            2,
                                                        )}</td
                                                    >
                                                </tr>
                                            {/each}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <input
                                type="hidden"
                                name="items"
                                value={JSON.stringify(
                                    data.treatments
                                        .filter((t) =>
                                            selectedTreatmentsForInvoice.includes(
                                                t.id,
                                            ),
                                        )
                                        .map((t) => ({
                                            treatment_id: t.id,
                                            description: t.treatment_type,
                                            amount: t.cost,
                                        })),
                                )}
                            />

                            <div
                                class="px-8 py-6 bg-gray-50/50 mt-4 flex flex-col gap-6"
                            >
                                <div
                                    class="flex justify-between items-center px-2"
                                >
                                    <span
                                        class="text-sm font-bold text-gray-500 uppercase tracking-wider"
                                        >{$t(
                                            "patient_details.total_selected",
                                        )}</span
                                    >
                                    <span
                                        class="text-2xl font-black text-indigo-600"
                                    >
                                        {data.appConfig
                                            .currencySymbol}{data.treatments
                                            .filter((t) =>
                                                selectedTreatmentsForInvoice.includes(
                                                    t.id,
                                                ),
                                            )
                                            .reduce((sum, t) => sum + t.cost, 0)
                                            .toFixed(2)}
                                    </span>
                                </div>
                                <div class="flex flex-row-reverse gap-3">
                                    <button
                                        type="submit"
                                        disabled={selectedTreatmentsForInvoice.length ===
                                            0}
                                        class="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all disabled:opacity-50 disabled:shadow-none"
                                    >
                                        {$t("patient_details.generate_invoice")}
                                    </button>
                                    <button
                                        type="button"
                                        class="flex-1 bg-white text-gray-700 px-6 py-3 rounded-2xl font-bold border border-gray-200 hover:bg-gray-50 transition-all"
                                        onclick={() =>
                                            (isInvoiceModalOpen = false)}
                                    >
                                        {$t("common.cancel")}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    {/if}

    <!-- Edit Profile Modal -->
    {#if isEditModalOpen}
        <div class="relative z-50" role="dialog" aria-modal="true">
            <div
                class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"
                aria-hidden="true"
                onclick={() => (isEditModalOpen = false)}
            ></div>
            <div class="fixed inset-0 z-50 w-screen overflow-y-auto">
                <div class="flex min-h-full items-center justify-center p-4">
                    <div
                        class="relative w-full max-w-4xl transform overflow-hidden rounded-3xl bg-white shadow-2xl transition-all"
                    >
                        <form
                            method="POST"
                            action="?/updatePatient"
                            use:enhance={() => {
                                return async ({ result, update }) => {
                                    if (result.type === "success")
                                        isEditModalOpen = false;
                                    await update();
                                };
                            }}
                        >
                            <div
                                class="bg-white px-8 py-8 max-h-[90vh] overflow-y-auto custom-scrollbar"
                            >
                                <h3
                                    class="text-2xl font-black text-gray-900 mb-8 border-b border-gray-100 pb-4"
                                >
                                    {$t("patient_details.edit_profile")}
                                </h3>

                                <div
                                    class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 text-start"
                                >
                                    <!-- Personal Information -->
                                    <div class="col-span-2">
                                        <h4
                                            class="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-4"
                                        >
                                            {$t("patients.personal_info")}
                                        </h4>
                                    </div>
                                    <div class="col-span-2 md:col-span-1">
                                        <label
                                            class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2"
                                            >{$t("patients.full_name")} *</label
                                        >
                                        <input
                                            type="text"
                                            name="full_name"
                                            value={data.patient.full_name}
                                            required
                                            class="block w-full rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium py-3 px-4 border"
                                        />
                                    </div>
                                    <div class="col-span-2 md:col-span-1">
                                        <label
                                            class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2"
                                            >{$t("patients.date_of_birth")} *</label
                                        >
                                        <input
                                            type="date"
                                            name="date_of_birth"
                                            value={data.patient.date_of_birth}
                                            required
                                            max={new Date()
                                                .toISOString()
                                                .split("T")[0]}
                                            class="block w-full rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium py-3 px-4 border font-inter"
                                        />
                                    </div>
                                    <div class="col-span-2 md:col-span-1">
                                        <label
                                            class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2"
                                            >{$t("patients.gender")}</label
                                        >
                                        <select
                                            name="gender"
                                            value={data.patient.gender || ""}
                                            class="block w-full rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium py-3 px-4 border"
                                        >
                                            <option value=""
                                                >{$t(
                                                    "common.select",
                                                )}...</option
                                            >
                                            <option value="Male"
                                                >{$t("patients.male")}</option
                                            >
                                            <option value="Female"
                                                >{$t("patients.female")}</option
                                            >
                                            <option value="Other"
                                                >{$t("patients.other")}</option
                                            >
                                            <option value="Prefer not to say"
                                                >{$t(
                                                    "patients.prefer_not_to_say",
                                                )}</option
                                            >
                                        </select>
                                    </div>
                                    <div class="col-span-2 md:col-span-1">
                                        <label
                                            class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2"
                                            >{$t(
                                                "patient_details.blood_type",
                                            )}</label
                                        >
                                        <input
                                            type="text"
                                            name="blood_type"
                                            value={data.patient.blood_type ||
                                                ""}
                                            placeholder="e.g., A+, O-"
                                            class="block w-full rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium py-3 px-4 border font-inter"
                                        />
                                    </div>

                                    <!-- Contact Information -->
                                    <div class="col-span-2 mt-6">
                                        <h4
                                            class="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-4"
                                        >
                                            {$t("patients.contact_info")}
                                        </h4>
                                    </div>
                                    <div class="col-span-2 md:col-span-1">
                                        <label
                                            class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2"
                                            >{$t("patients.phone")}</label
                                        >
                                        <input
                                            type="tel"
                                            name="phone"
                                            value={data.patient.phone || ""}
                                            class="block w-full rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium py-3 px-4 border font-inter"
                                        />
                                    </div>
                                    <div class="col-span-2 md:col-span-1">
                                        <label
                                            class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2"
                                            >{$t("common.email")}</label
                                        >
                                        <input
                                            type="email"
                                            name="email"
                                            value={data.patient.email || ""}
                                            class="block w-full rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium py-3 px-4 border font-inter"
                                        />
                                    </div>
                                    <div class="col-span-2">
                                        <label
                                            class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2"
                                            >{$t("patients.address")}</label
                                        >
                                        <input
                                            type="text"
                                            name="address"
                                            value={data.patient.address || ""}
                                            class="block w-full rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium py-3 px-4 border"
                                        />
                                    </div>
                                    <div class="col-span-2 md:col-span-1">
                                        <label
                                            class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2"
                                            >{$t("patients.city")}</label
                                        >
                                        <input
                                            type="text"
                                            name="city"
                                            value={data.patient.city || ""}
                                            class="block w-full rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium py-3 px-4 border"
                                        />
                                    </div>
                                    <div class="col-span-2 md:col-span-1">
                                        <label
                                            class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2"
                                            >{$t("patients.postal_code")}</label
                                        >
                                        <input
                                            type="text"
                                            name="postal_code"
                                            value={data.patient.postal_code ||
                                                ""}
                                            class="block w-full rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium py-3 px-4 border font-inter"
                                        />
                                    </div>

                                    <!-- Medical & Dental Info -->
                                    <div class="col-span-2 mt-6">
                                        <h4
                                            class="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-4"
                                        >
                                            {$t(
                                                "patient_details.medical_history",
                                            )} & {$t(
                                                "patient_details.dental_info",
                                            )}
                                        </h4>
                                    </div>
                                    <div class="col-span-2">
                                        <label
                                            class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2"
                                            >{$t(
                                                "patient_details.allergies",
                                            )}</label
                                        >
                                        <textarea
                                            name="allergies"
                                            rows="2"
                                            class="block w-full rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium py-3 px-4 border"
                                            >{data.patient.allergies ||
                                                ""}</textarea
                                        >
                                    </div>
                                    <div class="col-span-2">
                                        <label
                                            class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2"
                                            >{$t(
                                                "patient_details.medical_conditions",
                                            )}</label
                                        >
                                        <textarea
                                            name="medical_conditions"
                                            rows="2"
                                            class="block w-full rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium py-3 px-4 border"
                                            >{data.patient.medical_conditions ||
                                                ""}</textarea
                                        >
                                    </div>
                                    <div class="col-span-2">
                                        <label
                                            class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2"
                                            >{$t(
                                                "patient_details.dental_notes",
                                            )}</label
                                        >
                                        <textarea
                                            name="dental_notes"
                                            rows="3"
                                            class="block w-full rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium py-3 px-4 border"
                                            >{data.patient.dental_notes ||
                                                ""}</textarea
                                        >
                                    </div>
                                </div>
                            </div>
                            <div
                                class="px-8 py-6 bg-gray-50 border-t border-gray-100 flex flex-row-reverse gap-4"
                            >
                                <button
                                    type="submit"
                                    class="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
                                >
                                    {$t("common.save")}
                                </button>
                                <button
                                    type="button"
                                    class="bg-white text-gray-700 px-8 py-3 rounded-2xl font-bold border border-gray-200 hover:bg-gray-50 transition-all"
                                    onclick={() => (isEditModalOpen = false)}
                                >
                                    {$t("common.cancel")}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    {/if}

    <!-- Add Treatment Modal -->
    {#if isTreatmentModalOpen}
        <div class="relative z-50" role="dialog" aria-modal="true">
            <div
                class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"
                aria-hidden="true"
                onclick={() => (isTreatmentModalOpen = false)}
            ></div>
            <div class="fixed inset-0 z-50 w-screen overflow-y-auto">
                <div class="flex min-h-full items-center justify-center p-4">
                    <div
                        class="relative w-full max-w-6xl transform overflow-hidden rounded-3xl bg-white shadow-2xl transition-all"
                    >
                        <form
                            method="POST"
                            action="?/addTreatment"
                            use:enhance={() => {
                                formError = null;
                                formSuccess = null;
                                return async ({ result, update }) => {
                                    if (result.type === "success") {
                                        formSuccess =
                                            "Treatment added successfully!";
                                        setTimeout(() => {
                                            isTreatmentModalOpen = false;
                                            formSuccess = null;
                                        }, 1500);
                                    } else if (
                                        result.type === "failure" ||
                                        result.type === "error"
                                    ) {
                                        formError =
                                            (result.data as any)?.error ||
                                            "An unexpected error occurred.";
                                    }
                                    await update();
                                };
                            }}
                        >
                            <div
                                class="px-8 pt-8 pb-6 border-b border-gray-100"
                            >
                                <h3
                                    class="text-2xl font-black text-gray-900 mb-2"
                                >
                                    {$t("patient_details.add_treatment")}
                                </h3>
                                <p class="text-sm text-gray-500 font-medium">
                                    {$t("patient_details.add_treatment_desc")}
                                </p>
                            </div>

                            <div
                                class="px-8 py-8 max-h-[70vh] overflow-y-auto custom-scrollbar text-start"
                            >
                                {#if formError}
                                    <div
                                        class="mb-6 p-4 bg-red-50 border border-red-100 text-red-700 rounded-2xl text-sm font-bold flex items-center gap-3"
                                    >
                                        <span class="text-lg">⚠️</span>
                                        {formError}
                                    </div>
                                {/if}
                                {#if formSuccess}
                                    <div
                                        class="mb-6 p-4 bg-green-50 border border-green-100 text-green-700 rounded-2xl text-sm font-bold flex items-center gap-3"
                                    >
                                        <span class="text-lg">✓</span>
                                        {formSuccess}
                                    </div>
                                {/if}

                                <div
                                    class="grid grid-cols-1 md:grid-cols-2 gap-6"
                                >
                                    <div class="col-span-2 md:col-span-1">
                                        <label
                                            class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2"
                                            >{$t("patient_details.date")}</label
                                        >
                                        <input
                                            type="date"
                                            name="treatment_date"
                                            value={new Date()
                                                .toISOString()
                                                .split("T")[0]}
                                            required
                                            class="block w-full rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium py-3 px-4 border font-inter"
                                        />
                                    </div>
                                    <div class="col-span-2 md:col-span-1">
                                        <label
                                            class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2"
                                            >{$t("patient_details.type")}</label
                                        >
                                        <select
                                            name="treatment_type"
                                            required
                                            class="block w-full rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium py-3 px-4 border"
                                        >
                                            {#each data.treatmentTypes as type}
                                                <option value={type.name}
                                                    >{$t(
                                                        `patient_details.${type.name}`,
                                                        { default: type.name },
                                                    )}</option
                                                >
                                            {/each}
                                        </select>
                                    </div>
                                    <div class="col-span-2 md:col-span-1">
                                        <label
                                            class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2"
                                            >{$t("patient_details.tooth")} #</label
                                        >
                                        <input
                                            type="text"
                                            name="tooth_number"
                                            value={selectedTeeth.join(", ")}
                                            placeholder="Select from below..."
                                            class="block w-full rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium py-3 px-4 border font-inter"
                                        />
                                    </div>
                                    <div class="col-span-2 md:col-span-1">
                                        <label
                                            class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2"
                                            >{$t("patient_details.cost")} ({data
                                                .appConfig
                                                .currencySymbol})</label
                                        >
                                        <input
                                            type="number"
                                            step="0.01"
                                            name="cost"
                                            required
                                            placeholder="0.00"
                                            class="block w-full rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium py-3 px-4 border font-inter"
                                        />
                                    </div>
                                    <div class="col-span-2">
                                        <label
                                            class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2"
                                            >{$t(
                                                "patient_details.visual_tooth_selector",
                                            )}</label
                                        >
                                        <div
                                            class="bg-gray-50/50 rounded-2xl p-6 border border-gray-100"
                                        >
                                            <ToothSelector
                                                {selectedTeeth}
                                                onToggle={toggleTooth}
                                            />
                                        </div>
                                    </div>
                                    <div class="col-span-2">
                                        <label
                                            class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2"
                                            >{$t(
                                                "patient_details.description",
                                            )}</label
                                        >
                                        <input
                                            type="text"
                                            name="description"
                                            placeholder={$t(
                                                "patient_details.short_description",
                                            )}
                                            class="block w-full rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium py-3 px-4 border"
                                        />
                                    </div>
                                    <div class="col-span-2">
                                        <label
                                            class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2"
                                            >{$t(
                                                "doctor_dashboard.clinical_notes",
                                            )}</label
                                        >
                                        <textarea
                                            name="treatment_notes"
                                            rows="3"
                                            placeholder={$t(
                                                "doctor_dashboard.clinical_notes_placeholder",
                                            )}
                                            class="block w-full rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium py-3 px-4 border"
                                        ></textarea>
                                    </div>
                                </div>
                            </div>

                            <div
                                class="px-8 py-6 bg-gray-50 border-t border-gray-100 flex flex-row-reverse gap-4"
                            >
                                <button
                                    type="submit"
                                    class="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
                                >
                                    Ajouter Acte Général
                                </button>
                                <button
                                    type="button"
                                    class="bg-white text-gray-700 px-8 py-3 rounded-2xl font-bold border border-gray-200 hover:bg-gray-50 transition-all"
                                    onclick={() =>
                                        (isTreatmentModalOpen = false)}
                                >
                                    {$t("common.cancel")}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    {/if}
    <!-- Payment Modal -->
    {#if isPaymentModalOpen && selectedInvoice}
        <div class="relative z-50" role="dialog" aria-modal="true">
            <div
                class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"
                aria-hidden="true"
                onclick={() => (isPaymentModalOpen = false)}
            ></div>
            <div class="fixed inset-0 z-50 w-screen overflow-y-auto">
                <div class="flex min-h-full items-center justify-center p-4">
                    <div
                        class="relative w-full max-w-md transform overflow-hidden rounded-3xl bg-white shadow-2xl transition-all"
                    >
                        <form
                            method="POST"
                            action="?/recordPayment"
                            use:enhance={() => {
                                return async ({ result, update }) => {
                                    if (result.type === "success")
                                        isPaymentModalOpen = false;
                                    await update();
                                };
                            }}
                        >
                            <div
                                class="px-8 pt-8 pb-6 border-b border-gray-100"
                            >
                                <h3
                                    class="text-2xl font-black text-gray-900 mb-2"
                                >
                                    {$t("patient_details.record_payment")}
                                </h3>
                                <p class="text-sm text-gray-500 font-medium">
                                    {$t("patient_details.invoice_no")}: {selectedInvoice.invoice_number}
                                </p>
                            </div>

                            <div class="px-8 py-8 text-start space-y-6">
                                <input
                                    type="hidden"
                                    name="invoice_id"
                                    value={selectedInvoice.id}
                                />

                                <div>
                                    <label
                                        class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2"
                                        >{$t(
                                            "patient_details.payment_amount",
                                        )}</label
                                    >
                                    <div
                                        class="relative rounded-xl border border-gray-200 bg-gray-50/50 shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all"
                                    >
                                        <div
                                            class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"
                                        >
                                            <span
                                                class="text-gray-500 font-bold"
                                                >{data.appConfig
                                                    .currencySymbol}</span
                                            >
                                        </div>
                                        <input
                                            type="number"
                                            step="0.01"
                                            name="amount"
                                            value={selectedInvoice.total_amount}
                                            required
                                            class="block w-full pl-8 pr-4 py-4 bg-transparent border-none focus:ring-0 font-black text-lg text-gray-900 font-inter"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label
                                        class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2"
                                        >{$t("patient_details.method")}</label
                                    >
                                    <select
                                        name="payment_method"
                                        class="block w-full rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-bold py-4 px-4 border"
                                    >
                                        <option value="cash"
                                            >{$t(
                                                "patient_details.cash",
                                            )}</option
                                        >
                                        <option value="card"
                                            >{$t(
                                                "patient_details.card",
                                            )}</option
                                        >
                                        <option value="check"
                                            >{$t(
                                                "patient_details.check",
                                            )}</option
                                        >
                                        <option value="bank_transfer"
                                            >{$t(
                                                "patient_details.bank_transfer",
                                            )}</option
                                        >
                                    </select>
                                </div>
                            </div>

                            <div
                                class="px-8 py-6 bg-gray-50 border-t border-gray-100 flex flex-row-reverse gap-4"
                            >
                                <button
                                    type="submit"
                                    class="bg-green-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-green-700 shadow-lg shadow-green-100 transition-all w-full"
                                >
                                    {$t("patient_details.confirm_payment")}
                                </button>
                                <button
                                    type="button"
                                    class="bg-white text-gray-700 px-8 py-3 rounded-2xl font-bold border border-gray-200 hover:bg-gray-50 transition-all w-full"
                                    onclick={() => (isPaymentModalOpen = false)}
                                >
                                    {$t("common.cancel")}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    {/if}

    <!-- Tooth Update Modal -->
    {#if isToothModalOpen && selectedTooth}
        <div class="relative z-50" role="dialog" aria-modal="true">
            <div
                class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"
                aria-hidden="true"
                onclick={() => (isToothModalOpen = false)}
            ></div>
            <div class="fixed inset-0 z-50 w-screen overflow-y-auto">
                <div class="flex min-h-full items-center justify-center p-4">
                    <div
                        class="relative w-full max-w-md transform overflow-hidden rounded-3xl bg-white shadow-2xl transition-all"
                    >
                        <form
                            method="POST"
                            action="?/updateDentalChart"
                            use:enhance={() => {
                                return async ({ result, update }) => {
                                    if (result.type === "success")
                                        isToothModalOpen = false;
                                    await update();
                                };
                            }}
                        >
                            <div
                                class="px-8 pt-8 pb-6 border-b border-gray-100"
                            >
                                <h3
                                    class="text-2xl font-black text-gray-900 mb-2"
                                >
                                    {$t("patient_details.edit_tooth")} #{selectedTooth}
                                </h3>
                            </div>

                            <div class="px-8 py-8 text-start space-y-6">
                                <input
                                    type="hidden"
                                    name="tooth_number"
                                    value={selectedTooth}
                                />

                                <div>
                                    <label
                                        class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2"
                                        >{$t("patient_details.treatments")} ({$t(
                                            "patient_details.comma_separated",
                                        )})</label
                                    >
                                    <input
                                        type="text"
                                        name="treatments"
                                        value={toothForm.treatments}
                                        class="block w-full rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium py-3 px-4 border"
                                        placeholder="e.g., Filling, Crown"
                                    />
                                </div>

                                <div>
                                    <label
                                        class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2"
                                        >{$t(
                                            "patient_details.display_color",
                                        )}</label
                                    >
                                    <div class="flex gap-4 mt-2">
                                        {#each ["#ffffff", "#ef4444", "#3b82f6", "#10b981", "#f59e0b"] as c}
                                            <button
                                                type="button"
                                                onclick={() =>
                                                    (toothForm.color = c)}
                                                class="w-10 h-10 rounded-full border-4 transition-all hover:scale-110 {toothForm.color ===
                                                c
                                                    ? 'border-indigo-500 scale-110'
                                                    : 'border-gray-50'}"
                                                style="background-color: {c}"
                                            ></button>
                                        {/each}
                                    </div>
                                    <input
                                        type="hidden"
                                        name="color"
                                        value={toothForm.color}
                                    />
                                </div>

                                <div>
                                    <label
                                        class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2"
                                        >{$t(
                                            "patient_details.odontogram_notes",
                                        )}</label
                                    >
                                    <textarea
                                        name="notes"
                                        rows="3"
                                        class="block w-full rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium py-3 px-4 border"
                                        placeholder={$t(
                                            "patient_details.internal_notes_placeholder",
                                        )}>{toothForm.notes}</textarea
                                    >
                                </div>
                            </div>

                            <div
                                class="px-8 py-6 bg-gray-50 border-t border-gray-100 flex flex-row-reverse gap-4"
                            >
                                <button
                                    type="submit"
                                    class="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all w-full"
                                >
                                    {$t("common.save")}
                                </button>
                                <button
                                    type="button"
                                    class="bg-white text-gray-700 px-8 py-3 rounded-2xl font-bold border border-gray-200 hover:bg-gray-50 transition-all w-full"
                                    onclick={() => (isToothModalOpen = false)}
                                >
                                    {$t("common.cancel")}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    {/if}
</div>
