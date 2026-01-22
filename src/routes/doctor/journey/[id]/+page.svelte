<script lang="ts">
    import { enhance } from "$app/forms";
    import { invalidateAll, beforeNavigate } from "$app/navigation";
    import { t } from "svelte-i18n";
    import { onMount } from "svelte";
    import { fade, slide, scale } from "svelte/transition";
    import DentalChart from "$lib/components/dental/DentalChart.svelte";
    import { calculateAge } from "$lib/dental/tooth-data";
    import { quintOut } from "svelte/easing";
    import SmartDateTimePicker from "$lib/components/SmartDateTimePicker.svelte";

    import ResponsiveShield from "$lib/components/common/ResponsiveShield.svelte";

    let { data } = $props();

    let chart: any = $state();
    let showNotesModal = $state(false);
    let clinicalNote = $state("");
    let noteImportance = $state("low");

    let showRescheduleModal = $state(false);
    let rescheduleDate = $state("");
    let rescheduleTime = $state("");

    let isPaymentModalOpen = $state(false);
    let errorMessage = $state("");

    let visitTimer = $state(0);
    let timerInterval: any;

    const avgDurationSeconds = $derived((data.config?.avgDuration || 20) * 60);

    // Keyboard Shortcuts
    function handleKeydown(e: KeyboardEvent) {
        // Ignore if typing in an input
        const target = e.target as HTMLElement;
        if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) {
            if (e.key === "Escape") {
                target.blur();
            }
            return;
        }

        switch (e.key.toLowerCase()) {
            case "n":
                e.preventDefault();
                showNotesModal = true;
                break;
            case "a":
                e.preventDefault();
                chart?.openGeneralTreatment();
                break;
            case "p":
                e.preventDefault();
                isPaymentModalOpen = true;
                break;
            case "escape":
                showNotesModal = false;
                showRescheduleModal = false;
                // chart component handles its own escape usually, or we can add a method
                break;
        }
    }

    interface ClinicalStandard {
        id: number;
        category: string;
        treatment_name: string;
        min_duration: number;
        max_duration: number;
        gap_days_min: number;
        gap_days_max: number;
        typical_sessions: number;
        complexity: number;
    }

    // Clinical Standard Intelligence
    const targetStandard = $derived.by(() => {
        if (!data.clinicalStandards) return null;
        const type = data.appointment.appointment_type
            ?.toLowerCase()
            .replace(/_/g, " ");
        const results = data.clinicalStandards as any[];
        const std =
            results.find((s: any) => s.treatment_name.toLowerCase() === type) ||
            results.find((s: any) =>
                type?.includes(s.treatment_name.toLowerCase()),
            ) ||
            results.find(
                (s: any) => s.category.toLowerCase() === "consultation",
            );
        return (std as ClinicalStandard) || null;
    });

    const maxDurationSeconds = $derived(
        targetStandard ? targetStandard.max_duration * 60 : avgDurationSeconds,
    );

    const timerStatus = $derived.by(() => {
        const padding = 600; // 10 mins tolerance
        if (visitTimer < maxDurationSeconds) return "green";
        if (visitTimer < maxDurationSeconds + padding) return "orange";
        return "red";
    });

    // Rescheduling Intelligence
    let recommendedRescheduleDate = $state("");
    $effect(() => {
        if (
            showRescheduleModal &&
            targetStandard &&
            targetStandard.gap_days_min > 0
        ) {
            const d = new Date();
            d.setDate(d.getDate() + targetStandard.gap_days_min);
            recommendedRescheduleDate = d.toISOString().split("T")[0];
            rescheduleDate = recommendedRescheduleDate; // Auto-set
        }
    });

    // Lab Warning
    const hasPendingProsthesis = $derived.by(() => {
        if (
            targetStandard?.category.includes("Prothèse") ||
            data.appointment.appointment_type?.includes("prosthesis")
        ) {
            return !data.labTracking?.some((l: any) => l.status === "received");
        }
        return false;
    });

    // Derived values
    const plannedActs = $derived((data.plannedActs || []) as any[]);
    const labTrackingItems = $derived((data.labTracking || []) as any[]);
    const highPriorityNotes = $derived((data.clinicalNotes || []) as any[]); // Use all notes for sidebar logic

    let isLeftSidebarOpen = $state(false);
    let isNotesSidebarOpen = $state(false);
    let sidebarTab = $state("notes"); // 'notes' or 'finance'
    const totalPaid = $derived(
        (data.payments || []).reduce(
            (sum: number, p: any) => sum + p.amount,
            0,
        ),
    );

    // Smart Notification Logic
    const notesStatus = $derived.by(() => {
        const notes = (data.clinicalNotes || []) as any[];
        if (notes.some((n: any) => n.importance === "critical"))
            return "critical";
        if (notes.some((n: any) => n.importance === "high")) return "high";
        if (notes.length > 0) return "normal";
        return "empty";
    });

    const notesSummary = $derived.by(() => {
        const notes = (data.clinicalNotes || []) as any[];
        if (notes.length === 0) return "Aucune note";
        const critical = notes.filter(
            (n: any) => n.importance === "critical",
        ).length;
        const urgent = notes.filter((n: any) => n.importance === "high").length;
        return `${notes.length} Notes: ${critical > 0 ? critical + " Crities, " : ""}${urgent > 0 ? urgent + " Urgentes" : ""}`;
    });

    let localSessionStarted = $state(false);

    const isSessionActive = $derived(
        localSessionStarted ||
            (!!data.appointment.actual_start_time &&
                !data.appointment.actual_end_time),
    );

    // Reactive timer effect
    $effect(() => {
        if (isSessionActive) {
            const startStr =
                data.appointment.actual_start_time || new Date().toISOString();
            const start = new Date(startStr).getTime();
            // Immediate update
            visitTimer = Math.floor((Date.now() - start) / 1000);

            // Clear any existing interval to prevent duplicates
            if (timerInterval) clearInterval(timerInterval);

            timerInterval = setInterval(() => {
                visitTimer = Math.floor((Date.now() - start) / 1000);
            }, 1000);
        } else {
            if (timerInterval) clearInterval(timerInterval);
        }
        return () => {
            if (timerInterval) clearInterval(timerInterval);
        };
    });

    function formatTime(seconds: number) {
        const totalSeconds = Math.floor(seconds);
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;

        if (h > 0) {
            return `${h}h ${m.toString().padStart(2, "0")}m`;
        }
        if (m > 0) {
            return `${m}m ${s.toString().padStart(2, "0")}s`;
        }
        return `${s}s`;
    }

    async function handleTreatmentAdded() {
        if (!isSessionActive) {
            localSessionStarted = true; // Instant feedback
            // Auto-start session using the existing action
            try {
                const formData = new FormData();
                const response = await fetch("?/startVisit", {
                    method: "POST",
                    body: formData,
                });

                if (response.ok) {
                    await invalidateAll();
                } else {
                    localSessionStarted = false; // Revert on failure
                }
            } catch (e) {
                console.error("Failed to auto-start session:", e);
                localSessionStarted = false;
            }
        }
    }

    // Auto-end session on navigation if active
    beforeNavigate(async ({ cancel }) => {
        if (isSessionActive) {
            const formData = new FormData();
            // Use sendBeacon for reliability on unload, but here fetch is okay for SPA nav
            // We use the existing endVisit action
            try {
                fetch("?/endVisit", {
                    method: "POST",
                    body: formData,
                    keepalive: true,
                });
            } catch (e) {
                console.error("Failed to auto-end visit:", e);
            }
        }
    });

    const completedDuration = $derived.by(() => {
        if (
            data.appointment.status === "completed" &&
            data.appointment.actual_start_time &&
            data.appointment.actual_end_time
        ) {
            const start = new Date(
                data.appointment.actual_start_time,
            ).getTime();
            const end = new Date(data.appointment.actual_end_time).getTime();
            const diff = (end - start) / 1000;
            return formatTime(diff);
        }
        return "";
    });

    const patientAge = $derived(calculateAge(data.patient.date_of_birth));
</script>

<div class="journey-workspace overflow-hidden bg-slate-50 flex flex-col">
    <!-- 1. Header Identity Bar -->
    <header
        class="identity-bar sticky top-0 bg-white border-b-2 border-slate-200 flex items-center px-8 justify-between z-50 shadow-md shrink-0"
    >
        <div class="flex items-center gap-6">
            <a href="/doctor/journey" class="btn-back"> ← </a>
            <div class="patient-id-card">
                <div class="flex items-center gap-2">
                    <h2
                        class="text-2xl font-black text-slate-900 leading-none mb-1"
                    >
                        {data.patient.full_name}
                    </h2>
                    {#if targetStandard?.complexity}
                        <div
                            class="flex gap-0.5"
                            title="Complexité: {targetStandard.complexity}/5"
                        >
                            {#each Array(targetStandard.complexity) as _}
                                <span class="text-yellow-400 text-sm">★</span>
                            {/each}
                        </div>
                    {/if}
                </div>
                <div
                    class="flex gap-3 text-sm text-slate-500 font-bold uppercase tracking-wider"
                >
                    <span>{patientAge} ANS</span>
                    <span class="text-slate-300">|</span>
                    <span
                        >{data.patient.gender === "F" ? "Femme" : "Homme"}</span
                    >
                    {#if targetStandard && targetStandard.typical_sessions > 1}
                        <span
                            class="text-indigo-500 border-l border-slate-200 pl-3"
                        >
                            Séance 1 / {targetStandard.typical_sessions}
                        </span>
                    {/if}
                </div>
            </div>
        </div>

        <!-- Center: Intelligent Timer -->
        <div class="flex flex-col items-center">
            {#if isSessionActive}
                <div class="timer-display {timerStatus}" in:scale>
                    <span
                        class="time font-mono text-4xl font-black tracking-tight"
                        >{formatTime(visitTimer)}</span
                    >
                    {#if timerStatus !== "green"}
                        <span
                            class="absolute -bottom-6 text-[10px] font-bold uppercase tracking-widest text-red-500 animate-pulse"
                            >Dépassement</span
                        >
                    {/if}
                </div>
            {:else if data.appointment.status === "completed"}
                <div
                    class="flex items-center gap-3 px-6 py-2.5 bg-emerald-50 rounded-full border-2 border-emerald-100 shadow-sm shadow-emerald-100 animate-in fade-in zoom-in duration-500"
                >
                    <div
                        class="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white text-sm"
                    >
                        ✓
                    </div>
                    <div class="flex flex-col -space-y-1">
                        <span
                            class="text-xs font-black text-emerald-400 uppercase tracking-widest"
                            >{$t("journey.completed")}</span
                        >
                        <span
                            class="text-lg font-black text-emerald-700 font-mono"
                            >{completedDuration || "--:--"}</span
                        >
                    </div>
                </div>
            {:else if hasPendingProsthesis}
                <div class="flex flex-col items-center gap-2">
                    <div
                        class="flex items-center gap-3 px-6 py-2.5 bg-rose-50 rounded-full border-2 border-rose-100 shadow-sm shadow-rose-100 animate-bounce"
                    >
                        <div
                            class="w-8 h-8 bg-rose-500 rounded-full flex items-center justify-center text-white text-sm"
                        >
                            ⚠️
                        </div>
                        <div class="flex flex-col -space-y-1">
                            <span
                                class="text-xs font-black text-rose-400 uppercase tracking-widest"
                                >Bloqué</span
                            >
                            <span class="text-sm font-black text-rose-700"
                                >Prothèse non reçue</span
                            >
                        </div>
                    </div>
                </div>
            {:else}
                <div
                    class="flex items-center gap-3 px-6 py-2.5 bg-indigo-50 rounded-full border-2 border-indigo-100 shadow-sm shadow-indigo-100 animate-pulse"
                >
                    <div
                        class="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-white text-sm"
                    >
                        ⌛
                    </div>
                    <div class="flex flex-col -space-y-1">
                        <span
                            class="text-xs font-black text-indigo-400 uppercase tracking-widest"
                            >{$t("journey.status") || "Statut"}</span
                        >
                        <span class="text-lg font-black text-indigo-700"
                            >{$t("journey.waiting")}</span
                        >
                    </div>
                </div>
            {/if}
        </div>

        <div class="flex items-center gap-6">
            <!-- Critical Info & Balance (High Visibility) -->
            <div class="flex gap-3">
                {#if data.patient.allergies}
                    <div class="alert-box critical">
                        <span class="icon">⚠️</span>
                        <div class="flex flex-col">
                            <span class="label">{$t("journey.allergies")}</span>
                            <span class="value">{data.patient.allergies}</span>
                        </div>
                    </div>
                {/if}
                {#if data.patient.medical_conditions}
                    <div class="alert-box warning">
                        <span class="icon">🩺</span>
                        <div class="flex flex-col">
                            <span class="label"
                                >{$t("journey.medical_conditions")}</span
                            >
                            <span class="value"
                                >{data.patient.medical_conditions}</span
                            >
                        </div>
                    </div>
                {/if}
                <button
                    class="alert-box balance cursor-pointer hover:scale-105 active:scale-95 transition-all text-left border-none bg-transparent p-0"
                    class:negative={data.patient.balance_due > 0}
                    onclick={() => {
                        sidebarTab = "finance";
                        isNotesSidebarOpen = true;
                    }}
                >
                    <span class="icon">💰</span>
                    <div class="flex flex-col">
                        <span class="label">{$t("journey.solde")}</span>
                        <span class="value"
                            >{data.patient.balance_due.toLocaleString()}
                            {data.config?.currencySymbol || "دج"}</span
                        >
                    </div>
                </button>
            </div>

            <!-- Visit Control -->
            <div class="flex items-center gap-3">
                {#if !data.appointment.actual_start_time}
                    <form
                        action="?/startVisit"
                        method="POST"
                        use:enhance
                        onsubmit={(e) => {
                            if (
                                hasPendingProsthesis &&
                                !confirm(
                                    "La prothèse n'est pas reçue. Continuer quand même ?",
                                )
                            )
                                e.preventDefault();
                        }}
                    >
                        <button
                            class="btn-commencer"
                            class:warning={hasPendingProsthesis}
                        >
                            <span class="control-icon"
                                >{hasPendingProsthesis ? "⚠️" : "▶"}</span
                            >
                            <span>{$t("journey.start_visit")}</span>
                        </button>
                    </form>
                {:else if !data.appointment.actual_end_time}
                    <form action="?/endVisit" method="POST" use:enhance>
                        <button class="btn-terminer">
                            <span class="control-icon">■</span>
                            <span>{$t("journey.end_visit")}</span>
                        </button>
                    </form>
                {/if}
            </div>
        </div>
    </header>
    <!-- 2. Main Content Grid - Dynamic Collapsible Layout -->
    <main
        class="flex-1 grid gap-0 overflow-hidden transition-all duration-300 ease-out"
        style="grid-template-columns: 5rem 1fr 5rem;"
    >
        <!-- Left Section: Action Grid & Clinical Intelligence (Retractable) -->
        <section
            class="relative bg-slate-50 border-r-2 border-slate-200"
            style="z-index: {isLeftSidebarOpen ? 100 : 30};"
        >
            <div
                class="h-full transition-all duration-300 ease-out flex flex-col bg-slate-50 {isLeftSidebarOpen
                    ? 'absolute top-0 left-0 w-[350px] shadow-2xl border-r-2 border-slate-200 z-[100]'
                    : 'w-full'}"
                onclick={(e) => e.stopPropagation()}
                role="presentation"
            >
                {#if isLeftSidebarOpen}
                    <div
                        class="p-6 overflow-y-auto flex-1 flex flex-col gap-6"
                        in:fade
                    >
                        <div class="flex justify-between items-center">
                            <span
                                class="text-[10px] font-black text-slate-400 uppercase tracking-widest"
                                >Workspace</span
                            >
                            <button
                                class="w-8 h-8 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
                                onclick={() => (isLeftSidebarOpen = false)}
                            >
                                ←
                            </button>
                        </div>

                        <!-- 1. Planned Acts Notification -->
                        {#if plannedActs.length > 0}
                            <div
                                class="planned-acts-alert animate-bounce-subtle"
                                in:slide
                            >
                                <div class="flex items-center gap-3 mb-2">
                                    <span class="text-xl">📅</span>
                                    <h4
                                        class="font-black text-indigo-900 leading-none"
                                    >
                                        {$t("journey.planned_today")}
                                    </h4>
                                </div>
                                <ul class="space-y-1">
                                    {#each plannedActs as act}
                                        <li
                                            class="text-indigo-700 text-sm font-bold flex items-center gap-2"
                                        >
                                            <span
                                                class="w-1.5 h-1.5 rounded-full bg-indigo-400"
                                            ></span>
                                            {act.treatment_type}
                                        </li>
                                    {/each}
                                </ul>
                            </div>
                        {/if}

                        <!-- 2. Main Actions -->
                        <div class="action-group">
                            <h3 class="group-title">
                                {$t("journey.clinical_actions")}
                            </h3>
                            <div class="action-grid">
                                <button
                                    class="pos-btn"
                                    style="--color: #6366f1"
                                    onclick={() =>
                                        chart?.openGeneralTreatment({
                                            cdt_code: "CONS",
                                            procedure_description:
                                                "Consultation générale",
                                            fee: 1500,
                                            status: "completed",
                                            color: "#6B7280",
                                        })}
                                >
                                    <span class="icon">🦷</span>
                                    <span class="label"
                                        >{$t("journey.acte_general")}</span
                                    >
                                </button>
                                <button
                                    class="pos-btn"
                                    style="--color: #10b981"
                                    onclick={() => (isPaymentModalOpen = true)}
                                >
                                    <span class="icon">💳</span>
                                    <span class="label"
                                        >{$t("journey.paiement")}</span
                                    >
                                </button>
                                <button
                                    class="pos-btn"
                                    style="--color: #8b5cf6"
                                >
                                    <span class="icon">📜</span>
                                    <span class="label"
                                        >{$t("journey.ordonnance")}</span
                                    >
                                </button>
                                <button
                                    class="pos-btn"
                                    style="--color: #3b82f6"
                                >
                                    <span class="icon">📑</span>
                                    <span class="label"
                                        >{$t("journey.facture")}</span
                                    >
                                </button>
                            </div>
                        </div>

                        <!-- 3. Exception Handling (Quick Status) -->
                        <div class="action-group">
                            <h3 class="group-title">
                                {$t("journey.appointment_management")}
                            </h3>
                            <div class="grid grid-cols-2 gap-3">
                                <form
                                    action="?/updateStatus"
                                    method="POST"
                                    use:enhance
                                    class="contents"
                                >
                                    <input
                                        type="hidden"
                                        name="status"
                                        value="scheduled"
                                    />
                                    <button
                                        class="status-action-btn postponed flex flex-col items-center gap-1 py-3"
                                        disabled={isSessionActive}
                                    >
                                        <span class="text-lg">🕒</span>
                                        <span class="text-[10px]"
                                            >{$t("journey.postpone")}</span
                                        >
                                    </button>
                                </form>
                                <form
                                    action="?/updateStatus"
                                    method="POST"
                                    use:enhance
                                    class="contents"
                                >
                                    <input
                                        type="hidden"
                                        name="status"
                                        value="cancelled"
                                    />
                                    <button
                                        class="status-action-btn cancelled flex flex-col items-center gap-1 py-3"
                                        disabled={isSessionActive}
                                    >
                                        <span class="text-lg">❌</span>
                                        <span class="text-[10px]"
                                            >{$t("journey.cancel")}</span
                                        >
                                    </button>
                                </form>
                                <button
                                    class="status-action-btn reschedule col-span-2 flex items-center justify-center gap-2"
                                    disabled={isSessionActive}
                                    onclick={() => (showRescheduleModal = true)}
                                >
                                    <span class="text-lg">📅</span>
                                    <span>{$t("journey.reschedule")}</span>
                                </button>
                            </div>
                        </div>

                        <!-- 4. Lab Tracking -->
                        <div class="action-group">
                            <h3 class="group-title">
                                {$t("journey.lab_tracking")}
                            </h3>
                            <div class="lab-tracking-container">
                                {#if labTrackingItems.length > 0}
                                    {#each labTrackingItems as item}
                                        <div class="lab-item {item.status}">
                                            <div
                                                class="flex justify-between items-start mb-1"
                                            >
                                                <span
                                                    class="lab-name font-bold text-slate-700"
                                                    >{item.description}</span
                                                >
                                                <span class="status-pill"
                                                    >{item.status}</span
                                                >
                                            </div>
                                            <span
                                                class="text-[10px] text-slate-400 font-bold uppercase"
                                                >{new Date(
                                                    item.updated_at,
                                                ).toLocaleDateString()}</span
                                            >
                                        </div>
                                    {/each}
                                {:else}
                                    <div class="empty-lab-state">
                                        <span
                                            class="text-sm font-medium text-slate-400"
                                            >{$t("journey.no_prosthesis")}</span
                                        >
                                    </div>
                                {/if}
                            </div>
                        </div>
                    </div>
                {:else}
                    <!-- COLLAPSED STATE -->
                    <div
                        class="h-full w-full flex flex-col items-center py-6 gap-8 overflow-y-auto"
                        in:fade
                    >
                        <button
                            class="action-icon toggle-btn"
                            onclick={() => (isLeftSidebarOpen = true)}
                        >
                            →
                        </button>

                        <!-- Clinical Actions Icons -->
                        <div class="flex flex-col items-center gap-3">
                            <button
                                class="action-icon"
                                style="--color: #6366f1"
                                title={$t("journey.acte_general")}
                                onclick={() =>
                                    chart?.openGeneralTreatment({
                                        cdt_code: "CONS",
                                        procedure_description:
                                            "Consultation générale",
                                        fee: 1500,
                                        status: "completed",
                                        color: "#6B7280",
                                    })}>🦷</button
                            >
                            <button
                                class="action-icon"
                                style="--color: #10b981"
                                title={$t("journey.paiement")}
                                onclick={() => (isPaymentModalOpen = true)}
                                >💳</button
                            >
                            <button
                                class="action-icon"
                                style="--color: #8b5cf6"
                                title={$t("journey.ordonnance")}>📜</button
                            >
                            <button
                                class="action-icon"
                                style="--color: #3b82f6"
                                title={$t("journey.facture")}>📑</button
                            >
                        </div>

                        <!-- Appointment Management Icons -->
                        <div class="flex flex-col items-center gap-3">
                            <form
                                action="?/updateStatus"
                                method="POST"
                                use:enhance
                                class="contents"
                            >
                                <input
                                    type="hidden"
                                    name="status"
                                    value="scheduled"
                                />
                                <button
                                    class="action-icon status-scheduled"
                                    disabled={isSessionActive}
                                    title={$t("journey.postpone")}
                                >
                                    🕒
                                </button>
                            </form>
                            <form
                                action="?/updateStatus"
                                method="POST"
                                use:enhance
                                class="contents"
                            >
                                <input
                                    type="hidden"
                                    name="status"
                                    value="cancelled"
                                />
                                <button
                                    class="action-icon status-cancelled"
                                    disabled={isSessionActive}
                                    title={$t("journey.cancel")}
                                >
                                    ❌
                                </button>
                            </form>
                            <button
                                class="action-icon status-reschedule"
                                disabled={isSessionActive}
                                title={$t("journey.reschedule")}
                                onclick={() => (showRescheduleModal = true)}
                                >📅</button
                            >
                        </div>

                        <!-- Lab Tracking Icon -->
                        <div class="flex flex-col items-center gap-3">
                            <button
                                class="action-icon"
                                style="--color: #6366f1"
                                title={$t("journey.lab_tracking")}>🧪</button
                            >
                        </div>
                    </div>
                {/if}
            </div>
        </section>

        <!-- Center Section: Interactive Odontogram (Flexible) -->
        <section class="bg-white relative border-r-2 border-slate-100">
            <DentalChart
                bind:this={chart}
                patientId={data.patient.id}
                {patientAge}
                onTreatmentAdded={handleTreatmentAdded}
            />
        </section>

        <!-- Right Section: Collapsible Clinical Sidebar -->
        <section
            class="relative bg-slate-50 border-l-2 border-slate-100"
            style="z-index: {isNotesSidebarOpen ? 100 : 30};"
        >
            <div
                class="h-full transition-all duration-300 ease-out flex flex-col bg-slate-50 {isNotesSidebarOpen
                    ? 'absolute top-0 right-0 h-full w-[45vw] shadow-2xl border-l-2 border-slate-200 z-[100]'
                    : 'w-full'}"
                onclick={(e) => e.stopPropagation()}
                role="presentation"
            >
                {#if !isNotesSidebarOpen}
                    <!-- COLLAPSED: Toggle Handle with Smart Indicators -->
                    <button
                        class="h-full w-full flex flex-col items-center py-6 gap-6 hover:bg-slate-100 transition-colors group cursor-pointer"
                        onclick={() => (isNotesSidebarOpen = true)}
                        title={notesSummary}
                    >
                        <!-- Status Badge -->
                        <div class="relative">
                            <div
                                class="w-12 h-12 rounded-2xl flex items-center justify-center border-2 shadow-sm transition-all group-hover:scale-110 {notesStatus ===
                                'critical'
                                    ? 'bg-red-50 border-red-200 text-red-500 animate-pulse'
                                    : notesStatus === 'high'
                                      ? 'bg-orange-50 border-orange-200 text-orange-500'
                                      : notesStatus === 'normal'
                                        ? 'bg-blue-50 border-blue-200 text-blue-500'
                                        : 'bg-white border-slate-200 text-slate-300'}"
                            >
                                <span class="text-xl font-black">
                                    {notesStatus === "empty" ? "📝" : "i"}
                                </span>
                            </div>
                            {#if notesStatus !== "empty"}
                                <div
                                    class="absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white {notesStatus ===
                                    'critical'
                                        ? 'bg-red-500'
                                        : notesStatus === 'high'
                                          ? 'bg-orange-500'
                                          : 'bg-blue-500'}"
                                ></div>
                            {/if}
                        </div>

                        <!-- Vertical Label -->
                        <div
                            class="writing-vertical-rl rotate-180 flex items-center gap-4 py-4"
                        >
                            <span
                                class="font-black text-slate-400 text-xs tracking-[0.3em] uppercase whitespace-nowrap group-hover:text-indigo-500 transition-colors"
                            >
                                {sidebarTab === "notes"
                                    ? $t("journey.clinical_notes")
                                    : $t("journey.paiement")}
                            </span>
                        </div>
                    </button>
                {:else}
                    <!-- EXPANDED: Full Note Panel -->
                    <div
                        class="absolute inset-0 flex flex-col"
                        in:fade={{ duration: 300 }}
                    >
                        <div
                            class="p-6 border-b border-slate-200 bg-white/50 backdrop-blur-sm sticky top-0 z-10 flex flex-col gap-4"
                        >
                            <div class="flex justify-between items-center">
                                <div class="flex items-center gap-3">
                                    <button
                                        class="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 text-slate-400 hover:bg-slate-200 transition-colors"
                                        onclick={() =>
                                            (isNotesSidebarOpen = false)}
                                    >
                                        →
                                    </button>
                                    <h3
                                        class="font-black text-slate-800 uppercase tracking-wider text-sm"
                                    >
                                        {sidebarTab === "notes"
                                            ? $t("journey.clinical_notes")
                                            : $t("journey.finance_details")}
                                    </h3>
                                </div>
                                {#if sidebarTab === "notes"}
                                    <button
                                        class="w-8 h-8 flex items-center justify-center rounded-full bg-indigo-100 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                        onclick={() => (showNotesModal = true)}
                                    >
                                        <span class="text-lg leading-none pb-1"
                                            >+</span
                                        >
                                    </button>
                                {:else}
                                    <button
                                        class="w-8 h-8 flex items-center justify-center rounded-full bg-emerald-100 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                                        onclick={() =>
                                            (isPaymentModalOpen = true)}
                                        title={$t("journey.paiement")}
                                    >
                                        <span class="text-sm leading-none"
                                            >💳</span
                                        >
                                    </button>
                                {/if}
                            </div>

                            <!-- Tabs -->
                            <div class="flex p-1 bg-slate-100 rounded-xl gap-1">
                                <button
                                    class="flex-1 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all {sidebarTab ===
                                    'notes'
                                        ? 'bg-white text-indigo-600 shadow-sm'
                                        : 'text-slate-400 hover:text-slate-600'}"
                                    onclick={() => (sidebarTab = "notes")}
                                >
                                    📝 Notes
                                </button>
                                <button
                                    class="flex-1 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all {sidebarTab ===
                                    'finance'
                                        ? 'bg-white text-emerald-600 shadow-sm'
                                        : 'text-slate-400 hover:text-slate-600'}"
                                    onclick={() => (sidebarTab = "finance")}
                                >
                                    💰 Finance
                                </button>
                            </div>
                        </div>

                        <div
                            class="p-6 overflow-y-auto flex-1 flex flex-col gap-4"
                        >
                            {#if sidebarTab === "notes"}
                                {#if highPriorityNotes.length === 0}
                                    <div class="text-center py-10 opacity-50">
                                        <span class="text-4xl block mb-2"
                                            >📝</span
                                        >
                                        <span
                                            class="text-xs font-bold text-slate-400 uppercase"
                                            >{$t("journey.no_notes")}</span
                                        >
                                    </div>
                                {/if}

                                {#each highPriorityNotes as note}
                                    <div
                                        class="post-it {note.importance} pointer-events-auto"
                                        in:slide
                                    >
                                        <div
                                            class="flex items-center justify-between mb-2"
                                        >
                                            <span class="importance-badge"
                                                >{note.importance}</span
                                            >
                                            <span
                                                class="text-[10px] font-bold text-slate-400"
                                                >{new Date(
                                                    note.created_at,
                                                ).toLocaleDateString()}</span
                                            >
                                        </div>
                                        <p class="note-text">{note.content}</p>
                                    </div>
                                {/each}
                            {:else}
                                <!-- Financial Tab Content -->
                                <div class="space-y-6">
                                    <div
                                        class="p-5 bg-rose-50 rounded-[2rem] border-2 border-rose-100 flex flex-col gap-4"
                                    >
                                        <div
                                            class="flex justify-between items-center"
                                        >
                                            <span
                                                class="text-xs font-black text-rose-600 uppercase tracking-widest"
                                                >{$t(
                                                    "assistant.dashboard.payment.modal.totalDue",
                                                )}</span
                                            >
                                            <span
                                                class="text-2xl font-black text-rose-600"
                                                >{data.config?.currencySymbol ||
                                                    "DH"}{data.patient.balance_due.toFixed(
                                                    2,
                                                )}</span
                                            >
                                        </div>
                                        {#if data.patient.parent_name}
                                            <div
                                                class="pt-3 border-t border-rose-200 flex flex-col gap-1"
                                            >
                                                <span
                                                    class="text-[10px] font-black text-rose-400 uppercase tracking-widest"
                                                    >{$t(
                                                        "patient_details.parent_guardian",
                                                    )}</span
                                                >
                                                <div
                                                    class="flex justify-between items-center"
                                                >
                                                    <span
                                                        class="text-sm font-black text-rose-700"
                                                        >{data.patient
                                                            .parent_name}</span
                                                    >
                                                    <a
                                                        href="tel:{data.patient
                                                            .parent_phone}"
                                                        class="text-xs font-bold text-rose-500 hover:underline"
                                                        >{data.patient
                                                            .parent_phone}</a
                                                    >
                                                </div>
                                            </div>
                                        {/if}
                                    </div>

                                    <div class="space-y-3">
                                        <span
                                            class="text-xs font-black text-slate-400 uppercase tracking-widest pl-2"
                                        >
                                            {$t(
                                                "patient_details.encaissements",
                                            )}
                                        </span>
                                        <div class="flex flex-col gap-3">
                                            {#if data.payments && data.payments.length > 0}
                                                {#each [...(data.payments as any[])].reverse() as p}
                                                    {@const payment = p as any}
                                                    <div
                                                        class="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group"
                                                    >
                                                        <div
                                                            class="flex justify-between items-start mb-2"
                                                        >
                                                            <div
                                                                class="flex flex-col"
                                                            >
                                                                <span
                                                                    class="text-[10px] font-black text-slate-400 uppercase tracking-widest"
                                                                >
                                                                    {new Date(
                                                                        payment.payment_date,
                                                                    ).toLocaleDateString()}
                                                                </span>
                                                                <span
                                                                    class="text-sm font-black text-slate-700"
                                                                >
                                                                    {$t(
                                                                        `assistant.dashboard.payment.methods.${payment.payment_method}`,
                                                                    )}
                                                                </span>
                                                            </div>
                                                            <span
                                                                class="text-lg font-black text-emerald-600"
                                                            >
                                                                {data.config
                                                                    ?.currencySymbol}{payment.amount.toFixed(
                                                                    2,
                                                                )}
                                                            </span>
                                                        </div>
                                                        {#if payment.notes}
                                                            <p
                                                                class="text-xs text-slate-400 font-medium italic"
                                                            >
                                                                {payment.notes}
                                                            </p>
                                                        {/if}
                                                    </div>
                                                {/each}
                                            {:else}
                                                <div
                                                    class="text-center py-10 opacity-50 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200"
                                                >
                                                    <span
                                                        class="text-4xl block mb-2"
                                                        >💰</span
                                                    >
                                                    <span
                                                        class="text-[10px] font-bold text-slate-400 uppercase"
                                                        >{$t(
                                                            "patient_details.no_payments",
                                                        )}</span
                                                    >
                                                </div>
                                            {/if}
                                        </div>
                                    </div>
                                </div>
                            {/if}
                        </div>
                    </div>
                {/if}
            </div>
        </section>
    </main>

    {#if showNotesModal}
        <div
            class="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md"
            transition:fade
        >
            <div
                class="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden border-4 border-white"
                in:scale={{ start: 0.9, duration: 400, easing: quintOut }}
            >
                <form
                    action="?/saveNote"
                    method="POST"
                    use:enhance={() => {
                        return async ({ update }) => {
                            await update();
                            showNotesModal = false;
                            clinicalNote = "";
                        };
                    }}
                >
                    <div
                        class="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50"
                    >
                        <div class="flex flex-col">
                            <h3
                                class="text-3xl font-black text-slate-800 tracking-tighter"
                            >
                                {$t("journey.note_clinique")}
                            </h3>
                            <p
                                class="text-slate-400 font-bold text-sm uppercase tracking-wider"
                            >
                                {$t("journey.evolved_notes")}
                            </p>
                        </div>
                        <button
                            type="button"
                            class="w-12 h-12 flex items-center justify-center rounded-2xl bg-white shadow-sm text-slate-400 hover:text-rose-500 transition-all border border-slate-100"
                            onclick={() => (showNotesModal = false)}>✕</button
                        >
                    </div>

                    <div class="p-10 space-y-8">
                        <!-- Importance Trigger -->
                        <div class="flex flex-col gap-3">
                            <label
                                class="text-xs font-black text-slate-400 uppercase tracking-widest"
                                for="importance"
                            >
                                {$t("journey.importance_level")}
                            </label>
                            <div class="grid grid-cols-3 gap-4">
                                {#each ["low", "high", "critical"] as level}
                                    <label
                                        class="importance-selector {level}"
                                        class:active={noteImportance === level}
                                    >
                                        <input
                                            type="radio"
                                            name="importance"
                                            value={level}
                                            bind:group={noteImportance}
                                            class="hidden"
                                        />
                                        <span
                                            class="capitalize font-black text-sm"
                                            >{level}</span
                                        >
                                    </label>
                                {/each}
                            </div>
                        </div>

                        <div class="flex flex-col gap-3">
                            <label
                                class="text-xs font-black text-slate-400 uppercase tracking-widest"
                                for="content"
                            >
                                {$t("journey.note_content")}
                            </label>
                            <textarea
                                name="content"
                                bind:value={clinicalNote}
                                placeholder="Saisissez vos notes cliniques ici..."
                                class="w-full h-48 p-8 bg-slate-50 border-2 border-slate-100 rounded-[2rem] focus:border-indigo-500 focus:bg-white transition-all text-xl font-medium outline-none resize-none shadow-inner"
                            ></textarea>
                        </div>
                    </div>

                    <div class="p-10 bg-slate-50 flex gap-4">
                        <button
                            type="submit"
                            class="flex-1 py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black text-xl hover:bg-indigo-700 hover:scale-[1.02] transition-all shadow-xl shadow-indigo-200"
                        >
                            {$t("common.save")}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    {/if}

    {#if showRescheduleModal}
        <div
            class="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md"
            transition:fade
        >
            <div
                class="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border-4 border-white"
                in:scale={{ start: 0.95, duration: 300, easing: quintOut }}
            >
                <form
                    action="?/reschedule"
                    method="POST"
                    use:enhance={() => {
                        return async ({ update }) => {
                            await update();
                            showRescheduleModal = false;
                        };
                    }}
                >
                    <div
                        class="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50"
                    >
                        <h3
                            class="text-2xl font-black text-slate-800 tracking-tight"
                        >
                            {$t("journey.reschedule")}
                        </h3>
                        <button
                            type="button"
                            class="w-10 h-10 flex items-center justify-center rounded-xl bg-white shadow-sm text-slate-400 hover:text-rose-500 transition-all border border-slate-100"
                            onclick={() => (showRescheduleModal = false)}
                            >✕</button
                        >
                    </div>

                    <div class="p-8 space-y-6">
                        {#if targetStandard && targetStandard.gap_days_min > 0}
                            <div
                                class="bg-indigo-50 border-2 border-indigo-100 p-5 rounded-2xl flex items-start gap-4"
                            >
                                <span class="text-2xl">ℹ️</span>
                                <div>
                                    <p
                                        class="font-black text-indigo-900 text-xs uppercase tracking-widest mb-1"
                                    >
                                        Standard Clinique
                                    </p>
                                    <p
                                        class="font-bold text-indigo-600 text-sm"
                                    >
                                        Délai médical conseillé : {targetStandard.gap_days_min}
                                        jours.
                                    </p>
                                </div>
                            </div>
                        {/if}

                        <div class="grid grid-cols-2 gap-4">
                            <div class="flex flex-col gap-2">
                                <label
                                    class="text-xs font-black text-slate-400 uppercase tracking-widest pl-2"
                                    for="reschedule_date"
                                >
                                    Date
                                </label>
                                <input
                                    id="reschedule_date"
                                    type="date"
                                    bind:value={rescheduleDate}
                                    min={recommendedRescheduleDate}
                                    class="p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 font-bold text-slate-700 focus:border-indigo-500 focus:bg-white outline-none transition-all"
                                    required
                                />
                            </div>
                            <div class="flex flex-col gap-2">
                                <label
                                    class="text-xs font-black text-slate-400 uppercase tracking-widest pl-2"
                                    for="reschedule_time"
                                >
                                    Heure
                                </label>
                                <input
                                    id="reschedule_time"
                                    type="time"
                                    bind:value={rescheduleTime}
                                    class="p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 font-bold text-slate-700 focus:border-indigo-500 focus:bg-white outline-none transition-all"
                                    required
                                />
                            </div>
                        </div>

                        <!-- Hidden concatenated input for server -->
                        <input
                            type="hidden"
                            name="start_time"
                            value="{rescheduleDate}T{rescheduleTime || '09:00'}"
                        />
                    </div>

                    <div class="p-8 bg-slate-50">
                        <button
                            type="submit"
                            class="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-lg hover:bg-indigo-700 hover:scale-[1.02] transition-all shadow-lg shadow-indigo-200"
                        >
                            {$t("common.confirm")}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    {/if}

    <!-- Record Payment Modal -->
    {#if isPaymentModalOpen}
        <div
            class="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
            transition:fade={{ duration: 200 }}
        >
            <div
                class="bg-white rounded-[2.5rem] shadow-2xl w-[80%] max-w-7xl overflow-hidden border-4 border-white"
                in:scale={{ start: 0.95, duration: 300, easing: quintOut }}
            >
                <form
                    method="POST"
                    action="?/recordPayment"
                    use:enhance={() => {
                        errorMessage = "";
                        return async ({ result, update }) => {
                            if (result.type === "success") {
                                isPaymentModalOpen = false;
                            } else {
                                errorMessage =
                                    (result as any).data?.error ||
                                    "Payment failed";
                            }
                            await update();
                        };
                    }}
                >
                    <div
                        class="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50"
                    >
                        <h3
                            class="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3"
                        >
                            <span class="w-1.5 h-8 bg-emerald-500 rounded-full"
                            ></span>
                            {$t("assistant.dashboard.payment.modal.title")}
                        </h3>
                        <button
                            type="button"
                            class="w-10 h-10 flex items-center justify-center rounded-xl bg-white shadow-sm text-slate-400 hover:text-rose-500 transition-all border border-slate-100"
                            onclick={() => (isPaymentModalOpen = false)}
                            >✕</button
                        >
                    </div>

                    <div class="p-8">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <!-- Left Column: Form -->
                            <div class="space-y-6">
                                <span
                                    class="text-xs font-black text-slate-400 uppercase tracking-widest pl-2"
                                >
                                    {$t("patient_details.record_payment")}
                                </span>

                                <div class="space-y-4">
                                    <div class="flex flex-col gap-2">
                                        <label
                                            class="text-xs font-black text-slate-400 uppercase tracking-widest pl-2"
                                            for="payment_amount"
                                        >
                                            {$t(
                                                "assistant.dashboard.payment.fields.amount",
                                            )}
                                        </label>
                                        <div class="relative">
                                            <input
                                                id="payment_amount"
                                                type="number"
                                                step="0.01"
                                                name="amount"
                                                required
                                                class="w-full p-5 bg-slate-50 rounded-2xl border-2 border-slate-100 font-black text-2xl text-emerald-600 focus:border-emerald-500 focus:bg-white outline-none transition-all pl-12"
                                                value={data.patient.balance_due}
                                            />
                                            <span
                                                class="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold"
                                                >{data.config?.currencySymbol ||
                                                    "DH"}</span
                                            >
                                        </div>
                                    </div>

                                    <div class="flex flex-col gap-2">
                                        <label
                                            class="text-xs font-black text-slate-400 uppercase tracking-widest pl-2"
                                            for="payment_method"
                                        >
                                            {$t(
                                                "assistant.dashboard.payment.fields.paymentMethod",
                                            )}
                                        </label>
                                        <select
                                            id="payment_method"
                                            name="payment_method"
                                            class="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 font-bold text-slate-700 focus:border-indigo-500 focus:bg-white outline-none transition-all appearance-none cursor-pointer"
                                        >
                                            {#if data.config?.paymentMethods}
                                                {#each data.config.paymentMethods as method}
                                                    <option value={method}
                                                        >{method}</option
                                                    >
                                                {/each}
                                            {:else}
                                                <option value="cash"
                                                    >{$t(
                                                        "assistant.dashboard.payment.methods.cash",
                                                    )}</option
                                                >
                                                <option value="card"
                                                    >{$t(
                                                        "assistant.dashboard.payment.methods.card",
                                                    )}</option
                                                >
                                            {/if}
                                        </select>
                                    </div>

                                    <div class="flex flex-col gap-2">
                                        <label
                                            class="text-xs font-black text-slate-400 uppercase tracking-widest pl-2"
                                            for="payment_notes"
                                        >
                                            {$t("journey.note_clinique")} (Optionnel)
                                        </label>
                                        <textarea
                                            id="payment_notes"
                                            name="notes"
                                            rows="2"
                                            class="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 font-medium text-slate-600 focus:border-indigo-500 focus:bg-white outline-none transition-all resize-none"
                                            placeholder="Ex: Paiement d'avance, chèque n°..."
                                        ></textarea>
                                    </div>
                                </div>
                            </div>

                            <!-- Right Column: History & Summary -->
                            <div class="space-y-6">
                                <div class="grid grid-cols-2 gap-4">
                                    <div
                                        class="bg-rose-50 border-2 border-rose-100 p-5 rounded-3xl flex flex-col gap-1"
                                    >
                                        <span
                                            class="text-[10px] font-black text-rose-400 uppercase tracking-widest"
                                            >{$t(
                                                "assistant.dashboard.payment.modal.totalDue",
                                            )}</span
                                        >
                                        <span
                                            class="text-2xl font-black text-rose-600"
                                            >{data.config?.currencySymbol ||
                                                "DH"}{data.patient.balance_due.toFixed(
                                                2,
                                            )}</span
                                        >
                                    </div>
                                    <div
                                        class="bg-emerald-50 border-2 border-emerald-100 p-5 rounded-3xl flex flex-col gap-1"
                                    >
                                        <span
                                            class="text-[10px] font-black text-emerald-400 uppercase tracking-widest"
                                            >Total Payé</span
                                        >
                                        <span
                                            class="text-2xl font-black text-emerald-600"
                                            >{data.config?.currencySymbol ||
                                                "DH"}{totalPaid.toFixed(
                                                2,
                                            )}</span
                                        >
                                    </div>
                                </div>

                                <!-- Payment History -->
                                {#if data.payments && data.payments.length > 0}
                                    <div class="space-y-3">
                                        <span
                                            class="text-xs font-black text-slate-400 uppercase tracking-widest pl-2"
                                        >
                                            {$t(
                                                "patient_details.encaissements",
                                            )}
                                        </span>
                                        <div
                                            class="max-h-[220px] overflow-y-auto pr-2 space-y-2"
                                        >
                                            {#each (data.payments || [])
                                                .slice()
                                                .reverse() as p}
                                                {@const payment = p as any}
                                                <div
                                                    class="flex justify-between items-center p-3 bg-slate-50/50 rounded-2xl border border-slate-100 group hover:bg-white hover:shadow-sm transition-all"
                                                >
                                                    <div class="flex flex-col">
                                                        <span
                                                            class="text-[10px] font-black text-slate-800"
                                                        >
                                                            {new Date(
                                                                payment.payment_date,
                                                            ).toLocaleDateString(
                                                                "fr-FR",
                                                                {
                                                                    day: "2-digit",
                                                                    month: "short",
                                                                    year: "numeric",
                                                                },
                                                            )}
                                                        </span>
                                                        <span
                                                            class="text-[9px] font-bold text-slate-400 uppercase"
                                                        >
                                                            {$t(
                                                                `assistant.dashboard.payment.methods.${payment.payment_method}`,
                                                            )}
                                                        </span>
                                                    </div>
                                                    <span
                                                        class="text-sm font-black text-emerald-600"
                                                    >
                                                        {data.config
                                                            ?.currencySymbol}{payment.amount.toFixed(
                                                            2,
                                                        )}
                                                    </span>
                                                </div>
                                            {/each}
                                        </div>
                                    </div>
                                {:else}
                                    <div
                                        class="flex flex-col items-center justify-center py-10 opacity-30 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200"
                                    >
                                        <span class="text-4xl mb-2">💰</span>
                                        <span
                                            class="text-[10px] font-black uppercase tracking-widest"
                                            >{$t(
                                                "patient_details.no_payments",
                                            )}</span
                                        >
                                    </div>
                                {/if}

                                {#if errorMessage}
                                    <div
                                        class="p-4 bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl text-sm font-bold flex items-center gap-3"
                                    >
                                        <span class="text-lg">⚠️</span>
                                        {errorMessage}
                                    </div>
                                {/if}
                            </div>
                        </div>
                    </div>

                    <div class="p-8 bg-slate-50">
                        <button
                            type="submit"
                            class="w-full py-5 bg-emerald-600 text-white rounded-[1.5rem] font-black text-lg hover:bg-emerald-700 hover:scale-[1.02] transition-all shadow-xl shadow-emerald-100 flex items-center justify-center gap-3"
                        >
                            <span class="text-xl">💰</span>
                            {$t("assistant.dashboard.payment.modal.confirm")}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    {/if}

    <!-- Click-Outside Backdrop -->
    {#if isLeftSidebarOpen || isNotesSidebarOpen}
        <button
            class="fixed inset-0 z-[90] bg-slate-900/10 backdrop-blur-[2px] cursor-default w-full h-full border-none p-0 m-0"
            onclick={() => {
                isLeftSidebarOpen = false;
                isNotesSidebarOpen = false;
            }}
            aria-label="Close sidebars"
            transition:fade={{ duration: 200 }}
        ></button>
    {/if}
</div>

<style>
    .journey-workspace {
        font-family: "Outfit", "Inter", sans-serif;
    }

    .identity-bar {
        height: 6rem;
        background: rgba(255, 255, 255, 0.9);
        backdrop-filter: blur(10px);
        transition: all 0.3s ease;
    }

    /* Compact Mode for Small Heights (e.g. 617px) */
    @media (max-height: 750px) {
        .identity-bar {
            height: 4rem;
            padding-left: 1.5rem;
            padding-right: 1.5rem;
        }

        .patient-id-card h2 {
            font-size: 1.25rem;
        }

        .timer-display {
            padding: 0.25rem 1.5rem;
        }

        .timer-display .time {
            font-size: 1.5rem;
        }

        .alert-box {
            padding: 0.4rem 0.75rem;
            min-width: 110px;
            gap: 0.5rem;
        }

        .alert-box .icon {
            font-size: 1.1rem;
        }

        .alert-box .value {
            font-size: 0.9rem;
        }

        .pos-btn {
            height: 70px !important;
        }

        .pos-btn .icon {
            font-size: 1.5rem;
        }

        .action-grid {
            gap: 0.5rem !important;
        }

        .group-title {
            margin-bottom: 0.5rem !important;
        }

        .action-group {
            margin-bottom: 0.5rem !important;
        }

        .planned-acts-alert {
            padding: 0.75rem !important;
        }

        /* Sidebar layout adjustments */
        .lab-item {
            padding: 0.5rem 0.75rem;
        }
    }

    .alert-box {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem 1.25rem;
        border-radius: 1.25rem;
        border: 2px solid transparent;
        min-width: 140px;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .alert-box .icon {
        font-size: 1.5rem;
    }
    .alert-box .label {
        font-size: 0.6rem;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        opacity: 0.8;
    }
    .alert-box .value {
        font-weight: 900;
        font-size: 1.1rem;
        line-height: 1;
        letter-spacing: -0.02em;
    }

    .alert-box.critical {
        background: #fff1f2;
        border-color: #fecdd3;
        color: #e11d48;
    }

    .alert-box.warning {
        background: #fffbeb;
        border-color: #fef3c7;
        color: #d97706;
    }

    .alert-box.balance {
        background: #f0fdf4;
        border-color: #dcfce7;
        color: #16a34a;
        padding: 0rem 1.25rem;
    }

    .alert-box.balance.negative {
        background: #fef2f2;
        border-color: #fee2e2;
        color: #dc2626;
    }

    /* 2. Intelligent Timer */
    .timer-display {
        background: #0f172a;
        color: white;
        padding: 0.5rem 2rem;
        border-radius: 2rem;
        box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.4);
        border: 3px solid #1e293b;
        transition: all 0.5s ease;
    }

    .timer-display.green {
        border-color: #10b981;
        color: #10b981;
    }
    .timer-display.orange {
        border-color: #f59e0b;
        color: #f59e0b;
    }
    .timer-display.red {
        border-color: #ef4444;
        color: #ef4444;
        animation: pulse-red 2s infinite;
    }

    @keyframes pulse-red {
        0% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4);
        }
        70% {
            box-shadow: 0 0 0 15px rgba(239, 68, 68, 0);
        }
        100% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
        }
    }

    /* 3. Action Grid & Group */
    .group-title {
        font-size: 0.7rem;
        font-weight: 900;
        text-transform: uppercase;
        color: #94a3b8;
        letter-spacing: 0.15em;
        margin-bottom: 1rem;
    }

    .action-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 1rem;
    }

    .pos-btn {
        height: 100px;
        background: white;
        border: 2px solid #f1f5f9;
        border-radius: 1.5rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }

    .pos-btn:hover {
        transform: translateY(-5px) scale(1.02);
        border-color: var(--color);
        box-shadow:
            0 20px 25px -5px rgba(0, 0, 0, 0.1),
            0 10px 10px -5px rgba(0, 0, 0, 0.04);
    }

    .pos-btn:active {
        transform: translateY(-2px) scale(0.98);
        box-shadow: 0 5px 10px -3px rgba(0, 0, 0, 0.1);
    }

    .pos-btn .icon {
        font-size: 2.25rem;
        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
    }

    .pos-btn .label {
        font-weight: 900;
        font-size: 0.8rem;
        color: #334155;
        text-transform: uppercase;
        letter-spacing: 0.025em;
    }

    /* 4. Collapsed Sidebar Styling */
    .action-icon {
        width: 3rem;
        height: 3rem;
        border-radius: 1rem;
        background: white;
        border: 2px solid #f1f5f9;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.25rem;
        transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        cursor: pointer;
    }

    .action-icon:hover:not(:disabled) {
        transform: scale(1.15) rotate(5deg);
        border-color: var(--color, #6366f1);
        color: var(--color, #6366f1);
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        z-index: 10;
    }

    .action-icon:active:not(:disabled) {
        transform: scale(0.9);
    }

    .action-icon:disabled {
        opacity: 0.4;
        cursor: not-allowed;
        filter: grayscale(1);
    }

    .action-icon.toggle-btn {
        margin-bottom: 1rem;
        border-color: #e2e8f0;
        color: #94a3b8;
    }

    .action-icon.toggle-btn:hover {
        background: #f8fafc;
        color: #6366f1;
        border-color: #6366f1;
    }

    .action-icon.status-scheduled {
        --color: #64748b;
        background: #f8fafc;
    }
    .action-icon.status-cancelled {
        --color: #e11d48;
        background: #fff1f2;
        border-color: #fecdd3;
    }
    .action-icon.status-reschedule {
        --color: #4f46e5;
        background: #eef2ff;
        border-color: #c7d2fe;
    }

    /* 4. Status Actions (Exceptions) */
    .status-action-btn {
        padding: 0.75rem;
        border-radius: 1rem;
        font-weight: 900;
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        border: 2px solid transparent;
        transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }

    .status-action-btn:hover:not(:disabled) {
        transform: translateY(-3px) scale(1.03);
        box-shadow: 0 10px 15px -10px rgba(0, 0, 0, 0.1);
    }

    .status-action-btn:active:not(:disabled) {
        transform: scale(0.95);
    }

    .status-action-btn.postponed {
        background: #f8fafc;
        color: #64748b;
        border-color: #e2e8f0;
    }
    .status-action-btn.cancelled {
        background: #fff1f2;
        color: #e11d48;
        border-color: #fecdd3;
    }
    .status-action-btn.reschedule {
        background: #eef2ff;
        color: #4f46e5;
        border-color: #c7d2fe;
    }

    .status-action-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .status-action-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        filter: grayscale(0.5);
    }

    /* 5. Lab Tracking */
    .lab-tracking-container {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .lab-item {
        background: white;
        padding: 1rem;
        border-radius: 1.25rem;
        border: 2px solid #f1f5f9;
        transition: all 0.2s;
    }

    .lab-item.received {
        border-color: #10b981;
        background: #f0fdf4;
    }
    .lab-item.ordered {
        border-color: #3b82f6;
        background: #eff6ff;
    }

    .status-pill {
        font-size: 0.6rem;
        font-weight: 900;
        text-transform: uppercase;
        padding: 0.15rem 0.5rem;
        border-radius: 0.5rem;
        background: #f1f5f9;
        color: #64748b;
    }

    /* 6. Post-it Notes */
    .post-it {
        padding: 1.5rem;
        border-radius: 1.5rem;
        box-shadow: 0 10px 20px -5px rgba(0, 0, 0, 0.1);
        transform: rotate(1deg);
        transition: all 0.3s;
    }

    .post-it:nth-child(even) {
        transform: rotate(-1.5deg);
    }
    .post-it:hover {
        transform: scale(1.05) rotate(0deg);
        z-index: 40;
    }

    .post-it.critical {
        background: #fee2e2;
        border-left: 8px solid #ef4444;
        color: #991b1b;
    }
    .post-it.high {
        background: #fef3c7;
        border-left: 8px solid #f59e0b;
        color: #92400e;
    }
    .post-it.low {
        background: #f0f9ff;
        border-left: 8px solid #0ea5e9;
        color: #075985;
    }

    .importance-badge {
        font-size: 0.6rem;
        font-weight: 900;
        text-transform: uppercase;
        padding: 0.2rem 0.6rem;
        border-radius: 0.5rem;
        background: rgba(0, 0, 0, 0.05);
    }

    .note-text {
        font-weight: 600;
        font-size: 0.9rem;
        line-height: 1.4;
    }

    .btn-add-note-floating {
        background: #1e293b;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 1.5rem;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        font-weight: 800;
        transition: all 0.2s;
    }

    .btn-add-note-floating:hover {
        background: #0f172a;
        transform: scale(1.05);
    }

    /* 7. Modal & Forms */
    .importance-selector {
        padding: 1rem;
        border-radius: 1.25rem;
        text-align: center;
        border: 3px solid #f1f5f9;
        cursor: pointer;
        transition: all 0.2s;
        background: #f8fafc;
    }

    .importance-selector.active {
        transform: scale(1.05);
        border-color: currentColor;
    }
    .importance-selector.low {
        color: #0ea5e9;
    }
    .importance-selector.high {
        color: #f59e0b;
    }
    .importance-selector.critical {
        color: #ef4444;
    }

    .writing-vertical-rl {
        writing-mode: vertical-rl;
    }

    /* Planned Acts Alert */
    .planned-acts-alert {
        background: #eef2ff;
        border: 2px solid #c7d2fe;
        padding: 1.25rem;
        border-radius: 1.5rem;
    }

    @keyframes bounce-subtle {
        0%,
        100% {
            transform: translateY(0);
        }
        50% {
            transform: translateY(-5px);
        }
    }

    .animate-bounce-subtle {
        animation: bounce-subtle 4s infinite ease-in-out;
    }

    /* 8. Player-style Visit Controls */
    .btn-commencer,
    .btn-terminer {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem 1.5rem;
        border-radius: 99px;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        font-size: 0.85rem;
        transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        border: none;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        color: white;
    }

    .btn-commencer {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
    }

    .btn-commencer:hover {
        transform: scale(1.05) translateY(-2px);
        box-shadow: 0 8px 25px rgba(16, 185, 129, 0.4);
    }

    .btn-commencer.warning {
        background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3);
    }

    .btn-terminer {
        background: linear-gradient(135deg, #f43f5e 0%, #e11d48 100%);
        box-shadow: 0 4px 15px rgba(244, 63, 94, 0.3);
    }

    .btn-terminer:hover {
        transform: scale(1.05) translateY(-2px);
        box-shadow: 0 8px 25px rgba(244, 63, 94, 0.4);
    }

    .control-icon {
        font-size: 1.2rem;
        line-height: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 1.5rem;
    }
</style>
