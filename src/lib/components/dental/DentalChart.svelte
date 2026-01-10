<script lang="ts">
    import { onMount } from "svelte";
    import ToothSVG from "./ToothSVG.svelte";
    import {
        ADULT_TEETH_UNIVERSAL,
        PEDIATRIC_TEETH_UNIVERSAL,
        calculateAge,
        getDefaultDentitionType,
        TREATMENT_TYPES,
        SURFACES,
    } from "$lib/dental/tooth-data";
    import { t } from "svelte-i18n";

    interface Props {
        patientId: number;
        patientAge: number;
        readOnly?: boolean;
    }

    let { patientId, patientAge, readOnly = false }: Props = $props();

    let dentitionType = $state<"adult" | "pediatric" | "mixed">("adult");
    let selectedTooth = $state<string | number | null>(null);
    let treatments = $state<any[]>([]);
    let loading = $state(true);
    let showTreatmentModal = $state(false);

    // New treatment form
    let newTreatment = $state({
        surface: "",
        treatment_type: "",
        status: "planned" as "existing" | "completed" | "planned",
        notes: "",
    });

    // Determine initial dentition type
    onMount(async () => {
        dentitionType = getDefaultDentitionType(patientAge);
        await loadTreatments();
    });

    async function loadTreatments() {
        loading = true;
        try {
            const res = await fetch(
                `/api/dental/treatments?patientId=${patientId}`,
            );
            const data = await res.json();
            treatments = data.treatments || [];
        } catch (e) {
            console.error("Failed to load treatments:", e);
        } finally {
            loading = false;
        }
    }

    function getTeethList() {
        if (dentitionType === "adult") return ADULT_TEETH_UNIVERSAL;
        if (dentitionType === "pediatric") return PEDIATRIC_TEETH_UNIVERSAL;
        // Mixed: show both
        return [...PEDIATRIC_TEETH_UNIVERSAL, ...ADULT_TEETH_UNIVERSAL];
    }

    function getTreatmentsForTooth(toothNumber: string | number) {
        return treatments.filter(
            (t) => t.tooth_number === toothNumber.toString(),
        );
    }

    function handleToothClick(tooth: string | number) {
        if (readOnly) return;
        selectedTooth = tooth;
        showTreatmentModal = true;
    }

    async function saveTreatment() {
        if (!selectedTooth || !newTreatment.treatment_type) return;

        const treatmentColor =
            TREATMENT_TYPES.find((t) => t.id === newTreatment.treatment_type)
                ?.color || "#000000";

        try {
            await fetch("/api/dental/treatments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    patient_id: patientId,
                    tooth_number: selectedTooth.toString(),
                    surface: newTreatment.surface || null,
                    treatment_type: newTreatment.treatment_type,
                    status: newTreatment.status,
                    color: treatmentColor,
                    notes: newTreatment.notes,
                }),
            });

            // Reset form
            newTreatment = {
                surface: "",
                treatment_type: "",
                status: "planned",
                notes: "",
            };

            showTreatmentModal = false;
            selectedTooth = null;
            await loadTreatments();
        } catch (e) {
            console.error("Failed to save treatment:", e);
        }
    }

    async function deleteTreatment(id: number) {
        if (
            !confirm(
                $t("dental.delete_confirmation") || "Delete this treatment?",
            )
        )
            return;

        try {
            await fetch(`/api/dental/treatments/${id}`, { method: "DELETE" });
            await loadTreatments();
        } catch (e) {
            console.error("Failed to delete treatment:", e);
        }
    }
</script>

<div class="dental-chart">
    <!-- Header Controls -->
    <div class="chart-header">
        <div class="flex flex-col md:flex-row md:items-center gap-4">
            <h2 class="text-xl font-bold">{$t("dental.chart_title")}</h2>
            <div class="flex gap-2">
                <button
                    class="btn-toggle"
                    class:active={dentitionType === "adult"}
                    onclick={() => (dentitionType = "adult")}
                >
                    {$t("dental.adult")}
                </button>
                <button
                    class="btn-toggle"
                    class:active={dentitionType === "pediatric"}
                    onclick={() => (dentitionType = "pediatric")}
                >
                    {$t("dental.pediatric")}
                </button>
                <button
                    class="btn-toggle"
                    class:active={dentitionType === "mixed"}
                    onclick={() => (dentitionType = "mixed")}
                >
                    {$t("dental.mixed")}
                </button>
            </div>
        </div>

        <!-- Legend -->
        <div class="legend-container mt-4">
            <div class="legend text-xs font-medium text-gray-700">
                <span
                    class="legend-item bg-blue-50 px-2 py-1 rounded border border-blue-100"
                >
                    <span class="legend-dot" style="background: #3B82F6"></span>
                    {$t("dental.existing")}
                </span>
                <span
                    class="legend-item bg-green-50 px-2 py-1 rounded border border-green-100"
                >
                    <span class="legend-dot" style="background: #10B981"></span>
                    {$t("dental.completed")}
                </span>
                <span
                    class="legend-item bg-red-50 px-2 py-1 rounded border border-red-100"
                >
                    <span class="legend-dot" style="background: #EF4444"></span>
                    {$t("dental.planned")}
                </span>
            </div>
        </div>
    </div>

    {#if loading}
        <div class="loading">{$t("common.loading") || "Loading chart..."}</div>
    {:else if dentitionType === "mixed"}
        <!-- Upper Mixed -->
        <div class="arch upper-arch">
            <div class="arch-label">
                {$t("dental.upper")} ({$t("dental.adult")})
            </div>
            <div class="teeth-row">
                {#each ADULT_TEETH_UNIVERSAL.slice(0, 16) as tooth}
                    <ToothSVG
                        toothNumber={tooth}
                        treatments={getTreatmentsForTooth(tooth)}
                        onClick={() => handleToothClick(tooth)}
                        selected={selectedTooth === tooth}
                    />
                {/each}
            </div>
            <div class="teeth-row mt-2 pediatric-row">
                {#each PEDIATRIC_TEETH_UNIVERSAL.slice(0, 10) as tooth}
                    <ToothSVG
                        toothNumber={tooth}
                        treatments={getTreatmentsForTooth(tooth)}
                        onClick={() => handleToothClick(tooth)}
                        selected={selectedTooth === tooth}
                    />
                {/each}
            </div>
        </div>

        <!-- Lower Mixed -->
        <div class="arch lower-arch">
            <div class="arch-label">
                {$t("dental.lower")} ({$t("dental.adult")})
            </div>
            <div class="teeth-row">
                {#each ADULT_TEETH_UNIVERSAL.slice(16) as tooth}
                    <ToothSVG
                        toothNumber={tooth}
                        treatments={getTreatmentsForTooth(tooth)}
                        onClick={() => handleToothClick(tooth)}
                        selected={selectedTooth === tooth}
                    />
                {/each}
            </div>
            <div class="teeth-row mt-2 pediatric-row">
                {#each PEDIATRIC_TEETH_UNIVERSAL.slice(10) as tooth}
                    <ToothSVG
                        toothNumber={tooth}
                        treatments={getTreatmentsForTooth(tooth)}
                        onClick={() => handleToothClick(tooth)}
                        selected={selectedTooth === tooth}
                    />
                {/each}
            </div>
        </div>
    {:else}
        <!-- Upper Arch -->
        <div class="arch upper-arch">
            <div class="arch-label">{$t("dental.upper")}</div>
            <div class="teeth-row">
                {#each getTeethList().slice(0, dentitionType === "pediatric" ? 10 : 16) as tooth}
                    <ToothSVG
                        toothNumber={tooth}
                        treatments={getTreatmentsForTooth(tooth)}
                        onClick={() => handleToothClick(tooth)}
                        selected={selectedTooth === tooth}
                    />
                {/each}
            </div>
        </div>

        <!-- Lower Arch -->
        <div class="arch lower-arch">
            <div class="arch-label">{$t("dental.lower")}</div>
            <div class="teeth-row">
                {#each getTeethList().slice(dentitionType === "pediatric" ? 10 : 16) as tooth}
                    <ToothSVG
                        toothNumber={tooth}
                        treatments={getTreatmentsForTooth(tooth)}
                        onClick={() => handleToothClick(tooth)}
                        selected={selectedTooth === tooth}
                    />
                {/each}
            </div>
        </div>
    {/if}

    <!-- Treatment History List -->
    <div class="treatment-history">
        <h3 class="text-lg font-semibold mb-2">
            {$t("dental.treatment_history")}
        </h3>
        {#if treatments.length === 0}
            <p class="text-gray-500 text-sm">{$t("dental.no_treatments")}</p>
        {:else}
            <div class="space-y-2">
                {#each treatments as treatment}
                    <div
                        class="treatment-item"
                        style="border-left-color: {treatment.color}"
                    >
                        <div class="flex items-start justify-between">
                            <div>
                                <span class="font-semibold"
                                    >{$t("dental.tooth")}
                                    {treatment.tooth_number}</span
                                >
                                {#if treatment.surface}
                                    <span class="text-sm text-gray-600"
                                        >({treatment.surface})</span
                                    >
                                {/if}
                                <span class="ml-2 text-sm"
                                    >{treatment.treatment_type}</span
                                >
                                <span
                                    class="ml-2 text-xs px-2 py-1 rounded"
                                    style="background: {treatment.color}; color: white;"
                                >
                                    {$t(`dental.${treatment.status}`)}
                                </span>
                            </div>
                            {#if !readOnly}
                                <button
                                    onclick={() =>
                                        deleteTreatment(treatment.id)}
                                    class="text-red-600 text-sm hover:underline"
                                >
                                    {$t("dental.delete_treatment")}
                                </button>
                            {/if}
                        </div>
                        {#if treatment.notes}
                            <p class="text-sm text-gray-600 mt-1">
                                {treatment.notes}
                            </p>
                        {/if}
                    </div>
                {/each}
            </div>
        {/if}
    </div>
</div>

<!-- Treatment Modal -->
{#if showTreatmentModal && selectedTooth}
    <div class="modal-overlay" onclick={() => (showTreatmentModal = false)}>
        <div class="modal-content" onclick={(e) => e.stopPropagation()}>
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-xl font-bold">
                    {$t("dental.add_treatment")} - {$t("dental.tooth")}
                    {selectedTooth}
                </h3>
                <button
                    onclick={() => (showTreatmentModal = false)}
                    class="text-gray-400 hover:text-gray-600"
                >
                    <svg
                        class="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M6 18L18 6M6 6l12 12"
                        />
                    </svg>
                </button>
            </div>

            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium mb-1"
                        >{$t("dental.surface")} ({$t("common.optional") ||
                            "Optional"})</label
                    >
                    <select
                        bind:value={newTreatment.surface}
                        class="w-full border rounded px-3 py-2"
                    >
                        <option value="">{$t("dental.whole_tooth")}</option>
                        {#each SURFACES as surface}
                            <option value={surface}>{surface}</option>
                        {/each}
                    </select>
                </div>

                <div>
                    <label class="block text-sm font-medium mb-1"
                        >{$t("dental.treatment_type")} *</label
                    >
                    <select
                        bind:value={newTreatment.treatment_type}
                        class="w-full border rounded px-3 py-2"
                    >
                        <option value=""
                            >{$t("common.select") || "Select..."}</option
                        >
                        {#each TREATMENT_TYPES as type}
                            <option value={type.id}>{type.label}</option>
                        {/each}
                    </select>
                </div>

                <div>
                    <label class="block text-sm font-medium mb-1"
                        >{$t("dental.status")} *</label
                    >
                    <select
                        bind:value={newTreatment.status}
                        class="w-full border rounded px-3 py-2"
                    >
                        <option value="existing">{$t("dental.existing")}</option
                        >
                        <option value="completed"
                            >{$t("dental.completed")}</option
                        >
                        <option value="planned">{$t("dental.planned")}</option>
                    </select>
                </div>

                <div>
                    <label class="block text-sm font-medium mb-1"
                        >{$t("dental.notes")}</label
                    >
                    <textarea
                        bind:value={newTreatment.notes}
                        class="w-full border rounded px-3 py-2"
                        rows="3"
                        placeholder={$t("dental.notes_placeholder") ||
                            "Additional clinical notes..."}
                    ></textarea>
                </div>
            </div>

            <div class="flex justify-end gap-2 mt-6">
                <button
                    onclick={() => (showTreatmentModal = false)}
                    class="px-4 py-2 border rounded hover:bg-gray-50"
                >
                    {$t("dental.cancel")}
                </button>
                <button
                    onclick={saveTreatment}
                    class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    disabled={!newTreatment.treatment_type}
                >
                    {$t("dental.save_treatment")}
                </button>
            </div>
        </div>
    </div>
{/if}

<style>
    .dental-chart {
        background: white;
        border-radius: 8px;
        padding: 1.5rem;
    }

    .chart-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 2rem;
        padding-bottom: 1rem;
        border-bottom: 2px solid #e5e7eb;
        flex-wrap: wrap;
    }

    .btn-toggle {
        padding: 0.5rem 1rem;
        border: 1px solid #d1d5db;
        border-radius: 0.375rem;
        background: white;
        cursor: pointer;
        transition: all 0.2s;
        font-size: 0.875rem;
        font-weight: 500;
    }

    .btn-toggle:hover {
        background: #f3f4f6;
    }

    .btn-toggle.active {
        background: #3b82f6;
        color: white;
        border-color: #3b82f6;
    }

    .legend-container {
        display: flex;
        justify-content: center;
        margin-bottom: 2rem;
    }

    .legend {
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
        justify-content: center;
    }

    .legend-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    }

    .legend-dot {
        width: 14px;
        height: 14px;
        border-radius: 4px;
        display: inline-block;
        border: 2px solid white;
        box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1);
        flex-shrink: 0;
    }

    .arch {
        margin-bottom: 2rem;
    }

    .arch-label {
        font-weight: 600;
        margin-bottom: 0.5rem;
        color: #4b5563;
    }

    .teeth-row {
        display: flex;
        gap: 0.25rem;
        flex-wrap: wrap;
        justify-content: center;
        padding: 0.75rem;
        background: #f9fafb;
        border-radius: 0.5rem;
    }

    .pediatric-row {
        background: #fffafa;
        border: 1px dashed #fee2e2;
    }

    .loading {
        text-align: center;
        padding: 3rem;
        color: #6b7280;
    }

    .treatment-history {
        margin-top: 2rem;
        padding-top: 2rem;
        border-top: 2px solid #e5e7eb;
    }

    .treatment-item {
        padding: 0.75rem;
        background: #f9fafb;
        border-radius: 0.375rem;
        border-left: 4px solid #3b82f6;
    }

    .modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 50;
    }

    .modal-content {
        background: white;
        border-radius: 0.5rem;
        padding: 2rem;
        width: 100%;
        max-width: 500px;
        max-height: 90vh;
        overflow-y: auto;
    }
</style>
