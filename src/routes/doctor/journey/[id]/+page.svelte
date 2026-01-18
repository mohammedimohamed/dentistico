<script lang="ts">
    import { enhance } from "$app/forms";
    import { t } from "svelte-i18n";
    import { onMount } from "svelte";
    import { fade, slide, scale } from "svelte/transition";
    import DentalChart from "$lib/components/dental/DentalChart.svelte";
    import { calculateAge } from "$lib/dental/tooth-data";
    import { quintOut } from "svelte/easing";

    let { data } = $props();

    let chart: any = $state();
    let showNotesModal = $state(false);
    let clinicalNote = $state("");

    let visitTimer = $state(0);
    let timerInterval: any;

    onMount(() => {
        if (
            data.appointment.actual_start_time &&
            !data.appointment.actual_end_time
        ) {
            const start = new Date(
                data.appointment.actual_start_time,
            ).getTime();
            timerInterval = setInterval(() => {
                visitTimer = Math.floor((Date.now() - start) / 1000);
            }, 1000);
        }
        return () => clearInterval(timerInterval);
    });

    function formatTime(seconds: number) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h > 0 ? h + ":" : ""}${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }

    const patientAge = calculateAge(data.patient.date_of_birth);
</script>

<div
    class="journey-workspace h-[100vh] overflow-hidden bg-slate-50 flex flex-col"
>
    <!-- 1. Header Identity Bar -->
    <header
        class="identity-bar h-20 bg-white border-b border-slate-200 flex items-center px-8 justify-between z-20 shadow-sm"
    >
        <div class="flex items-center gap-6">
            <a href="/doctor/journey" class="btn-back"> ← </a>
            <div class="patient-id-card">
                <h2 class="text-xl font-bold text-slate-900">
                    {data.patient.full_name}
                </h2>
                <div class="flex gap-3 text-sm text-slate-500 font-medium">
                    <span
                        >{patientAge} ANS ({data.patient.gender === "F"
                            ? "Femme"
                            : "Homme"})</span
                    >
                    <span class="text-slate-300">|</span>
                    <span>{data.patient.phone}</span>
                </div>
            </div>
        </div>

        <div class="flex items-center gap-6">
            <!-- Critical Info -->
            <div class="flex gap-4">
                {#if data.patient.allergies}
                    <div
                        class="info-pill bg-rose-50 text-rose-600 border border-rose-100"
                    >
                        <span class="font-bold"
                            >⚠️ {$t("journey.allergies")}:</span
                        >
                        {data.patient.allergies}
                    </div>
                {/if}
                {#if data.patient.medical_conditions}
                    <div
                        class="info-pill bg-amber-50 text-amber-600 border border-amber-100"
                    >
                        <span class="font-bold"
                            >🩺 {$t("journey.medical_conditions")}:</span
                        >
                        {data.patient.medical_conditions}
                    </div>
                {/if}
            </div>

            <div class="balance-badge">
                <span class="label">{$t("journey.solde")}</span>
                <span
                    class="value"
                    class:positive={data.patient.balance_due <= 0}
                    class:negative={data.patient.balance_due > 0}
                >
                    {data.patient.balance_due.toLocaleString()} دج
                </span>
            </div>

            <!-- Visit Control -->
            {#if !data.appointment.actual_start_time}
                <form action="?/startVisit" method="POST" use:enhance>
                    <button class="btn-commencer">
                        🚀 {$t("journey.start_visit")}
                    </button>
                </form>
            {:else if !data.appointment.actual_end_time}
                <div class="flex items-center gap-4">
                    <div class="timer">
                        <span class="icon">⏱️</span>
                        <span class="time">{formatTime(visitTimer)}</span>
                    </div>
                    <form action="?/endVisit" method="POST" use:enhance>
                        <button class="btn-terminer">
                            {$t("journey.end_visit")}
                        </button>
                    </form>
                </div>
            {/if}
        </div>
    </header>

    <!-- 2. Main Content Grid -->
    <main class="flex-1 grid grid-cols-12 gap-0 overflow-hidden">
        <!-- Left Section: Action Grid -->
        <section
            class="col-span-4 p-6 bg-slate-100/50 border-r border-slate-200 overflow-y-auto"
        >
            <h3
                class="text-xs font-black text-slate-400 uppercase tracking-widest mb-6"
            >
                Action Grid
            </h3>
            <div class="action-grid">
                <button
                    class="pos-btn"
                    style="--color: #6366f1"
                    onclick={() => chart?.openGeneralTreatment()}
                >
                    <span class="icon">🦷</span>
                    <span class="label">{$t("journey.acte_general")}</span>
                </button>
                <button class="pos-btn" style="--color: #10b981">
                    <span class="icon">💳</span>
                    <span class="label">{$t("journey.paiement")}</span>
                </button>
                <button class="pos-btn" style="--color: #8b5cf6">
                    <span class="icon">📜</span>
                    <span class="label">{$t("journey.ordonnance")}</span>
                </button>
                <button class="pos-btn" style="--color: #3b82f6">
                    <span class="icon">📑</span>
                    <span class="label">{$t("journey.facture")}</span>
                </button>
                <button class="pos-btn" style="--color: #f59e0b">
                    <span class="icon">📅</span>
                    <span class="label">{$t("journey.prochain_rdv")}</span>
                </button>
                <button
                    class="pos-btn"
                    style="--color: #64748b"
                    onclick={() => (showNotesModal = true)}
                >
                    <span class="icon">📝</span>
                    <span class="label">{$t("journey.note_clinique")}</span>
                </button>
            </div>
        </section>

        <!-- Right Section: Interactive Odontogram -->
        <section class="col-span-8 flex flex-col bg-white">
            <div
                class="flex-1 overflow-auto flex items-center justify-center p-8"
            >
                <DentalChart
                    bind:this={chart}
                    patientId={data.patient.id}
                    {patientAge}
                />
            </div>
        </section>
    </main>

    {#if showNotesModal}
        <div
            class="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm"
            transition:fade
        >
            <div
                class="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden"
                in:scale={{ start: 0.9, duration: 400, easing: quintOut }}
            >
                <div
                    class="p-8 border-b border-slate-100 flex justify-between items-center"
                >
                    <h3 class="text-2xl font-black text-slate-800">
                        {$t("journey.note_clinique")}
                    </h3>
                    <button
                        class="text-slate-400 hover:text-slate-600"
                        onclick={() => (showNotesModal = false)}>✕</button
                    >
                </div>
                <div class="p-8">
                    <textarea
                        bind:value={clinicalNote}
                        placeholder="Saisissez vos notes ici..."
                        class="w-full h-64 p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl focus:border-indigo-500 focus:bg-white transition-all text-lg font-medium outline-none resize-none"
                    ></textarea>
                </div>
                <div class="p-8 bg-slate-50 flex gap-4">
                    <button
                        class="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all"
                        onclick={() => (showNotesModal = false)}
                    >
                        {$t("common.save")}
                    </button>
                </div>
            </div>
        </div>
    {/if}
</div>

<style>
    .journey-workspace {
        font-family: "Inter", sans-serif;
    }

    .btn-back {
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f1f5f9;
        border-radius: 12px;
        font-weight: 900;
        color: #64748b;
        transition: all 0.2s;
        text-decoration: none;
    }

    .btn-back:hover {
        background: #e2e8f0;
        color: #1e293b;
    }

    .info-pill {
        padding: 0.5rem 1rem;
        border-radius: 2rem;
        font-size: 0.75rem;
    }

    .balance-badge {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        background: #f8fafc;
        padding: 0.5rem 1.25rem;
        border-radius: 1rem;
        border: 1px solid #e2e8f0;
    }

    .balance-badge .label {
        font-size: 0.65rem;
        font-weight: 800;
        text-transform: uppercase;
        color: #94a3b8;
    }

    .balance-badge .value {
        font-weight: 900;
        font-size: 1.125rem;
    }

    .value.negative {
        color: #ef4444;
    }
    .value.positive {
        color: #10b981;
    }

    .btn-commencer {
        background: #6366f1;
        color: white;
        padding: 0.75rem 1.5rem;
        border-radius: 1rem;
        font-weight: 800;
        box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
        transition: all 0.2s;
        border: none;
    }

    .btn-commencer:hover {
        transform: scale(1.05);
        box-shadow: 0 6px 16px rgba(99, 102, 241, 0.4);
    }

    .timer {
        background: #0f172a;
        color: #10b981;
        padding: 0.5rem 1rem;
        border-radius: 0.75rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-family: "JetBrains Mono", monospace;
        font-weight: 700;
    }

    .btn-terminer {
        background: #fee2e2;
        color: #ef4444;
        padding: 0.75rem 1.5rem;
        border-radius: 1rem;
        font-weight: 800;
        border: none;
    }

    .btn-terminer:hover {
        background: #fecaca;
    }

    .action-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 1.25rem;
    }

    .pos-btn {
        aspect-ratio: 1;
        background: white;
        border: 2px solid transparent;
        border-radius: 1.5rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1rem;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }

    .pos-btn:hover {
        transform: translateY(-5px);
        border-color: var(--color);
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    }

    .pos-btn .icon {
        font-size: 2.5rem;
    }

    .pos-btn .label {
        font-weight: 800;
        font-size: 0.875rem;
        color: #1e293b;
        text-align: center;
    }
</style>
