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
    import { getToothName } from "$lib/dental/tooth-naming";

    import SurfaceSelector from "./SurfaceSelector.svelte";
    import QuickTreatmentPicker from "./QuickTreatmentPicker.svelte";

    interface Props {
        patientId: number;
        patientAge: number;
        readOnly?: boolean;
        onTreatmentAdded?: () => void;
    }

    let {
        patientId,
        patientAge,
        readOnly = false,
        onTreatmentAdded,
    }: Props = $props();

    let dentitionType = $state<"adult" | "pediatric" | "mixed">("adult");
    let selectedTooth = $state<string | number | null>(null);
    let treatments = $state<any[]>([]);
    let saveSuccess = $state(false);
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
    let editingTreatmentId = $state<number | null>(null);

    // Auto-set fee to 0 when status is "existing"
    $effect(() => {
        if (newTreatment.status === "existing") {
            newTreatment.fee = 0;
        }
    });

    function editTreatment(treatment: any) {
        if (readOnly || treatment.source !== "dental") return;

        editingTreatmentId = treatment.id;
        selectedTooth = treatment.tooth_number;

        newTreatment = {
            surfaces: treatment.surfaces ? treatment.surfaces.split(",") : [],
            cdt_code: treatment.cdt_code || "",
            procedure_description:
                treatment.description || treatment.treatment_type,
            fee: treatment.fee || treatment.cost || 0,
            status: treatment.status,
            date_performed: treatment.treatment_date
                ? new Date(treatment.treatment_date).toISOString().split("T")[0]
                : new Date().toISOString().split("T")[0],
            provider_id: treatment.provider_id || null,
            diagnosis: treatment.diagnosis || "",
            notes: treatment.notes || "",
            color: treatment.color || "#3B82F6",
            isCustom: treatment.cdt_code === "CUSTOM",
        };

        requiresSurfaces = !!treatment.surfaces;
        showSurfaceSelector = requiresSurfaces;
        showTreatmentModal = true;
    }

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
            const url = editingTreatmentId
                ? `/api/dental/treatments/${editingTreatmentId}`
                : "/api/dental/treatments";
            const method = editingTreatmentId ? "PUT" : "POST";

            await fetch(url, {
                method,
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
            editingTreatmentId = null;
            await loadTreatments();
            await invalidateAll();

            saveSuccess = true;
            setTimeout(() => {
                saveSuccess = false;
            }, 2000); // Hide after 2 seconds
            if (onTreatmentAdded) onTreatmentAdded();
        } catch (e) {
            console.error("Failed to save treatment:", e);
        }
    }

    export function openGeneralTreatment(
        defaultData?: Partial<typeof newTreatment>,
    ) {
        selectedTooth = "G";
        newTreatment = {
            cdt_code: defaultData?.cdt_code || "",
            procedure_description:
                defaultData?.procedure_description || "general",
            fee: defaultData?.fee ?? 0,
            status: defaultData?.status || "completed",
            surfaces: [],
            date_performed: new Date().toISOString().split("T")[0],
            provider_id: null,
            diagnosis: "",
            notes: "",
            color: defaultData?.color || "#3B82F6",
            isCustom: false,
        };
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

<svelte:window
    onkeydown={(e) => {
        if (e.key === "Escape" && showTreatmentModal) {
            showTreatmentModal = false;
            // Reset state
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
            showSurfaceSelector = false;
            requiresSurfaces = false;
            selectedTooth = null;
            editingTreatmentId = null;
        }
    }}
/>

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
        <div class="loading">
            {$t("common.loading") || "Loading chart..."}
        </div>
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
    <div class="treatment-history mt-4 pt-4">
        <h3 class="text-lg font-bold text-gray-900 mb-4 px-1">
            {$t("dental.treatment_history")} ({treatments.length})
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
                            <th class="w-1.5 p-0 bg-transparent border-none"
                            ></th>
                            <th
                                scope="col"
                                class="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-32"
                                >Date</th
                            >
                            <th
                                scope="col"
                                class="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-16"
                                >Ctx</th
                            >
                            <th
                                scope="col"
                                class="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-1/3"
                                >Description</th
                            >
                            <th
                                scope="col"
                                class="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-48"
                                >Diagnostic</th
                            >
                            <th
                                scope="col"
                                class="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-48"
                                >Note</th
                            >
                            <th
                                scope="col"
                                class="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-32"
                                >Status</th
                            >
                            <th
                                scope="col"
                                class="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider w-32"
                                >Amount</th
                            >
                            {#if !readOnly}
                                <th scope="col" class="relative px-4 py-3"></th>
                            {/if}
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-100">
                        {#each treatments as treatment}
                            <tr
                                class="hover:bg-blue-50/50 transition-colors cursor-pointer group relative"
                                title="Cliquez pour modifier ce traitement"
                                onclick={() => editTreatment(treatment)}
                                onkeydown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        editTreatment(treatment);
                                    }
                                }}
                                tabindex="0"
                                role="button"
                                aria-label="Modifier le traitement"
                            >
                                <!-- Color bar decoration -->
                                <td
                                    class="w-1.5 p-0 absolute left-0 top-0 bottom-0"
                                    style="background-color: {treatment.color ||
                                        '#e5e7eb'}"
                                ></td>
                                <!-- Date -->
                                <td
                                    class="px-4 py-4 whitespace-nowrap text-base font-bold text-gray-900"
                                >
                                    {treatment.treatment_date
                                        ? new Date(
                                              treatment.treatment_date,
                                          ).toLocaleDateString()
                                        : "---"}
                                </td>

                                <!-- Context (Tooth or General) -->
                                <td class="px-4 py-4 whitespace-nowrap text-sm">
                                    {#if treatment.source === "general"}
                                        <span
                                            class="px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase tracking-wider"
                                            >Général</span
                                        >
                                    {:else}
                                        <div class="flex flex-col">
                                            <span
                                                class="font-bold text-indigo-600"
                                                >#{treatment.tooth_number}</span
                                            >
                                            <span
                                                class="text-[10px] text-gray-400 font-medium truncate max-w-[80px]"
                                            >
                                                {getToothName(
                                                    treatment.tooth_number,
                                                )}
                                            </span>
                                        </div>
                                    {/if}
                                </td>

                                <!-- Description -->
                                <td class="px-4 py-4 text-base text-gray-800">
                                    <div
                                        class="font-bold text-gray-900 text-lg"
                                    >
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

                                <!-- Diagnosis -->
                                <td
                                    class="px-4 py-4 text-sm text-gray-700 font-medium max-w-[150px] truncate"
                                >
                                    {#if treatment.diagnosis}
                                        <span
                                            class="text-rose-600 font-semibold"
                                            >{treatment.diagnosis}</span
                                        >
                                    {:else}
                                        <span class="text-gray-300">-</span>
                                    {/if}
                                </td>

                                <!-- Clinical Note -->
                                <td
                                    class="px-4 py-4 text-sm text-gray-600 max-w-[200px] truncate"
                                >
                                    {#if treatment.notes}
                                        <span class="italic text-slate-600"
                                            >{treatment.notes}</span
                                        >
                                    {:else}
                                        <span class="text-gray-300">-</span>
                                    {/if}
                                </td>

                                <!-- Status Badge -->
                                <td class="px-4 py-4 whitespace-nowrap">
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
                                    class="px-4 py-4 whitespace-nowrap text-sm text-right"
                                >
                                    {#if treatment.status === "existing"}
                                        <div class="flex flex-col items-end">
                                            <span
                                                class="text-gray-400 line-through text-xs"
                                            >
                                                {APP_CONFIG.currencySymbol}{(
                                                    treatment.cost ||
                                                    treatment.fee ||
                                                    0
                                                ).toFixed(2)}
                                            </span>
                                            <span
                                                class="font-black text-gray-900"
                                            >
                                                {APP_CONFIG.currencySymbol}0.00
                                            </span>
                                        </div>
                                    {:else}
                                        <span class="font-black text-gray-900">
                                            {APP_CONFIG.currencySymbol}{(
                                                treatment.cost ||
                                                treatment.fee ||
                                                0
                                            ).toFixed(2)}
                                        </span>
                                    {/if}
                                </td>

                                <!-- Actions -->
                                {#if !readOnly}
                                    <td
                                        class="px-4 py-4 whitespace-nowrap text-right text-sm font-medium"
                                    >
                                        <div class="flex justify-end gap-2">
                                            {#if treatment.source === "dental"}
                                                <button
                                                    onclick={(e) => {
                                                        e.stopPropagation();
                                                        editTreatment(
                                                            treatment,
                                                        );
                                                    }}
                                                    class="text-indigo-400 hover:text-indigo-600 p-1 rounded-full hover:bg-indigo-50 transition-all"
                                                    title="Modifier"
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
                                                            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                                        ></path></svg
                                                    >
                                                </button>
                                                <button
                                                    onclick={(e) => {
                                                        e.stopPropagation();
                                                        deleteTreatment(
                                                            treatment.id,
                                                        );
                                                    }}
                                                    class="text-red-400 hover:text-red-600 p-1 rounded-full hover:bg-red-50 transition-all"
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
                                        </div>
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
        role="button"
        tabindex="0"
        onclick={() => (showTreatmentModal = false)}
        onkeydown={(e) => {
            if (e.key === "Escape") showTreatmentModal = false;
        }}
    >
        <div
            class="modal-content-large"
            onclick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            tabindex="-1"
        >
            <!-- Header -->
            <div class="modal-header">
                <div>
                    <h3 class="text-2xl font-bold">
                        {editingTreatmentId
                            ? "Modifier le traitement"
                            : "Ajouter un traitement"}
                    </h3>
                    <div class="flex flex-col mt-1">
                        <span
                            class="text-3xl font-black text-slate-800 tracking-tight"
                        >
                            #{selectedTooth}
                        </span>
                        <span
                            class="text-sm font-medium text-slate-500 uppercase tracking-wide"
                        >
                            {getToothName(selectedTooth || "")}
                        </span>
                    </div>
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
                    {#if newTreatment.cdt_code && !newTreatment.isCustom}
                        <div class="selected-procedure">
                            <div class="procedure-header">
                                <span class="procedure-code"
                                    >{newTreatment.cdt_code}</span
                                >
                            </div>
                            <div class="procedure-desc mb-3">
                                {newTreatment.procedure_description}
                            </div>

                            <div class="pt-3 border-t border-blue-200">
                                <label
                                    for="honoraires-input"
                                    class="block text-[10px] font-bold text-blue-700 uppercase mb-1"
                                >
                                    Honoraires ({APP_CONFIG.currencySymbol})
                                </label>
                                <div class="flex items-center gap-2">
                                    <input
                                        type="number"
                                        id="honoraires-input"
                                        bind:value={newTreatment.fee}
                                        readonly={newTreatment.status ===
                                            "existing"}
                                        class="w-full px-3 py-2 rounded border border-blue-300 focus:border-blue-500 focus:outline-none font-bold text-xl text-emerald-700 {newTreatment.status ===
                                        'existing'
                                            ? 'bg-gray-100 cursor-not-allowed'
                                            : 'bg-white'}"
                                    />
                                </div>
                                <p
                                    class="text-[10px] {newTreatment.status ===
                                    'existing'
                                        ? 'text-gray-500'
                                        : 'text-blue-500'} mt-1 italic"
                                >
                                    {newTreatment.status === "existing"
                                        ? "✓ Traitement existant - Aucun honoraire"
                                        : "* Modifiez le prix si nécessaire"}
                                </p>
                            </div>
                        </div>
                    {/if}

                    <!-- Status Selection -->
                    <div class="form-section">
                        <span class="form-label">Statut</span>
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
                                Existant
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
                                Terminé
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
                                Planifié
                            </button>
                        </div>
                    </div>

                    <!-- Date (if completed) -->
                    {#if newTreatment.status === "completed"}
                        <div class="form-section">
                            <label for="date-performed" class="form-label"
                                >Date de réalisation *</label
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
                            >Diagnostic (Optionnel)</label
                        >
                        <input
                            type="text"
                            id="diagnosis"
                            bind:value={newTreatment.diagnosis}
                            class="form-input"
                            placeholder="ex: Carie atteignant la jonction DES"
                        />
                    </div>

                    <!-- Clinical Notes -->
                    <div class="form-section">
                        <label for="clinical-notes" class="form-label"
                            >Notes cliniques</label
                        >
                        <textarea
                            id="clinical-notes"
                            bind:value={newTreatment.notes}
                            class="form-textarea"
                            rows="3"
                            placeholder="Observations supplémentaires..."
                        ></textarea>
                    </div>
                </div>
            </div>

            <!-- Footer Actions -->
            <div class="modal-footer">
                <button
                    onclick={() => {
                        showTreatmentModal = false;
                        editingTreatmentId = null;
                        // Reset form
                        newTreatment = {
                            surfaces: [],
                            cdt_code: "",
                            procedure_description: "",
                            fee: 0,
                            status: "completed",
                            date_performed: new Date()
                                .toISOString()
                                .split("T")[0],
                            provider_id: null,
                            diagnosis: "",
                            notes: "",
                            color: "#3B82F6",
                            isCustom: false,
                        };
                    }}
                    class="btn-secondary"
                >
                    Annuler
                </button>
                <button
                    onclick={saveTreatment}
                    class="btn-primary"
                    disabled={!newTreatment.cdt_code ||
                        (newTreatment.isCustom &&
                            !newTreatment.procedure_description)}
                >
                    💾 Enregistrer
                </button>
            </div>
        </div>
    </div>
{/if}

{#if saveSuccess}
    <div
        class="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none"
    >
        <div
            class="bg-green-500 text-white rounded-full p-6 shadow-2xl animate-bounce"
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-16 w-16"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
            >
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="3"
                    d="M5 13l4 4L19 7"
                />
            </svg>
        </div>
    </div>
{/if}

<style>
    .dental-chart {
        background: white;
        border-radius: 8px;
        padding: 1.5rem;
        width: 100%;
        display: flex;
        flex-direction: column;
    }

    .chart-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 1.5rem;
        padding-bottom: 0.75rem;
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
        margin-bottom: 1.5rem;
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
        padding: 1.5rem 1rem; /* Increased vertical padding for labels */
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

    /* COMPACT MODE for 1351x617 screens (and similar) */
    @media (max-height: 750px) {
        .dental-chart {
            padding: 0.75rem 1rem;
        }

        .chart-header {
            margin-bottom: 0.75rem;
            padding-bottom: 0.5rem;
            gap: 0.5rem;
        }

        .chart-header h2 {
            font-size: 1.125rem;
        }

        .legend-container {
            margin-bottom: 0.75rem;
            margin-top: 0.5rem !important;
        }

        .dentition-container {
            padding: 0.25rem;
            gap: 0.25rem;
        }

        .teeth-row {
            padding: 0.5rem 0.25rem !important;
        }

        .quadrant-divider {
            height: 90px;
        }

        .arch-divider {
            margin: 0.4rem 0;
        }

        .treatment-history {
            margin-top: 1rem;
            padding-top: 1rem;
        }

        .treatment-history h3 {
            font-size: 1rem;
            margin-bottom: 0.5rem;
        }

        .arch-label {
            font-size: 0.6rem;
            margin-bottom: 0.2rem;
        }

        .occlusal-plane-gap {
            height: 1.5rem;
        }
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
    /* Modal Styles */
    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.4);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: 1rem;
    }

    .modal-content-large {
        background: rgba(255, 255, 255, 0.95);
        border: 1px solid rgba(255, 255, 255, 0.2);
        box-shadow:
            0 20px 25px -5px rgba(0, 0, 0, 0.1),
            0 10px 10px -5px rgba(0, 0, 0, 0.04);
        border-radius: 1rem;
        width: 95%;
        max-width: 1500px;
        max-height: 96vh;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        animation: modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes modalSlideUp {
        from {
            opacity: 0;
            transform: translateY(20px) scale(0.98);
        }
        to {
            opacity: 1;
            transform: translateY(0) scale(1);
        }
    }

    .modal-header {
        padding: 0.75rem 1.25rem;
        border-bottom: 1px solid #e5e7eb;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        background: rgba(255, 255, 255, 0.5);
        backdrop-filter: blur(10px);
        position: sticky;
        top: 0;
        z-index: 10;
    }

    .modal-body {
        display: grid;
        grid-template-columns: 1.2fr 1fr;
        gap: 1rem;
        padding: 1rem;
        overflow: hidden;
        flex: 1;
        min-height: 0; /* Important for flex scroll */
    }

    @media (max-height: 750px) {
        .modal-body {
            gap: 1rem;
            padding: 1rem;
        }

        .modal-header {
            padding: 1rem 1.5rem !important;
        }
    }

    .left-column {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        overflow: hidden;
        min-height: 0;
    }

    .left-column > :global(.treatment-picker) {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        min-height: 0;
    }

    .right-column {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        overflow-y: auto;
    }

    .selected-procedure {
        padding: 0.75rem;
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
        gap: 0.4rem;
    }

    .status-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 0.5rem;
        border: 2px solid #d1d5db;
        border-radius: 0.5rem;
        background: white;
        cursor: pointer;
        transition: all 0.2s;
        font-weight: 500;
        font-size: 0.8rem;
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
        padding: 1rem 1.5rem;
        border-top: 2px solid #e5e7eb;
    }

    .btn-secondary {
        padding: 0.5rem 1rem;
        border: 2px solid #d1d5db;
        border-radius: 0.5rem;
        background: white;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        font-size: 0.9rem;
    }

    .btn-secondary:hover {
        background: #f3f4f6;
    }

    .btn-primary {
        padding: 0.5rem 1.5rem;
        border: none;
        border-radius: 0.5rem;
        background: #3b82f6;
        color: white;
        font-weight: 600;
        font-size: 1rem;
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
