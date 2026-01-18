<script lang="ts">
    import { onMount } from "svelte";
    import { invalidateAll } from "$app/navigation";
    import ToothSVG from "./ToothSVG.svelte";
    import {
        ADULT_TEETH_FDI,
        PEDIATRIC_TEETH_FDI,
        calculateAge,
        getDefaultDentitionType,
        STATUS_COLORS,
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
        status: "completed" as "existing" | "completed" | "planned",
        date_performed: new Date().toISOString().split("T")[0],
        provider_id: null as number | null,
        diagnosis: "",
        notes: "",
        color: "#3B82F6",
        isCustom: false,
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
        if (dentitionType === "adult") return ADULT_TEETH_FDI;
        if (dentitionType === "pediatric") return PEDIATRIC_TEETH_FDI;
        return ADULT_TEETH_FDI;
    }

    const quadrants = $derived({
        adult: {
            upperRight: ADULT_TEETH_FDI.slice(0, 8), // 18-11
            upperLeft: ADULT_TEETH_FDI.slice(8, 16), // 21-28
            lowerRight: ADULT_TEETH_FDI.slice(24, 32), // 48-41
            lowerLeft: ADULT_TEETH_FDI.slice(16, 24), // 38-31
        },
        pediatric: {
            upperRight: PEDIATRIC_TEETH_FDI.slice(0, 5), // 55-51
            upperLeft: PEDIATRIC_TEETH_FDI.slice(5, 10), // 61-65
            lowerRight: PEDIATRIC_TEETH_FDI.slice(15, 20), // 85-81
            lowerLeft: PEDIATRIC_TEETH_FDI.slice(10, 15), // 75-71
        },
    });

    const activeQuadrants = $derived(
        dentitionType === "pediatric" ? quadrants.pediatric : quadrants.adult,
    );

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
                    is_custom: newTreatment.isCustom,
                }),
            });

            // Reset
            newTreatment = {
                surfaces: [],
                cdt_code: "",
                procedure_description: "",
                fee: 0,
                status: "completed",
                date_performed: new Date().toISOString().split("T")[0],
                provider_id: null,
                diagnosis: "",
                notes: "",
                color: "#3B82F6",
                isCustom: false,
            };

            showTreatmentModal = false;
            showSurfaceSelector = false;
            requiresSurfaces = false;
            selectedTooth = null;
            await loadTreatments();
            await invalidateAll();
        } catch (e) {
            console.error("Failed to save treatment:", e);
        }
    }

    export function openGeneralTreatment() {
        selectedTooth = "G";
        showTreatmentModal = true;
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
                    class="legend-item bg-gray-50 px-2 py-1 rounded border border-gray-100"
                >
                    <span class="legend-dot" style="background: #9CA3AF"></span>
                    {$t("dental.existing")}
                </span>
                <span
                    class="legend-item bg-green-50 px-2 py-1 rounded border border-green-100"
                >
                    <span class="legend-dot" style="background: #10B981"></span>
                    {$t("dental.completed")}
                </span>
                <span
                    class="legend-item bg-blue-50 px-2 py-1 rounded border border-blue-100"
                >
                    <span
                        class="legend-dot"
                        style="background: #3B82F6; border: 1px solid #EF4444"
                    ></span>
                    {$t("dental.planned")}
                </span>
            </div>
        </div>
    </div>

    {#if loading}
        <div class="loading">{$t("common.loading") || "Loading chart..."}</div>
    {:else}
        <div
            class="dentition-container"
            class:mixed-mode={dentitionType === "mixed"}
        >
            {#if dentitionType === "mixed"}
                <!-- ROW 1: ADULT SUPERIOR (18-11, 21-28) -->
                <div class="arch adult-superior">
                    <div class="arch-label">
                        {$t("dental.adult_upper") || "Adult Superior"}
                    </div>
                    <div class="quadrants-row">
                        <div class="quadrant">
                            <div class="teeth-row">
                                {#each quadrants.adult.upperRight as tooth}
                                    <ToothSVG
                                        toothNumber={tooth}
                                        treatments={getTreatmentsForTooth(
                                            tooth,
                                        )}
                                        onClick={() => handleToothClick(tooth)}
                                        selected={selectedTooth === tooth}
                                        position="upper"
                                    />
                                {/each}
                            </div>
                        </div>
                        <div class="quadrant-divider"></div>
                        <div class="quadrant">
                            <div class="teeth-row">
                                {#each quadrants.adult.upperLeft as tooth}
                                    <ToothSVG
                                        toothNumber={tooth}
                                        treatments={getTreatmentsForTooth(
                                            tooth,
                                        )}
                                        onClick={() => handleToothClick(tooth)}
                                        selected={selectedTooth === tooth}
                                        position="upper"
                                    />
                                {/each}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- ROW 2: CHILD SUPERIOR (55-51, 61-65) -->
                <div class="arch child-superior">
                    <div class="arch-label">
                        {$t("dental.child_upper") || "Child Superior"}
                    </div>
                    <div class="quadrants-row">
                        <div class="quadrant">
                            <div class="teeth-row centered-row">
                                {#each quadrants.pediatric.upperRight as tooth}
                                    <ToothSVG
                                        toothNumber={tooth}
                                        treatments={getTreatmentsForTooth(
                                            tooth,
                                        )}
                                        onClick={() => handleToothClick(tooth)}
                                        selected={selectedTooth === tooth}
                                        position="upper"
                                        scale={0.75}
                                    />
                                {/each}
                            </div>
                        </div>
                        <div class="quadrant-divider mini"></div>
                        <div class="quadrant">
                            <div class="teeth-row centered-row">
                                {#each quadrants.pediatric.upperLeft as tooth}
                                    <ToothSVG
                                        toothNumber={tooth}
                                        treatments={getTreatmentsForTooth(
                                            tooth,
                                        )}
                                        onClick={() => handleToothClick(tooth)}
                                        selected={selectedTooth === tooth}
                                        position="upper"
                                        scale={0.75}
                                    />
                                {/each}
                            </div>
                        </div>
                    </div>
                </div>

                <div class="occlusal-plane-gap"></div>

                <!-- ROW 3: CHILD INFERIOR (85-81, 71-75) -->
                <div class="arch child-inferior">
                    <div class="quadrants-row">
                        <div class="quadrant">
                            <div class="teeth-row centered-row">
                                {#each quadrants.pediatric.lowerRight as tooth}
                                    <ToothSVG
                                        toothNumber={tooth}
                                        treatments={getTreatmentsForTooth(
                                            tooth,
                                        )}
                                        onClick={() => handleToothClick(tooth)}
                                        selected={selectedTooth === tooth}
                                        position="lower"
                                        scale={0.75}
                                    />
                                {/each}
                            </div>
                        </div>
                        <div class="quadrant-divider mini"></div>
                        <div class="quadrant">
                            <div class="teeth-row centered-row">
                                {#each quadrants.pediatric.lowerLeft as tooth}
                                    <ToothSVG
                                        toothNumber={tooth}
                                        treatments={getTreatmentsForTooth(
                                            tooth,
                                        )}
                                        onClick={() => handleToothClick(tooth)}
                                        selected={selectedTooth === tooth}
                                        position="lower"
                                        scale={0.75}
                                    />
                                {/each}
                            </div>
                        </div>
                    </div>
                    <div class="arch-label mt-2">
                        {$t("dental.child_lower") || "Child Inferior"}
                    </div>
                </div>

                <!-- ROW 4: ADULT INFERIOR (48-41, 31-38) -->
                <div class="arch adult-inferior">
                    <div class="quadrants-row">
                        <div class="quadrant">
                            <div class="teeth-row">
                                {#each quadrants.adult.lowerRight as tooth}
                                    <ToothSVG
                                        toothNumber={tooth}
                                        treatments={getTreatmentsForTooth(
                                            tooth,
                                        )}
                                        onClick={() => handleToothClick(tooth)}
                                        selected={selectedTooth === tooth}
                                        position="lower"
                                    />
                                {/each}
                            </div>
                        </div>
                        <div class="quadrant-divider"></div>
                        <div class="quadrant">
                            <div class="teeth-row">
                                {#each quadrants.adult.lowerLeft as tooth}
                                    <ToothSVG
                                        toothNumber={tooth}
                                        treatments={getTreatmentsForTooth(
                                            tooth,
                                        )}
                                        onClick={() => handleToothClick(tooth)}
                                        selected={selectedTooth === tooth}
                                        position="lower"
                                    />
                                {/each}
                            </div>
                        </div>
                    </div>
                    <div class="arch-label mt-4">
                        {$t("dental.adult_lower") || "Adult Inferior"}
                    </div>
                </div>
            {:else}
                <!-- NORMAL ADULT OR PEDIATRIC VIEW -->
                <!-- UPPER ARCH -->
                <div class="arch upper-arch">
                    <div class="arch-label">{$t("dental.upper")}</div>
                    <div class="quadrants-row">
                        <!-- Upper Right -->
                        <div class="quadrant">
                            <div class="teeth-row">
                                {#each activeQuadrants.upperRight as tooth}
                                    <ToothSVG
                                        toothNumber={tooth}
                                        treatments={getTreatmentsForTooth(
                                            tooth,
                                        )}
                                        onClick={() => handleToothClick(tooth)}
                                        selected={selectedTooth === tooth}
                                        position="upper"
                                    />
                                {/each}
                            </div>
                        </div>
                        <div class="quadrant-divider"></div>
                        <!-- Upper Left -->
                        <div class="quadrant">
                            <div class="teeth-row">
                                {#each activeQuadrants.upperLeft as tooth}
                                    <ToothSVG
                                        toothNumber={tooth}
                                        treatments={getTreatmentsForTooth(
                                            tooth,
                                        )}
                                        onClick={() => handleToothClick(tooth)}
                                        selected={selectedTooth === tooth}
                                        position="upper"
                                    />
                                {/each}
                            </div>
                        </div>
                    </div>
                </div>

                <div class="arch-divider"></div>

                <!-- LOWER ARCH -->
                <div class="arch lower-arch">
                    <div class="quadrants-row">
                        <!-- Lower Right -->
                        <div class="quadrant">
                            <div class="teeth-row">
                                {#each activeQuadrants.lowerRight as tooth}
                                    <ToothSVG
                                        toothNumber={tooth}
                                        treatments={getTreatmentsForTooth(
                                            tooth,
                                        )}
                                        onClick={() => handleToothClick(tooth)}
                                        selected={selectedTooth === tooth}
                                        position="lower"
                                    />
                                {/each}
                            </div>
                        </div>
                        <div class="quadrant-divider"></div>
                        <!-- Lower Left -->
                        <div class="quadrant">
                            <div class="teeth-row">
                                {#each activeQuadrants.lowerLeft as tooth}
                                    <ToothSVG
                                        toothNumber={tooth}
                                        treatments={getTreatmentsForTooth(
                                            tooth,
                                        )}
                                        onClick={() => handleToothClick(tooth)}
                                        selected={selectedTooth === tooth}
                                        position="lower"
                                    />
                                {/each}
                            </div>
                        </div>
                    </div>
                    <div class="arch-label mt-4">{$t("dental.lower")}</div>
                </div>
            {/if}
        </div>
    {/if}

    <!-- Treatment History List -->
    <div class="treatment-history mt-8 border-t border-gray-100 pt-6">
        <h3 class="text-lg font-bold text-gray-900 mb-4 px-1">
            {$t("dental.treatment_history")}
        </h3>

        {#if treatments.length === 0}
            <div
                class="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200"
            >
                <p class="text-gray-400 font-medium">
                    {$t("dental.no_treatments")}
                </p>
            </div>
        {:else}
            <div
                class="overflow-hidden border border-gray-200 rounded-xl shadow-sm"
            >
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th
                                scope="col"
                                class="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider"
                                >Date</th
                            >
                            <th
                                scope="col"
                                class="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider"
                                >Ctx</th
                            >
                            <th
                                scope="col"
                                class="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-full"
                                >Description</th
                            >
                            <th
                                scope="col"
                                class="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider"
                                >Status</th
                            >
                            <th
                                scope="col"
                                class="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider"
                                >Amount</th
                            >
                            {#if !readOnly}
                                <th scope="col" class="relative px-4 py-3"></th>
                            {/if}
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-100">
                        {#each treatments as treatment}
                            <tr class="hover:bg-gray-50 transition-colors">
                                <!-- Date -->
                                <td
                                    class="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900"
                                >
                                    {treatment.treatment_date
                                        ? new Date(
                                              treatment.treatment_date,
                                          ).toLocaleDateString()
                                        : "---"}
                                </td>

                                <!-- Context (Tooth or General) -->
                                <td
                                    class="px-4 py-3 whitespace-nowrap text-sm font-bold text-indigo-600"
                                >
                                    {#if treatment.source === "general"}
                                        <span
                                            class="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-xs"
                                            >Général</span
                                        >
                                    {:else}
                                        <span
                                            class="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs"
                                            >#{treatment.tooth_number}</span
                                        >
                                    {/if}
                                </td>

                                <!-- Description -->
                                <td class="px-4 py-3 text-sm text-gray-600">
                                    <div class="font-medium text-gray-900">
                                        {treatment.treatment_type || "---"}
                                    </div>
                                    {#if treatment.description || treatment.notes}
                                        <div
                                            class="text-xs text-gray-500 mt-0.5"
                                        >
                                            {treatment.description ||
                                                treatment.notes}
                                        </div>
                                    {/if}
                                    {#if treatment.surfaces}
                                        <div
                                            class="text-xs text-gray-400 mt-0.5 font-mono"
                                        >
                                            Surf: {treatment.surfaces}
                                        </div>
                                    {/if}
                                </td>

                                <!-- Status Badge -->
                                <td class="px-4 py-3 whitespace-nowrap">
                                    <span
                                        class="px-2.5 py-1 inline-flex text-[10px] leading-4 font-bold rounded-full uppercase tracking-wider
                                        {treatment.status === 'completed'
                                            ? 'bg-green-100 text-green-700'
                                            : treatment.status === 'existing'
                                              ? 'bg-gray-100 text-gray-600'
                                              : 'bg-blue-100 text-blue-700'}"
                                    >
                                        {$t(`dental.${treatment.status}`) ||
                                            treatment.status}
                                    </span>
                                </td>

                                <!-- Amount -->
                                <td
                                    class="px-4 py-3 whitespace-nowrap text-sm font-black text-gray-900 text-right"
                                >
                                    {APP_CONFIG.currencySymbol}{(
                                        treatment.cost ||
                                        treatment.fee ||
                                        0
                                    ).toFixed(2)}
                                </td>

                                <!-- Actions -->
                                {#if !readOnly}
                                    <td
                                        class="px-4 py-3 whitespace-nowrap text-right text-sm font-medium"
                                    >
                                        {#if treatment.source === "dental"}
                                            <button
                                                onclick={() =>
                                                    deleteTreatment(
                                                        treatment.id,
                                                    )}
                                                class="text-red-400 hover:text-red-600 transition-colors"
                                                title={$t(
                                                    "dental.delete_treatment",
                                                )}
                                            >
                                                <svg
                                                    class="w-4 h-4"
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
                                        {/if}
                                    </td>
                                {/if}
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        {/if}
    </div>
</div>

<!-- Replace the old modal with this NEW MODAL -->
{#if showTreatmentModal && selectedTooth}
    <div
        class="modal-overlay"
        onclick={() => (showTreatmentModal = false)}
        onkeydown={(e) => {
            if (e.key === "Escape") showTreatmentModal = false;
        }}
        role="button"
        tabindex="-1"
    >
        <div
            class="modal-content-large"
            onclick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
        >
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
                    <div class="mb-4">
                        <button
                            type="button"
                            class="w-full py-3 px-4 rounded-lg border-2 transition-all flex items-center justify-center gap-2 font-bold {newTreatment.isCustom
                                ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                                : 'border-gray-200 bg-white text-gray-600 hover:border-indigo-300'}"
                            onclick={() => {
                                newTreatment.isCustom = !newTreatment.isCustom;
                                if (newTreatment.isCustom) {
                                    newTreatment.cdt_code = "CUSTOM";
                                    newTreatment.procedure_description = "";
                                    newTreatment.fee = 0;
                                    newTreatment.color = "#6366F1"; // Indigo for custom
                                } else {
                                    newTreatment.cdt_code = "";
                                    newTreatment.procedure_description = "";
                                    newTreatment.fee = 0;
                                }
                            }}
                        >
                            <span>✨</span>
                            {$t("dental.custom_treatment")}
                        </button>
                    </div>

                    {#if !newTreatment.isCustom}
                        <QuickTreatmentPicker
                            selectedCode={newTreatment.cdt_code}
                            onSelect={handleCodeSelect}
                        />
                    {:else}
                        <div
                            class="bg-indigo-50 p-6 rounded-xl border border-indigo-100"
                        >
                            <h4
                                class="text-indigo-900 font-bold mb-4 flex items-center gap-2"
                            >
                                📝 {$t("dental.custom_treatment")}
                            </h4>

                            <div class="space-y-4">
                                <div class="form-section">
                                    <label
                                        for="custom-name"
                                        class="block text-sm font-bold text-indigo-700 mb-1"
                                    >
                                        {$t("dental.custom_name_label")}
                                    </label>
                                    <input
                                        type="text"
                                        id="custom-name"
                                        bind:value={
                                            newTreatment.procedure_description
                                        }
                                        placeholder="e.g., Couronne provisoire impression 3D"
                                        class="w-full px-4 py-2 rounded-lg border-2 border-indigo-200 focus:border-indigo-500 focus:outline-none bg-white"
                                    />
                                </div>

                                <div class="form-section">
                                    <label
                                        for="custom-price"
                                        class="block text-sm font-bold text-indigo-700 mb-1"
                                    >
                                        {$t("dental.custom_price_label")}
                                    </label>
                                    <input
                                        type="number"
                                        id="custom-price"
                                        bind:value={newTreatment.fee}
                                        class="w-full px-4 py-2 rounded-lg border-2 border-indigo-200 focus:border-indigo-500 focus:outline-none bg-white font-mono"
                                    />
                                </div>

                                <p
                                    class="text-xs text-indigo-600 italic mt-4 bg-white/50 p-2 rounded border border-indigo-100/50"
                                >
                                    ℹ️ {$t("dental.custom_disclaimer")}
                                </p>
                            </div>
                        </div>
                    {/if}
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
                                    >{APP_CONFIG.currencySymbol}{newTreatment.fee.toFixed(
                                        2,
                                    )}</span
                                >
                            </div>
                            <div class="procedure-desc">
                                {newTreatment.procedure_description}
                            </div>
                        </div>
                    {/if}

                    <!-- Status Selection -->
                    <div class="form-section">
                        <span class="form-label">Status</span>
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
                            <label for="date-performed" class="form-label"
                                >Date Performed *</label
                            >
                            <input
                                type="date"
                                id="date-performed"
                                bind:value={newTreatment.date_performed}
                                class="form-input"
                                required
                            />
                        </div>
                    {/if}

                    <!-- Diagnosis -->
                    <div class="form-section">
                        <label for="diagnosis" class="form-label"
                            >Diagnosis (Optional)</label
                        >
                        <input
                            type="text"
                            id="diagnosis"
                            bind:value={newTreatment.diagnosis}
                            class="form-input"
                            placeholder="e.g., Caries extending to DEJ"
                        />
                    </div>

                    <!-- Clinical Notes -->
                    <div class="form-section">
                        <label for="clinical-notes" class="form-label"
                            >Clinical Notes</label
                        >
                        <textarea
                            id="clinical-notes"
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
                    disabled={!newTreatment.cdt_code ||
                        (newTreatment.isCustom &&
                            !newTreatment.procedure_description)}
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

    .dentition-container {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        padding: 1rem;
        background: white;
        border-radius: 1rem;
    }

    .dentition-container.mixed-mode {
        gap: 0;
        padding: 0.5rem;
    }

    .arch {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 100%;
    }

    .quadrants-row {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        width: 100%;
    }

    .quadrant {
        display: flex;
        flex-direction: column;
    }

    .quadrant-divider {
        width: 2px;
        height: 120px;
        background: #f1f5f9;
        margin: 0 0.5rem;
    }

    .arch-divider {
        height: 2px;
        width: 100%;
        background: #f1f5f9;
        margin: 0.8rem 0;
    }

    .teeth-row {
        display: flex;
        gap: 0.15rem;
        justify-content: center;
        padding: 0.5rem;
    }

    .occlusal-plane-gap {
        height: 2.5rem;
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
    }

    .occlusal-plane-gap::after {
        content: "";
        position: absolute;
        left: 10%;
        right: 10%;
        height: 1px;
        background: repeating-linear-gradient(
            to right,
            #f1f5f9,
            #f1f5f9 10px,
            transparent 10px,
            transparent 20px
        );
    }

    .centered-row {
        justify-content: center;
        align-items: flex-end; /* Align to bottom for upper child teeth */
        padding-top: 0;
    }

    .child-superior .centered-row {
        align-items: flex-end;
    }

    .child-inferior .centered-row {
        align-items: flex-start;
    }

    .quadrant-divider.mini {
        height: 80px;
    }

    .arch-label {
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        font-size: 0.65rem;
        color: #94a3b8;
        margin-bottom: 0.5rem;
    }

    .adult-superior .arch-label,
    .child-superior .arch-label {
        margin-bottom: 0.25rem;
    }

    .child-inferior .arch-label,
    .adult-inferior .arch-label {
        margin-top: 0.25rem;
    }

    .loading {
        text-align: center;
        padding: 3rem;
        color: #64748b;
    }

    .treatment-history {
        margin-top: 2rem;
        padding-top: 2rem;
        border-top: 2px solid #e5e7eb;
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
        max-width: 1400px; /* Changed from 1200px */
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
