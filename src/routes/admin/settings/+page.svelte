<script lang="ts">
    import { enhance } from "$app/forms";
    import { onMount } from "svelte";
    import type { ActionData, PageData } from "./$types";
    import { t } from "svelte-i18n";

    let { data, form }: { data: PageData; form: ActionData } = $props();

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
            settings = resData.settings;
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

    // Treatment Type helper
    async function deleteTreatmentType(id: number) {
        if (confirm($t("admin.settings.treatment_types.confirm_delete"))) {
            const formData = new FormData();
            formData.append("id", id.toString());

            const response = await fetch("?/deleteTreatmentType", {
                method: "POST",
                body: formData,
            });

            if (response.ok) {
                window.location.reload();
            }
        }
    }

    // Local state for financial fields
    let currency = $state(data.config.currency);
    let currencySymbol = $state(data.config.currencySymbol);
    let bookingMode = $state(data.config.bookingMode);

    onMount(() => {
        loadClinicSettings();
    });

    // Sync if data changes
    $effect(() => {
        if (data.config) {
            currency = data.config.currency;
            currencySymbol = data.config.currencySymbol;
            bookingMode = data.config.bookingMode;
        }
    });
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
                <div class="p-8">
                    <div class="space-y-6">
                        <div>
                            <label
                                class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1"
                                >Clinic Name</label
                            >
                            <input
                                type="text"
                                bind:value={settings.clinic_name}
                                class="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all text-gray-900 font-medium"
                            />
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label
                                    class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1"
                                    >Booking Interval</label
                                >
                                <select
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
                                    >Work Start Time</label
                                >
                                <input
                                    type="time"
                                    bind:value={settings.work_start_time}
                                    class="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all text-gray-900 font-medium font-mono"
                                />
                            </div>

                            <div>
                                <label
                                    class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1"
                                    >Work End Time</label
                                >
                                <input
                                    type="time"
                                    bind:value={settings.work_end_time}
                                    class="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all text-gray-900 font-medium font-mono"
                                />
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

        <!-- Financial Settings (Preserved from old page) -->
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
                                class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1"
                                >{$t(
                                    "admin.settings.financial.currencyCode",
                                )}</label
                            >
                            <input
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
                                class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1"
                                >{$t(
                                    "admin.settings.financial.currencySymbol",
                                )}</label
                            >
                            <input
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
                                class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1"
                                >{$t("admin.settings.booking.mode")}</label
                            >
                            <select
                                name="bookingMode"
                                bind:value={bookingMode}
                                class="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all text-gray-900 font-medium"
                            >
                                <option value="freeform"
                                    >{$t(
                                        "admin.settings.booking.freeform",
                                    )}</option
                                >
                                <option value="availability"
                                    >{$t(
                                        "admin.settings.booking.availability",
                                    )}</option
                                >
                            </select>
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

        <!-- Treatment Types (Preserved from old page) -->
        <div
            class="bg-white shadow-xl shadow-gray-200/50 rounded-3xl overflow-hidden border border-gray-100 mb-20"
        >
            <div
                class="px-8 py-6 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center"
            >
                <h2
                    class="text-xl font-bold text-gray-900 flex items-center gap-2"
                >
                    <span>💊</span>
                    {$t("admin.settings.treatment_types.title")}
                </h2>
                <button
                    onclick={() => {
                        editingTreatmentType = null;
                        isCreatingTreatmentType = true;
                    }}
                    class="px-5 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 font-bold rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-indigo-100"
                >
                    <span>+</span>
                    {$t("admin.settings.treatment_types.add_button")}
                </button>
            </div>
            <div class="p-8">
                <div
                    class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                    {#each data.treatmentTypes as any[] as treatmentType (treatmentType.id)}
                        <div
                            class="group relative p-6 bg-white border border-gray-100 rounded-3xl hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5 transition-all"
                        >
                            <h4 class="font-black text-gray-900 text-lg mb-2">
                                {treatmentType.name}
                            </h4>
                            {#if treatmentType.description}
                                <p
                                    class="text-sm text-gray-500 font-medium line-clamp-2"
                                >
                                    {treatmentType.description}
                                </p>
                            {/if}
                            <div
                                class="mt-6 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all"
                            >
                                <button
                                    onclick={() => {
                                        editingTreatmentType = treatmentType;
                                        isEditingTreatmentType = true;
                                    }}
                                    class="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg font-bold text-xs uppercase tracking-tighter"
                                >
                                    {$t("common.edit")}
                                </button>
                                <button
                                    onclick={() =>
                                        deleteTreatmentType(treatmentType.id)}
                                    class="p-2 text-red-600 hover:bg-red-50 rounded-lg font-bold text-xs uppercase tracking-tighter"
                                >
                                    {$t("common.delete")}
                                </button>
                            </div>
                        </div>
                    {/each}
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
                        >Closure Date</label
                    >
                    <input
                        type="date"
                        bind:value={newClosure.closure_date}
                        class="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all text-gray-900 font-medium"
                    />
                </div>

                <div>
                    <label
                        class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1"
                        >Reason</label
                    >
                    <input
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

<!-- Create/Edit Treatment Type Modal -->
{#if isCreatingTreatmentType || isEditingTreatmentType}
    <div
        class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
    >
        <div
            class="bg-white rounded-[2rem] shadow-2xl p-8 w-full max-w-md border border-gray-100 animate-in fade-in zoom-in duration-200"
        >
            <h3
                class="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3"
            >
                <span class="p-3 bg-indigo-50 rounded-2xl text-xl">💊</span>
                {isEditingTreatmentType
                    ? $t("admin.settings.treatment_types.edit_title")
                    : $t("admin.settings.treatment_types.create_title")}
            </h3>

            <form
                method="POST"
                action={isEditingTreatmentType
                    ? "?/updateTreatmentType"
                    : "?/createTreatmentType"}
                use:enhance={() => {
                    isCreatingTreatmentType = false;
                    isEditingTreatmentType = false;
                    editingTreatmentType = null;
                    return async ({ update, result }) => {
                        if (result.type === "success") {
                            await update({ reset: false });
                        }
                    };
                }}
                class="space-y-6"
            >
                {#if isEditingTreatmentType}
                    <input
                        type="hidden"
                        name="id"
                        value={editingTreatmentType.id}
                    />
                {/if}

                <div>
                    <label
                        class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1"
                        >{$t(
                            "admin.settings.treatment_types.name_label",
                        )}</label
                    >
                    <input
                        type="text"
                        name="name"
                        value={editingTreatmentType?.name || ""}
                        required
                        class="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all text-gray-900 font-medium"
                    />
                </div>

                <div>
                    <label
                        class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1"
                        >{$t(
                            "admin.settings.treatment_types.description_label",
                        )}</label
                    >
                    <textarea
                        name="description"
                        rows="3"
                        value={editingTreatmentType?.description || ""}
                        class="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all text-gray-900 font-medium"
                        placeholder={$t(
                            "admin.settings.treatment_types.description_placeholder",
                        )}
                    ></textarea>
                </div>

                <div class="flex gap-4 mt-10">
                    <button
                        type="button"
                        onclick={() => {
                            isCreatingTreatmentType = false;
                            isEditingTreatmentType = false;
                            editingTreatmentType = null;
                        }}
                        class="flex-1 py-4 bg-gray-50 hover:bg-gray-100 text-gray-500 font-bold rounded-2xl transition-all active:scale-95"
                    >
                        {$t("common.cancel")}
                    </button>
                    <button
                        type="submit"
                        class="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-200 active:scale-95"
                    >
                        {isEditingTreatmentType
                            ? $t("common.save")
                            : $t("common.add")}
                    </button>
                </div>
            </form>
        </div>
    </div>
{/if}
