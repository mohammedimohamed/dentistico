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
    import { APP_CONFIG } from "$lib/config/app.config";

    import SurfaceSelector from "./SurfaceSelector.svelte";
    import QuickTreatmentPicker from "./QuickTreatmentPicker.svelte";

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
        surfaces: [] as string[],
        cdt_code: "",
        procedure_description: "",
        fee: 0,
        status: "planned" as "existing" | "completed" | "planned",
        date_performed: "",
        provider_id: null as number | null,
        diagnosis: "",
        notes: "",
        color: "#3B82F6",
    });

    let showSurfaceSelector = $state(false);
    let requiresSurfaces = $state(false);

    function handleCodeSelect(code: any) {
        newTreatment.cdt_code = code.code;
        newTreatment.procedure_description = code.description;
        newTreatment.fee = code.default_fee;
        newTreatment.color = code.color_code;
        requiresSurfaces = code.requires_surfaces;
        showSurfaceSelector = code.requires_surfaces;

        // Clear surfaces if procedure doesn't require them
        if (!code.requires_surfaces) {
            newTreatment.surfaces = [];
        }
    }

    function toggleSurface(surface: string) {
        const index = newTreatment.surfaces.indexOf(surface);
        if (index > -1) {
            newTreatment.surfaces.splice(index, 1);
        } else {
            newTreatment.surfaces.push(surface);
        }
        newTreatment.surfaces = [...newTreatment.surfaces]; // Trigger reactivity
    }

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
        if (!selectedTooth || !newTreatment.cdt_code) {
            alert("Please select a procedure");
            return;
        }

        if (requiresSurfaces && newTreatment.surfaces.length === 0) {
            alert("This procedure requires selecting surfaces");
            return;
        }

        if (
            newTreatment.status === "completed" &&
            !newTreatment.date_performed
        ) {
            alert("Please enter the date performed");
            return;
        }

        try {
            await fetch("/api/dental/treatments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    patient_id: patientId,
                    tooth_number: selectedTooth.toString(),
                    surfaces: newTreatment.surfaces.join(","),
                    cdt_code: newTreatment.cdt_code,
                    treatment_type: newTreatment.procedure_description,
                    status: newTreatment.status,
                    fee: newTreatment.fee,
                    date_performed: newTreatment.date_performed || null,
                    provider_id: newTreatment.provider_id,
                    diagnosis: newTreatment.diagnosis,
                    notes: newTreatment.notes,
                    color: newTreatment.color,
                }),
            });

            // Reset
            newTreatment = {
                surfaces: [],
                cdt_code: "",
                procedure_description: "",
                fee: 0,
                status: "planned",
                date_performed: "",
                provider_id: null,
                diagnosis: "",
                notes: "",
                color: "#3B82F6",
            };

            showTreatmentModal = false;
            showSurfaceSelector = false;
            requiresSurfaces = false;
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
                                {#if treatment.surfaces || treatment.surface}
                                    <span class="text-sm text-gray-600"
                                        >({treatment.surfaces ||
                                            treatment.surface})</span
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

<!-- Replace the old modal with this NEW MODAL -->
{#if showTreatmentModal && selectedTooth}
    <div class="modal-overlay" onclick={() => (showTreatmentModal = false)}>
        <div class="modal-content-large" onclick={(e) => e.stopPropagation()}>
            <!-- Header -->
            <div class="modal-header">
                <div>
                    <h3 class="text-2xl font-bold">Add Treatment</h3>
                    <p class="text-gray-600 mt-1">Tooth #{selectedTooth}</p>
                </div>
                <button
                    onclick={() => (showTreatmentModal = false)}
                    class="close-button"
                >
                    ✕
                </button>
            </div>

            <!-- Two-Column Layout -->
            <div class="modal-body">
                <!-- LEFT COLUMN: Procedure Selection -->
                <div class="left-column">
                    <QuickTreatmentPicker
                        selectedCode={newTreatment.cdt_code}
                        onSelect={handleCodeSelect}
                    />
                </div>

                <!-- RIGHT COLUMN: Details -->
                <div class="right-column">
                    <!-- Surface Selector (if required) -->
                    {#if showSurfaceSelector}
                        <SurfaceSelector
                            selectedSurfaces={newTreatment.surfaces}
                            onToggle={toggleSurface}
                        />
                    {/if}

                    <!-- Selected Procedure Summary -->
                    {#if newTreatment.cdt_code}
                        <div class="selected-procedure">
                            <div class="procedure-header">
                                <span class="procedure-code"
                                    >{newTreatment.cdt_code}</span
                                >
                                <span class="procedure-fee"
                                    >{APP_CONFIG.currencySymbol}{newTreatment.fee.toFixed(2)}</span
                                >
                            </div>
                            <div class="procedure-desc">
                                {newTreatment.procedure_description}
                            </div>
                        </div>
                    {/if}

                    <!-- Status Selection -->
                    <div class="form-section">
                        <label class="form-label">Status</label>
                        <div class="status-buttons">
                            <button
                                type="button"
                                class="status-btn"
                                class:active={newTreatment.status ===
                                    "existing"}
                                onclick={() =>
                                    (newTreatment.status = "existing")}
                            >
                                <span
                                    class="status-dot"
                                    style="background: #3B82F6"
                                ></span>
                                Existing
                            </button>
                            <button
                                type="button"
                                class="status-btn"
                                class:active={newTreatment.status ===
                                    "completed"}
                                onclick={() =>
                                    (newTreatment.status = "completed")}
                            >
                                <span
                                    class="status-dot"
                                    style="background: #10B981"
                                ></span>
                                Completed
                            </button>
                            <button
                                type="button"
                                class="status-btn"
                                class:active={newTreatment.status === "planned"}
                                onclick={() =>
                                    (newTreatment.status = "planned")}
                            >
                                <span
                                    class="status-dot"
                                    style="background: #EF4444"
                                ></span>
                                Planned
                            </button>
                        </div>
                    </div>

                    <!-- Date (if completed) -->
                    {#if newTreatment.status === "completed"}
                        <div class="form-section">
                            <label class="form-label">Date Performed *</label>
                            <input
                                type="date"
                                bind:value={newTreatment.date_performed}
                                class="form-input"
                                required
                            />
                        </div>
                    {/if}

                    <!-- Diagnosis -->
                    <div class="form-section">
                        <label class="form-label">Diagnosis (Optional)</label>
                        <input
                            type="text"
                            bind:value={newTreatment.diagnosis}
                            class="form-input"
                            placeholder="e.g., Caries extending to DEJ"
                        />
                    </div>

                    <!-- Clinical Notes -->
                    <div class="form-section">
                        <label class="form-label">Clinical Notes</label>
                        <textarea
                            bind:value={newTreatment.notes}
                            class="form-textarea"
                            rows="3"
                            placeholder="Additional observations..."
                        ></textarea>
                    </div>
                </div>
            </div>

            <!-- Footer Actions -->
            <div class="modal-footer">
                <button
                    onclick={() => (showTreatmentModal = false)}
                    class="btn-secondary"
                >
                    Cancel
                </button>
                <button
                    onclick={saveTreatment}
                    class="btn-primary"
                    disabled={!newTreatment.cdt_code}
                >
                    💾 Save Treatment
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

    .modal-content-large {
        background: white;
        border-radius: 1rem;
        width: 98vw;
        max-width: 1400px;  /* Changed from 1200px */
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }

    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: start;
        padding: 1.5rem;
        border-bottom: 2px solid #e5e7eb;
    }

    .close-button {
        font-size: 1.5rem;
        width: 40px;
        height: 40px;
        border-radius: 0.5rem;
        border: none;
        background: #f3f4f6;
        cursor: pointer;
        transition: all 0.2s;
    }

    .close-button:hover {
        background: #e5e7eb;
    }

    .modal-body {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 2rem;
        padding: 1.5rem;
        overflow-y: auto;
        flex: 1;
    }

    .left-column,
    .right-column {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .selected-procedure {
        padding: 1rem;
        background: #eff6ff;
        border: 2px solid #3b82f6;
        border-radius: 0.5rem;
    }

    .procedure-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
    }

    .procedure-code {
        font-weight: 700;
        font-size: 1.25rem;
        color: #1e40af;
    }

    .procedure-fee {
        font-weight: 700;
        font-size: 1.25rem;
        color: #059669;
    }

    .procedure-desc {
        font-size: 0.875rem;
        color: #1f2937;
    }

    .form-section {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .form-label {
        font-weight: 600;
        font-size: 0.875rem;
        color: #374151;
    }

    .form-input,
    .form-textarea {
        width: 100%;
        padding: 0.75rem;
        border: 2px solid #d1d5db;
        border-radius: 0.5rem;
        font-size: 1rem;
    }

    .form-input:focus,
    .form-textarea:focus {
        outline: none;
        border-color: #3b82f6;
    }

    .status-buttons {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 0.5rem;
    }

    .status-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 1rem;
        border: 2px solid #d1d5db;
        border-radius: 0.5rem;
        background: white;
        cursor: pointer;
        transition: all 0.2s;
        font-weight: 500;
    }

    .status-btn:hover {
        border-color: #3b82f6;
        background: #eff6ff;
    }

    .status-btn.active {
        border-color: #3b82f6;
        background: #dbeafe;
        border-width: 3px;
    }

    .status-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
    }

    .modal-footer {
        display: flex;
        justify-content: flex-end;
        gap: 1rem;
        padding: 1.5rem;
        border-top: 2px solid #e5e7eb;
    }

    .btn-secondary {
        padding: 0.75rem 1.5rem;
        border: 2px solid #d1d5db;
        border-radius: 0.5rem;
        background: white;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
    }

    .btn-secondary:hover {
        background: #f3f4f6;
    }

    .btn-primary {
        padding: 0.75rem 2rem;
        border: none;
        border-radius: 0.5rem;
        background: #3b82f6;
        color: white;
        font-weight: 600;
        font-size: 1.125rem;
        cursor: pointer;
        transition: all 0.2s;
    }

    .btn-primary:hover:not(:disabled) {
        background: #2563eb;
    }

    .btn-primary:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    @media (max-width: 768px) {
        .modal-body {
            grid-template-columns: 1fr;
        }
    }
</style>
