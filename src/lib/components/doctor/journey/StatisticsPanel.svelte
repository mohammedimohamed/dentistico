<script lang="ts">
    import { slide } from "svelte/transition";
    import { onMount } from "svelte";
    import PatientVolumeCard from "./PatientVolumeCard.svelte";
    import AppointmentStatusCard from "./AppointmentStatusCard.svelte";
    import PatientTypeCard from "./PatientTypeCard.svelte";
    import TimeManagementCard from "./TimeManagementCard.svelte";

    let { stats } = $props<{ stats: any }>();

    let isExpanded = $state(false);

    onMount(() => {
        const saved = localStorage.getItem("doctor_stats_panel_state");
        if (saved === "open") {
            isExpanded = true;
        }
    });

    function toggle() {
        isExpanded = !isExpanded;
        localStorage.setItem(
            "doctor_stats_panel_state",
            isExpanded ? "open" : "closed",
        );
    }
</script>

<div class="stats-panel-container" class:is-expanded={isExpanded}>
    <button class="panel-header" onclick={toggle}>
        <div class="header-left">
            <span class="icon">📊</span>
            <span class="title">Aperçu de la journée</span>
        </div>
        <div class="header-right">
            {#if !isExpanded}
                <div class="mini-stats">
                    <span class="mini-item"><b>{stats.volume.total}</b> RV</span
                    >
                    <span class="mini-item"
                        ><b>{stats.volume.completed}</b> terminés</span
                    >
                    <span
                        class="mini-item pace-{stats.timeManagement.paceStatus}"
                        >{stats.timeManagement.recommendedTimePerVisit} min/pat.</span
                    >
                </div>
            {/if}
            <div class="toggle-icon" class:is-rotated={isExpanded}>
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="2.5"
                    stroke="currentColor"
                    class="w-5 h-5"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                    />
                </svg>
            </div>
        </div>
    </button>

    {#if isExpanded}
        <div class="panel-content" transition:slide={{ duration: 300 }}>
            <div class="stats-grid">
                <PatientVolumeCard stats={stats.volume} />
                <AppointmentStatusCard stats={stats.statusBreakdown} />
                <PatientTypeCard stats={stats.patientTypes} />
                <TimeManagementCard
                    stats={stats.timeManagement}
                    totalAppointments={stats.volume.total}
                />
            </div>
        </div>
    {/if}
</div>

<style>
    .stats-panel-container {
        background: white;
        border-radius: 1.5rem;
        border: 1px solid #e2e8f0;
        overflow: hidden;
        margin-bottom: 2rem;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }

    .stats-panel-container.is-expanded {
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        border-color: #cbd5e1;
    }

    .panel-header {
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem 1.5rem;
        background: transparent;
        border: none;
        cursor: pointer;
        transition: background 0.2s;
    }

    .panel-header:hover {
        background: #f8fafc;
    }

    .header-left {
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }

    .header-left .icon {
        font-size: 1.25rem;
    }

    .header-left .title {
        font-weight: 800;
        color: #1e293b;
        font-size: 1rem;
    }

    .header-right {
        display: flex;
        align-items: center;
        gap: 1.5rem;
    }

    .mini-stats {
        display: flex;
        gap: 1rem;
    }

    .mini-item {
        font-size: 0.75rem;
        color: #64748b;
        background: #f1f5f9;
        padding: 0.25rem 0.625rem;
        border-radius: 2rem;
        font-weight: 600;
    }

    .mini-item b {
        color: #1e293b;
    }

    .pace-comfortable {
        color: #16a34a !important;
        background: #f0fdf4 !important;
    }
    .pace-tight {
        color: #d97706 !important;
        background: #fff7ed !important;
    }
    .pace-overbooked {
        color: #dc2626 !important;
        background: #fef2f2 !important;
    }

    .toggle-icon {
        color: #94a3b8;
        transition: transform 0.3s;
    }

    .toggle-icon.is-rotated {
        transform: rotate(180deg);
        color: #4f46e5;
    }

    .panel-content {
        padding: 0 1.5rem 1.5rem 1.5rem;
    }

    .stats-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 1rem;
        padding-top: 0.5rem;
    }

    @media (max-width: 1024px) {
        .stats-grid {
            grid-template-columns: repeat(2, 1fr);
        }
    }

    @media (max-width: 640px) {
        .stats-grid {
            grid-template-columns: 1fr;
        }

        .mini-stats {
            display: none;
        }
    }
</style>
